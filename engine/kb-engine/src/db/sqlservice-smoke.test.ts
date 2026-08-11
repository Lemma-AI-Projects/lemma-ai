/**
 * P0-3 黄金集成冒烟：迁移产物（001）+ PgProvider + 真实 SqlService 三件套。
 *
 * 模拟引擎在 PG 上的启动视角：
 *   1. bootstrapSql = db/migrations/001_init_pg.sql + 引擎种子（initialized/dbVersion）
 *      —— pg-mem 库初始化为迁移产物
 *   2. PgProvider 连同一库，**不注入 columnNames**——验证内置
 *      trilium-column-names.json 默认加载，把迁移表的小写列名还原为 camelCase
 *   3. SqlService 走引擎真实代码路径：sqlite_master 查询（isDbInitialized）、
 *      options 种子读取（getDbVersion）、反引号 DDL（param_list TEMP TABLE）、
 *      INSERT/事务/replace（lastInsertRowid）
 *
 * 注意：pg-mem 限制（递归 CTE / RLS / ROLLBACK 数据级）留真 PG 集成复核。
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PgProvider } from './pg-provider.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'
import { initContext } from '../../packages/core/src/services/context.js'

// 迁移表的真实主键（pg-mem 无法查系统表 → 注入；与 001 DDL 一致）
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

/** 迁移产物 + 引擎种子（等价于 db/migrate.ts 应用 001 后的状态） */
const BOOTSTRAP_SQL =
  readFileSync(new URL('../../db/migrations/001_init_pg.sql', import.meta.url), 'utf-8') +
  `
INSERT INTO options (name, user_id, value, isSynced, utcDateModified)
VALUES ('initialized', '', 'true', 0, '2026-08-11'),
       ('dbVersion', '', '240', 0, '2026-08-11')
ON CONFLICT (user_id, name) DO NOTHING;
`

function makeProvider() {
  return new PgProvider({
    connectionString: 'pg-mem://golden',
    usePgMem: true,
    primaryKeys: PRIMARY_KEYS,
    // entity_changes 的 OR REPLACE 由 UNIQUE(entityName, entityId) 触发冲突（非主键 id）
    conflictTargets: { entity_changes: ['entityName', 'entityId'] },
    bootstrapSql: BOOTSTRAP_SQL,
  })
}

describe('P0-3 引擎启动视角（迁移产物 + provider + SqlService）', () => {
  // context 为模块级单例：整个文件只初始化一次
  beforeAll(() => {
    initContext({ init: (f) => f(), get: () => undefined, set: () => {}, reset: () => {} } as never)
  })

  it('引擎初始化路径：sqlite_master / initialized / dbVersion / 反引号 DDL', async () => {
    const provider = makeProvider()
    const log = { info: () => {}, error: () => {}, warn: () => {} } as never
    const sql = new SqlService(
      { provider, isReadOnly: false, onTransactionCommit: () => {}, onTransactionRollback: () => {} },
      log,
    )

    try {
      // ── isDbInitialized 路径（sql_init.ts） ──
      const schemaExists = sql.getValue(`SELECT name FROM sqlite_master
          WHERE type = 'table' AND name = 'options'`)
      expect(schemaExists).toBe('options')

      const initialized = sql.getValue("SELECT value FROM options WHERE name = 'initialized'")
      expect(initialized).toBe('true')

      // ── getDbVersion 路径（migration.ts：>= 240 则跳过 200+ 迁移） ──
      const dbVersion = parseInt(sql.getValue("SELECT value FROM options WHERE name = 'dbVersion'"))
      expect(dbVersion).toBeGreaterThanOrEqual(240)

      // ── SQLite 反引号标识符 → PG 双引号（引擎 DDL 风格） ──
      // （param_list TEMP TABLE 是引擎真实路径，但 pg-mem 不支持 TEMP——真 PG 集成验证；
      //   这里用普通表验证反引号转换本身）
      sql.execute('CREATE TABLE IF NOT EXISTS "backtick_test" (`col1` TEXT NOT NULL, `col2` INTEGER DEFAULT 0)')
      sql.execute('INSERT INTO backtick_test (col1, col2) VALUES (?, ?)', ['abc', 1])
      const backtickRows = sql.getRows<{ col1: string; col2: number }>(
        'SELECT col1, col2 FROM backtick_test',
      )
      expect(backtickRows.length).toBe(1)
      expect(backtickRows[0].col1).toBe('abc')
    } finally {
      provider.close()
    }
  })

  it('引擎风格写入：notes INSERT + entity_changes.replace（lastInsertRowid）+ 事务', async () => {
    const provider = makeProvider()
    const log = { info: () => {}, error: () => {}, warn: () => {} } as never
    const sql = new SqlService(
      { provider, isReadOnly: false, onTransactionCommit: () => {}, onTransactionRollback: () => {} },
      log,
    )

    try {
      // notes INSERT（引擎 BNote 风格，camelCase 列名访问——验证默认列名还原）
      sql.insert('notes', {
        noteId: 'note-1', title: '点积的定义', type: 'text', mime: 'text/html',
        isProtected: 0, isDeleted: 0, dateCreated: '2026-08-11', dateModified: '2026-08-11',
        utcDateCreated: '2026-08-11T00:00:00.000Z', utcDateModified: '2026-08-11T00:00:00.000Z',
      })
      const note = sql.getRow<{ noteId: string; title: string }>(
        'SELECT noteId, title FROM notes WHERE noteId = ?', ['note-1'],
      )
      expect(note?.title).toBe('点积的定义')

      // entity_changes.replace（自增 id + lastInsertRowid——引擎 `ec.id = replace(...)` 路径）
      const ecId = sql.replace('entity_changes', {
        entityName: 'note', entityId: 'note-1', hash: 'h1',
        isErased: 0, changeId: 'c1', componentId: 'comp', instanceId: 'inst',
        isSynced: 1, utcDateChanged: '2026-08-11T00:00:00.000Z',
      })
      expect(Number(ecId)).toBeGreaterThan(0)

      // 事务内写入（引擎 transactional 路径）
      sql.transactional(() => {
        sql.insert('branches', {
          branchId: 'b1', noteId: 'note-1', parentNoteId: 'root',
          notePosition: 0, isExpanded: 0, isDeleted: 0, utcDateModified: '2026-08-11',
        })
        expect(provider.inTransaction).toBe(true)
      })
      expect(provider.inTransaction).toBe(false)
      const branch = sql.getRow<{ branchId: string; noteId: string }>(
        'SELECT branchId, noteId FROM branches WHERE branchId = ?', ['b1'],
      )
      expect(branch?.noteId).toBe('note-1')
    } finally {
      provider.close()
    }
  })
})
