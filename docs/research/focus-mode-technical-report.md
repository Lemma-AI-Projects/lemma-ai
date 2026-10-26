# Lemma AI Focus Mode：交互机制、技术架构与实现路线调研报告

> 分支 `practice-system` · 2026-10-26 · 人类辅助作者：CeaserZhao · 研究与执笔：Lemma AI Agent
> 状态：技术调研报告 V1（2026-10-26 重构为四部分；Part III 为探索生长区，E1–E4 已分配进各线）

---

---

## 一页摘要

**结论先行**：Focus Mode 的技术路线应当是 **Hybrid Workspace 的两步走**——先以已验证的
Activity-Centric shell（Proposal B 原型）为骨架引入**结构化块内容层**，再在块层之上实现
Agent 的锚定编辑与渐进干预；不建议一步到位引入完整的富文本编辑器框架，也不建议自研
无限画布引擎。理由如下：

1. **Chat 不是合格的学习工作面，证据充分**。Kirsh & Maglio 的 epistemic action 研究与
   2026 年的"Keyhole Effect"分析共同指出：聊天界面无法承载认知卸载，也不支持
   "用手思考"；学习者需要的是可排列、可比较、可操作的外部表征。
2. **Agent 主动介入的主要风险不是技术，是元认知**。AIRIS 框架（Kuhn et al. 2026）指出
   生成能力越强、内部监控与认知投入越可能悄悄流失。这为"渐进式干预 + 可逆性"提供了
   理论锚点，也解释了为什么四级干预（L1–L4）**不应默认升档**。
3. **渐进干预有成熟的行业对应物**：Agentic UX 的 Sidebar Colleague / Inline Ghost /
   Collaborative Canvas 三种空间模式、GenUI 的 tool-bound 组件模式、以及"可逆操作静默
   执行、高利害操作确认"的自主权分级，都能与 L1–L4 一一映射——**不需要发明新协议，
   需要的是把它们接到 Learn Space 的对象模型上**。
4. **内容表示推荐"块层 + 活动组合层"的 Hybrid**：文档以块（block）为单位存储
   （ProseMirror/Tiptap 一类 schema 驱动编辑器），活动（实验、练习、Agent 卡片）是
   **组合进活动流的一等对象**。锚定采用"块 id + 文本内 offset + 引文复核"三段式
   ——仓库的 `blockOps` 已有 position+quote+occurrence 原型。
5. **最大的开放风险不在前端选型，在锚定的稳定性与 Agent/用户编辑冲突**——
   整页替换式保存（现有 `save_page_blocks` 是整页删重插）与锚定存在结构性冲突，
   必须先做实验 E1/E2（见 §8 · C1）。
6. **跨设备的共同内核是五类意图（Select/Annotate/Manipulate/Compare/Ask），差异在输入
   消歧**：触控笔的"画线"到底是标注、选择还是绘图，不该交给 AI 猜——用"模式 +
   上下文 + 轻量 UI"三档消歧，AI 只做确认不做裁决。
7. **验证顺序**：先实验（锚定稳定性 → 双方编辑冲突 → 干预粒度呈现）→ 再 MVP。
   两个原型（`/preview/focus-activity`、`/preview/space-canvas`）已经是 Stage 0 的
   交互证据，不需要推倒。

---

# Part I · 基础与证据（冻结层）

> 仓库事实与外部研究。只有被新证据（含 Part III 的执行结果）推翻时才修改；
> 修改须注明证据与日期，不静默改写。


---

## 1 · 研究范围与方法

### 1.1 研究主线

本报告的主线是：

> **Learning Experience → Interaction Mechanisms → Technical Foundations →
> Architecture Alternatives → Experimental Validation**

技术研究服务于已定义的交互目标，而不是反过来。每一章的结构是：主张 → 证据 →
对 Lemma AI 的含义 → 局限。

### 1.2 信息源与优先级

按项目规定的优先级处理了五类来源：

1. 产品负责人确认的设计上下文（本任务 Part I 摘要；其中 **Progressive Intervention
   四级已明确批准**）；
2. 仓库正式决策与设计文档（`docs/decisions/`、`docs/architecture/`、`docs/design/`、
   `VISION_GAPS.md`、`docs/decisions/agent-principles.md`）；
3. 仓库代码（`backend/ai/`、`frontend/src/features/`，含两个已验收原型）；
4. 外部研究（§4–§5，引用见 §17）；
5. 参考报告《Lemma AI「AI 个性化课程生成」科学化、算法化方案调研报告》——仅作格式与
   论证方式参考，其内容不定义本报告的产品需求。

### 1.3 严谨性分级

全文主张分四级标注：

- **[EF] Established Finding**：有同行评议或长期共识的发现（如 Kirsh & Maglio 1994）；
- **[EJ] Evidence-supported Engineering Judgment**：由证据支持的工程判断（如
  "schema 驱动编辑器更适合 Agent 局部编辑"）；
- **[DH] Design Hypothesis**：设计假设，需实验验证（如"块锚定可在整页保存下存活"）；
- **[ORQ] Open Research Question**：开放研究问题（如"手写歧义的消歧成本"）。

---

## 2 · 产品决策与仓库现状（Task 1）

### 2.1 已确认的产品决策

| 决策 | 状态 | 来源 |
|---|---|---|
| Learn Space 是 Learning Environment，不是 Chat 页/LMS/文档阅读器 | 已确认 | 产品上下文 §1 |
| Canvas 是空间化工作环境；元素类不预先冻结 | 已确认 | 产品上下文 §2 |
| 双击 Canvas 文件进入 Focus Mode；上下文连续 | 已确认 + 原型验证 | 产品上下文 §2；Path B（`7e092e79`） |
| **Progressive Intervention 四级（L1–L4）** | **已批准** | 产品上下文 §6 |
| 四级不是状态机，可按情境直接采用不同强度 | 已确认 | 产品上下文 §6 |
| 六维分析框架（空间/注意力/控制权/价值/成本/可逆），非评分模型 | 已确认 | 产品上下文 §6 |
| Intervention 粒度 ≠ Learning Object 粒度，不混用 | 已确认 | 产品上下文 §7 |
| Agent Initiative 三分：判断 / 行动 / 打断；打断非默认 | 已确认 | `agent-principles.md` U4 |
| Every Method is a Plugin；Method 指导策略，Learning Move 表达行动 | 方向已定，架构未冻结 | 产品上下文 §9 |

### 2.2 仓库现状：文档 / Mock / 真实功能三层区分

| 能力 | 层级 | 证据 |
|---|---|---|
| Evidence → Learner State（对错 + 可靠性 + 依据，状态派生） | **真实** | `backend/ai/knowledge/`，`LEARNER_STATE_V0.md` |
| Coordinator 每轮选 Method | **真实** | `ai/coordinator/`，生产调用方 2 处 |
| Method 插件（Socratic / Direct Explanation） | **真实** | `ai/methods/`，四要素声明式 |
| Agent 环境操作（画图/写笔记/读材料/记证据） | **真实**（工具在，2026-10-20 起 prompt 才提及） | `ai/tools/declarations.py:21-40` |
| Mala 引用（bundle 快照 + contextBundleIds） | **真实** | `models/board_context.py` |
| Insight（help-dependence 观察 → 三视图呈现） | **实验性**（fixture + 预览页） | `ADAPTIVE_INSIGHT_V0.md` |
| Canvas 原型（三类元素 + 持续 Insight + 双击进聚焦） | **原型**（mock，sessionStorage 持久化） | `/preview/space-canvas`，`162e2fed` |
| Proposal B 活动工作区（特征向量实验 + Agent 插入卡） | **原型**（mock） | `/preview/focus-activity`，`8ad97285` |
| Path B（画布双击 → 活动工作区 → 返回原样） | **原型**（跨路由已验收） | `7e092e79`，14 条断言 |
| 焦点文档编辑（五类块 + 标题可写） | **真实**（整页删重插保存） | `doc_service.save_page_blocks` |
| "读到哪/正在做什么"信号 | **不存在** | VISION_GAPS C2（grep 0 命中） |
| Learning Move 抽象 / Runtime | **概念**（决策日志 P1，Provisional） | `RESEARCH_DECISION_LOG.md` |
| 交互闭环（completion / episodes） | **代码存在、生产零调用** | VISION_GAPS A3 |
| Method 自动切换（SWITCH） | **定义存在、零执行** | VISION_GAPS A5 |

### 2.3 主要技术约束（从代码得出）

