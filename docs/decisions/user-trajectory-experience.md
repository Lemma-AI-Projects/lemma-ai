# User Trajectory · 体验设计决策日志

> 分支 `user-trajectory` · 2026-11-03 · 状态：决策记录（Conf/Prov/Open 混排，逐条标注）·
> 上游：`design/user-trajectory-positioning.md` · `research/user-trajectory-discovery-exploration.md` ·
> `design/trajectory.md` · `design/adaptive-insight.md` · `architecture/evidence-flow.md` §10

本文只做一件事：**把"已经定了"和"还没定"分开**，并且给每条已确认的决策写一个推翻条件。
没有推翻条件的，是偏好，不是决策。

## 0 · 状态词

| 本文 | 等同 `docs/README.md` | 意思 |
|---|---|---|
| **Conf** | Accepted | 按它做事，别在路过时重新讨论 |
| **Prov** | Provisional | 当前倾向，别在它上面签合同 |
| **Open** | Open | 真的没定，**不许在实现里悄悄解决** |

---

## 1 · Confirmed

| # | 决策 | 依据 | 什么能推翻它 |
|---|---|---|---|
| **C-1** | User Trajectory 是 **Global User Development Layer**，同时是 Information Layer 与集中入口 | `positioning.md` §1.1 | 出现证据表明"贯穿其他体验"这件事做不到（例如跨 Space 聚合始终无规则），则降级为"单 Space 的发展视图" |
| **C-2** | 它**不是**孤立的个人分析 Dashboard；判据是"删掉这个页面，Focus Mode 与 Learn Space 仍应受益" | §1.2 | 如果删除后其他体验毫无损失，说明它本来就是 Dashboard |
| **C-3** | 首要体验是 **Self-discovery**；用户来发现自己还没注意到的，不是核对已知 | §2 | 用户研究显示真实使用是"查自己做了多少"，且用户明确希望是盘点 |
| **C-4** | Self-discovery 由三个方向构成：Unexpected Connections / Emerging Patterns / Unexplored Possibilities | §2.1 | 三者中任意一个无法被验证（点不开依据），或用户无法区分 |
| **C-5** | **Unexplored Possibilities 是提议，不是对用户的判断**；必须带依据、必须标为提议、必须可拒绝 | §2.3 | —（与 `adaptive-insight.md` §3 同一条红线，不建议推翻） |
| **C-6** | 不把 Self-discovery 做成"AI 自动生成个人总结" | §2.2 | — |
| **C-7** | 保留四个视角：Overview / Timeline / Explore / Insights，各自核心问题如 §4 | §4 | 原型验证显示用户无法区分其中两个 |
| **C-8** | 四个视角**不是四套数据集**，是同一个 Information Space 的四种观察方式；不机械实现为四个互不关联的 Dashboard | §4.1 | — |
| **C-9** | Shared Exploration Context：Selected Object / Selected Event 共享；Time Range 有条件共享；Filters 只共享语义兼容的 | §5.1 | 上下文共享导致用户困惑（例如切换后看到"被莫名其妙过滤过"的结果） |
| **C-10** | Explore 的 `Object Type = Projects` **不传播**到 Timeline | §5.2 | — |
| **C-11** | Insights 不是独立 AI Summary 页；一条 Insight 必须能挂六样：支撑证据 / 相关对象 / 相关事件 / **矛盾证据** / 出处 / 用户反馈 | §7.2 | — |
| **C-12** | 区分四态：Observed Fact / System Interpretation / Hypothesis / User-confirmed Understanding | §7.3 | 用户看不出四种的差别，且这一区分不影响任何行为 |
| **C-13** | Insight 可以出现在探索过程中，不必只通过 Insights 页进入 | §7.4 | — |
| **C-14** | 可信度六原则：Evidence-based / Traceable / Distinguish facts from interpretations / Explicit uncertainty / User-correctable / User-controlled | §3 | — |

**C-5、C-6、C-8、C-10、C-11、C-13、C-14 没有推翻条件。** 它们不是偏好，是与其他文档共用的红线；
要改需要先改上游（`adaptive-insight.md` / `evidence-flow.md`）。

---

## 2 · Provisional

