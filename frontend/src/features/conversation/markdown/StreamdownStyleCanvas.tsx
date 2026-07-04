import { calloutThemes, type CalloutType } from '@/components/calloutTheme'

import { AssistantMarkdown } from './AssistantMarkdown'

// [sandbox] Callout 卡片端到端预览：用真实线上语法（```concept 等
// fence 字符串）经生产 AssistantMarkdown 管线渲染，验证语法与样式。

const calloutSamples: Record<CalloutType, string> = {
  concept: String.raw`**概念** 是对一个知识点的最小稳定定义：它回答“这个东西是什么”、它在什么条件下成立，以及它和相邻概念的边界在哪里。

理解一个概念时，先抓住三件事：

- 它描述的核心对象是什么？
- 它成立需要哪些前提条件？
- 它最容易和哪个概念混淆？`,
  keypoint: String.raw`**重点** 用来标出当前知识点里最值得优先记住的规则、公式或判断标准。

如果时间有限，先保留这条主线：

- 先记住结论，再补证明。
- 先掌握高频场景，再处理例外。
- 遇到题目时，优先判断它是否触发这个规则。`,
  pitfall: String.raw`**易错** 用来提醒那些看起来相似、但条件或结论不同的地方。

最常见的错误不是不会算，而是把两个概念的适用边界混在一起：

- 看到熟悉形式就直接套公式。
- 忽略定义域、前提条件或单位。
- 把“充分条件”误当成“充要条件”。`,
  application: String.raw`**应用** 用来说明这个知识点在真实题目或实际场景里怎么派上用场。

使用时可以按这个顺序思考：

1. 识别题目给出的对象。
2. 找到能直接调用的条件。
3. 把抽象概念转换成可计算、可比较或可判断的步骤。`,
  proof: String.raw`**证明** 用来展示一个结论为什么成立，而不只是告诉你结论本身。

阅读证明时，先看清楚它的三段结构：

1. 从哪些已知条件出发？
2. 中间用了哪些定义、定理或等价变形？
3. 最后一步如何回到要证明的结论？`,
  example: String.raw`**举例** 用来把抽象规则放进一个具体情境里，让你看到它是怎么被使用的。

一个好的例子通常会包含：

- 明确的输入条件。
- 一步一步的处理过程。
- 最后对结果做一次回扣，说明它对应了哪个概念或规则。`,
}

const calloutPreviews = (
  Object.entries(calloutSamples) as [CalloutType, string][]
).map(([type, body]) => ({
  type,
  title: `${calloutThemes[type].label}样式底板 · ${'```'}${type}`,
  markdown: `${'```'}${type}\n${body}\n${'```'}`,
}))

export function StreamdownStyleCanvas() {
  return (
    <section className="flex min-h-[520px] flex-col gap-6">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        streamdown · style canvas
      </span>
      {calloutPreviews.map((preview) => (
        <div key={preview.type} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-400">
            {preview.title}
          </span>
          <AssistantMarkdown>{preview.markdown}</AssistantMarkdown>
        </div>
      ))}
    </section>
  )
}