1. **整页删重插保存**：`save_page_blocks`（`doc_service.py:216`）每次保存删掉全部块再
   重插——与"Agent 精准锚定到段落"存在**结构性冲突**，是本次研究最高优先级风险。
2. **文档与活动是两套渲染**：`MaterialView`（PDF/图片，只读）与 `BlockEditor`（五类块，
   可编辑）按 `originalName` 分流——Hybrid 内容模型必须跨越这条既有分界。
3. **画布无第三方引擎**：拖动为自研 pointer events（60 行，禁 `setPointerCapture` 的
   坑已注释）；tldraw 已按既定范围推迟。
4. **工具面与 prompt 面的时差**：Agent 早就有画图/写笔记工具，但 system prompt 直到
   2026-10-20 才提及——**能力与告知之间的时差是反复出现的债**，Method/Move 设计要
   把"声明能力"做成结构化字段而非散落文本。
5. **无"读到哪"信号**：Agent Initiative 的最小信号源缺失，一切主动干预的前提
   是先埋点（`RESEARCH_DECISION_LOG.md` §4）。

---

## 3 · 认知科学与 HCI 基础（Task 2）

### 3.1 Epistemic Action：为什么"操作内容"本身就是思考

**[EF]** Kirsh & Maglio（1994）用 Tetris 玩家区分了两类动作：**pragmatic action**
直接逼近目标；**epistemic action** 改变世界以降低后续思考的成本。关键发现反直觉：
专家玩家做**更多**的手动物体旋转——因为物理旋转 + 视觉比对比心理旋转更快更省。
后续研究（Scrabble 拼字、材料操作问题解决）反复复现：**允许操纵外部表征的人表现更好**。

**对 Focus Mode 的含义**：用户"把定义拖到例证旁边""把滑杆拖到 0° 看箭头对齐"
不是娱乐性交互——它们是 epistemic action，是认知过程的一部分。
**Agent 替用户做掉这些动作 = 抹掉学习机会**。这直接支持两条设计约束：

- Agent 插入的内容应该是**可被用户继续操作的**（Proposal B 的滑杆实验是这个原则的实例）；
- Agent 的"帮你完成"类动作默认要降档——完成感属于学习者（与 Khanmigo 的
  "never give direct answers" 守则同一逻辑）。

**局限**：这些研究来自受控小游戏任务，向"数小时的真实学习会话"外推时，
epistemic action 的识别与计量仍属 **[ORQ]**。

### 3.2 The Keyhole Effect：聊天为什么不合格

**[EF/EJ]** 2026 年的分析（arXiv:2602.00947）把这一点系统化：聊天界面
(1) 不是稳定的外部表征（对话是转瞬即逝的流，检索成本抵消外部化收益）；
(2) 阻断 epistemic action（"你无法排列 AI 的回答"）；
(3) 有语言摩擦瓶颈（同一条 refinement：点复选框 0.5s vs 打字 5.2s，Fitts 定律 +
   打字模型估算，50 次操作累计 ~8 分钟 vs ~1 分钟，作者标注待实证验证）。

**对 Focus Mode 的含义**：这份分析给"Activity-centric 而非 Chat-centric"提供了
最直接的理论与量化依据。Lemma 的对话窗格必须降为**五类意图之一（Ask/Redirect）的
入口**，而不是学习的默认表面。**局限**：该文分析的是数据分析场景，时间数字是模型
估算而非实测——方向可信，数字不可直接引用。

### 3.3 Distributed Cognition 与"界面是认知伙伴"

**[EF]** Hutchins 的船舰导航研究确立了：认知分布于人、工具与程序构成的社会技术系统；
Hollan et al.（2000）总结出三条原则——在环境中建立/协调结构、尽可能把认知努力卸载到
环境、用社会组织做认知负载均衡。Clark 的 cognitive scaffolds 与 Vygotsky 的 scaffolding
在此汇合：**工具承担一部分思考，正是工具好用的原因**。

**对 Focus Mode 的含义**：画布上的元素不是"文件的快捷方式"，它们是**外部记忆与
外部计算**。Material anchors（Hutchins）提示：把概念结构锚在稳定的空间结构上，
本身就在稳定概念表征——这是"Canvas ↔ Focus 上下文连续"的认知学依据。

### 3.4 AIRIS：Agent 主动性的元认知代价

**[EF]** AIRIS 框架（Kuhn et al., 2026, arXiv:2608.21618）针对生成式 AI 学习场景提出
"performance–metacognition dilemma"：**产出质量上升的同时，内部监控、校准与认知投入
可能悄悄下降**。核心区分：外包（outsourcing，例行外围工作）无害；**认知卸载
（cognitive offloading，学习相关的生成与调节过程本身）恰恰威胁持久理解**。框架给出
七种失稳机制与五个调节算子（Anticipate / Interrogate / Reflect / Integrate / Synthesize），
并明确："**该架构本身不改善学习；它规定 genAI 支持的工作要维持理解必须保留什么**"。

**对 Focus Mode 的含义**（这是本研究最重要的理论收获）：

1. **渐进式干预的 L1–L4 不只是打扰管理问题，更是控制分配问题**——每一次升档都是一次
   认知过程的移交。L4（Activity Reorientation）在 AIRIS 语境下几乎必然伴随认知卸载
   风险，因此需要显式确认；
2. **Agent 的"帮你写/帮你算"要默认降档为"陪你想"**——这正是 Socratic guardrail 的
   认知学解释（见 §4.2 Khanmigo）；
3. **六维框架里的 Agency/Control 与 Reversibility 有了理论根据**，不再是审美偏好。

**局限**：AIRIS 是理论框架 + 研究议程，**不提供干预频率的经验数字**；其命题尚待
实证（作者自己说明）。

### 3.5 Cognitive Load 与打断：什么时候介入是负价值

**[EF]** 认知负荷理论（Sweller）与多媒体学习研究的基本结论：工作记忆容量有限，
外在认知负荷（界面强加的）挤占内在负荷（内容本身的）。打断研究的经典结论：
被打断后任务恢复存在 resumption lag，且与被打断任务的复杂度正相关。

**对 Focus Mode 的含义**：L1（Ambient）放在低干扰区是"零打断成本"的设计；
L2（Contextual Nudge）**必须**出现在内容附近而非屏幕另一端——否则一次注意力转移
就把低价值提示变成高成本打断。这也为"Spatial Scope 与 Attentional Demand 分开计"的
六维框架提供了依据：**空间近 ≠ 打扰小，但空间远必然打断大**。

**局限**：打断研究的对象多为 30 秒–几分钟的任务段；对"深度阅读 40 分钟被打一次"
这种低频高影响场景，实证覆盖有限 **[ORQ]**。

### 3.6 Mixed-Initiative：Horvitz 的原则至今成立

**[EJ]** Horvitz（1999）的 mixed-initiative 原则以**期望效用**为干预判据：
当系统对"帮助的期望价值高于打扰成本"有足够置信时才介入。这与我们六维框架的
Learning Value vs Interruption Cost 是同一结构。不同的是：Horvitz 假设系统可以
计算这个值，而学习场景里**学习价值恰恰是最难计算的**——AIRIS 的警告在此生效。

**结论**：[DH] 本轮把"何时介入"的判据落在**用户显式信号优先、可观察行为次之、
认知推断最后且必须标注**（对应产品上下文 §8 的四级区分），而不是发明一个
intervention score。

### 3.7 小结：理论 → 设计约束的映射

| 理论 | 设计约束（进了本报告后续章节） |
|---|---|
| Epistemic action | Agent 插入内容必须可继续操作；"替学"默认降档 |
| Keyhole Effect | Chat 降为五意图之一；工作区是主表面 |
| Distributed cognition | Canvas 元素是外部记忆；Canvas↔Focus 上下文连续有认知学依据 |
| AIRIS | L4 需确认；"陪你想"优先于"替你想"；控制分配是核心问题 |
| CLT / 打断研究 | L2 提示必须就近；Spatial 与 Attentional 分开计 |
| Horvitz mixed-initiative | 介入判据 = 显式信号 > 可观察行为 > 标注过的推断 |

---

## 4 · 现有系统与技术版图（Task 3）

### 4.1 空间工作区：tldraw / Heptabase / Obsidian Canvas

