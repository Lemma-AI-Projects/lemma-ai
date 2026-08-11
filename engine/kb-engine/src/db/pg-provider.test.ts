/**
 * PgProvider 冒烟测试（P0-2 验收）——pg-mem 内存模拟驱动。
 *
 * 覆盖：CRUD / 位置参数 `?` / named 参数 `:paramN` / lastInsertRowid /
 * 事务（提交+回滚）/ INSERT OR REPLACE → ON CONFLICT / 字符串字面量保护 /
 * BEGIN IMMEDIATE 方言转换。
 *
 * 注意：真实 PG 冒烟留到部署环境（本地无 PG 实例）；pg-mem 与真 PG 的差异
 * （如 ON CONFLICT 细节）在集成时用真库复核。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PgProvider } from './pg-provider.ts'

let provider: PgProvider

beforeAll(() => {
  provider = new PgProvider({
    connectionString: 'pg-mem://test', // usePgMem 模式下忽略
    usePgMem: true,
    // pg-mem 不支持 information_schema 系统表查询 → 显式注入主键
    // （真 PG 自动探测，无需此配置）
    primaryKeys: { notes: 'id' },
    // pg-mem 列名不折叠，但生产映射按 Trilium schema 还原——注入同一映射验证 camelCase 键
    columnNames: {
      id: 'id', title: 'title', isdeleted: 'isDeleted',
      branchid: 'branchId', noteid: 'noteId', parentnoteid: 'parentNoteId',
    },
  })
  provider.exec('CREATE TABLE notes (id SERIAL PRIMARY KEY, title TEXT, isDeleted INTEGER DEFAULT 0)')
})

afterAll(() => {
  provider.close()
})

describe('PgProvider CRUD（同步桥 + 方言转换）', () => {
  it('INSERT 返回 changes 与 lastInsertRowid（SERIAL 主键）', () => {
    const res = provider
      .prepare('INSERT INTO notes (title) VALUES (?)')
      .run(['线性代数'])
    expect(res.changes).toBe(1)
    expect(res.lastInsertRowid).toBeGreaterThan(0)
  })

  it('位置参数 ? → $n：多参数查询', () => {
    provider.prepare('INSERT INTO notes (title, isDeleted) VALUES (?, ?)').run(['微积分', 0])
    const rows = provider.prepare('SELECT * FROM notes WHERE isDeleted = ?').all([0])
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('get 返回单行对象（无行返回 null）', () => {
    const row = provider.prepare('SELECT id, title FROM notes WHERE title = ?').get(['微积分'])
    expect(row).not.toBeNull()
    expect((row as { title: string }).title).toBe('微积分')
    const none = provider.prepare('SELECT * FROM notes WHERE title = ?').get(['不存在的标题'])
    expect(none).toBeNull()
  })

  it('named 参数 :paramN → $N（SqlService ??? 展开产物）', () => {
    const row = provider
      .prepare('SELECT id FROM notes WHERE title = :param1 AND isDeleted = :param2')
      .get({ param1: '微积分', param2: 0 })
    expect(row).not.toBeNull()
  })

  it('字符串字面量里的 ? 不被转换', () => {
    const rows = provider.prepare("SELECT id FROM notes WHERE title = 'what?'").all([])
    expect(Array.isArray(rows)).toBe(true)
  })

  it('UPDATE 返回 changes', () => {
    const res = provider
      .prepare('UPDATE notes SET title = ? WHERE title = ?')
      .run(['微积分（上）', '微积分'])
    expect(res.changes).toBeGreaterThanOrEqual(1)
  })

  it('DELETE 生效', () => {
    provider.prepare('DELETE FROM notes WHERE title = ?').run(['线性代数'])
    const rows = provider.prepare('SELECT * FROM notes WHERE title = ?').all(['线性代数'])
    expect(rows.length).toBe(0)
  })
})

describe('PgProvider 事务', () => {
  it('事务成功提交（SqlService.transactional 语义：deferred() 立即执行并返回结果）', () => {
    const result = provider.transaction(() => {
      provider.prepare('INSERT INTO notes (title) VALUES (?)').run(['事务内提交'])
      return 'ok'
    }).deferred?.() ?? 'noop'
    // deferred() 应同步执行并返回 func 结果
    expect(result).toBe('ok')
    const rows = provider.prepare('SELECT * FROM notes WHERE title = ?').all(['事务内提交'])
    expect(rows.length).toBe(1)
  })

  it('事务失败回滚（命令序列正确：BEGIN → 异常 → ROLLBACK；数据级回滚留真 PG 集成验证）', () => {
    expect(() =>
      provider.transaction(() => {
        provider.prepare('INSERT INTO notes (title) VALUES (?)').run(['事务内回滚'])
        expect(provider.inTransaction).toBe(true) // 事务内
        throw new Error('boom')
      }).deferred?.(),
    ).toThrow('boom')
    // ROLLBACK 命令已发 → 事务状态复位（worker 侧跟踪，不依赖 pg-mem 的回滚语义）
    expect(provider.inTransaction).toBe(false)
  })

  it('无 primaryKeys 配置时（模拟环境）INSERT 不崩、退化为 lastInsertRowid=0', () => {
    const p2 = new PgProvider({ connectionString: 'pg-mem://t3', usePgMem: true })
    p2.exec('CREATE TABLE bare (id SERIAL PRIMARY KEY, name TEXT)')
    const res = p2.prepare('INSERT INTO bare (name) VALUES (?)').run(['x'])
    expect(res.changes).toBe(1)
    // 主键不可得 → RETURNING 未附加 → lastInsertRowid 保持 0（fail-safe，不抛错）
    expect(res.lastInsertRowid).toBe(0)
    p2.close()
  })

  it('inTransaction 状态正确', () => {
    provider.transaction(() => {
      expect(provider.inTransaction).toBe(true)
    }).deferred?.()
    expect(provider.inTransaction).toBe(false)
  })
})

describe('PgProvider 方言转换', () => {
  it('INSERT OR REPLACE → ON CONFLICT (pk) DO UPDATE（主键命中更新）', () => {
    // 先插入 id=100
    provider.prepare('INSERT INTO notes (id, title) VALUES (?, ?)').run([100, '原标题'])
    // OR REPLACE 更新同 id
    const res = provider
      .prepare('INSERT OR REPLACE INTO notes (id, title) VALUES (?, ?)')
      .run([100, '新标题'])
    expect(res.changes).toBeGreaterThanOrEqual(1)
    const row = provider.prepare('SELECT title FROM notes WHERE id = ?').get([100])
    expect((row as { title: string }).title).toBe('新标题')
  })

  it('BEGIN IMMEDIATE（transactionalAsync 用）→ BEGIN', () => {
    // worker 里 BEGIN IMMEDIATE 被重写为 BEGIN；这里直接验证 exec 不抛错且事务状态正确
    provider.exec('BEGIN IMMEDIATE')
    provider.prepare('INSERT INTO notes (title) VALUES (?)').run(['immediate 事务'])
    expect(provider.inTransaction).toBe(true)
    provider.exec('COMMIT')
    expect(provider.inTransaction).toBe(false)
    const rows = provider.prepare('SELECT * FROM notes WHERE title = ?').all(['immediate 事务'])
    expect(rows.length).toBe(1)
  })
})

describe('PgProvider 边界语义', () => {
  it('unsupported 方法明确报错（fail loudly，不静默）', async () => {
    await expect(provider.backup('/tmp/x.db')).rejects.toThrow(/not supported/)
    expect(() => provider.serialize()).toThrow(/not supported/)
  })

  it('close 后可关闭（幂等）', () => {
    const p2 = new PgProvider({ connectionString: 'pg-mem://t2', usePgMem: true })
    p2.close()
    p2.close() // 幂等
  })
})
