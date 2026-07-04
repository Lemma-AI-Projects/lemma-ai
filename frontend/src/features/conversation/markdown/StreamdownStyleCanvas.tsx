import {
  MousePointerClick,
  Puzzle,
  Route,
  Target,
  Telescope,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

import { AssistantMarkdown } from './AssistantMarkdown'

interface ThemeBlock {
  title: string
  label: string
  icon: LucideIcon
  color: string
  content: string
}

const themeBlocks: ThemeBlock[] = [
  {
    title: '概念样式底板',
    label: '概念',
    icon: Telescope,
    color: '#0047BB',
    content: String.raw`**概念** 是对一个知识点的最小稳定定义：它回答“这个东西是什么”、它在什么条件下成立，以及它和相邻概念的边界在哪里。

理解一个概念时，先抓住三件事：

- 它描述的核心对象是什么？
- 它成立需要哪些前提条件？
- 它最容易和哪个概念混淆？`,
  },
  {
    title: '重点样式底板',
    label: '重点',
    icon: Target,
    color: '#7A5A00',
    content: String.raw`**重点** 用来标出当前知识点里最值得优先记住的规则、公式或判断标准。

如果时间有限，先保留这条主线：

- 先记住结论，再补证明。
- 先掌握高频场景，再处理例外。
- 遇到题目时，优先判断它是否触发这个规则。`,
  },
  {
    title: '易错样式底板',
    label: '易错',
    icon: TriangleAlert,
    color: '#A34A35',
    content: String.raw`**易错** 用来提醒那些看起来相似、但条件或结论不同的地方。

最常见的错误不是不会算，而是把两个概念的适用边界混在一起：

- 看到熟悉形式就直接套公式。
- 忽略定义域、前提条件或单位。
- 把“充分条件”误当成“充要条件”。`,
  },
  {
    title: '应用样式底板',
    label: '应用',
    icon: MousePointerClick,
    color: '#2F6F5E',
    content: String.raw`**应用** 用来说明这个知识点在真实题目或实际场景里怎么派上用场。

使用时可以按这个顺序思考：

1. 识别题目给出的对象。
2. 找到能直接调用的条件。
3. 把抽象概念转换成可计算、可比较或可判断的步骤。`,
  },
  {
    title: '证明样式底板',
    label: '证明',
    icon: Route,
    color: '#62558A',
    content: String.raw`**证明** 用来展示一个结论为什么成立，而不只是告诉你结论本身。

阅读证明时，先看清楚它的三段结构：

1. 从哪些已知条件出发？
2. 中间用了哪些定义、定理或等价变形？
3. 最后一步如何回到要证明的结论？`,
  },
  {
    title: '举例样式底板',
    label: '举例',
    icon: Puzzle,
    color: '#2D728F',
    content: String.raw`**举例** 用来把抽象规则放进一个具体情境里，让你看到它是怎么被使用的。

一个好的例子通常会包含：

- 明确的输入条件。
- 一步一步的处理过程。
- 最后对结果做一次回扣，说明它对应了哪个概念或规则。`,
  },
]

function StreamdownThemeBlock({ block }: { block: ThemeBlock }) {
  const Icon = block.icon

  return (
    <div
      aria-label={block.title}
      className="relative min-h-[220px] rounded-[16px] bg-zinc-100"
    >
      <span
        className="absolute left-[15px] top-[15px] h-[22px] w-[2.5px] rounded-full"
        style={{ backgroundColor: block.color }}
      />
      <Icon
        className="absolute left-[30px] top-[16px] size-[20px]"
        style={{ color: block.color }}
      />
      <span
        className="absolute left-[54.5px] top-[14px] text-[16px] font-medium leading-6"
        style={{ color: block.color }}
      >
        {block.label}
      </span>
      <div className="px-[30px] pb-8 pt-[58px]">
        <AssistantMarkdown className="max-w-none text-[15px] leading-7 text-zinc-800">
          {block.content}
        </AssistantMarkdown>
      </div>
    </div>
  )
}

export function StreamdownStyleCanvas() {
  return (
    <section className="flex min-h-[520px] flex-col gap-6">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        streamdown · style canvas
      </span>
      {themeBlocks.map((block) => (
        <StreamdownThemeBlock key={block.label} block={block} />
      ))}
    </section>
  )
}