| | tldraw | Heptabase | Obsidian Canvas |
|---|---|---|---|
| 定位 | **Canvas infrastructure**（React SDK） | 研究型卡片白板（产品） | Markdown 库的空间视图 |
| 可借鉴 | multiplayer、runtime API、**Chat starter kit**（在 canvas 上标注后发给 AI）、selection/geometry 系统 | 卡片=一等对象、PDF 标注与卡片同板、双向链接 | 内容是**既有笔记的空间排列**（JSON Canvas 开放格式） |
| 不适合 | 无学习语义，卡片/块要自建 | 闭源产品、无嵌入 SDK、无免费层 | 无自由绘制，Canvas 是二等特性 |
| 对 Lemma 的取舍 | **作为 Stage 2 画布引擎候选**（若自研拖动不够用）；其 Chat starter kit 验证了"canvas 标注 → 发给 AI"正是我们 Mala 的形态 | 学习语义的参照物：卡片 + 材料同板的产品定位被市场验证 | "canvas 是笔记的视图"的定位与我们"Canvas 是空间层"的决策相反，作对照 |

**可观察的实现思路**：tldraw 的 signal-based record store + geometry hit-testing 是
"自研画布要补什么"的清单；Heptabase 证明了"卡片笔记 + PDF 标注 + 白板"三合一在
学习者市场有付费验证。

**不能证明的**：任何这些产品**都没有**"Agent 以渐进干预的方式作用于学习对象"的公开
证据——它们的 AI 功能多为生成/摘要。§6 的干预模型无现成产品可抄 **[ORQ]**。

### 4.2 AI 学习产品：Khanmigo / NotebookLM / SchoolAI

- **Khanmigo**（Khan Academy）：Socratic guardrail 的规模化实例——**被明确设计为
  永不直接给答案**，以引导问题保住 productive struggle。这是"提供答案 ≠ 促进学习"
  的最强产品侧证据，也是我们 Socratic Method 的产品先例。
- **NotebookLM**：closed-corpus RAG——回答只引用用户上传的来源、逐条给出源引用。
  对 Lemma 的启示：**材料在画布/聚焦里的锚定引用 = 教育场景的 provenance affordance**
  （"Grounding isn't just a retrieval strategy, it's a UI affordance"）。
- 三者的共同点是**克制**（withhold answers / stay in corpus / keep teacher in view）——
  与 AIRIS 的警告互为印证。

**不能证明的**：这些产品都没有"在持续学习工作区内、按干预分级主动出现"的行为；
Khanmigo 的 Socratic 效果是设计声明与用户口碑，公开对照实验数据有限 **[ORQ]**。

### 4.3 Agentic UI / Generative UI：可直接映射的模式库

2026 年 agentic UX 的行业实践给出三个层次的模式，**几乎一一映射到本项目**：

1. **空间共存模式**（Zooz 总结）：Sidebar Colleague（≈ 我们的对话窗格）·
   Inline Ghost（≈ L2 contextual nudge）· Collaborative Canvas（≈ 画布上的 Agent 内容）·
   Invisible Agent（≈ L1 ambient）。
2. **自主权分级**（五级：Operator → Collaborator → Consultant → Approver → Observer）
   与 **Autonomy Slider**——对应我们 L1–L4 的 Agency/Control 维度；且行业做法是
   "**可逆操作静默执行，高利害操作暂停等确认**"，与 U4/D4 完全一致。
3. **GenUI 三模式**（Zylos）：Static（tool-bound 组件库，Agent 只能选）·
   Declarative（JSON schema）· Open-ended（自由渲染）。**Lemma 应取 Static**：
   我们的 `AgentMoveCard` 就是 tool-bound 卡片——与"不冻结 UI、也不给 Agent 发明 UI 的
   自由"两条约束同时吻合。
4. **Agent 状态可见性**：checkpoint confirmation、interrupt+redirect、
   post-run summary with sources——对应"Agent 行动要在工作区可见、可撤、有来源"
   （决策日志 D1）。

### 4.4 编辑器框架（为 §7/§9 服ł务）

| | ProseMirror | Tiptap | Lexical |
|---|---|---|---|
| 本质 | schema 驱动编辑器框架 | ProseMirror 的产品化封装 | Meta 的 React 友好编辑器内核 |
| 协同 | 内建、成熟 | Yjs 集成顺畅 | 需自建/社区 |
| AI 友好度 | 文档结构完全暴露，Agent 可精准插拔 | 同 PM，扩展模式更现代 | 同级，React 集成好 |
| 成本 | 工程重、学习曲线陡 | 中（封装 + 商业部分） | 中低（React 团队） |
| 适用判断 | 编辑器是战略核心面、团队可投入 | **务实中间档** | React 重、要快 |

**[EJ]** 三者都能做到"把选中节点发给 AI、把结果干净插回"——差异在工程成本与控制粒度。
对 Lemma：**Stage 实验用 Tiptap（最快验证块 + Agent 编辑），ProseMirror 作为转正备选**；
Lexical 的 React 亲和是加分项但协同与 schema 生态略薄。

---

# Part II · 交互设计（产品层）

> 交互模型、场景与内容/设备策略。随产品决策演进；与 `docs/decisions/` 冲突时以决策日志为准。


---

## 5 · 交互模型与 Agent 行为（Task 4/6 核心）

### 5.1 五类意图 → 界面机制（Intent-first）

五类基础行为是**研究性归纳**（非冻结协议），映射到当前/计划中的界面机制：

| 意图 | Laptop 机制 | Tablet 机制 | 仓库现状 |
|---|---|---|---|
| Select / Point | 点击/框选；文本选择 | 触摸点选；笔尖悬停预览 | 块选择（Mala）、画布选中 ✓ |
| Annotate / Express | 文本编辑、边注 | **手写笔迹（未实现）** | 边注轨 ✓、note ✓ |
| Manipulate | 拖拽、滑杆 | 直接操作（触摸拖动） | EigenExplorer ✓、卡片拖动 ✓ |
| Compare / Relate | 并列窗口、画布摆放 | 分屏 + 双指 | 画布摆放 ✓、比较视图 ✗ |
| Ask / Redirect | 对话窗格 | 语音/对话 | ChatPanel ✓ |

**缺口**：手写笔迹（Annotate 的 Tablet 主形态）与比较视图（Compare）完全未实现，
列 Roadmap。

### 5.2 Progressive Intervention L1–L4 → UI 机制映射

四级是**已批准的设计方向**，映射到具体 UI 行为（每级都标注六维中的关键项）：

| 级 | UI 机制 | 空间 | 注意力 | 可逆性 | 仓库对应物 |
|---|---|---|---|---|---|
| L1 Ambient | Insight 固定栏 / 低干扰区展示发现，不要求回应 | 右栏 | 近零 | 随时可关 | **已有**（InsightPanel 常驻，`162e2fed`） |
| L2 Contextual Nudge | 内容**附近**的小提示条，可忽略、可关 | 就地 | 低（一次扫视） | 点掉即走 | **原型级**（AgentMoveCard 的形态可复用） |
| L3 Collaborative Action | 工作区内嵌入可操作内容（可视化/练习/反例卡） | 就地展开 | 中（持续） | 卡片可撤销 | **原型级**（AgentMoveCard + EigenExplorer） |
| L4 Activity Reorientation | 建议改变当前活动，**需确认**（全屏浮层或中央卡片） | 全区 | 高 | 原活动状态完整保留 | **无**（需设计确认协议） |

<figure>
<svg viewBox="0 0 640 250" xmlns="http://www.w3.org/2000/svg" font-family="Microsoft YaHei">
  <g font-size="11">
    <rect x="30" y="200" width="86" height="26" rx="13" fill="#EFEDE8"/><text x="73" y="218" text-anchor="middle" fill="#57534E">L1 Ambient</text>
    <text x="130" y="218" fill="#1F2328">Insight 固定栏 · 不要求回应</text><text x="420" y="218" fill="#8A5A2B">✓ 已有（InsightPanel）</text>
    <rect x="30" y="160" width="86" height="26" rx="13" fill="#F7EBD8"/><text x="73" y="178" fill="#854F0B">L2 Nudge</text>
    <text x="130" y="178" fill="#1F2328">内容旁小提示 · 可忽略 · 10s 淡出</text><text x="420" y="178" fill="#B98A3C">原型可复用</text>
    <rect x="30" y="120" width="86" height="26" rx="13" fill="#F7D8C4"/><text x="73" y="138" fill="#854F0B">L3 Action</text>
    <text x="130" y="138" fill="#1F2328">工作区嵌入可操作内容（卡/可视化）</text><text x="420" y="138" fill="#B98A3C">原型（AgentMoveCard）</text>
    <rect x="30" y="80" width="86" height="26" rx="13" fill="#E4B88C"/><text x="73" y="98" fill="#4A2E12">L4 Reorient</text>
    <text x="130" y="98" fill="#1F2328">建议改变活动 · 必须确认 + 完整退出</text><text x="420" y="98" fill="#B03A2E">✗ 未设计</text>
    <path d="M73 190 L73 96" stroke="#8A5A2B" stroke-width="1.4" marker-end="url(#up)"/>
    <text x="46" y="150" fill="#854F0B" transform="rotate(-90 46 150)">注意力与控制权 ↑</text>
    <text x="500" y="60" fill="#57534E">升档不自动发生：</text>
    <text x="500" y="78" fill="#57534E">L2 被忽略 = 负信号，</text>
    <text x="500" y="96" fill="#57534E">不构成升档理由（AIRIS）。</text>
    <text x="500" y="126" fill="#57534E">任何级别都带来源标注</text>
    <text x="500" y="144" fill="#57534E">（这条提示基于什么）。</text>
  </g>
  <defs><marker id="up" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M1 7L4 1L7 7" fill="none" stroke="#8A5A2B" stroke-width="1.4"/></marker></defs>
