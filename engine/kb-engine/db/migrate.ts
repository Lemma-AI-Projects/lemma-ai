/**
 * kb-engine P0-3：PG 迁移运行器。
 *
 * 职责：
 *   1. 连接目标 PG（真实连接串或 pg-mem 测试注入）
 *   2. 维护 schema_migrations 版本表，按文件名顺序应用 db/migrations/*.sql
 *   3. 应用后写入引擎必需种子：options.initialized='true'（配合 sqlite_master
 *      视图，引擎 isDbInitialized() 返回 true）+ options.dbVersion（引擎
 *      migrateIfNecessary 校验版本一致则跳过 200+ 条 SQLite 迁移）
 *
 * 引擎兼容关键（已在 001/002 注释）：sqlite_master 视图 + dbVersion 种子，
 * 二者共同让 Trilium 引擎在 PG 上启动时认为「库已初始化且版本最新」。
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

/**
 * 引擎当前目标 DB 版本 = core MIGRATIONS[0].version。
 * 硬编码兜底；若 core 可导入则动态获取（见 applySeeds）。
 */
const FALLBACK_DB_VERSION = 240

export interface RunMigrationsOptions {
  connectionString: string
  /** 测试注入：pg-mem 内存模拟 */
  usePgMem?: boolean
  /** 测试注入：已创建的 pg-mem Db 实例（usePgMem 时优先复用，否则内部新建） */
  pgMemDb?: unknown
  /** 跳过 RLS 迁移（pg-mem 不支持）——真 PG 部署必须关闭此选项 */
  skipRls?: boolean
  /** 迁移目录（测试可覆盖） */
  migrationsDir?: string
}

export interface MigrationResult {
  applied: string[]
  skipped: string[]
  dbVersion: number
}

export async function runMigrations(opts: RunMigrationsOptions): Promise<MigrationResult> {
  const { Pool, db } = await loadPg(opts.usePgMem, opts.pgMemDb)
  const pool = new Pool(opts.usePgMem ? { max: 1 } : { connectionString: opts.connectionString, max: 1 })

  try {
    // 先查后建（而非 CREATE IF NOT EXISTS）：pg-mem 对「表已存在 + IF NOT EXISTS」
    // 的重复 DDL 有解析 bug（AST 部分未读）；真 PG 语义一致。
    const migTable = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'schema_migrations'`,
    )
    if (migTable.rows.length === 0) {
      await pool.query(`CREATE TABLE schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`)
    }

    const dir = opts.migrationsDir ?? MIGRATIONS_DIR
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    const appliedRows = await pool.query('SELECT id FROM schema_migrations')
    const appliedSet = new Set(appliedRows.rows.map((r: { id: string }) => r.id))

    const applied: string[] = []
    const skipped: string[] = []

    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped.push(file)
        continue
      }
      if (opts.skipRls && file.includes('_rls')) {
        skipped.push(file)
        continue
      }
      const sql = readFileSync(path.join(dir, file), 'utf-8')
      await pool.query('BEGIN')
      try {
        await pool.query(sql)
        await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file])
        await pool.query('COMMIT')
        applied.push(file)
      } catch (e) {
        await pool.query('ROLLBACK')
        throw new Error(`[migrate] failed on ${file}: ${(e as Error).message}`)
      }
    }

    const dbVersion = await applySeeds(pool)

    return { applied, skipped, dbVersion }
  } finally {
    await pool.end()
  }
}

/** 引擎必需种子：initialized + dbVersion（写 system 行 user_id = ''） */
async function applySeeds(pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }): Promise<number> {
  const dbVersion = await resolveDbVersion()
  const now = new Date().toISOString()

  await pool.query(
    `INSERT INTO options (name, user_id, value, isSynced, utcDateModified)
     VALUES ('initialized', '', 'true', 0, $1),
            ('dbVersion', '', $2::text, 0, $1)
     ON CONFLICT (user_id, name) DO NOTHING`,
    [now, String(dbVersion)],
  )
  return dbVersion
}

/** 优先从 core 动态获取最新迁移版本；失败用常量兜底 */
async function resolveDbVersion(): Promise<number> {
  try {
    const mod = await import('../packages/core/src/migrations/migrations.ts')
    const fn = mod.getMaxMigrationVersion as (() => number) | undefined
    if (typeof fn === 'function') {
      return fn()
    }
  } catch {
    // core 不可导入（如裁剪环境）→ 用常量
  }
  return FALLBACK_DB_VERSION
}

/** 按需加载 pg（生产）或 pg-mem（测试） */
async function loadPg(usePgMem?: boolean, pgMemDb?: unknown) {
  if (usePgMem) {
    const { newDb, DataType } = await import('pg-mem')
    const db: { adapters: { createPg(): { Pool: new (opts?: object) => unknown } }; public: { registerFunction: (f: object) => void } } =
      (pgMemDb as { adapters: { createPg(): { Pool: new (opts?: object) => unknown } }; public: { registerFunction: (f: object) => void } }) ?? newDb()
    // pg-mem 不实现 current_setting（001 的 user_id 动态默认值依赖）——注册：
    // 测试语义下无会话变量 → 返回空串（COALESCE 兜底为系统行）
    try {
      ;(db as { public: { registerFunction: (f: object) => void } }).public.registerFunction({
        name: 'current_setting',
        args: [DataType.text, DataType.bool],
        returns: DataType.text,
        implementation: () => '',
      })
    } catch {
      // 已注册
    }
    return {
      Pool: db.adapters.createPg().Pool as unknown as typeof import('pg').Pool,
      db,
    }
  }
  return { Pool: (await import('pg')).Pool, db: undefined }
}
