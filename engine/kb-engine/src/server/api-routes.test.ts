/**
 * kb-engine K2 冒烟：引擎 REST 层挂载（buildSharedApiRoutes → /kb/api/*）。
 *
 * 覆盖：
 *   1. GET /kb/api/tree —— 读路径（引擎 getTree）
 *   2. GET /kb/api/notes/:noteId —— 读路径（getNote）
 *   3. PUT /kb/api/notes/:noteId/title —— 写路径（changeTitle，Becca 一致 + 落库）
 *   4. POST /kb/api/notes/:parentNoteId/children —— 写路径（createNote，建子笔记）
 *   5. 门控：未调用 mountApiRoutes 时 /kb/api/* 404（默认关 = 无暴露面）
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import request from 'supertest'
import { PgProvider } from '../db/pg-provider.ts'
import { initEngineContext, type EngineContext } from './engine-context.ts'
import { createKbApp } from './app.ts'
import { mountApiRoutes } from './api-routes.ts'
import { getSql } from '../../packages/core/src/services/sql/index.ts'

const PRIMARY_KEYS = {
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
  readFileSync(new URL('../../db/migrations/001_init_pg.sql', import.meta.url), 'utf-8') +
  '\n' +
  readFileSync(new URL('../../db/migrations/002_rls.sql', import.meta.url), 'utf-8') +
  `
INSERT INTO options (name, user_id, value, isSynced, utcDateModified)
VALUES ('initialized', '', 'true', 0, '2026-08-14'),
       ('dbVersion', '', '240', 0, '2026-08-14')
ON CONFLICT (user_id, name) DO NOTHING;
INSERT INTO blobs (blobId, user_id, content, dateModified, utcDateModified)
VALUES ('blob-seed-1', '', '<p>种子内容</p>', '2026-08-14', '2026-08-14T00:00:00.000Z')
ON CONFLICT DO NOTHING;
INSERT INTO notes (noteId, user_id, title, type, mime, blobId, isProtected, isDeleted, dateCreated, dateModified, utcDateCreated, utcDateModified)
VALUES ('seed-1', '', '种子笔记', 'text', 'text/html', 'blob-seed-1', 0, 0, '2026-08-14', '2026-08-14', '2026-08-14T00:00:00.000Z', '2026-08-14T00:00:00.000Z')
ON CONFLICT DO NOTHING;
INSERT INTO branches (branchId, user_id, noteId, parentNoteId, notePosition, isExpanded, isDeleted, utcDateModified)
VALUES ('seed-b1', '', 'seed-1', 'root', 0, 1, 0, '2026-08-14')
ON CONFLICT DO NOTHING;
`

let ctx: EngineContext
let provider: PgProvider
let app: ReturnType<typeof createKbApp>

beforeAll(async () => {
  provider = new PgProvider({
    connectionString: 'pglite://k2',
    usePglite: true,
    primaryKeys: PRIMARY_KEYS,
    bootstrapSql: BOOTSTRAP_SQL,
  })
  ctx = await initEngineContext({ provider })
  app = createKbApp({ provider, sql: ctx.sql })
  mountApiRoutes(app)
})

describe('K2 引擎 REST 层挂载', () => {
  it('读路径：GET /kb/api/tree 返回种子树', async () => {
    const res = await request(app).get('/kb/api/tree').expect(200)
    // 响应带引擎标准头
    expect(res.headers['trilium-max-entity-change-id']).toBeDefined()
    // 树含种子笔记（结构断言宽松——POJO 形态由引擎决定）
    const bodyText = JSON.stringify(res.body)
    expect(bodyText).toContain('seed-1')
    expect(bodyText).toContain('种子笔记')
  })

  it('读路径：GET /kb/api/notes/seed-1 读回种子笔记', async () => {
    const res = await request(app).get('/kb/api/notes/seed-1').expect(200)
    expect(JSON.stringify(res.body)).toContain('种子笔记')
  })

  it('写路径：PUT /kb/api/notes/seed-1/title 改名 → Becca 一致 + PG 落库', async () => {
    const res = await request(app)
      .put('/kb/api/notes/seed-1/title')
      .send({ title: 'K2 改名后的标题' })
      .expect(200)
    expect(res.body).toBeDefined()
    // Becca 内存缓存即时一致
    expect(ctx.becca.notes['seed-1'].title).toBe('K2 改名后的标题')
    // PG 落库
    const fromDb = getSql().getValue<unknown>(
      "SELECT title FROM notes WHERE noteId = 'seed-1'",
    )
    expect(fromDb).toBe('K2 改名后的标题')
  })

  it('写路径：POST /kb/api/notes/seed-1/children 建子笔记', async () => {
    const res = await request(app)
      .post('/kb/api/notes/seed-1/children?target=into')
      .send({ title: 'K2 子笔记', type: 'text', content: '' })
      .expect(200)
    // createNote 返回 { note, branch }（引擎 POJO 形态）
    const created = res.body as { note?: { noteId?: string } }
    expect(created.note?.noteId).toBeDefined()
    // Becca 缓存 + PG 双重确认
    expect(ctx.becca.notes[created.note!.noteId!]).toBeDefined()
    const fromDb = getSql().getRow<{ title: string }>(
      'SELECT title FROM notes WHERE noteId = ?',
      [created.note!.noteId!],
    )
    expect(fromDb?.title).toBe('K2 子笔记')
  })

  it('门控：未 mount 时 /kb/api/* 404（默认关 = 零暴露面）', async () => {
    const bare = createKbApp({ provider, sql: ctx.sql })
    const res = await request(bare).get('/kb/api/tree').expect(404)
    expect(res.body).toBeDefined()
  })
})