</svg>
<figcaption>图 1 · 渐进干预四级 → UI 机制映射。右列是仓库对应物：L1 已实现，L2/L3 有原型，L4 未设计。</figcaption>
</figure>

**映射规则**（不是状态机）：

- 升档**不自动发生**：L2→L3 只能由**新的显式信号**（用户点击/长时间驻留某对象）触发，
  不能因为"L2 被忽略"就升 L3——被忽略本身是负信号（AIRIS：calibration drift 的
  对应物）。
- L4 必须带**完整的退出计划**（原活动状态如何恢复）。
- **任何级别的干预都要有来源标注**（NotebookLM 式 provenance：这条提示来自哪份材料、
  哪条证据）。

### 5.3 两种粒度的正交性

 Intervention Granularity（强度/范围）与 Learning Object Granularity（对象规模）
**正交**，允许的组合举例：

| | 小对象（一句话/公式） | 大对象（整章/整个活动） |
|---|---|---|
| **低强度** | L2：在公式旁提示"检查 λ 的符号" | L1：Insight 栏显示"你本周在这章停留最多" |
| **高强度** | L3：为一段推导生成一个反例卡 | L4：建议从阅读转向重装练习 |

**设计推论**：干预 API 的参数必须**同时**携带粒度与强度——"只按强度路由 UI"会把
"对一句话的高强度反例"错误渲染成全屏横幅。

### 5.4 Shared Attention：四级区分的实现落点

产品上下文 §8 的四级区分（观察/解释/假设/结论）落到代码上：

- **Observed**：可记录的事件（停顿、回看、滑杆操作、修改）——**目前无埋点**（缺口）；
- **Contextual Interpretation**：Agent 回复中的措辞约束（"看起来/我猜"）——已在
  prompt（Evidence boundaries 段）；
- **Hypothesis**：**无处存放**（`knowledge_evidence` 只记判定）——决策日志 D5，
  本轮不解决，但 L2/L3 的干预理由在 UI 上必须显示为**假设**而非结论；
- **Supported Conclusion**：唯一可进 Learner State 的东西。

---

## 5A · 三个完整交互场景（Task 6）

> 本章是对 brief Task 6（"重点验收任务"）的补齐：三场景各按 10 要素展开，
> 每个场景末尾给技术实现映射。场景是**推演产物**（[DH]），不是已发生的用户记录。

### 场景 A · Laptop / Research（读论文、比较证据）

| # | 要素 | 内容 |
|---|---|---|
| 1 | 初始环境 | 画布上有论文 A、论文 B（两份 `imported`）与一张比较笔记；学习目标："梳理两文对 X 的不同论证" |
| 2 | 用户行为 | 精读 A §3.2，选中一句写边注；尚未打开 B |
| 3 | 系统可观察 | A §3.2 的文本选择事件 + 边注写入 + 学习目标文本（**无**跨文件信号） |
| 4 | 解释与不确定性 | [假设] 他在比较两文（因目标如此），但也可能只是精读 A——两者无法区分 |
| 5 | Method 依据 | 无显式 Method；意图归类为 Compare/Relate → 只准备 **L1**，不打断 |
| 6 | Learning Move | `reference`（关联提示）：指向 B 中论证结构相似的一段 |
| 7 | UI 响应 | Insight 栏（L1）出现一条：「你标记的这段与 B §4.1 论证结构相似」，带源引用，不要求回应 |
| 8 | 用户进一步交互 | 点引用 → 跳到 B 对应段 → 并排比较、各自写边注 |
| 9 | Agent 调整 | 用户已在 B 上动手 → 不再升级，保持 L1 静默 |
| 10 | 状态变化与保存 | 两条边注持久化（块层）；Insight 展示记录不进 Learner State |

**技术映射**：`read_page`（块级锚）+ Insight 固定栏 + **材料间语义检索**（当前仓库没有——本场景暴露的真实缺口）。

### 场景 B · Tablet / Mathematics（手写 + 模拟器）

| # | 要素 | 内容 |
|---|---|---|
| 1 | 初始环境 | 平板；特征值讲义 + EigenExplorer（滑杆实验） |
| 2 | 用户行为 | 拖滑杆 3 次、停在 30°；在手写区写下"为什么不转？"；未发任何消息 |
| 3 | 系统可观察 | 滑杆事件 ×3 + **笔迹**（ink，OCR 前不可读）+ 零对话 |
| 4 | 解释与不确定性 | 手写内容**不可靠**（不做 OCR 前提）→ Agent 只知道"实验区有书写行为"；为何写，[假设] |
| 5 | Method 依据 | Socratic 活跃（用户此前选择）；行动原则 = 不给答案 |
| 6 | Learning Move | L2 contextual nudge：`指向动作而非答案`——"把方向转到 0°，看 Av 的长度变成多少" |
| 7 | UI 响应 | 滑杆上方小条（L2），10 秒后自动淡出，可忽略 |
| 8 | 用户进一步交互 | 拖到 0° → 对齐高亮出现 → 手写区补了一笔 |
| 9 | Agent 调整 | 用户继续手写 → **静默**（L1），不再提示（连续提示即噪音） |
| 10 | 状态变化与保存 | 滑杆值=界面态；笔迹=ink 块（持久）；L2 出现/淡出记入观察流（不进判定） |

**技术映射**：Pointer Events 按 `pointerType` 分流 + ink 块类型 + L2 组件 + **零 OCR 依赖**（笔迹先按原样保存）。

### 场景 C · Agent Initiative Without Explicit Request（无显式请求）

| # | 要素 | 内容 |
|---|---|---|
| 1 | 初始环境 | 用户读特征值讲义；**从未与 Agent 对话** |
| 2 | 用户行为 | 20 分钟内三次回到同一节；滑杆方向转满一圈（0°→359°） |
| 3 | 系统可观察 | 三次回看 §2（**前提：需要埋点**，当前零命中）+ 滑杆满一圈 + 两次对齐落在 0°/315° |
| 4 | 解释与不确定性 | [假设] 转满一圈 + 两处对齐 = 可能在做系统性探索；也可能只是玩滑杆——**两个解释都活着** |
| 5 | Method 依据 | 不足以换方法（D4：打断非默认）；保持当前方法 |
| 6 | Learning Move | L3 一次性：插入**对比卡**——"你在 0° 和 315° 都对上了；两个方向的 \|Av\| 不同（2 vs 1）——这就是两个特征值" |
| 7 | UI 响应 | 工作区末尾出现建议卡（AgentMoveCard 形态），徽章=「基于你的操作」+ 可展开依据（3 次回看 + 转满一圈——**观察溯源**，U 系列的"不假装"在这里兑现） |
| 8 | 用户进一步交互 | 读卡 → 点「有用」→ 展开看 \|Av\| 对比 |
| 9 | Agent 调整 | 无追问 → 收手回 L1；卡片保留可撤销 |
| 10 | 状态变化与保存 | 卡片采纳/忽略 + 回看观察记录进观察流；**不形成认知结论** |

**技术映射**：回看/滑杆埋点（**前置缺口**，VISION_GAPS C2）+ `propose` 原语 + 观察溯源徽章 + 卡片级撤销。

### Path B 的时序（画布 ↔ 聚焦的往返协议）

