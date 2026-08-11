/**
 * P0-3 迁移运行器测试（pg-mem）——验证：
 *   1. 001 建表：9 张业务表 + user_data + sqlite_master 视图
 *   2. 种子：options.initialized='true' + dbVersion（引擎跳过 200+ 迁移的关键）
 *   3. 幂等：重复运行不重复应用
 *   4. RLS（002）在模拟环境被跳过，不阻塞
 * 注意：RLS 语义（current_setting 隔离）只能在真 PG 验证——pg-mem 不支持。
 */
import { describe, expect, it } from 'vitest'
import { runMigrations } from './migrate.ts'

/** 每次测试独立 pg-mem 实例；返回 db（供 runMigrations 复用）与 Pool 构造 */
async function freshDb() {
  const { newDb } = await import('pg-mem')
  return newDb()
}

async function queryOne(pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }, sql: string, params?: unknown[]): Promise<unknown> {
  const res = await pool.query(sql, params)
  return (res.rows as unknown[])[0] ?? null
}

describe('P0-3 迁移运行器', () => {
  it('应用 001：9 张业务表 + user_data + sqlite_master 视图', async () => {
    const db = await freshDb()
    const connString = 'pg-mem://t1'
    await runMigrations({ connectionString: connString, usePgMem: true, skipRls: true, pgMemDb: db })

    const adapter = db.adapters.createPg(); const pool = new adapter.Pool({})
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )
    const names = (tables.rows as { table_name: string }[]).map((r) => r.table_name)
    for (const expected of [
      'entity_changes', 'branches', 'notes', 'revisions', 'options',
      'attributes', 'recent_notes', 'blobs', 'attachments', 'user_data',
    ]) {
      expect(names).toContain(expected)
    }
    // 裁剪表不建
    expect(names).not.toContain('etapi_tokens')
    expect(names).not.toContain('sessions')

    // sqlite_master 视图：引擎 isDbInitialized 查询
    const row = await queryOne(
      pool,
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'options'`,
    )
    expect(row).not.toBeNull()
    expect((row as { name: string }).name).toBe('options')

    await pool.end()
  })

  it('种子：initialized + dbVersion（系统行 user_id = ""）', async () => {
    const db = await freshDb()
    await runMigrations({ connectionString: 'pg-mem://t2', usePgMem: true, skipRls: true, pgMemDb: db })

    const adapter = db.adapters.createPg(); const pool = new adapter.Pool({})
    const initialized = await queryOne(
      pool,
      `SELECT value FROM options WHERE name = 'initialized' AND user_id = ''`,
    )
    expect((initialized as { value: string }).value).toBe('true')

    const dbVersion = await queryOne(
      pool,
      `SELECT value FROM options WHERE name = 'dbVersion' AND user_id = ''`,
    )
    expect(Number((dbVersion as { value: string }).value)).toBeGreaterThanOrEqual(240)

    await pool.end()
  })

  it('幂等：重复运行不重复应用、不报错', async () => {
    const db = await freshDb()
    await runMigrations({ connectionString: 'pg-mem://t3', usePgMem: true, skipRls: true, pgMemDb: db })
    const second = await runMigrations({ connectionString: 'pg-mem://t3', usePgMem: true, skipRls: true, pgMemDb: db })

    expect(second.applied).toEqual([]) // 全部跳过
    expect(second.skipped.length).toBeGreaterThanOrEqual(2) // 001 + 002(跳过 RLS)

    const adapter = db.adapters.createPg(); const pool = new adapter.Pool({})
    const count = await queryOne(pool, 'SELECT COUNT(*) AS c FROM schema_migrations')
    expect(Number((count as { c: string }).c)).toBe(1) // 只有 001
    await pool.end()
  })

  it('引擎视角端到端：isDbInitialized 查询路径可跑', async () => {
    const db = await freshDb()
    await runMigrations({ connectionString: 'pg-mem://t4', usePgMem: true, skipRls: true, pgMemDb: db })

    const adapter = db.adapters.createPg(); const pool = new adapter.Pool({})
    // 模拟 sql_init.ts 的 isDbInitialized() 两条查询
    const exists = await queryOne(
      pool,
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'options'`,
    )
    const initialized = await queryOne(
      pool,
      `SELECT value FROM options WHERE name = 'initialized'`,
    )
    expect(exists).not.toBeNull()
    expect((initialized as { value: string }).value).toBe('true')

    // 模拟 migration.ts 的 getDbVersion()
    const dbVersion = await queryOne(
      pool,
      `SELECT value FROM options WHERE name = 'dbVersion'`,
    )
    expect(Number((dbVersion as { value: string }).value)).toBeGreaterThanOrEqual(240)
    await pool.end()
  })
})
