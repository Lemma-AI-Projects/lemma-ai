/**
 * PG 同步桥 —— 把异步 node-postgres 调用以同步语义暴露给 Trilium 引擎。
 *
 * 背景：DatabaseProvider 接口是 100% 同步（better-sqlite3 风格），而 pg 驱动是异步的。
 * Node 中「同步等待异步」的唯一可靠机制 = worker_threads + SharedArrayBuffer + Atomics.wait
 * （synckit 验证过的模式）：主线程 postMessage 发请求后 Atomics.wait 阻塞，worker 独立线程
 * 执行完把结果写回 SAB 并 Atomics.notify 唤醒主线程。主线程事件循环不参与等待，无死锁。
 *
 * 协议（与 pg-worker.cjs 对齐）：
 *   control = Int32Array(4)：[0] 状态 0=idle 1=busy 2=done 3=error；[1] payload 字节长
 *   payload = Uint8Array(capacity)：响应 JSON（Buffer → { __pg_buf: base64 }）
 */
import { Worker } from 'worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const STATE_IDLE = 0
const STATE_DONE = 2
const STATE_ERROR = 3

const CONTROL_STATE = 0
const CONTROL_LEN = 1

export interface PgSyncBridgeOptions {
  connectionString: string
  /** 测试注入：true 时 worker 用 pg-mem 内存模拟替代真实 PG */
  usePgMem?: boolean
  /**
   * 显式主键映射（表 → 主键列）。真 PG 自动探测（pg_index/information_schema）；
   * pg-mem 等模拟环境不支持系统表查询，此时 INSERT RETURNING / upsert 依赖此配置。
   */
  primaryKeys?: Record<string, string>
  /** 列名还原映射（小写 → 原样）：默认加载内置 trilium-column-names.json；可覆盖 */
  columnNames?: Record<string, string>
  /** 测试引导：pg-mem 模式建库后执行的 SQL（迁移产物）；真实部署走 db/migrate.ts */
  bootstrapSql?: string
  /** 冲突目标映射（表 → 冲突列）：INSERT OR REPLACE 的 ON CONFLICT 目标；模拟环境注入 */
  conflictTargets?: Record<string, string[]>
  /** 单次响应最大字节数（默认 16MB，知识库查询足够） */
  payloadCapacity?: number
  /** worker 脚本路径（默认指向同目录 pg-worker.cjs） */
  workerScript?: string
}

export class PgSyncBridge {
  private readonly worker: Worker
  private readonly control: Int32Array
  private readonly payload: Uint8Array
  private closed = false

  constructor(opts: PgSyncBridgeOptions) {
    const capacity = opts.payloadCapacity ?? 16 * 1024 * 1024
    const sab = new SharedArrayBuffer(16 + capacity)
    this.control = new Int32Array(sab, 0, 4)
    this.payload = new Uint8Array(sab, 16, capacity)

    const workerScript =
      opts.workerScript ??
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'pg-worker.cjs')

    this.worker = new Worker(workerScript, {
      workerData: {
        connectionString: opts.connectionString,
        usePgMem: opts.usePgMem ?? false,
        primaryKeys: opts.primaryKeys,
        columnNames: opts.columnNames,
        bootstrapSql: opts.bootstrapSql,
        conflictTargets: opts.conflictTargets,
        control: sab,
        payloadCapacity: capacity,
      },
    })
  }

  /**
   * 同步执行一次查询（阻塞主线程直到 worker 完成）。
   * 同一时刻只有一个调用（同步阻塞天然互斥），事务安全。
   * params 为数组（位置参数）或纯对象（named 参数 :paramN），worker 按形态分支。
   */
  exec<T>(
    kind: 'run' | 'get' | 'all' | 'exec' | 'begin' | 'commit' | 'rollback' | 'inTransaction' | 'ping',
    sql: string,
    params: unknown[] | Record<string, unknown>,
  ): T {
    if (this.closed) throw new Error('[pg-bridge] bridge is closed')
    this.worker.postMessage({ kind, sql, params })

    // 等待 worker 完成（worker 独立线程执行，不依赖主线程事件循环）
    while (Atomics.load(this.control, CONTROL_STATE) === STATE_IDLE) {
      Atomics.wait(this.control, CONTROL_STATE, STATE_IDLE)
    }

    const state = Atomics.load(this.control, CONTROL_STATE)
    const len = Atomics.load(this.control, CONTROL_LEN)
    const json = new TextDecoder().decode(this.payload.subarray(0, len))

    // 复位状态供下一次调用
    Atomics.store(this.control, CONTROL_STATE, STATE_IDLE)
    Atomics.store(this.control, CONTROL_LEN, 0)

    if (state === STATE_ERROR) {
      const parsed = JSON.parse(json) as { message: string }
      throw new Error(parsed.message || '[pg-bridge] worker error')
    }
    return JSON.parse(json, reviver) as T
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    void this.worker.terminate()
  }
}

/** 反序列化：base64 Buffer 还原 */
function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && typeof (value as { __pg_buf?: unknown }).__pg_buf === 'string') {
    return Buffer.from((value as { __pg_buf: string }).__pg_buf, 'base64')
  }
  return value
}