<figure>
<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" font-family="Microsoft YaHei" font-size="11">
  <rect x="20" y="20" width="120" height="30" rx="4" fill="#F0EDE6" stroke="#8A5A2B"/>
  <text x="80" y="40" text-anchor="middle">画布页</text>
  <rect x="260" y="20" width="120" height="30" rx="4" fill="#F0EDE6" stroke="#8A5A2B"/>
  <text x="320" y="40" text-anchor="middle">Proposal B 页</text>
  <rect x="500" y="20" width="120" height="30" rx="4" fill="#F0EDE6" stroke="#8A5A2B"/>
  <text x="560" y="40" text-anchor="middle">sessionStorage</text>
  <line x1="320" y1="50" x2="320" y2="230" stroke="#D6D3CD"/>
  <line x1="560" y1="50" x2="560" y2="230" stroke="#D6D3CD"/>
  <text x="80" y="70">双击 file</text>
  <line x1="80" y1="78" x2="315" y2="78" stroke="#8A5A2B" marker-end="url(#a)"/>
  <text x="330" y="100">?from=canvas&amp;file=特征值讲义</text>
  <text x="330" y="116">（返回条 + 文件身份）</text>
  <text x="335" y="140">用户点「← 返回画布」</text>
  <line x1="318" y1="150" x2="90" y2="150" stroke="#8A5A2B" marker-end="url(#a)"/>
  <text x="95" y="172">navigate 回 /preview/space-canvas</text>
  <line x1="90" y1="180" x2="315" y2="180" stroke="#8A5A2B" stroke-dasharray="4 3"/>
  <text x="95" y="176">重挂载 → loadElements()</text>
  <line x1="430" y1="200" x2="558" y2="200" stroke="#5F5E5A" marker-end="url(#a)"/>
  <text x="435" y="195">读取 elements</text>
  <text x="95" y="222">✓ 位置 / note 文本 / insight 开合 = 原样（14 条断言已验）</text>
  <defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="#8A5A2B" stroke-width="1.4"/></marker></defs>
</svg>
<figcaption>图 4 · Path B 往返：状态经 sessionStorage 跨路由保留（verify_path_b.mjs，14 条断言）</figcaption>
</figure>

---

## 6 · 工作区内容表示（Task 4）

### 6.1 候选模型对比

| 模型 | 优势 | 劣势 | 判定 |
|---|---|---|---|
| Document Tree（传统富文本树） | 成熟工具链 | 活动/交互内容是二等公民；Agent 插"活物"别扭 | 不采纳为唯一模型 |
| **Block-based Content** | 块=锚定与权限的自然单位；ProseMirror/Tiptap 生态成熟 | 纯文档观仍以文档为中心 | **采纳为内容层** |
| Activity-based Composition | 已有原型验证（Proposal B）；学习活动是一等 | 纯活动观缺"长文档阅读"支撑 | **采纳为组织层** |
| Composable Objects（自由画布万物） | 画布原型已验 | 文档内块的精细编辑没有着落 | 不采纳为唯一模型 |
| **Hybrid（块层 + 活动组合层）** | 覆盖两类需求；与仓库两条既有线（BlockEditor + 活动原型）都能接 | 两层的对象关系需要设计 | **推荐** |

**推荐模型** [DH]：文档内容以**块**存储（每块有稳定 id、类型、内容）；活动是**块的有序
组合 + 交互对象**（一个"学习活动"= 一个块序列，可含 Agent 插入的活动块）。
Focus Mode 渲染的是**活动流**；一个活动可以就是"读这份文档"（全部是文档块），
也可以是混合序列。这与 Proposal B 的"活动为主对象"兼容：**活动 = 块的组合**，
而不是与文档并列的另一种东西。

### 6.2 锚定（Anchoring）

Agent 要指着一句话/一个公式说话。三层方案：

1. **块级锚**：`{ blockId }` —— 稳定（块有 id），粒度粗；
2. **文本内锚**：`{ blockId, start, end }` —— 细，但怕编辑漂移；
3. **三段复核锚（推荐）**：`{ blockId, position, quote, occurrence }` ——
   **仓库已有原型**：`frontend/src/features/learn-space/focus/blockOps.ts` 的
   position+quote+occurrence 方案。取用时验证 quote 匹配，不匹配则降级到块级。

**与现有保存的结构性冲突**：`save_page_blocks` 是**整页删重插**——块 id 在保存后
不稳定，锚 2/3 会系统性失效。**这是本报告识别的最高优先级技术风险**（详见 §8 E1）。
<figure>
<svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" font-family="Microsoft YaHei" font-size="11">
  <rect x="20" y="40" width="170" height="90" rx="6" fill="#F7F6F2" stroke="#D6D3CD"/>
  <text x="105" y="62" text-anchor="middle" fill="#57534E">文档（块序列）</text>
  <rect x="40" y="74" width="130" height="16" fill="#fff" stroke="#D6D3CD"/><text x="48" y="86" fill="#57534E">block A</text>
  <rect x="40" y="92" width="130" height="16" fill="#FDF3E3" stroke="#8A5A2B"/><text x="48" y="104" fill="#854F0B">block B ← 目标</text>
  <rect x="40" y="110" width="130" height="14" fill="#fff" stroke="#D6D3CD"/><text x="48" y="121" fill="#9CA3AF">block C</text>
  <rect x="260" y="52" width="180" height="72" rx="6" fill="#FDF3E3" stroke="#8A5A2B"/>
  <text x="350" y="72" text-anchor="middle" fill="#854F0B">锚对象</text>
  <text x="272" y="92" fill="#1F2328">① blockId（粗定位）</text>
  <text x="272" y="108" fill="#1F2328">② position（块内偏移）</text>
  <text x="272" y="124" fill="#1F2328">③ quote + occurrence（复核）</text>
  <line x1="192" y1="98" x2="256" y2="90" stroke="#8A5A2B" marker-end="url(#b)"/>
  <rect x="500" y="52" width="120" height="72" rx="6" fill="#F7F6F2" stroke="#D6D3CD"/>
  <text x="560" y="74" text-anchor="middle" fill="#57534E">取用时校验</text>
  <text x="510" y="94" fill="#1F2328">quote 匹配？</text>
  <text x="510" y="110" fill="#1F2328">✓ 精确锚定</text>
  <text x="510" y="126" fill="#854F0B">✗ 降级到块级</text>
  <line x1="442" y1="88" x2="496" y2="88" stroke="#8A5A2B" marker-end="url(#b)"/>
  <text x="240" y="160" fill="#57534E">整页删重插保存 ⇒ blockId 不稳定 ⇒ 三段锚系统性失效（最高优先级风险，见 E1）</text>
  <defs><marker id="b" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="#8A5A2B" stroke-width="1.4"/></marker></defs>
</svg>
<figcaption>图 3 · 三段式锚定：块级定位 → 块内偏移 → 引文复核；取用时不匹配则显式降级。</figcaption>
</figure>

行业参照：ProseMirror 的 Step 模型（每次编辑是一个可重放/可变换的 step）天然支持
锚点随文档变换（position mapping）——这是"引入编辑器框架"的**决定性理由之一**，
权重高于开发体验对比。

### 6.3 用户编辑与 Agent 编辑的冲突

| 问题 | 方案 | 级别 |
|---|---|---|
| 谁改了什么 | 每次内容变更带 `source: user \| agent`，进操作历史 | [DH] |
| 建议与执行分离 | Agent 的内容默认是**建议卡**（L3 可逆），用户"采纳"才并入正文；L2/L1 永不直接改正文 | [DH]，与 D4/U4 一致 |
| 防 Agent 覆盖未保存工作 | Agent 写入走**追加式**（新块/新卡），**永不**改写用户正在编辑的块；要改必须先展示 diff 并等确认 | [DH] |
| 撤销 | 两级：Agent 卡片级撤销（已实现）+ 正文编辑 undo（编辑器内建） | 已验证卡片级 |
| 保存竞态 | 现状整页删重插下，Agent 写入必须走**独立通道**（活动层），不进 `save_page_blocks` | 现状约束 |

### 6.4 状态连续性（State Continuity）

四类状态分开管理（借 Path B 验证过的分层）：

| 类别 | 例子 | 持久化 | 现状 |
|---|---|---|---|
| **持久学习内容** | 文档块、note 文本、Agent 被采纳的插入 | 后端（pages/blocks） | ✓ |
| **临时界面状态** | 元素位置、面板开合、滚动位置、滑杆角度 | sessionStorage（原型）/ 内存 | ✓ 原型已验 |
| **Agent 建议** | 未采纳的插入卡、L2 提示 | 内存（会话内），随会话消失 | ✓ 原型 |
| **学习证据** | 对错判定、（未来的）假设 | 后端证据层 | ✓（判定）；✗（假设，D5） |

