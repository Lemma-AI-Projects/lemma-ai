# User Trajectory · 产品定位与信息架构

> 分支 `user-trajectory` · 2026-11-03 · 状态：**产品与交互设计（约定为主，含未定）** ·
> 上游：`architecture/evidence-flow.md` §10 · `architecture/trajectory-inputs.md` · `design/adaptive-insight.md` ·
> `design/trajectory.md`（交互形态）· `research/user-trajectory-lab/taxonomy/`（语义分类）

本文回答三件事：**它是什么、用户为什么会打开它、四个视角怎么共享同一份信息。**
不回答：后台怎么实现、页面长什么样、下一版做哪一步（后者在 `design/trajectory.md`）。

## 0 · 状态词（全文只允许这三种）

| 状态 | 意思 | 谁能改 |
|---|---|---|
| **[Confirmed]** | 已确认，按它做事 | 一条新的、有日期的决策 |
| **[Provisional]** | 当前倾向，仍可调整，别在它上面签合同 | 证据，或一次原型验证 |
| **[Open]** | 真的没定，**不要在实现里悄悄解决** | 一条记录下来的发现 |

⚠️ 与 `decisions/` 的 Accepted / Provisional / Open 是同一套，只是把 Accepted 写作 Confirmed。

---

## 1 · 定位

### 1.1 它是 Lemma AI 的 Global User Development Layer **[Confirmed]**

两个角色，缺一不可：

| 角色 | 内容 | 如果只做这一个会怎样 |
|---|---|---|
| **Information Layer** | 贯穿 Lemma AI，为其他体验提供"这个人发展到了哪"的信息 | 变成一个孤立的分析页面，与学习本身无关 |
| **User Interface** | 一个集中入口，让用户查看、探索、理解自己的发展 | 用户永远不知道系统记住了什么 |

**推论（三条，都是这条定位的直接后果）：**

1. **Focus Mode 可以读到相关的 Insight 与历史 Evidence。** 不必跳进 Trajectory 页。
2. **Learn Space 里发生的学习活动可以关联回 Trajectory。** 关联是默认的，不是用户手动"归档"。
3. **Projects / Learning Experiences / Materials 本身就是发展信息的一部分。** 不需要为 Trajectory 再建一套平行对象。

⚠️ 这三条是**定位的推论，不是今天的实现状态**。今天：Trajectory 读的是九张内部表
（`evidence-flow.md` §10）；Insight 在生产代码里是零实体（`adaptive-insight.md` §1.2）。
写它们是用来判断"这个定位有没有被兑现"，不是用来描述现状。

### 1.2 它不是一个孤立的个人分析 Dashboard **[Confirmed]**

| 它像什么 | 它不像什么 |
|---|---|
| 一个贯穿产品的信息底座 + 一个查看它的入口 | 一个独立的"数据统计"页面 |
| 用户发现自己没注意到的东西 | 用户检查自己完成了多少任务 |
| 证据可以被点开、可以追溯到原始记录 | 一组不可追问的结论卡片 |

判据很简单：**把 Trajectory 页面整个删掉，Focus Mode 与 Learn Space 应该仍然受益于这套信息。**
做不到，说明做的其实是 Dashboard。

---

## 2 · 核心体验：Self-discovery **[Confirmed]**

> Users do not come to inspect what they already know about themselves.
> They come to discover what they have not yet noticed.

这是本轮最重要的定位调整。**用户打开它，不是为了核对已知，是为了发现自己还没注意到的。**

### 2.1 三个方向

| 方向 | 用户会说的话 | 它不是 |
|---|---|---|
| **Unexpected Connections** | "这两个东西居然是一回事" | 不是"相关推荐"：必须是**已经存在于他历史里的两个对象**之间的连接 |
| **Emerging Patterns** | "原来我一直在绕这个问题" | 不是"兴趣标签云"：必须有**时间上的形成过程**，不是一张快照 |
| **Unexplored Possibilities** | "这个我确实没想过" | 不是系统对他的判断：是**提问**，不是结论（见 §2.3） |

