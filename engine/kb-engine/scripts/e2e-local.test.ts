/**
 * kb-engine 部署形态 Node 侧真 HTTP 全链路（vitest 跑；DB 用 pglite 替代真 PG）。
 *
 * 验证目标（部署验证的一环）：
 *   1. 完整引擎初始化（initEngineContext → Becca 加载）在【真 HTTP server】下可跑
 *   2. 读路径：/kb/health · /kb/notes · /kb/notes/tree · /kb/api/tree
 *   3. 写路径：/kb/api/notes/:id/title（改名）· /kb/api/notes/:parent/children（新建）
 *   4. 内容：/kb/api/notes/:id/blob（编辑器读）· PUT /kb/api/notes/:id/data（编辑器存）
 *   5. 搜索：/kb/api/quick-search/:str
 *
 * 运行：npx vitest run scripts/e2e-local.test.ts
 * 说明：真 Supabase 连接（Docker/云凭据）本机不可用——DB 层用 pglite（WASM 真 PG），
 *       部署时以真连接串替换（见 planning/lemma-ai-kb-deploy-checklist.md）。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Server } from 'node:http'
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
INSERT INTO branches (branchId, user_id, noteId, parentNoteId, notePosition, isExpanded, isDeleted, utcDateModified)
VALUES ('b-welcome', '', 'welcome', 'root', 0, 1, 0, '2026-08-15')
ON CONFLICT DO NOTHING;
`

const PORT = 3211
let server: Server
let base = ''

beforeAll(async () => {
  const provider = new PgProvider({
    connectionString: 'pglite://e2e-local',
    usePglite: true,
    primaryKeys: PRIMARY_KEYS,
    bootstrapSql: BOOTSTRAP_SQL,
  })
  const ctx = await initEngineContext({ provider })
  const app = createKbApp({ provider, sql: ctx.sql })
  mountApiRoutes(app)
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, resolve)
  })
  base = `http://127.0.0.1:${PORT}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()))
})

describe('部署形态 Node 侧真 HTTP 全链路（pglite）', () => {
  it('健康检查 + 读路径（P0 路由）', async () => {
    const health = await fetch(`${base}/kb/health`).then((r) => r.json())
    expect(health.ok).toBe(true)
    const tree = await fetch(`${base}/kb/notes/tree`).then((r) => r.json())
    expect(JSON.stringify(tree)).toContain('welcome')
  })

  it('引擎 API 读路径：/kb/api/tree + /kb/api/notes/:id', async () => {
    const tree = await fetch(`${base}/kb/api/tree`).then((r) => r.json())
    expect(JSON.stringify(tree)).toContain('welcome')
    const note = await fetch(`${base}/kb/api/notes/welcome`).then((r) => r.json())
    expect(JSON.stringify(note)).toContain('欢迎')
  })

  it('写路径：改名 PUT /kb/api/notes/:id/title', async () => {
    const res = await fetch(`${base}/kb/api/notes/welcome/title`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '欢迎页（已改名）' }),
    })
    expect(res.status).toBe(200)
    // 引擎读回
    const note = await fetch(`${base}/kb/api/notes/welcome`).then((r) => r.json())
    expect(JSON.stringify(note)).toContain('已改名')
  })

  it('写路径：新建 POST /kb/api/notes/:parent/children', async () => {
    const res = await fetch(`${base}/kb/api/notes/welcome/children?target=into`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '部署验证子笔记', type: 'text', content: '' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { note?: { noteId?: string } }
    expect(body.note?.noteId).toBeDefined()
  })

  it('编辑器：blob 读内容 + PUT data 存内容', async () => {
    const blob = await fetch(`${base}/kb/api/notes/welcome/blob`).then((r) => r.json())
    expect((blob as { content?: string }).content).toContain('欢迎')
    const save = await fetch(`${base}/kb/api/notes/welcome/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '<p>编辑后的内容 <strong>加粗</strong></p>' }),
    })
    // updateNoteData 无返回值 → 引擎 formatApiResult 204（正确语义）
    expect(save.status).toBe(204)
    const blob2 = await fetch(`${base}/kb/api/notes/welcome/blob`).then((r) => r.json())
    expect((blob2 as { content?: string }).content).toContain('<strong>加粗</strong>')
  })

  it('搜索：/kb/api/quick-search/:str', async () => {
    const res = await fetch(`${base}/kb/api/quick-search/${encodeURIComponent('欢迎')}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { searchResults?: unknown[] }
    expect(body.searchResults?.length ?? 0).toBeGreaterThan(0)
  })
})
