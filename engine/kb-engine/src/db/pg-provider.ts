/**
 * PostgreSQL DatabaseProvider —— Trilium 引擎的 PG 存储实现（kb-engine P0-2）。
 *
 * 以 apps/server/src/sql_provider.ts（BetterSqlite3Provider，91 行）为蓝本，
 * 但存储目标换成 Supabase PG：所有查询经 PgSyncBridge（worker + Atomics.wait）同步执行。
 *
 * 语义对照（与 SQLite 提供方对齐）：
 *   - loadFromFile / loadFromMemory / loadFromBuffer：PG 连接在构造时已建立，全部 no-op
 *   - detach / isAttached：detach 置为未连接（PG 无「文件替换」场景，防御实现）
 *   - backup / serialize：PG 数据在云端，本地文件备份无意义 → 明确抛错（fail loudly）
 *   - prepare / transaction / inTransaction / exec / close：同步桥实现
 */
import type { DatabaseProvider, RunResult, Statement, Transaction } from '../../packages/core/src/services/sql/types.ts'
import { PgSyncBridge, type PgSyncBridgeOptions } from './pg-sync-bridge.ts'

export interface PgProviderOptions {
  connectionString: string
  /** 测试注入（pg-mem） */
  usePgMem?: boolean
  /** 显式主键映射（表 → 主键列）：真 PG 自动探测；模拟环境必须指定 */
  primaryKeys?: Record<string, string>
  /** 列名还原映射（小写 → 原样）：默认加载内置 trilium-column-names.json；可覆盖 */
  columnNames?: Record<string, string>
  /** 测试引导：pg-mem 模式建库后执行的 SQL（迁移产物）；真实部署走 db/migrate.ts */
  bootstrapSql?: string
  /** 冲突目标映射（表 → 冲突列）：INSERT OR REPLACE 的 ON CONFLICT 目标；模拟环境注入 */
  conflictTargets?: Record<string, string[]>
  payloadCapacity?: number
}

export class PgProvider implements DatabaseProvider {
  private readonly bridge: PgSyncBridge
  private attached = false

  constructor(opts: PgProviderOptions) {
    this.bridge = new PgSyncBridge({
      connectionString: opts.connectionString,
      usePgMem: opts.usePgMem,
      primaryKeys: opts.primaryKeys,
      columnNames: opts.columnNames,
      bootstrapSql: opts.bootstrapSql,
      conflictTargets: opts.conflictTargets,
      payloadCapacity: opts.payloadCapacity,
    })
    // 连接在 worker 内已建立（懒启动：首次 exec 时才真正连接）
    this.attached = true
  }

  // ── 加载语义：PG 无文件概念，全部 no-op ─────────────────────────────────
  loadFromFile(_path: string, _isReadOnly: boolean): void {
    this.attached = true
  }

  loadFromMemory(): void {
    this.attached = true
  }

  loadFromBuffer(_buffer: Uint8Array): void {
    this.attached = true
  }

  async backup(_destinationFile: string): Promise<void> {
    throw new Error('[pg-provider] backup() not supported: PG data lives in the cloud')
  }

  serialize(): Uint8Array {
    throw new Error('[pg-provider] serialize() not supported: PG data lives in the cloud')
  }

  detach(): void {
    this.attached = false
  }

  isAttached(): boolean {
    return this.attached
  }

  // ── 查询 ────────────────────────────────────────────────────────────────
  prepare(query: string): Statement {
    return new PgStatement(this.bridge, query)
  }

  transaction<T>(func: (statement: Statement) => T): Transaction {
    // better-sqlite3 语义：transaction(func) 返回事务函数，.deferred() 调用时
    // 同步执行 func 并返回其结果（SqlService.transactional 依赖此行为，见
    // script.ts:33 的返回值用法）。桥串行执行 → BEGIN/func/COMMIT 在同一连接。
    const txFn = (): T => {
      this.bridge.exec('begin', '', [])
      try {
        const result = func(new PgStatement(this.bridge, ''))
        this.bridge.exec('commit', '', [])
        return result
      } catch (e) {
        this.bridge.exec('rollback', '', [])
        throw e
      }
    }
    return { deferred: () => txFn() } as unknown as Transaction
  }

  get inTransaction(): boolean {
    return this.bridge.exec<{ inTransaction: boolean }>('inTransaction', '', []).inTransaction
  }

  exec(query: string): void {
    this.bridge.exec('exec', query, [])
  }

  /**
   * 设置 RLS 租户上下文（会话级 app.user_id）。每请求调用一次；
   * 同步桥串行执行，请求级设置/重置不会交叉污染。
   * 空串 = 系统上下文（仅可见系统行）。
   */
  setAppUserId(userId: string): void {
    this.bridge.exec('set_user_id', '', [], userId)
  }

  close(): void {
    this.bridge.close()
    this.attached = false
  }
}

/** 代理 Statement：每次调用经同步桥执行；raw/pluck 为 statement 级模式开关 */
class PgStatement implements Statement {
  private pluckMode = false
  private rawMode = false

  constructor(
    private readonly bridge: PgSyncBridge,
    private readonly sql: string,
  ) {}

  run(...params: unknown[]): RunResult {
    return this.bridge.exec('run', this.sql, flattenParams(params))
  }

  get(params: unknown): unknown {
    let p: unknown[] | Record<string, unknown> = []
    if (params !== undefined && params !== null) {
      p = params as unknown[] | Record<string, unknown>
    }
    const row = this.bridge.exec('get', this.sql, p) as Record<string, unknown> | null
    return this.shapeRow(row)
  }

  all(...params: unknown[]): unknown[] {
    const rows = this.bridge.exec('all', this.sql, flattenParams(params)) as Record<string, unknown>[]
    if (this.pluckMode) {
      return rows.map((r) => (r ? Object.values(r)[0] : undefined))
    }
    if (this.rawMode) {
      return rows.map((r) => (r ? Object.values(r) : r))
    }
    return rows
  }

  iterate(...params: unknown[]): IterableIterator<unknown> {
    const rows = this.all(...params)
    return rows[Symbol.iterator]()
  }

  // better-sqlite3 模式切换：
  //   pluck(true)  → get/all 只返回第一列值（SqlService.getValue 依赖）
  //   raw(true)    → 行对象变值数组
  raw(toggleState = true): this {
    this.rawMode = toggleState
    return this
  }

  pluck(toggleState = true): this {
    this.pluckMode = toggleState
    return this
  }

  private shapeRow(row: Record<string, unknown> | null): unknown {
    if (!row) return null
    if (this.pluckMode) return Object.values(row)[0] ?? null
    if (this.rawMode) return Object.values(row)
    return row
  }
}

/**
 * better-sqlite3 变参兼容：run([a,b]) 与 run(a,b) 都展开为 [a,b]；
 * 纯对象参数（named 模式 :paramN）原样传递（不包数组，否则 worker 误判位置模式）。
 * 返回类型 = unknown[] | 纯对象（worker 侧按 Array.isArray 分支处理）。
 */
function flattenParams(params: unknown[]): unknown[] | Record<string, unknown> {
  if (params.length === 1 && Array.isArray(params[0])) return params[0]
  if (params.length === 1 && isPlainObject(params[0])) return params[0]
  return params
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
