// 导入流程的断言（SSR + 纯函数，不需要浏览器、不需要后端）。
//
// 用法：node scripts/ssr-check-import.mjs
//
// 重点不在「界面上有什么字」，而在四条会悄悄错掉的规则：
//   1. 勾文件夹要连带子孙（漏了 → 用户以为导了整个文件夹，实际只导了壳）
//   2. 只勾一部分时必须是**可见的半选**（漏了 → 「里面选了一部分」在界面上丢失）
//   3. 计数只算显式勾中的（多算 → 数量对不上，用户会怀疑整个流程）
//   4. 搜索命中文件夹要保留整棵子树（剪掉 → 搜到了却挑不了里面）

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
let treeUtils
try {
  mod = await server.ssrLoadModule('/scripts/ssr/import-entry.tsx')
  // 纯逻辑单独加载：不从渲染入口 `export *` 转出来 —— 那会让
  // react-refresh/only-export-components 报错（它无法核实 `export *` 的内容）。
  treeUtils = await server.ssrLoadModule('/src/features/docs/import/treeUtils.ts')
} catch (error) {
  await server.close()
  console.error('SSR 模块加载失败：', error)
  process.exit(1)
}

for (let i = 0; i < 100 && !mod.translationsReady(); i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 20))
}
if (!mod.translationsReady()) {
  await server.close()
  console.error('语言包未就绪：import.title 仍返回 key')
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
const countOf = (haystack, needle) => haystack.split(needle).length - 1

const tree = mod.treeForSource('obsidian')
const NOTION = mod.treeForSource('notion')
const {
  nodeIds,
  collectIds,
  checkState,
  expandSelection,
  countSelection,
  filterTree,
  selectAll,
} = treeUtils

// vault 根 → 数学 → 习题（3 个文件）；数学 下另有 3 个文件
const root = tree[0]
const math = root.children.find((n) => n.name === '数学')
const exercises = math.children.find((n) => n.name === '习题')

console.log('\n[1] 勾选级联')
const empty = new Set()
check('勾文件夹连带全部子孙', expandSelection(empty, root, true).size === nodeIds(root).length)
const onlyExercises = expandSelection(empty, exercises, true)
check(
  '只勾子文件夹只动它自己那支',
  onlyExercises.size === nodeIds(exercises).length &&
    onlyExercises.size < nodeIds(root).length
)
check(
  '取消勾选会连子孙一起摘掉',
  expandSelection(onlyExercises, exercises, false).size === 0
)

console.log('\n[2] 三态（半选必须看得见）')
check('一个都没勾 → unchecked', checkState(empty, math) === 'unchecked')
check('全勾 → checked', checkState(expandSelection(empty, math, true), math) === 'checked')
check(
  '只勾一个子孙 → indeterminate',
  checkState(onlyExercises, math) === 'indeterminate'
)
check(
  '半选不是 checked（否则用户以为整支都进去了）',
  checkState(onlyExercises, math) !== 'checked'
)

console.log('\n[3] 计数只算显式勾中的')
const partial = new Set([exercises.children[0].id])
const partialCount = countSelection(partial, tree)
check('只勾 1 个文件 → files=1', partialCount.files === 1)
check('祖先不因「有子孙被选」被自动算上 → folders=0', partialCount.folders === 0)
check(
  '全选 → 等于树里全部节点数',
  countSelection(selectAll(tree), tree).files + countSelection(selectAll(tree), tree).folders ===
    nodeIds(root).length
)

console.log('\n[4] 搜索过滤')
const hit = filterTree(tree, '数学')
check('命中文件夹时保留该节点的整棵子树', JSON.stringify(hit[0].children) === JSON.stringify([math]))
check('未命中的兄弟分支被剪掉', hit[0].children.length === 1)
const hitFile = filterTree(tree, '正交投影')
check(
  '只在子孙里命中时保留路径骨架',
  hitFile.length === 1 && hitFile[0].children.length === 1
)
check(
  '骨架节点自身不是命中项，子树只剩命中的那支',
  hitFile[0].children[0].children.length === 1
)
check('搜不到 → 空数组（界面走空态）', filterTree(tree, 'zzz-not-exist').length === 0)

console.log('\n[5] 第 1 步：来源（官方 logo）')
const sourceStep = mod.renderSourceStep(null)
check('Obsidian 用官方 logo', sourceStep.includes('src="/icons/obsidian.svg"'))
check('Notion 用官方 logo', sourceStep.includes('src="/icons/notion.svg"'))
check('Notion 行标了「需授权」', sourceStep.includes('需授权'))
check('「本地文件夹」没有品牌方 → 不硬塞 logo', countOf(sourceStep, '<img') === 2)
check('来源是 radiogroup（不是一堆裸按钮）', sourceStep.includes('role="radiogroup"'))
const sourceSelected = mod.renderSourceStep('obsidian')
check('选中态回写到 aria-checked', sourceSelected.includes('aria-checked="true"'))

console.log('\n[6] 第 2 步：目录树')
const treeStep = mod.renderTreeStep(tree, [])
check('渲染为 role=tree', treeStep.includes('role="tree"'))
check('节点是 role=treeitem', treeStep.includes('role="treeitem"'))
check('有搜索框', treeStep.includes('搜索文件或文件夹'))
check('有全选 / 取消全选', treeStep.includes('全选') && treeStep.includes('取消全选'))
check('未勾任何东西时没有半选', !treeStep.includes('aria-checked="mixed"'))
const treePartial = mod.renderTreeStep(tree, [exercises.children[0].id])
check('有半选时输出 aria-checked="mixed"', treePartial.includes('aria-checked="mixed"'))
// 默认只展开根一层，所以 习题 的那一行**不渲染**（数学 是收起的），
// 能显示半选的只有「根 + 数学」这 2 个已渲染的祖先。
// 这条断言写的是「渲染出来的半选数量」，不是「理论祖先数量」—— 别把两件事混起来。
check(
  '半选只出现在已渲染的祖先链上（根 + 数学）',
  countOf(treePartial, 'aria-checked="mixed"') === 2,
  String(countOf(treePartial, 'aria-checked="mixed"'))
)
const treeAll = mod.renderTreeStep(tree, nodeIds(root))
check('全选后没有半选', !treeAll.includes('aria-checked="mixed"'))
const treeFiltered = mod.renderTreeStep(tree, [])
check('初始只展开根一层（深层节点未渲染）', !treeFiltered.includes('第一周 · 行列式.md'))

console.log('\n[7] 第 3 步：落点')
const destStep = mod.renderDestinationStep('preview')
check('空间是单选 radiogroup', destStep.includes('role="radiogroup"'))
check('默认落点被选中', destStep.includes('aria-checked="true"'))
check('只有一个选中项', countOf(destStep, 'aria-checked="true"') === 1)
check('说明导入产物是「资料」板块', destStep.includes('资料'))
const destNone = mod.renderDestinationStep(null)
check('未选落点时没有选中项', !destNone.includes('aria-checked="true"'))

console.log('\n[8] 第 4 步：结果')
const resultStep = mod.renderResultStep('obsidian', 8, 3, 'preview')
check('回显来源', resultStep.includes('Obsidian'))
check('回显数量', resultStep.includes('8') && resultStep.includes('3'))
check('回显落点', resultStep.includes('线性代数 · 第 12 讲'))
check('内部链接写成规则（将来时），不谎报「已解析」', resultStep.includes('会指向'))
check('结果页用的还是官方 logo', resultStep.includes('src="/icons/obsidian.svg"'))

console.log('\n[9] 三棵来源树形状不同（只用一棵树测不出夹层）')
const maxDepth = (nodes) =>
  nodes.length === 0 ? 0 : 1 + Math.max(...nodes.map((n) => maxDepth(n.children ?? [])))
check('obsidian 有 4 层（根 → 数学 → 习题 → 文件）', maxDepth(tree) === 4, String(maxDepth(tree)))
// 注意：nodeIds() 收的是**单个节点**，collectIds() 收的是节点数组。
// 混用会静默返回 1（数组自己没有 children），这条断言第一版就是这么假通过的。
check('obsidian 节点数 16', collectIds(tree).length === 16, String(collectIds(tree).length))
check('folder 树只有 2 层（形状确实不同）', maxDepth(mod.treeForSource('folder')) === 3)
check('notion 根层是页面，id 不是路径', NOTION[0].id === '8f2a-product-wiki')
check('两条来源树不共用同一份数据', tree !== NOTION)

await server.close()

if (failures.length) {
  console.error(`\n${failures.length} 项断言失败：`)
  for (const name of failures) console.error(`  - ${name}`)
  process.exit(1)
}
console.log('\n全部断言通过。')
