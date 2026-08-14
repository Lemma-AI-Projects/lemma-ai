/**
 * kb-engine K1 冒烟：引擎完整上下文初始化（pglite 真语义）。
 *
 * 覆盖：
 *   1. initEngineContext 全序列可跑（initContext → platform/log/backup 桩 →
 *      initSql → dbReady → Becca load）
 *   2. Becca 加载：种子数据后 notes/branches/attributes 内存缓存有数据
 *   3. 写后一致：BNote().save() 后 becca.notes 即时含新 noteId（PG 与缓存同源）
 *   4. 引擎业务方法可用（getNote/title 读回——K2 挂载的前置断言）
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PgProvider } from '../db/pg-provider.ts'
import { initEngineContext, type EngineContext } from './engine-context.ts'
import BNote from '../../packages/core/src/becca/entities/bnote.ts'
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
-- 种子业务数据（Becca 加载验证用）
INSERT INTO notes (noteId, user_id, title, type, mime, isProtected, isDeleted, dateCreated, dateModified, utcDateCreated, utcDateModified)
VALUES ('seed-1', '', '种子笔记', 'text', 'text/html', 0, 0, '2026-08-14', '2026-08-14', '2026-08-14T00:00:00.000Z', '2026-08-14T00:00:00.000Z')
ON CONFLICT DO NOTHING;
INSERT INTO branches (branchId, user_id, noteId, parentNoteId, notePosition, isExpanded, isDeleted, utcDateModified)
VALUES ('seed-b1', '', 'seed-1', 'root', 0, 1, 0, '2026-08-14')
ON CONFLICT DO NOTHING;
`

let ctx: EngineContext

beforeAll(async () => {
  const provider = new PgProvider({
    connectionString: 'pglite://k1',
    usePglite: true,
    primaryKeys: PRIMARY_KEYS,
    bootstrapSql: BOOTSTRAP_SQL,
  })
  ctx = await initEngineContext({ provider })
})

describe('K1 引擎完整上下文', () => {
  it('初始化序列可跑 + Becca 从 PG 加载种子数据', () => {
    // 种子笔记在 Becca 内存缓存
    expect(ctx.becca.notes['seed-1']).toBeDefined()
    expect(ctx.becca.notes['seed-1'].title).toBe('种子笔记')
    // 分支
    expect(ctx.becca.branches['seed-b1']).toBeDefined()
    // Becca loaded 标志
    expect(ctx.becca.loaded).toBe(true)
  })

  it('引擎全局 getSql 可用（路由依赖的全局单例）', () => {
    const title = getSql().getValue<unknown>("SELECT title FROM notes WHERE noteId = 'seed-1'")
    expect(title).toBe('种子笔记')
  })

  it('写后 Becca 一致：BNote().save() 即时进内存缓存 + PG 落库', () => {
    const note = new BNote({
      noteId: 'k1-note-1',
      title: 'K1 写入的笔记',
      type: 'text',
      mime: 'text/html',
    }).save()
    expect(note.noteId).toBe('k1-note-1')
    // 内存缓存即时更新（不 reload 也可见）
    expect(ctx.becca.notes['k1-note-1']).toBeDefined()
    expect(ctx.becca.notes['k1-note-1'].title).toBe('K1 写入的笔记')
    // PG 落库（引擎 getSql 读回）
    const fromDb = getSql().getRow<{ title: string }>(
      'SELECT title FROM notes WHERE noteId = ?',
      ['k1-note-1'],
    )
    expect(fromDb?.title).toBe('K1 写入的笔记')
  })

  it('引擎业务方法（K2 挂载前置断言）：BNote 读回', () => {
    const note = ctx.becca.getNote('seed-1')
    expect(note?.title).toBe('种子笔记')
  })
})
