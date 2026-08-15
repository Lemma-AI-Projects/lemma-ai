/**
 * kb-engine 本地全链路开发服务器（pglite 充当 DB，复刻部署形态 index.ts）。
 *
 * 用途：本机无 PG/Docker 时，用 pglite（WASM 真 PostgreSQL）跑完整引擎栈——
 * initEngineContext（Becca 加载）+ createKbApp + mountApiRoutes（全量 API）+
 * 真 HTTP listen。FastAPI 网关设 kb_engine_url=http://localhost:3210 即可
 * 打通「网关 → 侧车 → DB」全链路（部署形态正确性验证；仅 DB 用 pglite 替代）。
 *
 * 运行：node --experimental-strip-types scripts/serve-local.ts
 * 环境：KB_PORT（默认 3210）；KB_FULL_API_ENABLED=true 默认（本地全量）。
 */
import { readFileSync } from 'node:fs'
import { PgProvider } from '../src/db/pg-provider.ts'
import { initEngineContext } from '../src/server/engine-context.ts'
import { createKbApp } from '../src/server/app.ts'
import { mountApiRoutes } from '../src/server/api-routes.ts'

const PRIMARY_KEYS: Record<string, string> = {
  entity_changes: 'id',
  branches: 'branchId',
  notes: 'noteId',
  revisions: 'revisionId',
  attributes: 'attributeId',
  recent_notes: 'noteId',
  blobs: 'blobId',
  attachments: 'attachmentId',
  user_data: 'tmpid',
}

const BOOTSTRAP_SQL =
  readFileSync(new URL('../db/migrations/001_init_pg.sql', import.meta.url), 'utf-8') +
  '\n' +
  readFileSync(new URL('../db/migrations/002_rls.sql', import.meta.url), 'utf-8') +
  `
INSERT INTO options (name, user_id, value, isSynced, utcDateModified)
VALUES ('initialized', '', 'true', 0, '2026-08-15'),
       ('dbVersion', '', '240', 0, '2026-08-15')
ON CONFLICT (user_id, name) DO NOTHING;
INSERT INTO blobs (blobId, user_id, content, textRepresentation, dateModified, utcDateModified)
VALUES ('blob-welcome', '', '<p>欢迎使用 Lemma 知识库 🎉</p>', '<p>欢迎使用 Lemma 知识库 🎉</p>', '2026-08-15', '2026-08-15T00:00:00.000Z')
ON CONFLICT DO NOTHING;
INSERT INTO notes (noteId, user_id, title, type, mime, blobId, isProtected, isDeleted, dateCreated, dateModified, utcDateCreated, utcDateModified)
VALUES ('welcome', '', '欢迎', 'text', 'text/html', 'blob-welcome', 0, 0, '2026-08-15', '2026-08-15', '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z')
ON CONFLICT DO NOTHING;
INSERT INTO notes (noteId, user_id, title, type, mime, blobId, isProtected, isDeleted, dateCreated, dateModified, utcDateCreated, utcDateModified)
VALUES ('math-notes', '', '数学笔记', 'text', 'text/html', NULL, 0, 0, '2026-08-15', '2026-08-15', '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z')
ON CONFLICT DO NOTHING;
INSERT INTO branches (branchId, user_id, noteId, parentNoteId, notePosition, isExpanded, isDeleted, utcDateModified)
VALUES ('b-welcome', '', 'welcome', 'root', 0, 1, 0, '2026-08-15'),
       ('b-math', '', 'math-notes', 'root', 1, 1, 0, '2026-08-15')
ON CONFLICT DO NOTHING;
`

async function main() {
  const provider = new PgProvider({
    connectionString: 'pglite://local-dev',
    usePglite: true,
    primaryKeys: PRIMARY_KEYS,
    bootstrapSql: BOOTSTRAP_SQL,
  })

  const ctx = await initEngineContext({ provider })
  const app = createKbApp({ provider, sql: ctx.sql })
  mountApiRoutes(app)

  const port = Number(process.env.KB_PORT ?? 3210)
  app.listen(port, () => {
    console.log(`[kb-engine-local] listening on :${port} (pglite)`)
    console.log('[kb-engine-local] GET  /kb/health · /kb/notes · /kb/notes/tree')
    console.log('[kb-engine-local] API  /kb/api/*（全量：tree/notes/quick-search/...）')
  })
}

main().catch((e) => {
  console.error('[kb-engine-local] fatal:', e)
  process.exit(1)
})
