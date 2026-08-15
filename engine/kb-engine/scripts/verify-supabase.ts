/**
 * Supabase 部署验证脚本（真 PG 连接）。
 *
 * 用法：
 *   KB_PG_ADMIN_URL="postgresql://postgres:...@host:5432/postgres" \
 *   KB_PG_CONNECTION_STRING="postgresql://lemma_kb:...@host:5432/postgres" \
 *     node --experimental-strip-types scripts/verify-supabase.ts
 *
 * 两个连接的分工（生产姿势）：
 *   - KB_PG_ADMIN_URL：迁移用（需要 schema DDL 权限；生产=管理连接/SQL 编辑器）。
 *     缺省回退 KB_PG_CONNECTION_STRING（仅本地开发便利，生产必须显式给）。
 *   - KB_PG_CONNECTION_STRING：业务连接（非 BYPASSRLS 角色），检查角色/权限/RLS。
 *
 * 验证项：
 *   1. 迁移可跑（db/migrate.ts）+ 幂等（二次不重复应用）
 *   2. 业务角色非 BYPASSRLS（RLS 生效前提）+ 序列权限
 *   3. 表清单 + options 种子（initialized/dbVersion）
 *   4. RLS 状态
 */
import { readFileSync } from 'node:fs'

const conn = process.env.KB_PG_CONNECTION_STRING
if (!conn) {
  console.error('[verify] KB_PG_CONNECTION_STRING is required')
  process.exit(1)
}
const adminConn = process.env.KB_PG_ADMIN_URL ?? conn

const { runMigrations } = await import('../db/migrate.ts')

// 1. 迁移（admin 连接：需要 DDL 权限；业务角色只跑查询）
console.log('[verify] 迁移（admin 连接）……')
const first = await runMigrations({ connectionString: adminConn })
console.log(`[verify] 首次应用: ${first.applied.join(', ') || '(无)'} | dbVersion=${first.dbVersion}`)

const second = await runMigrations({ connectionString: adminConn })
console.log(`[verify] 二次应用: ${second.applied.join(', ') || '(无，幂等 ✓)'}`)

// 2. 角色/权限/表清单（业务连接直查）
const pg = await import('pg')
const client = new pg.Client({ connectionString: conn })
await client.connect()
try {
  // 当前角色
  const role = await client.query('SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user')
  const r = role.rows[0]
  console.log(`[verify] 角色: ${r.current_user} | superuser=${r.rolsuper} | bypassrls=${r.rolbypassrls}`)
  if (r.rolbypassrls) {
    console.warn('[verify] ⚠️ 角色 BYPASSRLS=true —— RLS 租户隔离失效！部署必须用非 bypass 角色（authenticated/lemma_kb）')
    process.exitCode = 1
  } else {
    console.log('[verify] 角色无 BYPASSRLS ✓（RLS 可生效）')
  }

  // 序列权限（entity_changes.id 自增）——只查 public schema（Supabase 的
  // auth 等 schema 序列业务角色无权限，扫到会误报）
  const seq = await client.query(
    "SELECT has_sequence_privilege(current_user, s.relname, 'USAGE') AS ok " +
    "FROM pg_class s JOIN pg_namespace n ON n.oid = s.relnamespace " +
    "WHERE s.relkind='S' AND n.nspname = 'public' LIMIT 1",
  )
  console.log(`[verify] 序列 USAGE 权限: ${seq.rows[0]?.ok ?? 'n/a'}（无序列时 n/a 正常）`)

  // 表清单
  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  )
  const names = tables.rows.map((t) => t.tablename)
  console.log(`[verify] public 表 (${names.length}): ${names.join(', ')}`)

  // options 种子
  const opts = await client.query(
    "SELECT name, value FROM options WHERE user_id='' AND name IN ('initialized','dbVersion')",
  )
  const seed = Object.fromEntries(opts.rows.map((o) => [o.name, o.value]))
  console.log(`[verify] 种子: initialized=${seed.initialized ?? 'MISSING'} dbVersion=${seed.dbVersion ?? 'MISSING'}`)
  if (seed.initialized !== 'true' || seed.dbVersion !== String(first.dbVersion)) {
    console.warn('[verify] ⚠️ 种子不完整——引擎会尝试跑 SQLite 迁移')
    process.exitCode = 1
  } else {
    console.log('[verify] 种子完整 ✓（引擎启动将跳过 SQLite 迁移）')
  }

  // RLS 状态
  const rls = await client.query(
    "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('notes','branches','entity_changes') ORDER BY relname",
  )
  for (const t of rls.rows) {
    console.log(`[verify] RLS ${t.relname}: ${t.relrowsecurity ? 'ON ✓' : 'OFF ⚠️'}`)
    if (!t.relrowsecurity) process.exitCode = 1
  }
} finally {
  await client.end()
}

console.log('[verify] 完成（exitCode=' + (process.exitCode ?? 0) + '）')