Path B 的验收（去 Proposal B 一趟回来画布原样）已经证明了这套分层的可行性。

---

## 7 · 跨设备交互（Task 5）

### 7.1 共同内核与设备差异

**共同内核 = 五类意图**（§5.1）。同一意图在不同设备用不同输入通道实现，
但**产生相同的领域事件**（例如 Annotate 在桌面是"选中+写边注"，在平板是"手写批注"，
但都产生"附着在某块上的标注"对象）——这是两套 UI 不必相同的理论保障。

### 7.2 Laptop 机制清单

- Pointer/keyboard 已覆盖（五意图中 4 类有实现）；
- 快捷键：未系统化（**缺口**）——Select/Ask 至少各一条；
- 多区域并行：三栏布局已验证；焦点管理需要补（键盘路径）。

### 7.3 Tablet / Stylus：三个真问题

1. **手写笔迹的数据模型**：笔迹 = `{ elementId, strokes[], timestamp }` 的
   **独立内容类型**（ink block），不做 OCR 前提假设——手写先以原样保存（笔迹本身
   是学习痕迹，[EJ] 参照 Heptabase 的 PDF 手写标注产品化先例）；
2. **手势歧义**：一笔下去是标注？选择？绘图？还是擦除？
   **消歧三档**（按可靠性排序）：
   - **输入通道**：笔尖 = 写/画，手指 = 滚动/选择（Palm rejection + 通道分离）——
     最可靠，系统级解决；
   - **上下文**：落在文本块上的笔迹默认标注，落在空白区默认绘图；落在滑杆区
     不接收笔迹——零成本；
   - **轻量 UI**：仍歧义时，笔迹末端浮出三个小图标（标注/选择/绘图）让用户点——
     一次点击的成本，且**事后可改**；
   - **不交给 AI 猜**：输入消歧的实时性要求（<100ms 反馈）与错误代价（用户笔迹被
     理解成别的动作）决定了 AI 不适合做第一裁决者 **[EJ]**。AI 的角色是**事后**：
     把笔迹作为观察记录（"用户在这段推导旁画了框"），供未来解释——不是实时裁决。
3. **触摸/滚动/书写冲突**：标准解是 pointerType 分流（touch → 滚动；pen → 内容）+
   手掌防误触（palm rejection）——浏览器 Pointer Events 原生支持 `pointerType`，
   实现成本低。

**注意**：不要假设平板用户都有笔——五意图在纯触屏下的可用性（无手写的 Annotate =
触摸文本选择 + 软键盘）必须在 MVP 验收里单列。

### 7.4 输入延迟与可访问性

- 手写延迟预算：数字墨水行业惯例 <10ms 触摸到墨线（可用 `getCoalescedEvents` 提升采样）；
- 可访问性：五意图都要有键盘路径（Select=方向键、Annotate=快捷键+输入、Ask=对话）；
  Tablet 上的触摸目标 ≥44px。

---

# Part III · 技术路径探索（生长区）

> 本部分是报告**唯一会持续变化的部分**：每条探索线（C1–C5）对应一个必须用实验或
> 实现回答的技术问题（brief Task 9 的实验设计已分布到各线）。每节统一按模板演进：
> **问题 → 当前证据 → 实验 → 结果 → 判定 → 对推荐的修订**。
> 规则：① 结果与判定只能由真实执行填入，推理不得代填；② 某线的判定若推翻 Part IV
> 的推荐，须修订 Part IV 并注明依据的线与日期；③ 未开始的线保留占位——占位是诚实的，
> "已完成为零"不是。

| 线 | 问题 | 挂接实验 | 状态 |
|---|---|---|---|
| C1 内容层与锚定 | 块 id 能否跨保存稳定；双方编辑如何共存 | E1、E2 | **未开始**（设计就绪，E1 最优先） |
| C2 干预呈现 | L1–L4 同屏是否互扰；提示生命周期与降档 | E3 | 未开始 |
| C3 跨设备输入消歧 | 笔/触摸三档消歧的代价 | E4 | 未开始 |
| C4 公式渲染 | KaTeX × 块编辑器 × 公式内锚定 | 待定义 | 未开始（选型假设已列） |
| C5 Agent–Workspace 边界 | 四原语是否够用 | 待 R2 后定义 | 未开始 |


---

## 8 · C1 · 内容层与锚定

**状态：未开始 · E1/E2 设计就绪（2026-10-26）**

### 问题

引入 schema 化块编辑器后，"块 id + position + quote+occurrence" 三段锚能否在保存、
重开、多轮编辑后稳定指向同一内容；Agent 建议落进块层后，用户编辑与撤销如何共存。

### 当前证据（来自 Part II）

- 三段式锚已在仓库 `blockOps` 有原型（§6.2）；
- **整页删重插保存与锚定存在结构性冲突**——本报告识别的最高优先级风险（§2.3、§6.2）；
- Tiptap 的事务模型与 schema 扩展是候选地基，**未实测**（[DH]，§4.4）——"最快验证
  路径"是待检假设，不是结论。

### E1 · 块锚定的存续性（最高优先级）

- **RQ**：引入 schema 化块编辑器后，块 id + position+quote+occurrence 锚能否在
  保存/重开/多轮编辑后稳定指向同一内容？
- **H**：三段复核锚在 Tiptap 事务模型下，常规编辑（改字/插块/删块）后仍可解析到
  正确内容，或显式降级为块级。
- **Minimal Setup**：一个 10 块文档 + 5 个锚；脚本执行 20 次随机编辑 + 保存重开。
- **Scope**：Tiptap PoC（不含协同、不含后端）。
- **成功**：≥90% 锚精确恢复；**失败**：锚错位且无降级提示。
- **Informs**：编辑器选型 + 是否必须改整页保存协议。

### E2 · 双方编辑冲突与撤销

- **RQ**：Agent 建议卡被采纳进块层后，用户 undo 的语义是什么？
- **H**：Agent 采纳 = 一个可整体撤销的事务；用户在采纳后的编辑不影响"撤销 Agent 插入"
  的正确性。
- **Setup**：E1 的 PoC + 一个模拟 Agent 插入按钮。
- **成功**：撤销后文档回到采纳前状态，且用户后续编辑保留；**失败**：撤销丢用户内容。
- **Informs**：Agent 写入通道的设计（§6.3）。

### 结果

_未执行。E1 优先于一切后续阶段（Roadmap §15 的 R1 进入条件）。_

### 判定

_待 E1/E2 执行后填写。可产出的判定：编辑器选型（Tiptap / ProseMirror / D 现状增强）；
整页保存协议是否必须改。_

### 对推荐的修订

_无（v0 推荐维持 Path C 两步走，以 E1 通过为前提）。_


---

## 9 · C2 · 干预呈现（L1–L4 同屏）

**状态：未开始 · E3 设计就绪**

### 问题

四种干预强度同时存在于一个工作区时，视觉层级是否可辨、是否互相干扰；
被忽略的提示如何收敛（生命周期）；干预的**降档路径**是什么。

### 当前证据

- L1 已有实现（InsightPanel），L3 有原型（AgentMoveCard），L2/L4 未设计（图 1，§5.2）；
- v1 评估补充的两个未答问题进本轮走查提纲：L2 提示堆叠/过期/消失的规则；
  Agent 判断错了，已发出的 L3 怎么收（"建议→采纳"的撤回语义）。

### E3 · 四级干预的同屏呈现

- **RQ**：L1–L4 四种 UI 同时存在于一个工作区时，视觉层级是否可辨、是否互相干扰？
- **H**：Insight 栏（L1）+ 就地提示（L2）+ 内容卡（L3）并存时，用户能区分并分别处理。
- **Setup**：Proposal B 原型注入三种预设干预，邀请 2–3 人走查（think-aloud）。
- **成功**：走查者能说出每条信息的"需要我做什么"且无一类被完全忽略；
  **失败**：某级被当成噪音系统性忽略。
- **Informs**：L2/L3 的默认视觉权重；干预频率上限的启发值。

### 结果 / 判定 / 对推荐的修订

_未执行。_


---

## 10 · C3 · 跨设备输入消歧

**状态：未开始 · E4 设计就绪**

### 问题

笔 + 触摸双通道下，"标注/选择/绘图"的三档消歧（通道 > 上下文 > 末端图标）
错误率与主观负担如何；纯触屏（无笔）下五意图是否可用。

### 当前证据

- 三档消歧与"AI 不做实时裁决"的立场见 §7.3；
- 消歧研究多为通用笔迹界，数学推导场景无直接证据（§16 局限 3）。