三类都必须是**可验证的**：点得开它依据的对象、事件或证据。点不开的"发现"，是编的。

### 2.2 反例：不要把它做成"AI 生成个人总结" **[Confirmed]**

一段 200 字的"你这半年成长了很多，你在工程与理论之间找到了平衡"，读起来像发现，实际上：

- 无法证伪，所以无法被质疑；
- 无法追溯，所以无法被修正；
- 每次都能生成，所以它不是"发现"，是"配文"。

`design/adaptive-insight.md` §4.5 已经定过：**"不生成"是一等结果。**
Self-discovery 不改变这条，它只是把"生成什么"从"总结这个人"改成"指出他可能没注意到的一处连接"。

### 2.3 Unexplored Possibilities 的边界 **[Confirmed]**

它是**探索建议**，不是**已确认的用户特征**。三条硬约束：

1. 必须带依据（哪两个项目、哪条反复出现的问题），并且依据可点开。
2. 必须显示为"提议/问题"，与"系统观察"在视觉与文案上不同（§7.3 的四态区分）。
3. 必须可拒绝，且拒绝会被记住——否则同一个建议每周回来一次。

⚠️ 它与 `adaptive-insight.md` §3 的"不许自动推断稳定人格或学习类型"是同一条红线的两个方向：
**可以提议一个方向，不可以断言一个人是什么样的人。**

### 2.4 与既有"四问"的关系 **[Confirmed]**

`evidence-flow.md` §10 要求每个节点答四问（发生了什么 / 什么变了 / 凭什么 / 这对接下来的意义）。
Self-discovery 不改四问，改的是**第四问在这个产品里的角色**：

| | 过去 | 现在 |
|---|---|---|
| 第四问 | 叙事的收尾（"所以这很重要"） | **发现的入口**（"所以还有一件事你没试过"） |

⇒ 第四问不能由模型自由发挥，它必须指向一个**具体的、可点开的对象**。

---

## 3 · 体验原则 **[Confirmed]**

| # | 原则 | 反面 |
|---|---|---|
| P1 | **先给发现，再给清单。** 打开时先回答"有什么值得看的"，而不是"你有多少条记录" | 首屏是统计与计数 |
| P2 | **每一条判断都能追到它引用的那几行。** 两级：判断 → 依据 → 原始记录 | 结论卡片不可点开 |
| P3 | **事实、解释、提议三者不共用一种样式。** 用户一眼能分出"系统看到的""系统认为的""系统建议的" | 三种都用同一种卡片 |
| P4 | **不确定要显形，不是藏起来。** 没有证据时要写"没有记录支撑"，不是留白 | 空状态被当成"没什么可说的" |
| P5 | **用户可以不同意，且不同意有后果。** 否决会改变后续的呈现，不是只写一条日志 | 有"反馈"按钮但没有行为差异 |

这五条不是新发明：P2 来自 `design/trajectory.md` §4（两级追溯）与 `adaptive-insight.md` §5 C-1，
P3 来自 `evidence-flow.md` §1.1，P4 来自 `trajectory.md` §4（无依据要显形），P5 来自 `adaptive-insight.md` §5 C-2。
本文只是把它们从"某一块的约束"提升为**整个产品的原则**。

---

## 4 · 四个视角 **[Confirmed]**

| 视角 | 核心问题 | 体验目标 |
|---|---|---|
| **Overview** | What is happening in my development? | Discover something unexpected |
| **Timeline** | What happened over time? | See how things unfolded |
| **Explore** | What makes up my development? | Follow connections |
| **Insights** | What can I understand from my history? | Understand emerging patterns |

### 4.1 三个约束 **[Confirmed]**

1. **四个视角不是四套独立数据集。** 它们是同一个 Information Space 的四种观察方式。
2. **不要机械实现成四个互不关联的 Dashboard 页面。**
3. **不要因为 Self-discovery 的定位就删掉原有视角。** 四个都留着，权重会变，结构不变。

### 4.2 每个视角"不做什么"

