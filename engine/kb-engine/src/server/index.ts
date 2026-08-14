/**
 * kb-engine 服务入口（P0-4 骨架 + K1 引擎上下文 + K2 全量 API 门控）。
 *
 * 启动序列：
 *   1. runMigrations（建表 + 种子 initialized/dbVersion —— 引擎跳过 SQLite 迁移）
 *   2. initEngineContext（K1：context/platform/log/backup/crypto/translations 桩 +
 *      initSql + dbReady + Becca 全量加载）
 *   3. Express 监听（信任内网，由 FastAPI 网关转发 + 认证）
 *   4. KB_FULL_API_ENABLED=true 时挂载引擎 REST 层 /kb/api/*（K2，默认关）
 *
 * 环境变量：
 *   KB_PG_CONNECTION_STRING  必填：Supabase PG 连接串（非 bypass RLS 角色）
 *   KB_PORT                  可选：监听端口，默认 3210
 *   KB_FULL_API_ENABLED      可选：'true' 时挂载 /kb/api/* 全量 API（K2 门控，默认关）
 */
import { PgProvider } from '../db/pg-provider.ts'
import { runMigrations } from '../../db/migrate.ts'
import { initEngineContext } from './engine-context.ts'
import { createKbApp } from './app.ts'
import { mountApiRoutes } from './api-routes.ts'

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

  // 2. 引擎完整上下文（K1：Becca 加载 + 全局 getSql，路由依赖）
  const provider = new PgProvider({ connectionString })
  const ctx = await initEngineContext({ provider })

  // 3. Express + K2 门控挂载
  const app = createKbApp({ provider, sql: ctx.sql })
  const fullApi = process.env.KB_FULL_API_ENABLED === 'true'
  if (fullApi) {
    mountApiRoutes(app)
    console.log('[kb-engine] full API mounted at /kb/api/* (kb_full_api_enabled=true)')
  }

  const port = Number(process.env.KB_PORT ?? 3210)
  app.listen(port, () => {
    console.log(`[kb-engine] listening on :${port} (full API: ${fullApi ? 'on' : 'off'})`)
  })
}

main().catch((e) => {
  console.error('[kb-engine] fatal:', e)
  process.exit(1)
})