### E4 · 平板输入消歧

- **RQ**：笔 + 触摸双通道下，"标注/选择/绘图"的三档消歧（通道/上下文/末端图标）
  的错误率与主观负担？
- **Setup**：iPad/Pencil + Pointer Events PoC，10 个预录手势。
- **成功**：三档消歧后错误率 <10% 且全部可事后改正；**失败**：需要 AI 实时裁决。
- **Informs**：Tablet 是否进 MVP，还是纯触摸先行。

### 结果 / 判定 / 对推荐的修订

_未执行。_


---

## 11 · C4 · 公式渲染

**状态：未开始 · 选型假设已列（v1 评估补入的盲点，自架构对比章移入）**

### 问题

KaTeX/MathJax 与块编辑器的集成方式；公式是否作为原子块；公式**内部**的锚定
（锚到"等号右边那一项"）是否进 MVP。

### 当前证据

1. **渲染引擎** [EJ]：MVP 取 **KaTeX + 自定义原子块**——公式在块层是不可进入光标的
   原子节点，渲染走 KaTeX；把"公式内编辑"完整排除出 MVP，换取锚定与性能的确定性。
   （候选：MathJax v3 更全但较慢；Tiptap 数学扩展成熟度参差。）
2. **公式内的锚定** [DH]：MVP 把公式作为整体锚（blockId 级）；公式内锚定需要公式 AST，
   成本陡增，列为 E1 的扩展问题。
3. **与手写的关系**：手写 ink 与公式块是两种对象，不做实时互转——OCR 到 LaTeX 是
   未来可选能力，不是 MVP 前提。

### 实验

_待定义：选型验证并入 C1 的 Tiptap PoC（公式原子块作为第一个自定义节点）；
公式内锚定作 E1 的扩展组。_

### 结果 / 判定 / 对推荐的修订

_未执行。_


---

## 12 · C5 · Agent–Workspace 交互边界

**状态：未开始 · 四原语为设计假设 [DH]（详见 §14.2）**

### 问题

`read / propose / annotate / reference` 四原语是否覆盖 Socratic 与 Structural
Reconstruction 两类 Method 的全部动作？哪种 move 会逼出第五个原语？

### 当前证据

- **propose 的真实成本是 O(块类型 × move)**——每种 move × 每种块类型都是一张独立的
  建议卡组件（v1 评估指出，v0 曾低估为"声明成本一个字段"）；
- Method 计划 Stage 2 的 `MoveHint`（name + prompt_line + 可选 tool）是 move 声明的
  最小形态，与四原语的映射未经验证。

### 实验

_待 R2（真实数据版建议卡）之后定义——原语的验证需要先有可被 move 作用的工作区
（Roadmap §15 的依赖主线：先工作区，后 move 声明）。_

### 结果 / 判定 / 对推荐的修订

_未执行。_


---

# Part IV · 综合判断（随 Part III 修订）

> 本部分是**截至 v0 的最佳判断**，不是最终结论。修订规则：任何 Part III 的判定与
> 本部分冲突时，以判定为准修订本部分并注明依据的线与日期；被推翻的原文保留为
> "历史判断"，不静默改写。


---

## 13 · 架构备选与对比（Task 7）
三条路径按 brief 定义。对比维度取自 Part I–II（§4–§7）的分析：

| 维度 | **Path A** Document-Centric | **Path B** Activity-Centric | **Path C** Hybrid |
|---|---|---|---|
| 核心机制 | 富文本文档树为主，活动嵌在文档里 | 活动/对象构成工作区，文档是一类内容 | 块层（内容）+ 活动层（组织） |
| 代表技术 | ProseMirror/Tiptap 单文档 | 自研画布/组合引擎（已有原型） | Tiptap 块层 + 现有活动原型 |
| 文档支持 | ★★★ | ★★（长文阅读弱） | ★★★ |
| Agent 精准操作 | ★★（需文档内锚定） | ★★★（对象即锚） | ★★★（块 id + 编辑器 mapping） |
| 与仓库兼容 | 中（重写 BlockEditor） | **高**（原型即基础） | **高**（两条线都有） |
| Laptop | ★★★ | ★★ | ★★★ |
| Tablet/Stylus | ★★（文档内手写受限） | ★★（自由但无文档） | ★★（ink 作为块类型可扩展） |
| 状态管理 | 文档版本 | 活动状态（已验） | 两层分别管理（§6.4） |
| 撤销 | 编辑器内建 | 卡片级（已验） | 两级（§6.3） |
| 工程成本 | 中高 | 低（已有） | 中 |
| 技术风险 | 锚定在整页保存下最脆弱 | 长文档场景未验 | **两层的缝合是新风险** |
| 最小可行实现 | 一个 Tiptap 文档 + AI 插件 | 现有原型 + 持久化 | 现有原型 + Tiptap 块实验（E1） |

<figure>
<svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg" font-family="Microsoft YaHei" font-size="11">
  <g>
    <rect x="20" y="20" width="185" height="180" rx="8" fill="#F7F6F2" stroke="#D6D3CD"/>
    <text x="112" y="44" text-anchor="middle" fill="#57534E" font-weight="bold">A · Document-Centric</text>
    <text x="34" y="70" fill="#1F2328">核心：富文本文档树</text>
    <text x="34" y="90" fill="#1F2328">锚定：文档内（脆弱）</text>
    <text x="34" y="110" fill="#1F2328">Agent 内容：文档附件</text>
    <text x="34" y="130" fill="#1F2328">Laptop ★★★ Tablet ★★</text>
    <text x="34" y="152" fill="#B03A2E">风险：与活动为中心</text>
    <text x="34" y="170" fill="#B03A2E">的既定方向相反</text>
    <rect x="228" y="20" width="185" height="180" rx="8" fill="#F7F6F2" stroke="#D6D3CD"/>
    <text x="320" y="44" text-anchor="middle" fill="#57534E" font-weight="bold">B · Activity-Centric</text>
    <text x="242" y="70" fill="#1F2328">核心：活动/对象组合</text>
    <text x="242" y="90" fill="#1F2328">锚定：对象即锚</text>
    <text x="242" y="110" fill="#1F2328">Agent 内容：一等公民</text>
    <text x="242" y="130" fill="#1F2328">Laptop ★★ Tablet ★★</text>
    <text x="242" y="152" fill="#B03A2E">风险：长文阅读无答案</text>
    <text x="242" y="170" fill="#B03A2E">（主场景之一）</text>
    <rect x="436" y="14" width="185" height="192" rx="8" fill="#FDF3E3" stroke="#8A5A2B" stroke-width="1.6"/>
    <text x="528" y="44" text-anchor="middle" fill="#854F0B" font-weight="bold">C · Hybrid（推荐）</text>
    <text x="450" y="70" fill="#1F2328">块层（内容，Tiptap 实验）</text>
    <text x="450" y="90" fill="#1F2328">+ 活动层（组合，已有）</text>
    <text x="450" y="110" fill="#1F2328">锚定：块 id + mapping</text>
    <text x="450" y="130" fill="#1F2328">Agent 内容：一等 + 可撤</text>
    <text x="450" y="150" fill="#1F2328">Laptop ★★★ Tablet ★★</text>
    <text x="450" y="172" fill="#854F0B">风险：两层缝合 + E1</text>
    <text x="450" y="190" fill="#854F0B">（先实验再定）</text>
  </g>
</svg>
<figcaption>图 2 · 三路径对比：星数来自 §13 表格；C 的额外风险（两层缝合）不因推荐而消失。</figcaption>
</figure>

**其他候选**（brief 允许提出）：**Path D — 现状增强**（不引编辑器框架，继续自研
BlockEditor，只加埋点与干预 UI）。它的优势是零迁移成本，劣势是锚定/undo/协同的
地基永远是自研的——列为对照项而非推荐。

---

---

## 14 · 推荐技术路线（Task 8）

> 状态：**截至 v0 的最佳判断**；修订以 Part III 各线的判定为准。
### 9.1 推荐：**Path C（Hybrid），两步走** [EJ]

**第一步（已基本完成）**：Activity-Centric shell —— Proposal B / 画布原型已验证
"活动为主对象、Agent 内容落工作区、跨视图状态连续"。

**第二步（本轮推荐的新工作）**：在活动流内引入**块内容层**（Tiptap 实验起步），
把现有五类块迁入 schema 化的块模型，获得：

- 稳定的块 id 与 position mapping（解决锚定的结构性风险，E1）；
- 内建 undo/redo 与事务模型（解决 Agent/用户编辑冲突的地基，E2）；
- 成熟的 schema 扩展路径（ink 块、练习块、Agent 卡片都是**自定义节点**）。