| # | 倾向 | 现在为什么是这个 | 什么会让它变 |
|---|---|---|---|
| **P-1** | **Overview 变成 Discovery Surface**，首屏回答"此刻有什么值得发现" | 与 Self-discovery 一致；旧的三段（Now / Recent Developments / Recent Insights）偏盘点 | 供给源建不起来（见 X-1）⇒ 只能退回"最近变化 + 待确认解释" |
| **P-2** | 旧三段**保留但降为背景**，不再平级并列 | 不删结构，只改权重 | 原型显示用户根本不会往下看 ⇒ 可以真的删 |
| **P-3** | 三种发现内容**是候选，不是三张固定卡片** | 数量、顺序、能否并存都无依据 | V3 验证显示用户分不清三类 ⇒ 只留一类 |
| **P-4** | 主动呈现 vs 主动探索的判别："能不能一句话说清且可证伪" | 作为设计时的自检工具 | 出现反例（一句话说清但用户不想看） |
| **P-5** | **Focus 是 Selected Object，不是 filter** | 线索有 id、有起止，是发展对象 | 用户把它当"分类标签"用 ⇒ 说明它被理解成 filter |
| **P-6** | Context continuity：Breadcrumb + Selection Highlight 作基础；Context Bar 按需；Inspector 按需展开 | 三者都未验证；先给最便宜的一个定为基础 | V1 显示用户不跨视角 ⇒ 全部砍掉 |
| **P-7** | **Living Map 可能就是 `design/trajectory.md` §3 那张"纵向时间 × 横向 focus"的图** | 两者都表达"时间 + 结构" | 原型显示两者需要的交互不兼容（例如 Map 需要自由布局） |
| **P-8** | 三个候选的形态倾向 **K1 画布为主 / Cards 作入口 / Trails 作路径** | 是三者重叠分析的结果，不是验证结果 | 见 X-4；任何一个 K 的验证失败 |

---

## 3 · Open

不假装有答案。每条写清"卡在哪"。

| # | 问题 | 卡在哪 | 谁能解 |
|---|---|---|---|
| **O-1** | Discovery 的内容从哪来？ | 三种发现今天**都没有供给源**（X-1）。结构查询只能给最浅一层 | 需要一次供给方案决策 |
| **O-2** | "Global" 与"按 Space 投影"之间怎么聚合？ | 今天 `trajectory_service` 按 space 拼装；跨 Space 无身份、无规则 | 产品 + 架构 |
| **O-3** | 第四个视角叫 **Overview** 还是 **Development**？ | 两份文档用了不同名字（X-3） | 一次命名决策 |
| **O-4** | 首页在"没有发现"时显示什么？ | 空态是产品问题，不是排版问题 | 低保真 V2 |
| **O-5** | 首页放几条？要不要衰减？能不能钉住？同一处连接会不会重复出现？ | 无依据 | 低保真 V2 |
| **O-6** | 共享上下文值不值得做？ | 取决于用户是否真的跨视角（V1） | 低保真 V1 |
| **O-7** | Unexplored Possibility 与 Hypothesis 是不是同一个东西？ | 都是"未验证的提议"；差别在"关于他"还是"关于可以做什么" | 语义决策（与 taxonomy §2.4 有关） |
| **O-8** | 一张图在 8 条 focus、密集时段下是否成立？ | `design/trajectory.md` §6.4 自己承认这个数字是拍的 | 低保真 V4 |
| **O-9** | 三个候选机制最终怎么组合？ | 见 `discovery-exploration.md` §4，三个 K 都没验证 | 低保真 V5 之后 |
| **O-10** | 跨 Space 的 Insight 归属谁？ | Insight 目前是 `space_insights`（计划中），而 Self-discovery 是 user-level 的 | 架构 |

---

## 4 · Superseded

本轮没有。若将来某条 Conf 被推翻，**原文保留 + 加一行指向新决策**，不删。

---

## 5 · 冲突登记（未解决，不要默默覆盖）

这些是**两份文档说的不一样**，不是"谁写错了"。每条都给了建议，建议本身也是 Prov 或 Open。

### X-1 · Discovery 体验 vs 观察引擎的范围（最严重）

| 一边 | 另一边 |
|---|---|
| `positioning.md` §2/§6：核心体验是 Self-discovery，首页要呈现 connection / pattern / possibility | `adaptive-insight.md` §7「明确不做」：**"全面的跨学科认知模式识别"**；V1 只生成一种观察（help_dependence），门槛 ≥2 行跨 ≥2 日期 |

**影响**：Discovery Surface 今天**没有任何供给源**。硬做，只剩"用模型现编"这一条路，而那条路违反 §4.5。

