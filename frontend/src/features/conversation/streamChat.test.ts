import { describe, expect, it } from 'vitest'

import { buildChatRequestBody } from './streamChat'

describe('buildChatRequestBody 的 wire 形状', () => {
  it('新会话带 projectId、不带 conversationId', () => {
    expect(buildChatRequestBody({ content: 'hi', projectId: 'p1' })).toEqual({
      projectId: 'p1',
      messages: [{ role: 'user', content: 'hi' }],
    })
  })

  it('续聊带 conversationId、不带 projectId（已有会话后端忽略它）', () => {
    expect(
      buildChatRequestBody({
        content: 'hi',
        conversationId: 'c1',
        projectId: 'p1',
      })
    ).toEqual({
      conversationId: 'c1',
      messages: [{ role: 'user', content: 'hi' }],
    })
  })

  it('Mala 投送：contextBundleIds 进 body，且是 camelCase', () => {
    expect(
      buildChatRequestBody({ content: 'hi', contextBundleIds: ['b1', 'b2'] })
    ).toEqual({
      contextBundleIds: ['b1', 'b2'],
      messages: [{ role: 'user', content: 'hi' }],
    })
  })

  it('空数组等同于没带：整个键不出现（不发空数组）', () => {
    const body = buildChatRequestBody({ content: 'hi', contextBundleIds: [] })
    expect('contextBundleIds' in body).toBe(false)
    expect(body).toEqual({ messages: [{ role: 'user', content: 'hi' }] })
  })

  it('工具回合把 tool 一并放进 body', () => {
    expect(
      buildChatRequestBody({ content: 'hi', tool: 'course_planning' })
    ).toEqual({
      tool: 'course_planning',
      messages: [{ role: 'user', content: 'hi' }],
    })
  })
})
