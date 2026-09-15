// Learning Brief 的结构断言（SSR，不需要浏览器、不需要后端）。
//
// 用法：node scripts/ssr-check-brief.mjs
//
// 校验的是「规则」而不是「像素」：
//   1. 厚态六段都渲染；
//   2. 薄态不渲染任何凭空的能力判断（宁可短，不可编）；
//   3. 任何一态都不出现量化痕迹（progress / 百分比 / 分数）——
//      types.ts 里没有数值字段，这里是第二道闸；
//   4. 未启用（undefined）时整块不渲染。

// —— 浏览器 API 垫片：@/i18n 在模块顶层摸 document / localStorage ——
const store = new Map([['lemma-lang', 'zh']])
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => void store.set(key, value),
  removeItem: (key) => void store.delete(key),
}
globalThis.document = { documentElement: { lang: '' } }
globalThis.window = globalThis

const { createServer } = await import('vite')

// 交给 vite 自己发现 vite.config.ts（root 默认 cwd = frontend/）：
// 手动传 pathname 会被 URL 编码成 %20，rolldown 解析不了带空格的路径。
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let mod
try {
  mod = await server.ssrLoadModule('/scripts/ssr/brief-entry.tsx')
} catch (error) {
  await server.close()
  console.error('SSR 模块加载失败：', error)
  process.exit(1)
}

// i18n 的 init 是异步的；等 key 真能解析出来再渲染，否则断言会把 key 当文案。
for (let i = 0; i < 100 && !mod.translationsReady(); i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 20))
}
if (!mod.translationsReady()) {
  await server.close()
  console.error('语言包未就绪：workspace.briefTitle 仍返回 key')
  process.exit(1)
}

const failures = []

function check(name, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${name}`)
  } else {
    failures.push(name)
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const SECTION_TITLES = [
  '你正在做',
  '你已经具备',
  '正在形成',
  '目前的主要障碍',
  '接下来',
]

const LEARNING_BRIEF_STEP_TITLES = [
  '第 3 讲 · 正交投影',
  '练一练：特征向量方向判断',
  '聊一聊：投影公式里为什么会出现转置',
]

// 禁止量化：progress 元素查原始 DOM；百分比 / 分数只查**可见文本** ——
// 否则 Tailwind 的 `border-zinc-200/80` 这类类名会被误判成评分。
const QUANT_PATTERNS = [
  [/\d+(?:\.\d+)?\s*%/, '百分比'],
  [/\d+\s*\/\s*\d+/, 'n/m 分数'],
  [/\b\d+\s*(?:分|points?)\b/i, '分数'],
]

// 计划 §3.2 的禁用词表：系统概念不得漏到用户面前。中英各一份 ——
// 提示词写的是英文版，界面是中文，两边都得拦。
const FORBIDDEN_WORDS = [
  [/\b(?:tension|score|mastery|gap)\b/i, '系统词（英）'],
  [/(?:掌握度|得分|评分|能力值|张力|缺口|等级)/, '系统词（中）'],
]

// 计划 §3.4：不得出现雷达图容器之类的可视化控件。
const FORBIDDEN_SHAPES = [
  [/<progress/i, '<progress> 元素'],
  [/<canvas/i, '<canvas> 雷达图容器'],
  [/<meter/i, '<meter> 元素'],
]

function visibleText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ')
}

console.log('\n[1] 厚态（证据充足）')
const thick = mod.renderVariant('thick')
check('渲染学习目标', thick.includes('把特征值和特征向量讲清楚'))
check('渲染全部判断段', SECTION_TITLES.every((title) => thick.includes(title)))
check('「接下来」的三步都渲染', LEARNING_BRIEF_STEP_TITLES.every((title) => thick.includes(title)))
check('生成时间以「更新于」呈现', thick.includes('更新于'))
check('不出现「系统推断」标注', !thick.includes('根据本空间的课程推断'))

console.log('\n[2] 推断态（目标由课程兜底）')
const inferred = mod.renderVariant('inferred')
check('标注「系统推断」', inferred.includes('根据本空间的课程推断'))
check('缺席的段落不渲染', !inferred.includes('正在形成') && !inferred.includes('目前的主要障碍'))

console.log('\n[3] 薄态（全新空间）')
const thin = mod.renderVariant('thin')
check('不凭空造能力判断', SECTION_TITLES.slice(0, 4).every((title) => !thin.includes(title)))
check('显示「还没设目标」', thin.includes('还没有设置学习目标'))
check('显示课程空态入口', thin.includes('这个空间还没有课程') && thin.includes('开一段对话'))
check('显示诚实边界说明', thin.includes('这个空间里的内容还很少'))

console.log('\n[4] 不量化 / 不出现系统词')
for (const [label, html] of [['厚态', thick], ['推断态', inferred], ['薄态', thin]]) {
  const text = visibleText(html)
  for (const [pattern, what] of [...QUANT_PATTERNS, ...FORBIDDEN_WORDS]) {
    const hit = text.match(pattern)?.[0] ?? ''
    check(`${label} 不出现${what}`, !hit, hit)
  }
  for (const [pattern, what] of FORBIDDEN_SHAPES) {
    check(`${label} 不出现 ${what}`, !pattern.test(html))
  }
}

console.log('\n[5] 未启用时不渲染')
const disabled = mod.renderPanel(undefined)
check('brief=undefined 整块不渲染', disabled === '')

console.log('\n[6] 读取中')
const loading = mod.renderPanel(null)
check('brief=null 出骨架而不是空面板', loading.includes('animate-pulse'))

console.log('\n[7] 结构与可访问性')
check(
  '根节点是有名字的 aside（不是裸 div）',
  /<aside[^>]*aria-label="学习简报"/.test(thick)
)
check(
  '「接下来」每一步都是真 button（步骤自带动作）',
  LEARNING_BRIEF_STEP_TITLES.every((title) => {
    const at = thick.indexOf(title)
    return at > -1 && thick.lastIndexOf('<button', at) > thick.lastIndexOf('</button>', at)
  })
)
check(
  '关闭按钮有 aria-label',
  /<button[^>]*aria-label="关闭学习简报"/.test(thick)
)
check(
  '没有刷新改用例时不渲染刷新按钮（不做假按钮）',
  !/<button[^>]*aria-label="重新生成"/.test(thick)
)

await server.close()

if (failures.length) {
  console.error(`\n${failures.length} 项断言失败：`)
  for (const name of failures) console.error(`  - ${name}`)
  process.exit(1)
}
console.log('\n全部断言通过。')
