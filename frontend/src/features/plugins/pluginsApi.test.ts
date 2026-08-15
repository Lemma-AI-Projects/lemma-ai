/**
 * P4 插件 API 纯函数单测（URL 构建；安装/卸载路径）。
 */
import { describe, expect, it } from 'vitest'
import { buildInstallPluginPath } from './pluginsApi'

describe('P4 plugins API 路径构建', () => {
  it('安装/卸载：POST/DELETE /plugins/{id}/install', () => {
    expect(buildInstallPluginPath('math-solver')).toBe(
      '/api/v1/plugins/math-solver/install'
    )
  })

  it('插件 id 含特殊字符 → encodeURIComponent', () => {
    expect(buildInstallPluginPath('paper reader/2')).toBe(
      '/api/v1/plugins/paper%20reader%2F2/install'
    )
  })
})
