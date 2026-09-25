import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import * as constructed from './constructed'
import * as docSamples from './docSamples'
import type { QuestionFixture } from './types'

// 把手写 fixture 导出为后端解析器 / 判分器的测试期望（方案 §10.1）。
// 只在 EXPORT_QUESTION_FIXTURES=1 时写盘，平时 `vitest run` 跳过：
//   EXPORT_QUESTION_FIXTURES=1 npx vitest run src/mock/question/exportFixtures.test.ts

const here = dirname(fileURLToPath(import.meta.url))
const backendFixtures = join(here, '../../../../backend/tests/qbank/fixtures')
const enabled = process.env.EXPORT_QUESTION_FIXTURES === '1'

/** docSamples.ts 每个导出上方的「原始 HTML：raw/xxx.html」注释 → 导出名到 raw 文件名。 */
function rawFileByExport(): Map<string, string> {
  const source = readFileSync(join(here, 'docSamples.ts'), 'utf8')
  const mapping = new Map<string, string>()
  for (const match of source.matchAll(/原始 HTML：raw\/([\w.-]+\.html)[^\n]*\nexport const (\w+)/g)) {
    mapping.set(match[2], match[1])
  }
  return mapping
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

describe.runIf(enabled)('export question fixtures to backend', () => {
  it('writes expected/*.json, constructed/*.json and raw/*.html', () => {
    const rawByExport = rawFileByExport()
    for (const dir of ['expected', 'constructed', 'raw']) {
      mkdirSync(join(backendFixtures, dir), { recursive: true })
    }

    for (const [name, fixture] of Object.entries(docSamples as Record<string, QuestionFixture>)) {
      const rawFile = rawByExport.get(name) ?? null
      writeJson(join(backendFixtures, 'expected', `${name}.json`), { name, rawFile, ...fixture })
    }
    for (const [name, value] of Object.entries(constructed)) {
      const fixture = value as QuestionFixture
      if (!fixture || typeof fixture !== 'object' || !('view' in fixture)) continue
      writeJson(join(backendFixtures, 'constructed', `${name}.json`), { name, ...fixture })
    }
    for (const file of readdirSync(join(here, 'raw'))) {
      if (file.endsWith('.html')) copyFileSync(join(here, 'raw', file), join(backendFixtures, 'raw', file))
    }

    expect(rawByExport.size).toBeGreaterThan(0)
  })
})