| 视角 | 明确不做 | 为什么 |
|---|---|---|
| Overview | 不做统计首页（条数、周活跃、完成率） | 那是 Dashboard，与本产品定位相反 |
| Timeline | 不画依赖/解锁关系 | `design/trajectory.md` §3：会编造用户没经历过的因果 |
| Explore | 不展示系统对用户的判断 | 它回答"我在做什么"，不回答"系统怎么看我" |
| Insights | 不展示活动流水 | 它回答"能从中理解什么"，流水是 Timeline 的事 |

### 4.3 与语义分类的对应

四个视角各自主要消费哪些范畴，见
`research/user-trajectory-lab/taxonomy/information-architecture-mapping.md` §6 的矩阵。
⚠️ 那份文档里的第四个视角叫 **Development**，与本文的 **Overview** 不一致 —— 冲突已登记在
`decisions/user-trajectory-experience.md` §5-3，**在解决之前不要引它的第四列当规格**。

---

## 5 · Shared Exploration Context **[Confirmed]**

> **One Information Space, Multiple Perspectives.**

### 5.1 共享规则

| Context | 规则 | 说明 |
|---|---|---|
| **Selected Object** | 跨视角共享 | 在 Explore 选中 `prj-07`，切到 Timeline 时它仍是被选中的那一个 |
| **Selected Event** | 跨视角共享 | 选中 `act-102`，Insights 里讨论它的那条解释应被高亮 |
| **Time Range** | **有条件**共享 | 只在两个视角都支持时间过滤时传播 |
| **Filters** | **只有语义兼容的才共享** | 见 §5.2 |
| **Inspector** | 尽量保留当前对象上下文 | 换视角时不清空，只换内容 |

### 5.2 反例（必须能区分）

Explore 里用户设了 `Object Type = Projects`。

**这个过滤不会让 Timeline 只显示 Project Events**，除非用户明确设了一个语义兼容的条件
（例如"只看与 prj-02 有关的事件"）。

```text
Object Type = Projects        ✗ 不传播（Explore 的结构性过滤）
Selected object = prj-02      ✓ 传播（选中的对象是同一件事）
Time range = 2026-06          ✓ 传播（两个视角都支持）
```

判别方法一句话：**"过滤的是这个视角的呈现方式" → 不传播；"过滤的是信息本身" → 传播。**

### 5.3 Focus 属于哪一类 **[Provisional]**

`focus`（线索）在 Timeline 里是横轴，在 Explore 里是主结构。
本文倾向：**它是 Selected Object 的一种，不是 filter。**

理由：线索是发展对象（`taxonomy-specification.md` §2.1 I-e），有 id、有起止、可被引用；
而"只看这条线索"是选中它之后的一个视图状态。
⇒ 选中 `foc-02` 后切到 Insights，应该看到讨论这条线索的解释，而不是"被过滤空的列表"。

### 5.4 Context continuity：三种机制的当前状态 **[Provisional]**

| 机制 | 当前倾向 | 状态 |
|---|---|---|
| **Breadcrumb + Selection Highlight** | 作为**基础**：任何跨视角跳转都留一条可回头的路径，且高亮不丢 | Provisional |
| **Context Bar** | **按需出现**：只在"同时带着 ≥2 个上下文"时出现（例如时间范围 + 选中对象） | Provisional |
| **Persistent Inspector** | **按需展开**：默认收着，点开才占位 | Provisional |

⚠️ **这三条都还是倾向，不是交互规格。** 谁把它们当规格写进实现，会在第一次可用性测试后返工。

### 5.5 一条尚未被验证的假设 **[Open]**

共享上下文的价值依赖一个前提：**用户真的会在四个视角之间来回走**。
如果真实行为是"打开 → 看首页 → 关掉"，那共享上下文是一套为不存在的路径做的工程。
→ 列为低保真第一个要验证的问题（见 `research/user-trajectory-discovery-exploration.md` §6）。

---

## 6 · Overview 重审

### 6.1 从 Current Landscape 到 Discovery Surface **[Confirmed]**

