/**
 * Supabase 部署验证脚本（连真 PG → 迁移 → RLS 角色检查 → 表清单）。
 *
 * 用法：
 *   KB_PG_CONNECTION_STRING="postgresql://...@host:5432/postgres" \
 *     node --experimental-strip-types scripts/verify-supabase.ts
 *
 * 验证项：
 *   1. 连接可达（连接串）
 *   2. 迁移可跑（db/migrate.ts：9 业务表 + user_data + etapi_tokens + 种子）
 *   3. 幂等（二次跑不重复应用）
 *   4. 角色非 BYPASSRLS（RLS 生效前提）+ 序列权限
 *   5. 表清单 + options 种子（initialized/dbVersion）
 *
 * 注意：业务连接角色必须无 BYPASSRLS（不能用 postgres/service_role）。
 */
import { readFileSync } from 'node:fs'

const conn = process.env.KB_PG_CONNECTION_STRING
if (!conn) {
  console.error('[verify] KB_PG_CONNECTION_STRING is required')
  process.exit(1)
}

const { runMigrations } = await import('../db/migrate.ts')

// 1. 迁移（真 PG 连接串）
console.log('[verify] 连接 + 迁移……')
const first = await runMigrations({ connectionString: conn })
console.log(`[verify] 首次应用: ${first.applied.join(', ') || '(无)'} | dbVersion=${first.dbVersion}`)

const second = await runMigrations({ connectionString: conn })
console.log(`[verify] 二次应用: ${second.applied.join(', ') || '(无，幂等 ✓)'}`)

// 2. 角色/权限/表清单（用 pg 直查）
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

  // 序列权限（entity_changes.id 自增）
  const seq = await client.query(
    "SELECT has_sequence_privilege(current_user, s.relname, 'USAGE') AS ok FROM pg_class s WHERE s.relkind='S' LIMIT 1",
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