**建议**：先把 Discovery 的内容限定为**结构查询**（同一材料跨两段经历 / 一条线索跨两个项目 / 被后续证据削弱的解释），
标为"弱发现"；把"生成型发现"明确排除在 V1 之外。**不要**为了首页好看去扩 insight 引擎。
→ Prov，待供给方案决策。

### X-2 · Global Layer vs 按 Space 投影

| 一边 | 另一边 |
|---|---|
| C-1：贯穿 Lemma AI 的用户发展层 | `evidence-flow.md` §10：Trajectory 是既有语义来源的投影；`trajectory_service` 按 space 拼装九张表 |

**影响**：C-1 承诺的是 user-level，实现是 space-level。"用户在两个 Space 里的两条线其实是同一条"这件事今天无法表达。

**建议**：明确两层——**per-space 投影（今天有）+ user-level 汇总（今天无规则）**；
在汇总规则落地之前，所有 UI 文案不得承诺跨 Space 的连续性。
→ Open（O-2）。

### X-3 · 第四个视角：Overview 还是 Development

| 一边 | 另一边 |
|---|---|
| `positioning.md` §4：Overview = "What is happening in my development?" | `taxonomy/information-architecture-mapping.md` §3：第四个视角叫 **Development** = "我现在在哪"，且规定"Development 里没有 Activity" |

**影响**：两份文档的第四列不能同时当规格用。

**建议**：**保留 Development 的内容分析，改名为 Overview**；
"我现在在哪"成为 Overview 的一个区域（今天的锚点），而不是独立视角。
`taxonomy` 那份文档已加冲突提示，**正文未改**。
→ Open（O-3），倾向已明确。

### X-4 · Overview 是首页，还是要被砍掉

| 一边 | 另一边 |
|---|---|
| `positioning.md` §6：Overview 成为 Discovery Surface，是入口 | `design/trajectory.md` §4「砍掉」：「现在那个三栏并排的 Overview（它和大图会重复）⇒ 折成画布上的一行刻度」 |

**影响**：一个说"它是正门"，一个说"它应该消失"。

**建议**：两者可以同时成立——**Overview 不是独立页面，是同一张画布的一个相机位置**：
镜头在"今天"，周围浮着 1–3 个发现锚点；往下拖就是 Timeline。
这样既满足 P-1，又不违反 `trajectory.md` §4 的"不要和大图重复"。
→ Prov（P-1 + P-7 的组合），需要原型验证。

### X-5 · "Unexplored Possibility" vs 不许编造

| 一边 | 另一边 |
|---|---|
| `positioning.md` §2.3：可以提议用户没试过的方向 | `adaptive-insight.md` §3：不许推断稳定人格/学习类型；不许把单次行为当稳定特征 |

**影响**：两者的边界很窄——**提议一个方向**和**断言一个人适合什么**只差一个动词。

**建议**：把 Unexplored Possibility 定义成**关于"对象之间"的提议**（"这两个项目可能在问同一件事，你要不要看看"），
**不是关于"人"的断言**（"你适合做交叉研究"）。前者可证伪，后者不能。
→ Conf（C-5）已含此意，但**判定标准需要写进文案规范**，目前没有。

### X-6 · Insights 需要"矛盾证据"，但生产环境没有关系表

| 一边 | 另一边 |
|---|---|
| C-11：一条 Insight 必须能挂矛盾证据 | 生产环境 `knowledge_evidence` 没有正负关系表；`evidence_relations` 只存在于合成数据 |

**影响**：Insights 视角的核心要求（第 4 项）今天无法实现。

**建议**：这是**前置依赖**，不是 UI 问题。在关系表落地之前，Insights 视角只能显示"支撑证据"，
并且**必须明说"目前只显示支持它的记录"**——不能假装已经能表达矛盾。
→ Open（架构）。

### X-7 · 供给节奏：发现是每天的还是每月的

| 一边 | 另一边 |
|---|---|
| Discovery Surface 的形态暗示"每次打开都有新东西" | `adaptive-insight.md` §4.5「不生成是一等结果」+ 合成数据集里 10 个月只有 8 条系统观察 |

**影响**：如果把"每次都有"当默认，产品会在第 3 天开始编。

**建议**：把"发现"的默认节奏定为**低频**（有则显示，没有就显示最近变化），
并在文案上接受"这一周没什么要说的"。
→ Prov（P-1 的一部分）。

---

## 6 · 一句话总结这份日志

**已经确认的是"它是什么"和"它不能是什么"；没有确认的是"首页放什么"和"内容从哪来"。**
后者是下一阶段原型的全部任务。
