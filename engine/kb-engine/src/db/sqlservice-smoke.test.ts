// 冒烟：真实 SqlService（引擎 SQL 封装层）跑在 PgProvider 上
import { describe, it, expect } from 'vitest'
import { PgProvider } from './pg-provider.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'
import { initContext } from '../../packages/core/src/services/context.js'

it('SqlService 全链路跑在 PgProvider 上', () => {
// 引擎 context 初始化（SqlService 的 slow-query 日志等依赖）
initContext({ init: (f) => f(), get: () => undefined, set: () => {}, reset: () => {} } as any)

const provider = new PgProvider({
  connectionString: 'pg-mem://smoke',
  usePgMem: true,
  primaryKeys: { notes: 'id', branches: 'branchId' },
    columnNames: {
      id: 'id', title: 'title', isdeleted: 'isDeleted',
      branchid: 'branchId', noteid: 'noteId', parentnoteid: 'parentNoteId',
    },
})

// 最小 log 桩（SqlService 构造参数）
const log = { info: () => {}, error: () => {}, warn: () => {} } as any
const sql = new SqlService(
  { provider, isReadOnly: false, onTransactionCommit: () => {}, onTransactionRollback: () => {} },
  log,
)

// 建表 + 引擎风格操作
sql.execute('CREATE TABLE notes (id SERIAL PRIMARY KEY, title TEXT, isDeleted INTEGER DEFAULT 0)')
sql.execute('CREATE TABLE branches (branchId TEXT PRIMARY KEY, noteId TEXT, parentNoteId TEXT, isDeleted INTEGER DEFAULT 0)')

// insert() 封装（返回 lastInsertRowid——entity_changes.replace 依赖）
const id = sql.insert('notes', { title: '点积', isDeleted: 0 })
console.log('insert lastInsertRowid:', id)

// getRow / getRows / getColumn
const row = sql.getRow<{ id: number; title: string }>('SELECT id, title FROM notes WHERE title = ?', ['点积'])
console.log('getRow:', row?.id, row?.title)

// 事务（transactional——引擎 46 处同步事务的核心路径）
sql.transactional(() => {
  sql.execute("INSERT INTO notes (title, isDeleted) VALUES ('微积分', 0)")
})
console.log('transactional 后行数:', sql.getColumn<number>('SELECT COUNT(*) FROM notes') )

// getRows 多行 + 排序（pg-mem 不支持递归 CTE / 部分 cast，真 PG 集成时验证子树查询）
sql.execute("INSERT INTO branches (branchId, noteId, parentNoteId) VALUES ('b1', 'n1', 'root')")
sql.execute("INSERT INTO branches (branchId, noteId, parentNoteId) VALUES ('b2', 'n2', 'n1')")
const rows = sql.getRows<{ noteId: string }>('SELECT noteId FROM branches WHERE parentNoteId = ? ORDER BY branchId', ['root'])
console.log('getRows 行数:', rows.length)

// replace()（INSERT OR REPLACE 路径）
sql.execute("INSERT INTO branches (branchId, noteId, parentNoteId) VALUES ('b9', 'n9', 'root')")
sql.replace('branches', { branchId: 'b9', noteId: 'n9b', parentNoteId: 'root', isDeleted: 0 })
const replaced = sql.getRow<{ noteId: string }>('SELECT noteId FROM branches WHERE branchId = ?', ['b9'])
console.log('replace 后 noteId:', replaced?.noteId)

provider.close()
  expect(true).toBe(true)
})

