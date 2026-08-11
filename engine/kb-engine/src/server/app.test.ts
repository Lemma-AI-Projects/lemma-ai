/**
 * P0-4 服务骨架测试：Express app（supertest）+ pg-mem（bootstrapSql 迁移产物）。
 *
 * 覆盖：
 *   1. /kb/health 探活
 *   2. /kb/notes 返回非删除笔记（RLS 中间件设置 app.user_id 后查询）
 *   3. /kb/notes/tree 组装多父树
 *   4. RLS 中间件：请求级设置/重置调用（provider.setAppUserId 顺序）
 * 注意：pg-mem 不执行 RLS policy——租户隔离语义在真 PG 集成验证；
 *       这里验证「每请求设置 app.user_id」的调用链与查询路径。
 */
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { readFileSync } from 'node:fs'
import { PgProvider } from '../db/pg-provider.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'
import { initContext } from '../../packages/core/src/services/context.js'
import { createKbApp, type KbEngineContext } from './app.ts'

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
  `
INSERT INTO options (name, user_id, value, isSynced, utcDateModified)
VALUES ('initialized', '', 'true', 0, '2026-08-11'),
       ('dbVersion', '', '240', 0, '2026-08-11')
ON CONFLICT (user_id, name) DO NOTHING;
`

let ctx: KbEngineContext

beforeAll(async () => {
  initContext({ init: (f) => f(), get: () => undefined, set: () => {}, reset: () => {} } as never)

  const provider = new PgProvider({
    connectionString: 'pg-mem://server',
    usePgMem: true,
    primaryKeys: PRIMARY_KEYS,
    bootstrapSql: BOOTSTRAP_SQL,
  })
  const log = { info: () => {}, error: () => {}, warn: () => {} } as never
  const sql = new SqlService(
    { provider, isReadOnly: false, onTransactionCommit: () => {}, onTransactionRollback: () => {} },
    log,
  )

  // 种子数据：一个笔记 + 一个分支
  sql.insert('notes', {
    noteId: 'n1', title: '点积的定义', type: 'text', mime: 'text/html',
    isProtected: 0, isDeleted: 0, dateCreated: '2026-08-11', dateModified: '2026-08-11',
    utcDateCreated: '2026-08-11T00:00:00.000Z', utcDateModified: '2026-08-11T00:00:00.000Z',
  })
  sql.insert('notes', {
    noteId: 'n2', title: '点积的几何意义', type: 'text', mime: 'text/html',
    isProtected: 0, isDeleted: 0, dateCreated: '2026-08-11', dateModified: '2026-08-11',
    utcDateCreated: '2026-08-11T00:00:00.000Z', utcDateModified: '2026-08-11T00:00:00.000Z',
  })
  sql.insert('notes', {
    noteId: 'n3', title: '已删除笔记', type: 'text', mime: 'text/html',
    isProtected: 0, isDeleted: 1, dateCreated: '2026-08-11', dateModified: '2026-08-11',
    utcDateCreated: '2026-08-11T00:00:00.000Z', utcDateModified: '2026-08-11T00:00:00.000Z',
  })
  sql.insert('branches', {
    branchId: 'b-root', noteId: 'n1', parentNoteId: 'root', notePosition: 0,
    isExpanded: 0, isDeleted: 0, utcDateModified: '2026-08-11',
  })
  sql.insert('branches', {
    branchId: 'b-child', noteId: 'n2', parentNoteId: 'n1', notePosition: 0,
    isExpanded: 0, isDeleted: 0, utcDateModified: '2026-08-11',
  })

  ctx = { provider, sql }
})

describe('kb-engine Express 服务（P0-4）', () => {
  it('GET /kb/health 探活', async () => {
    const res = await request(createKbApp(ctx)).get('/kb/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.service).toBe('kb-engine')
  })

  it('GET /kb/notes 只返回未删除笔记（isDeleted = 0）', async () => {
    const res = await request(createKbApp(ctx)).get('/kb/notes')
    expect(res.status).toBe(200)
    expect(res.body.notes.length).toBe(2)
    const titles = res.body.notes.map((n: { title: string }) => n.title)
    expect(titles).toContain('点积的定义')
    expect(titles).not.toContain('已删除笔记')
  })

  it('GET /kb/notes/tree 组装多父树（root → n1 → n2）', async () => {
    const res = await request(createKbApp(ctx)).get('/kb/notes/tree')
    expect(res.status).toBe(200)
    expect(res.body.tree.length).toBe(1)
    const root = res.body.tree[0]
    expect(root.noteId).toBe('n1')
    expect(root.children.length).toBe(1)
    expect(root.children[0].noteId).toBe('n2')
  })

  it('RLS 中间件：请求级设置 app.user_id（X-Lemma-User-Id 生效，响应后重置）', async () => {
    const provider = ctx.provider
    // 中间件在请求开始时设置用户上下文——用 spy 记录调用序列
    const calls: string[] = []
    const original = provider.setAppUserId.bind(provider)
    provider.setAppUserId = (uid: string) => {
      calls.push(uid)
      original(uid)
    }

    await request(createKbApp(ctx)).get('/kb/notes').set('X-Lemma-User-Id', 'user-abc')
    // 请求开始设置 uid，响应结束重置为空
    expect(calls).toContain('user-abc')
    expect(calls[calls.length - 1]).toBe('')

    provider.setAppUserId = original
  })

  it('无 X-Lemma-User-Id 头：以系统上下文（空 uid）处理，不报错', async () => {
    const res = await request(createKbApp(ctx)).get('/kb/notes')
    expect(res.status).toBe(200)
  })
})
