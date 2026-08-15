/**
 * K4.1 知识库写路径/搜索 API 构建函数单测（纯函数，无 react/axios 依赖）。
 * 覆盖：新建 URL + target=into、改名 URL、删除 taskId 必填（F3）、
 * 中文/特殊字符 encodeURIComponent、quick-search 路径。
 */
import { describe, expect, it } from 'vitest'
import {
  buildChangeTitlePath,
  buildCreateNotePath,
  buildDeleteNotePath,
  buildNoteBlobPath,
  buildQuickSearchPath,
  buildUpdateNoteDataPath,
} from './knowledgeBaseApi'

describe('K4.1 kb write/search API 路径构建', () => {
  it('新建：/notes/:parent/children?target=into（target=into 语义 = 作为子笔记）', () => {
    expect(buildCreateNotePath('seed-1')).toBe(
      '/api/v1/kb/api/notes/seed-1/children?target=into'
    )
  })

  it('新建：parentNoteId 含中文/特殊字符 → encodeURIComponent', () => {
    expect(buildCreateNotePath('微积分 专题/1')).toBe(
      '/api/v1/kb/api/notes/%E5%BE%AE%E7%A7%AF%E5%88%86%20%E4%B8%93%E9%A2%98%2F1/children?target=into'
    )
  })

  it('改名：PUT /notes/:noteId/title', () => {
    expect(buildChangeTitlePath('note-abc')).toBe(
      '/api/v1/kb/api/notes/note-abc/title'
    )
  })

  it('删除：必须带 taskId（引擎 TaskContext 校验，缺失 400）', () => {
    const path = buildDeleteNotePath('note-abc', 'task-xyz')
    expect(path).toBe('/api/v1/kb/api/notes/note-abc?taskId=task-xyz')
    // taskId 必须是查询参数（不在路径段）
    expect(path).not.toContain('/task-')
    expect(path).toContain('?taskId=')
  })

  it('删除：taskId 含特殊字符 → encodeURIComponent', () => {
    const path = buildDeleteNotePath('note-abc', 'a/b c')
    expect(path).toContain('taskId=a%2Fb%20c')
  })

  it('搜索：GET /quick-search/:searchString（中文编码）', () => {
    expect(buildQuickSearchPath('导数')).toBe(
      '/api/v1/kb/api/quick-search/%E5%AF%BC%E6%95%B0'
    )
  })
})

describe('K5.2 内容读写 API 路径构建', () => {
  it('读内容：GET /notes/:noteId/blob', () => {
    expect(buildNoteBlobPath('note-abc')).toBe(
      '/api/v1/kb/api/notes/note-abc/blob'
    )
  })

  it('读内容：noteId 含中文 → encodeURIComponent', () => {
    expect(buildNoteBlobPath('导数 笔记')).toBe(
      '/api/v1/kb/api/notes/%E5%AF%BC%E6%95%B0%20%E7%AC%94%E8%AE%B0/blob'
    )
  })

  it('存内容：PUT /notes/:noteId/data', () => {
    expect(buildUpdateNoteDataPath('note-abc')).toBe(
      '/api/v1/kb/api/notes/note-abc/data'
    )
  })
})
