/**
 * 真 PG 语义全链路验证（pglite = PostgreSQL 编译到 WASM 的真内核）。
 *
 * 覆盖 pg-mem 无法验证的 4 个真 PG 语义 + RLS 租户隔离全链路：
 *   1. 迁移 001+002（含 RLS policy）在真 PG 语义下执行
 *   2. RLS 隔离：用户 A 写入 → 用户 B 不可见；系统行（options 种子）始终可见
 *   3. 递归 CTE（branches 子树查询）
 *   4. 数据级 ROLLBACK（事务失败数据不落库）
 *   5. param_list TEMP TABLE（引擎 initDbConnection 路径）
 *   6. entity_changes.replace upsert（唯一索引冲突更新）
 *
 * 与 Supabase 部署差异：pglite 连接为超级用户（bypass RLS）→ worker 初始化链
 * SET ROLE lemma_kb（非超级用户）使 RLS 生效；真实部署用 authenticated 连接。
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PgProvider } from './pg-provider.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'
import { initContext } from '../../packages/core/src/services/context.js'

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

/** 001（建表）+ 002（RLS）+ 种子 —— 完整迁移产物，含 RLS */
const BOOTSTRAP_SQL =
  readFileSync(new URL('../../db/migrations/001_init_pg.sql', import.meta.url), 'utf-8') +
  '\n' +
  readFileSync(new URL('../../db/migrations/002_rls.sql', import.meta.url), 'utf-8') +
  `
INSERT INTO options (name, user_id, value, isSynced, utcDateModified)
VALUES ('initialized', '', 'true', 0, '2026-08-12'),
       ('dbVersion', '', '240', 0, '2026-08-12')
ON CONFLICT (user_id, name) DO NOTHING;
`

function makeProvider(): PgProvider {
  return new PgProvider({
    connectionString: 'pglite://integration',
    usePglite: true,
    primaryKeys: PRIMARY_KEYS,
    // entity_changes 的 OR REPLACE 由 UNIQUE(entityName, entityId) 触发冲突（非主键 id）
    conflictTargets: { entity_changes: ['entityName', 'entityId'] },
    bootstrapSql: BOOTSTRAP_SQL,
  })
}

function makeSql(provider: PgProvider): SqlService {
  return new SqlService(
    { provider, isReadOnly: false, onTransactionCommit: () => {}, onTransactionRollback: () => {} },
    { info: () => {}, error: () => {}, warn: () => {} } as never,
  )
}