| | 旧方向 | 新方向 |
|---|---|---|
| 定位 | Current Landscape：现在是什么样 | **Discovery Surface**：现在有什么值得发现 |
| 首屏问题 | "我现在处在什么位置" | **"此刻，我的发展里有什么值得发现的"** |
| 主要动作 | 阅读 | 点开一处，然后往深处走 |

**方向是 Confirmed；它今天能不能被数据撑住，是 Open。**

⚠️ 供给源还没有（见 `decisions/user-trajectory-experience.md` X-1：观察引擎 V1 明确不做"跨学科认知模式识别"）。
在供给方案落地前，首页只能填"结构查询"级别的弱发现，或者空着。
**不许为了填满首页让模型现编。**

### 6.2 与原有三段的关系

| 原有 | 现在怎么处理 | 状态 |
|---|---|---|
| Now / Current Landscape | **保留，降为背景**：作为"今天的锚点"存在（一句话 + 一条时间刻度），不占首屏主体 | Provisional |
| Over Time / Recent Developments | **保留，但改成"进入 Timeline 的入口"**：给最近 3–5 天的一条横带，点进去是完整 Timeline | Provisional |
| Interpretation / Recent Insights | **保留，但必须是"待你确认的那一条"**，不是"最近生成的三条" | Provisional |

**不删除任何一段。** 三段都还在，只是它们不再平级并列——它们从"内容区"变成"底座"。

### 6.3 三种候选内容类型 **[Provisional，且只是候选]**

| 候选 | 对应 §2 的方向 | 它与旧三段的关系 |
|---|---|---|
| A connection you might have missed | Unexpected Connections | 新东西，旧三段里没有 |
| An emerging interest | Emerging Patterns | 与 "Recent Developments" 部分重叠——差别是**它要有形成过程**，不是"最近在看什么" |
| An unexplored possibility | Unexplored Possibilities | 新东西，旧三段里完全没有 |

⚠️ **这三条不是三个固定卡片。** 它们是"首页上可能出现的内容"，出现几条、什么顺序、
能不能同时出现两条同类的——都没定（`decisions/user-trajectory-experience.md` §3-2）。

### 6.4 主动呈现 vs 主动探索 **[Provisional]**

| 适合主动呈现 | 适合让用户自己探索 |
|---|---|
| 一处**具体的**连接，且两条边都在他历史里 | 任意两个对象之间"有没有关系" |
| 一个**已经形成**的模式（有 ≥3 个时间点） | 一个刚出现两周的方向 |
| 一条**明确的**未探索提议（带依据） | 开放式"我还该学什么" |
| 最近发生的、会影响他当下判断的变化 | 全量历史的浏览 |

判别方法：**主动呈现的东西必须能被一句话说清，且这句话可以被证伪。**
说不清、或证伪不了的，交给用户自己翻。

### 6.5 怎么避免变成 AI 生成内容的 Feed **[Confirmed 的四条约束]**

1. **有则显示，无则空。** 空状态是"这一次没什么要说的"，不是"正在为你生成"。
2. **不滚动加载。** 首页是一次性的，不是无限流。超过一屏的"发现"不是发现，是信息流。
3. **每条必须可点开依据。** 点不开的不许上首页。
4. **同一处连接不重复出现。** 用户看过/划过的，不应该下周原样回来（除非有新证据）。

### 6.6 尚未回答的问题 **[Open]**

- 如果这一周**真的没有任何**值得呈现的发现，首页显示什么？（空白？最近变化？直接进 Timeline？）
- 首页允许出现几条？一条和三条是两种产品。
- "发现"要不要有时间衰减？三个月前的连接还值不值得放在首页？
- 用户能不能"钉住"一条发现，让它不消失？

---

## 7 · Insights 重审

### 7.1 它不是一个独立的 AI Summary 页面 **[Confirmed]**

Insights 的职责是**让用户理解、检验、探索系统发现的模式**，不是"读一段总结"。

⇒ 一个 Insight 的价值不在它的句子，在**它连着什么、以及它可能错在哪**。

### 7.2 一个 Insight 必须能关联的六样 **[Confirmed]**

