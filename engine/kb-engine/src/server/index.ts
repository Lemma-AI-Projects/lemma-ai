/**
 * kb-engine P0-4：Express 服务入口。
 *
 * 启动序列：
 *   1. runMigrations（建表 + 种子 initialized/dbVersion —— 引擎跳过 SQLite 迁移）
 *   2. initContext（引擎 context：slow-query 日志等）
 *   3. PgProvider + SqlService（同步桥连 PG）
 *   4. Express 监听（信任内网，由 FastAPI 网关转发 + 认证）
 *
 * 环境变量：
 *   KB_PG_CONNECTION_STRING  必填：Supabase PG 连接串（非 bypass RLS 角色）
 *   KB_PORT                  可选：监听端口，默认 3210
 */
import { PgProvider } from '../db/pg-provider.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'
import LogService from '../../packages/core/src/services/log.ts'
import { initContext } from '../../packages/core/src/services/context.js'
import { runMigrations } from '../../db/migrate.ts'
import { createKbApp } from './app.ts'

/** 引擎 ExecutionContext 的最小实现（Map 存储） */
function makeExecutionContext() {
  const store = new Map<string, unknown>()
  return {
    init<T>(fn: () => T): T {
      return fn()
    },
    get<T = unknown>(key: string): T | undefined {
      return store.get(key) as T | undefined
    },
    set(key: string, value: unknown): void {
      store.set(key, value)
    },
    reset(): void {
      store.clear()
    },
  }
}

async function main() {
  const connectionString = process.env.KB_PG_CONNECTION_STRING
  if (!connectionString) {
    console.error('[kb-engine] KB_PG_CONNECTION_STRING is required')
    process.exit(1)
  }

  // 1. 迁移（幂等：版本表跳过已应用）
  const migration = await runMigrations({ connectionString })
  if (migration.applied.length > 0) {
    console.log(`[kb-engine] applied migrations: ${migration.applied.join(', ')} (dbVersion=${migration.dbVersion})`)
  }

  // 2. 引擎 context + 存储
  initContext(makeExecutionContext())
  const provider = new PgProvider({ connectionString })
  const sql = new SqlService(
    {
      provider,
      isReadOnly: false,
      onTransactionCommit: () => {},
      onTransactionRollback: () => {},
    },
    new LogService(),
  )

  // 3. Express
  const app = createKbApp({ provider, sql })
  const port = Number(process.env.KB_PORT ?? 3210)
  app.listen(port, () => {
    console.log(`[kb-engine] listening on :${port}`)
  })
}

main().catch((e) => {
  console.error('[kb-engine] fatal:', e)
  process.exit(1)
})