describe('真 PG 语义全链路（pglite）', () => {
  // context 为模块级单例：整个文件只初始化一次
  beforeAll(() => {
    initContext({ init: (f) => f(), get: () => undefined, set: () => {}, reset: () => {} } as never)
  })

  it('迁移 001+002（含 RLS）可执行 + 引擎启动视角（sqlite_master/种子）', async () => {
    const provider = makeProvider()
    const sql = makeSql(provider)
    try {
      // isDbInitialized 路径
      const schemaExists = sql.getValue(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'options'`,
      )
      expect(schemaExists).toBe('options')
      const initialized = sql.getValue("SELECT value FROM options WHERE name = 'initialized'")
      expect(initialized).toBe('true')
      const dbVersion = parseInt(sql.getValue("SELECT value FROM options WHERE name = 'dbVersion'"))
      expect(dbVersion).toBeGreaterThanOrEqual(240)

      // RLS 已启用（真 PG 语义下能查 pg_policies）
      const policyCount = sql.getColumn<number>(
        `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'notes'`,
      )
      expect(policyCount[0]).toBeGreaterThan(0)
    } finally {
      provider.close()
    }
  })

  it('RLS 租户隔离：A 写入 → B 不可见；options 系统行始终可见', async () => {
    const provider = makeProvider()
    const sql = makeSql(provider)
    try {
      // 用户 A 写入一条笔记
      provider.setAppUserId('user-a')
      sql.insert('notes', {
        noteId: 'a-note-1', title: 'A 的私有笔记', type: 'text', mime: 'text/html',
        isProtected: 0, isDeleted: 0, dateCreated: '2026-08-12', dateModified: '2026-08-12',
        utcDateCreated: '2026-08-12T00:00:00.000Z', utcDateModified: '2026-08-12T00:00:00.000Z',
      })

      // 系统上下文写入另一条（user_id = ''）
      provider.setAppUserId('')
      sql.insert('notes', {
        noteId: 'sys-note-1', title: '系统笔记', type: 'text', mime: 'text/html',
        isProtected: 0, isDeleted: 0, dateCreated: '2026-08-12', dateModified: '2026-08-12',
        utcDateCreated: '2026-08-12T00:00:00.000Z', utcDateModified: '2026-08-12T00:00:00.000Z',
      })

      // 用户 A 视角：看到自己的 + 系统行（user_id='' 通过 options 式放行？——notes policy 无 OR）
      provider.setAppUserId('user-a')
      const aSees = sql.getColumn<string>(
        `SELECT noteId FROM notes WHERE noteId IN ('a-note-1', 'sys-note-1') ORDER BY noteId`,
      )
      expect(aSees).toEqual(['a-note-1']) // 系统行在 notes 表不可见（policy 严格 user_id 匹配）

      // 用户 B 视角：A 的笔记不可见
      provider.setAppUserId('user-b')
      const bSees = sql.getColumn<string>(
        `SELECT noteId FROM notes WHERE noteId IN ('a-note-1', 'sys-note-1')`,
      )
      expect(bSees).toEqual([]) // 完全隔离

      // options 系统行对任意用户可见（policy 含 OR user_id = ''）
      provider.setAppUserId('user-b')
      const opt = sql.getValue("SELECT value FROM options WHERE name = 'initialized'")
      expect(opt).toBe('true')
    } finally {
      provider.close()
    }
  })

  it('递归 CTE：branches 子树查询（pg-mem 跑不了的真 PG 语义）', async () => {
    const provider = makeProvider()
    const sql = makeSql(provider)
    try {
      provider.setAppUserId('user-a')
      sql.insert('branches', {
        branchId: 'b1', noteId: 'n1', parentNoteId: 'root', notePosition: 0,
        isExpanded: 1, isDeleted: 0, utcDateModified: '2026-08-12',
      })
      sql.insert('branches', {
        branchId: 'b2', noteId: 'n2', parentNoteId: 'n1', notePosition: 0,
        isExpanded: 1, isDeleted: 0, utcDateModified: '2026-08-12',
      })
      sql.insert('branches', {
        branchId: 'b3', noteId: 'n3', parentNoteId: 'n2', notePosition: 0,
        isExpanded: 0, isDeleted: 0, utcDateModified: '2026-08-12',
      })

      // 引擎 branches 子树查询（routes/api/branches.ts 同款）
      const tree = sql.getRows<{ noteId: string }>(
        `WITH RECURSIVE tree(branchId, noteId) AS (
           SELECT branchId, noteId FROM branches WHERE branchId = ?
           UNION
           SELECT branches.branchId, branches.noteId FROM branches
             JOIN tree ON branches.parentNoteId = tree.noteId
           WHERE branches.isDeleted = 0 AND branches.isExpanded = 1
         ) SELECT noteId FROM tree`,
        ['b1'],
      )
      // b1 → n1（expanded）→ b2 → n2（expanded）→ b3 → n3（isExpanded=0 不展开）
      expect(tree.map((r) => r.noteId).sort()).toEqual(['n1', 'n2'])
    } finally {
      provider.close()
    }
  })

  it('数据级回滚：事务失败 → 数据不落库（pg-mem 做不到的真语义）', async () => {
    const provider = makeProvider()
    const sql = makeSql(provider)
    try {
      provider.setAppUserId('user-a')

      // 成功事务
      sql.transactional(() => {
        sql.insert('notes', {
          noteId: 'tx-ok', title: '事务成功', type: 'text', mime: 'text/html',
          isProtected: 0, isDeleted: 0, dateCreated: '2026-08-12', dateModified: '2026-08-12',
          utcDateCreated: '2026-08-12T00:00:00.000Z', utcDateModified: '2026-08-12T00:00:00.000Z',
        })
      })
      expect(
        sql.getColumn<number>(`SELECT COUNT(*) FROM notes WHERE noteId = 'tx-ok'`)[0],
      ).toBe(1)

      // 失败事务 → 回滚（数据级！）
      // SqlService.transactional 内部立即调用 provider.transaction(func).deferred()——
      // 异常在 transactional 调用点抛出，expect 包裹捕获
      expect(() =>
        sql.transactional(() => {
          sql.insert('notes', {
            noteId: 'tx-fail', title: '事务失败', type: 'text', mime: 'text/html',
            isProtected: 0, isDeleted: 0, dateCreated: '2026-08-12', dateModified: '2026-08-12',
            utcDateCreated: '2026-08-12T00:00:00.000Z', utcDateModified: '2026-08-12T00:00:00.000Z',
          })
          throw new Error('boom')
        }),
      ).toThrow('boom')

      const failed = sql.getColumn<number>(`SELECT COUNT(*) FROM notes WHERE noteId = 'tx-fail'`)
      expect(failed[0]).toBe(0) // 已回滚
      expect(provider.inTransaction).toBe(false)
    } finally {
      provider.close()
    }
  })

  it('param_list TEMP TABLE（引擎 initDbConnection 反引号 DDL）+ entity_changes.replace upsert', async () => {
    const provider = makeProvider()
    const sql = makeSql(provider)
    try {
      // TEMP TABLE + 反引号转换（引擎 fillParamList 路径）
      sql.execute('CREATE TEMP TABLE IF NOT EXISTS "param_list" (`paramId` TEXT NOT NULL PRIMARY KEY)')
      sql.execute('INSERT INTO param_list VALUES (?)', ['abc'])
      expect(sql.getColumn<number>('SELECT COUNT(*) FROM param_list')[0]).toBe(1)

      // entity_changes.replace：UNIQUE(entityName, entityId) 冲突 → 更新（lastInsertRowid）
      provider.setAppUserId('user-a')
      const id1 = sql.replace('entity_changes', {
        entityName: 'note', entityId: 'ec-1', hash: 'h1',
        isErased: 0, changeId: 'c1', componentId: 'comp', instanceId: 'inst',
        isSynced: 1, utcDateChanged: '2026-08-12T00:00:00.000Z',
      })
      expect(Number(id1)).toBeGreaterThan(0)

      const id2 = sql.replace('entity_changes', {
        entityName: 'note', entityId: 'ec-1', hash: 'h2',
        isErased: 0, changeId: 'c1', componentId: 'comp', instanceId: 'inst',
        isSynced: 1, utcDateChanged: '2026-08-12T00:00:00.000Z',
      })
      // 冲突更新：hash 变为 h2，行数仍 1（不重复插入）
      expect(Number(id2)).toBeGreaterThan(0)
      const rows = sql.getRows<{ hash: string }>(
        `SELECT hash FROM entity_changes WHERE entityName = 'note' AND entityId = 'ec-1'`,
      )
      expect(rows.length).toBe(1)
      expect(rows[0].hash).toBe('h2')
    } finally {
      provider.close()
    }
  })
})