| # | 关联 | 缺了会怎样 |
|---|---|---|
| 1 | Supporting Evidence | 变成不可追问的断言 |
| 2 | Related Objects | 无法回答"这是在说哪件事" |
| 3 | Related Events | 无法回到当时 |
| 4 | **Contradicting Evidence** | 变成单选叙事（`ins-13` 那种错误就没有对手） |
| 5 | Provenance（谁说的、何时、依据什么规则） | 无法判断可信度 |
| 6 | User Feedback / Correction | 用户无法不同意 |

第 4 项是这轮补的，也是最容易被漏的一项。**只列支撑证据的 Insight，等于把系统判断包装成事实。**

### 7.3 四态区分 **[Confirmed]**

| 态 | 谁产生的 | 用户该有的反应 | 文案基调 |
|---|---|---|---|
| **Observed Fact** | 系统观察到（有原始记录） | "对，是这样" | 陈述 |
| **System Interpretation** | 系统推断（有依据，可能错） | "也许吧 / 不对" | 判断，带不确定性 |
| **Hypothesis** | 系统或用户提出，尚无足够依据 | "有可能" | 疑问，明确标"未验证" |
| **User-confirmed Understanding** | 用户认可过的解释 | "这就是我" | 第一人称或用户自己的话 |

⚠️ 四态不是四种子类型，是**同一条解释的四个阶段/来源状态**（见 `taxonomy-specification.md` §2.4）。
把它们做成四种卡片类型，会让"确认"变成一次换皮，而不是一次判断。

### 7.4 Insight 出现在探索过程中 **[Confirmed]**

不必只通过 Insights 页访问。三个应当出现的位置：

1. **Timeline 的节点展开时**——"这一条上有系统的一条判断"。
2. **Explore 选中某个对象时**——"关于这个对象，系统有一条解释"。
3. **Focus Mode 的相关上下文里**——这是 Information Layer 角色的直接体现（§1.1）。

### 7.5 与 `adaptive-insight.md` §5 的关系 **[Confirmed]**

那份文档的 C 约束（必须能展开证据 / 必须有质疑入口 / 没证据不许摆一条 / 不许因为卡片需要结构就发明层级）
**仍然全部有效**，本文不重复也不放宽。
本文只补一条它没写的：**Insights 视角要能容纳"互相矛盾的两条"同时存在**（§7.2 第 4 项）。

---

## 8 · 与既有文档的关系

| 文档 | 它管什么 | 本次是否改动 |
|---|---|---|
| `design/trajectory.md` | Timeline 的交互形态（拖动/缩放/布局/分步） | **只加指针与状态**，正文不动 |
| `design/adaptive-insight.md` | 一条观察怎么生成、什么不许做 | 不动 |
| `architecture/evidence-flow.md` | Event/Evidence/State 的语义边界 | 不动 |
| `architecture/trajectory-inputs.md` | 哪些信息能进轨迹、从哪来 | 不动 |
| `research/user-trajectory-lab/taxonomy/` | 五类语义范畴 | 不动；仅在 IA 文档里登记第四视角的命名冲突 |
| **本文** | 产品定位、体验原则、四视角、共享上下文、Overview/Insights 的重审 | 新增 |

⚠️ 本文**不重新定义**任何语义对象。凡与 `evidence-flow.md` §1 冲突之处，以那份为准。

---

## 9 · 未决（详见决策日志）

| # | 问题 | 状态 |
|---|---|---|
| Q1 | Discovery Surface 今天没有供给源（见 §6.1 与冲突登记） | Open |
| Q2 | "Global" 与"今天按 Space 投影"之间没有聚合规则 | Open |
| Q3 | 第四个视角叫 Overview 还是 Development | Open（冲突 X-3） |
| Q4 | 首页在"没有发现"时显示什么 | Open |
| Q5 | 三种发现内容的数量、顺序、去重规则 | Open |
| Q6 | 共享上下文是否值得做（取决于用户是否真的跨视角） | Open |
| Q7 | Unexplored Possibility 与 Hypothesis 是不是同一个东西 | Open |

→ 全部登记在 `decisions/user-trajectory-experience.md`。
