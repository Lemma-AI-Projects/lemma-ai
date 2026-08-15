/**
 * P5-A 建议生成纯函数单测（安装态 → 首页增补建议）。
 */
import { describe, expect, it } from 'vitest'
import { installedPluginSuggestions } from './pluginSuggestions'

describe('P5-A installedPluginSuggestions', () => {
  it('已安装数学插件 → 返回数学建议', () => {
    const out = installedPluginSuggestions(['math'])
    expect(out.length).toBe(1)
    expect(out[0].label).toContain('math')
  })

  it('general 不给建议（工具非学科）', () => {
    expect(installedPluginSuggestions(['general']).length).toBe(0)
  })

  it('同学科多个插件去重', () => {
    expect(installedPluginSuggestions(['math', 'math']).length).toBe(1)
  })

  it('未知学科跳过', () => {
    expect(installedPluginSuggestions(['unknown-subject']).length).toBe(0)
  })

  it('多学科全返回 + 顺序稳定', () => {
    const out = installedPluginSuggestions(['physics', 'math', 'chess'])
    expect(out.map((s) => s.label)).toEqual([
      expect.stringContaining('physics'),
      expect.stringContaining('math'),
      expect.stringContaining('chess'),
    ])
  })
})