**为什么不选 A**：文档中心会把 Agent 内容与活动再次降为"文档里的附件"——与已批准的
Activity-centric 决策方向相反；且锚定问题在纯文档模型下并不更容易。

**为什么不选 B（纯活动）**：特征向量原型验证的是"一个实验性活动"，但 Focus Mode 的
主场景仍包含**长文档阅读**（产品上下文 §3 第一条）——纯活动组合对"连续阅读 40 分钟"
没有答案。

**为什么不选 D（现状增强）**：整页删重插保存与锚定的冲突是结构性的；自研 undo 与
未来的协同成本会持续累积。D 可作为 E1 的对照组。

### 9.2 最小 Agent–Workspace 交互边界（本轮最重要的架构产出）[DH]

**Agent 与工作区之间只需要四个操作原语**（不需要 DSL/Runtime）：

1. **锚定读取** `read(anchor)`：按锚读取内容（已有 `read_page`，需升级为块级锚）；
2. **建议插入** `propose(move, anchor, payload)`：产生一张建议卡（L3），用户采纳才
   落为块；**永不直接写用户正在编辑的层**；
3. **状态标注** `annotate(observation)`：记录观察（不打扰），进证据层；
4. **活动引用** `reference(element)`：指向画布/活动元素（Mala 已有先例）。

这四个原语把"Method 指导策略、Learning Move 表达行动"翻译成可实现的接口：
**Method 在 directive 里声明它期望的 moves（决策日志 P1 的最小实义），
Agent 把 move 翻译成 2–4 号原语的调用，工作区负责呈现与保护**。

### 9.3 暂不必要的抽象

- Learning Move DSL / Schema 系统（P1 未定型）
- Universal Workspace Runtime / 插件化元素系统
- Method Runtime（Method 插件 = 数据 + 纯函数，已足够）
- 多 Agent 编排
- 自研无限画布引擎（tldraw 作为 Stage 2 备选，未到决策点）

### 9.4 尚未验证的风险清单

1. 块 id 在引入编辑器框架后能否稳定跨保存（E1）；
2. Agent 建议卡 → 用户采纳 → 正文合入的 undo 语义（E2）；
3. 渐进干预在同一工作区内四种呈现是否会互相干扰（E3）；
4. 平板纯触屏（无笔）下五意图的可用性（E4 的子问题）；
5. Agent 主动性在真实使用中的频率/价值比——没有任何仓库或外部证据 **[ORQ]**。

---

## 15 · Development Roadmap（Task 10）
> 不含时间与人力承诺；每阶段有**进入条件**与**决策节点**。

| 阶段 | 内容 | 进入条件 | 技术目标 / 验收 | 决策节点 |
|---|---|---|---|---|
| **R1 Technical Validation** | E1（锚定）+ E2（冲突撤销）+ E4（消歧 PoC） | 本报告获批 | E1 ≥90% 锚恢复；E2 撤销语义成立；E4 错误率 <10% | 编辑器选型（Tiptap vs ProseMirror vs D 现状增强） |
| **R2 Interaction Prototype** | 把 Path B 原型的块内容迁入选型编辑器；L2 提示 + L3 建议卡的**真实数据**版 | R1 通过 | Proposal B 全部既有验收在新内容层复现 | 是否开始 MVP |
| **R3 Minimum Viable Focus Mode** | 文档块 + note + 一次 Agent 建议流（锚定 → 建议卡 → 采纳/拒绝）+ 返回画布 | R2 通过 | 现有原型验收项 + 数据真持久化 | MVP 是否接 Canvas |
| **R4 Agent Integration** | Method moves 声明进 prompt（Method 计划 Stage 2）+ propose 原语接入工具层；L4 确认协议。**⚠️ 进入条件追加（v1 评估）：C2 埋点（读到哪/在做什么）已上线** —— 没有信号源，主动干预全是伪触发 | R3 通过 **且** C2 埋点可用 | Agent 的每个工作区动作可溯源于 move；L4 有确认与完整退出 | SWITCH/闭环的形态 |
| **R5 Cross-device** | Pointer Events 分流 + ink 块类型 + 触屏五意图验收 | R3 通过（与 R4 并行可） | 纯触屏五意图可用；笔消歧按 E4 结论 | Tablet 进 MVP 或延后 |

**依赖主线**：E1 → 编辑器选型 → R2 → R3 → (R4 ∥ R5)。Method moves（决策日志 P1）
在 R4 才进入代码——**先有可被 move 作用的工作区，再定义 move 的声明格式**，
顺序不可颠倒。

---

## 16 · 局限与开放问题
1. **"读到哪"信号缺失**是 Agent Initiative 的最小前提，本报告只指出未解决；
2. 干预频率/价值的实证数字：AIRIS 不提供、行业无公开、仓库无埋点——**[ORQ]**；
3. 手写消歧的研究多为通用笔迹界（非数学推导）；数学手写识别（如 MyScript 类）的
   准确率与成本未评估；
4. 协同编辑（多人/多 Agent）超出范围，但 Tiptap/ProseMirror 的 Yjs 路径已预留；
5. Keyhole Effect 的时间数字是模型估算（原作者标注待实证），引用时只取方向；
6. 本报告的场景（A/B/C）是推演产物，尚未经真实学习者检验——这本身是 R3 之后的
   一个研究任务。

---

## 17 · 参考文献（编号，经检索核实）
> **来源等级标注（v1 评估补）**：#1–#8 为学术来源（其中 #5、#6 为 arXiv **预印本，未经同行评议**）；
> #9–#13 为官方产品/项目文档；#14 为**行业实践类（厂商博客与顾问文章，非学术）**——
> 其模式描述可信，但"有效性"无实证背书；#16 为仓库内部事实。

1. Kirsh, D., & Maglio, P. (1994). On distinguishing epistemic from pragmatic action.
   *Cognitive Science*, 18(4), 513–549.
2. Hutchins, E. (1995). *Cognition in the Wild*. MIT Press.
3. Hollan, J., Hutchins, E., & Kirsh, D. (2000). Distributed cognition: Toward a new
   foundation for human-computer interaction research. *ACM TOCHI*, 7(2), 174–196.
4. Clark, A., & Chalmers, D. (1998). The extended mind. *Analysis*, 58(1), 7–19.
5. *The Keyhole Effect: Why Chat Interfaces Fail at Data Analysis*
   (2026). arXiv:2602.00947.
6. Kuhn, J., Gerjets, P., Trautwein, U., et al. (2026). AI-Augmented Inquiry and
   Regulation in Hybrid Systems (AIRIS). arXiv:2608.21618.
7. Horvitz, E. (1999). Principles of mixed-initiative user interfaces. *CHI '99*.
8. Sweller, J. Cognitive Load Theory（综述见 Sweller, van Merriënboer & Paas, 2019,
   *Educational Psychology Review*）。
9. tldraw 官方文档与案例（tldraw.dev，2026 检索；Chat starter kit / make real）。
10. Heptabase 产品定位与功能（heptabase.com，2026 检索）。
11. Obsidian Canvas / JSON Canvas 格式（obsidian.md，2026 检索）。
12. Khanmigo（Khan Academy）：Socratic guardrail 设计（khanmigo.ai，2026 检索）。
13. NotebookLM：closed-corpus RAG 与逐条源引用（Google，2026 检索）。
14. Agentic UX 模式汇编：Zylos（AG-UI / GenUI 三模式 / approval gates，2026-05）；
    Zooz（七种共存模式 / 五级自主权）；David John（latency as material / grounding
    as affordance）。
15. ProseMirror 官方文档（prosemirror.net）；Tiptap / Lexical 对比（2025–2026 检索）。
16. 仓库内部文档与代码（全部为 2026-10 时点 practice-system 分支）：`docs/decisions/
    agent-principles.md` · `docs/decisions/rnd-real-time-interaction.md` ·
    `docs/architecture/method-system.md` · `VISION_GAPS.md` ·
    `backend/ai/tools/declarations.py` · `backend/services/doc_service.py` ·
    `frontend/src/features/space-canvas/` · `/preview/focus-activity` 原型及验收脚本。

---

*报告完。后续动作：Stage 0 拍板 → R1 实验排期（E1 最优先）。*

---

---

*报告完。报告分四部分：I/II 冻结与产品层，III 是唯一生长区，IV 随 III 修订。
后续动作：C1（E1）排期 → 按判定修订 Part IV。*
