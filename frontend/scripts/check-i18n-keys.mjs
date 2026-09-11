// en / zh 语言包 key 对齐校验：缺失或多余都以非零退出（可挂 CI）。
// 用法：node scripts/check-i18n-keys.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function flatten(value, prefix = '') {
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (item && typeof item === 'object') {
      Object.assign(out, flatten(item, path))
    } else {
      out[path] = item
    }
  }
  return out
}

const en = flatten(JSON.parse(readFileSync(join(root, 'src/i18n/locales/en.json'), 'utf8')))
const zh = flatten(JSON.parse(readFileSync(join(root, 'src/i18n/locales/zh.json'), 'utf8')))

const enKeys = Object.keys(en).sort()
const zhKeys = Object.keys(zh).sort()
const missingInZh = enKeys.filter((key) => !(key in zh))
const missingInEn = zhKeys.filter((key) => !(key in en))

if (missingInZh.length || missingInEn.length) {
  if (missingInZh.length) {
    console.error('zh.json 缺少：')
    for (const key of missingInZh) console.error(`  - ${key}`)
  }
  if (missingInEn.length) {
    console.error('en.json 缺少：')
    for (const key of missingInEn) console.error(`  - ${key}`)
  }
  process.exit(1)
}

console.log(`i18n keys aligned: ${enKeys.length} keys`)
