# Evidence Flow · 证据如何进入系统、如何影响教学、如何被追溯

> **基线** `user-profile @ 86a60dca` · **日期** 2026-10-10 · **状态**：跨模块的术语与链路权威
> **零产品代码改动。**
>
> ⚠️ **本文取代 `EVIDENCE_FEEDBACK_V0.md`**（同一轮先写的草稿，已 `git rm`）。
> 那一份用「六个功能领域 T1–T6」作骨架；本任务要求的是「六条链路 A–F」，
> 两者是**同一套内容的两种切法** ⇒ 保留链路作骨架、把领域压成 §3.8 的一张映射表。
> ⚠️ **不是两份并存** —— 并存就会变成两套平行定义。
>
> **上游（本文档不重复定义它们）**：`backend/ai/knowledge/PORTABLE.md`（分析核心契约）·
> `LEARNER_STATE_V0.md` · `SPACE_MEMORY_V0.md` · `GLOBAL_AGENT_V0.md` ·
> `METHOD_V0_PLAN.md` · `TRAJECTORY_V0_PLAN.md` · `FREE_COURSE_V3.md`
>
> **诊断类**：`learn-space-wiring-report.md`（接线审计）· `FREE_COURSE_BLUEPRINT_AUDIT.md`
>
> **下一步（≤5 行）**
> ① 六条链路里**只有 B 的一部分是 IMPLEMENTED_AND_VERIFIED**：分析核心能算状态，
>    但**生产里只有 2 个触发点**，Free Course 的作答记录**只被 `count()` 读过**。
> ② **Coordinator 至今没有独立文档** —— 本文 §3.5 是它第一次有定义，标 `DESIGNED_NOT_IMPLEMENTED`。
> ③ 第一阶段闭环仍是**把 `is_correct` 接进已存在的 `admit_outcome`**，不是新建机制。
> ④ **术语冲突已处理一处**：`LEARNER_STATE_V0.md` 的「按 KST 思路」与「不做 Knowledge Tracing」
>    并不矛盾（见 §2.4），已写明以免下一位读者误判。
> ⑤ **两种「证据」必须分开**：学习证据 vs 系统证据（§6）—— 混用会让人拿 UI 截图当学习效果。

---

## 1 · 对象定义

⚠️ 这六者**不是六个阶段的容器**，而是六种**职责不同的东西**。混淆它们是文档失效的主因。

| | 是什么 | 回答 | 不是什么 |
|---|---|---|---|
| **Event** | 系统里实际发生的一件事（提交答案 / 改作品 / 开始交互 / 离开又回来 Space） | **发生了什么** | ❌ 不等于学习证据 |
| **Evidence** | 支持某项**学习判断或结果判断**的依据（对概念的回答 / 独立推导 / 修改前后作品 / 迁移应用 / 多次尝试呈现的规律） | **凭什么这么判断** | ❌ 不是每条 Chat Message、每次点击、每次课程访问 |
| **Learner State** | 用户**当前**的知识与能力状态 | **现在会什么** | ❌ 不是完整历史；❌ 不是模型猜的 |
| **Knowledge Structure** | 知识之间的结构与依赖 | **这些概念怎么关联** | ❌ 不假设每条 Evidence 都自动改结构 |
| **Coordinator** | 读 Goal + State + 相关 Evidence，决定**要不要行动、行动哪一类** | **下一步做什么** | ❌ 不是常驻 Agent，不是自主规划器 |
| **Method** | 具体的认知干预：让用户做什么、观察什么、**什么条件算这一轮完成** | **怎么教** | ❌ 不接管全局编排，不绕过状态更新 |

### 1.1 两条不可违反的原则

**A · Evidence ≠ State**
「答错」是 Evidence；「这个知识点待确认困难」是 State；而「他不理解」是 Interpretation ——
**三者必须分开表述**。不能凭一次错误断言长期不会。

**B · State Update ≠ Learning Improvement**
**记录了困难 ≠ 系统更会教了。** 只有后续结果里出现有意义的改善，策略的有效性才能被判断。
⚠️ **短期答对 / 理解与解释 / 迁移 / 长期保持是四种不同性质的结果，不能互相替代**，
而本仓库今天**只能测第一种**（§7 D 层）。

---

## 2 · 核心闭环与它的实际语义

```text
Learning Experience → User Action → Evidence → Learner State Update
        ↑                                      ↓
        └──── Next Learning Experience ← Coordinator Decision ← Method
                                    ↺
```

⚠️ **这是概念层主链路。实际运行时**，以下情况都会发生且必须能被观察：

| 情况 | 系统该怎样 | 今天的状态 |
|---|---|---|
| 没有产生有效 Evidence | 不更新状态，不报错 | ⚠️ `resolve_item` 失败时**静默不写**（`conversation_tool_service.py:579-600`）|
| 新 Evidence 不足以改变 State | **保留原状态**，不是错误 | ✅ `derive_state` 是纯函数，同输入同输出 |
| Evidence 与既有判断冲突 | **保留依据与不确定性**，不覆盖 | ⚠️ 结构层有 `revise`，**证据层的纠正路径没实现** |
| State 没有变化 | ⚠️ **不能默认 Evidence 无效** —— 可能是「已在那个状态」 | 🔴 无从区分：没有状态变更日志 |
| Coordinator 怎么知道 Evidence 与 Goal 相关 | 读结构化状态，**不做语义匹配** | 🔴 `rules.py` **grep `goal` = 0 命中**（快照填了 `goal`，规则层不读）|
| 决策是否真被执行 | 应可追踪 | 🔴 `turn_start` **零生产者** ⇒ 每轮不咨询决策层 |
| 失败的回流能否被发现 | 应有事件 ID 可追 | ⚠️ 只有 `Provenance`，无统一 trace |

⚠️ **后四行是「Open Question / Future Design」，本文档不给算法。**

---

## 3 · 六条核心链路

### 3.1 Chain A · Learning Experience → Evidence

⚠️ **不同体验产生不同类型的证据，不能强制统一。**

| 体验 | 可能产生的证据 | 今天的实际 |
|---|---|---|
| **Free Course** | 回答 · 尝试 · 练习 · 自己解释 · 迁移 | ⚠️ 有 observation 表，但**只被 count**（§4 T2）|
| **Video Course** | **观看本身不等于学会**，需结合可观察行为 | 🔴 未核（不在本文档范围）|
| **Casual Chat** | 只有部分交互构成有效证据 | ⚠️ **唯一真进闭环的一条**（`evidence_entry`），但**由模型自主决定是否调用**（`ai/client.py` 无 `tool_choice`）|
| **Focus / Artifact** | 作品创建 · 修改 · 独立重构 · 反馈后改进 | 🔴 **Focus 里零个交互通向 evidence**（见 wiring report BL-2）|

### 3.2 Chain B · Evidence → Learner State

```
admit_outcome（evidence_entry.py:141）→ compute_state（读时算）→ derive_state
                                    → counterexample 落库（唯一的回写）
```
✅ **这条链的代码是完整的**，且有可移植性测试守着（`ai/knowledge/PORTABLE.md`）。

⚠️ **它的调用方只有 2 个**：`conversation_tool_service.py:646` 与 `api/v1/knowledge.py:148`。
**而且后者的前端唯一调用方挂在 `/schedule` 的 dev 面板上。**

### 3.3 Chain C · Evidence + State + Goal → Coordinator

⚠️ **Coordinator 至今没有独立文档。** 本文 §3.5 是它第一次有定义。

既定方向（保持）：**事件触发 · 读必要的结构化状态 · 产出明确决策**。
❌ 不是常驻自主 Agent、不是持续规划器。

⚠️ **它的输入有一个已知缺口**：`rules.py` 不读 goal ⇒
「目标变了 → 下一轮说法变了」这条链在决策侧**不存在**。

### 3.4 Chain D · Method → Evidence

Method 应声明三件事：**让用户做什么 · 观察什么 · 什么条件算完成**。

⚠️ **完成条件目前是死代码**：`ai/methods/completion.py` 整个模块生产零调用，
`completion_met` / `rule_owes_completion` / `restore_rule` 的调用方全在测试里。
⇒ **「这一轮完成了」今天没有运行时判定。**

⚠️ 且 Method **不接管编排**：新 Evidence 交还给 §3.2 那条链，不自己写状态。

### 3.5 Coordinator · 第一次定义

| | |
|---|---|
| 读 | Goal · Learner State · 相关 Evidence · 当前上下文 · 可用 Method 清单 |
| 产出 | 一个明确决策：`INTRODUCE` / `REVIEW` / `CONTINUE` / `HOLD` / `END` |
| **不** | 常驻运行 · 自动读全部历史 · 自己排课 · 绕过状态更新 |
| 实现 | ⚠️ `coordinator_service.py` 存在；**executor 对三种 action 一律 `return "handed_to_global_agent"` 而无 agent 被调用** |
| 状态 | **DESIGNED_NOT_IMPLEMENTED** |

⚠️ **与 Global Agent 的边界**：Coordinator **决定「做什么类别的干预」**，
Agent **执行具体的话**。⚠️ 今天这两者的边界在代码里是空的（executor 不调用任何人），
所以边界目前**只存在于本文档**。

### 3.6 Chain E · Artifact → Evidence

> **Artifact 完成 ≠ 学习完成；作品质量 ≠ 用户的独立能力。**

⚠️ 两条今天的硬限制：
- 编辑文档**不进 Learner State**（`pages.py` 内 evidence 零命中）
- 页面保存**整页删掉重插** ⇒ **无版本历史** ⇒ 「修改前后」这个概念目前无法还原

### 3.8 六个功能领域 ↔ 六条链路（映射，不是两套分类）

⚠️ **领域与链路不是同一个维度**：链路是**数据怎么流动**，领域是**证据生命周期的位置**。
同一份记录可以同时属于 T2 与 Chain A。**不要把它们当成两套分类去维护。**

| 功能领域 | 位置 | 主要链路 | 今天状态 |
|---|---|---|---|
| **T1 即时交互反馈** | 当前会话 | Chain A → 当次决策（不落库） | PARTIALLY_IMPLEMENTED |
| **T2 结构化学习观察** | 结构化记录 | Chain A → B | PARTIALLY_IMPLEMENTED |
| **T3 跨会话与跨模式** | 模式之间 | Chain B（跨模式分支） | NOT_DEFINED |
| **T4a Space Source** | 空间内材料 | Chain A（回答依据） | IMPLEMENTED_AND_VERIFIED（检索受限）|
| **T4b Space Memory** | 空间内复用 | Chain A → D | PARTIALLY_IMPLEMENTED（**用户无入口**）|
| **T5 课程规划与调整** | 蓝图 | Chain C → 下一轮 Experience | 偏好侧 IMPLEMENTED · **证据侧 NOT IMPLEMENTED** |
| **T6 结果与长期评估** | 后续 | 回评此前决策 | DESIGNED_NOT_IMPLEMENTED |

### 3.7 Chain F · Evidence → Knowledge Structure

**V0 保持简单可解释。** 现有机制只有一条：
**一条边被证据反驳两次才退役，除非有人确认过**（`ai/knowledge/` 的 `revise`）。

⚠️ **不假设每条 Evidence 都会创建或修改知识关系。**

#### 关于「KST」的一处澄清（避免误判为冲突）

`LEARNER_STATE_V0.md` 说「按 ALEKS / KST 的**核心思路**」，同一份文档的「刻意不做」里
列着 **Knowledge Tracing / Neural KT**。

⇒ **两者不矛盾**：借的是「从证据推导状态」这个思路，**不是 KT 算法**。
⚠️ 记在这里是因为本文档其它地方说「不引入复杂 Knowledge Tracing」，
不澄清就会看起来像冲突。

---

## 4 · 成熟度表

**状态标记（五档，全文统一）**

| 标记 | 含义 |
|---|---|
| `IMPLEMENTED_AND_VERIFIED` | 代码存在 **且** 有运行/测试证据确认行为 |
| `PARTIALLY_IMPLEMENTED` | 有实现或数据基础，**闭环未打通** |
| `DESIGNED_NOT_IMPLEMENTED` | 有明确设计，无实现 |
| `NOT_DEFINED` | 需要但连规则都没有 |
| `UNKNOWN` | 缺证据，不下结论 |

| 链路 / 领域 | 证据来源 | 现有实现 | 当前限制 | 回流去向 | 最小下一步 | Eval | 状态 |
|---|---|---|---|---|---|---|---|
| 分析核心 | Evidence + 结构 | `admit` / `derive_state` / `revise` / `fringes` | **生产触发点仅 2 个** | Learner State | 增加触发点 | A/B/C | **IMPLEMENTED_AND_VERIFIED**（机制）/ 被调用不足 |
| **Chain A** Free Course | 作答 | `course_lesson_observations` 五字段 + 写入 `free_course_service.py:605` | **三处读取全是 `count()`**（`:722`、`free_course_events.py:553-556`）| 应进 State | 见 §8 | C | **PARTIALLY_IMPLEMENTED** |
| Chain A · Focus | 编辑 / 漫游 / 侧栏 | 无 | **零个交互通向 evidence** | — | 先有判定面 | C | **DESIGNED_NOT_IMPLEMENTED** |
| Chain B | Evidence → State | `admit_outcome` 全链 | 冷启动返回「还没有证据」 | prompt 每轮重算 | — | B | **IMPLEMENTED_AND_VERIFIED** |
| Chain C | State + Goal | `coordinator_service.py` | **`rules.py` 不读 goal**；`turn_start` 零生产者 | 决策 | 发一次事件 | C | **DESIGNED_NOT_IMPLEMENTED** |
| Chain D | Method → Evidence | `method_episodes` 表 + `completion.py` | **零生产写入方 · 完成判定死代码** | 承诺与兑现 | 见 §8 | C | **DESIGNED_NOT_IMPLEMENTED** |
| Chain E | Artifact | `page_blocks` | **整页删掉重插 ⇒ 无版本** | — | 版本或 diff | A | **PARTIALLY_IMPLEMENTED** |
| Chain F | Evidence → 结构 | `revise`（反驳两次才退役） | 只改结构，不改状态 | 结构 | — | B | **IMPLEMENTED_AND_VERIFIED** |
| **Cross-mode** | 三个模式 | 三套独立的表 | **无共同提交面 · 无冲突规则 · 无置信度** | 共享底座 | 先定义共享范围 | — | **NOT_DEFINED** |
| **T6 结果评估** | 后续表现 | 仅 `is_correct`（课程内） | 迁移 / 保持**无任何测量能力** | 回评决策 | 相似题独立表现 | D | **DESIGNED_NOT_IMPLEMENTED** |

⚠️ **上表里没有一条链是端到端 `IMPLEMENTED_AND_VERIFIED`。**
**最接近的是 Chain B，但它的触发点只有 Agent 工具那一处。**

---

## 5 · Knowledge Structure · V0 的位置

| | |
|---|---|
| 是什么 | 概念之间的结构与依赖 |
| 与 Evidence 的关系 | **证据可以辅助识别前置缺口与需要验证的依赖**（Chain F），但**不假设每条证据都改结构** |
| V0 的样子 | 一条边被证据反驳两次才退役，且人确认过的不退役 |
| 冷启动事实 | 🔴 **新产品没有知识结构** ⇒ `resolve_item` 必然失败 ⇒ Evidence 写不进去（见 wiring report BL-1）|
| 不做 | 复杂 Knowledge Tracing · 神经 KT |

---

## 6 · 两种「证据」必须分开

⚠️ 这是最容易出事的一处：**同一个词指两件事，且都会被叫做「证据」**。

| | Learner Evidence 学习证据 | System / Product Evidence 系统证据 |
|---|---|---|
| 回答 | 用户**实际表现出了什么**？这对状态意味着什么？ | 某条运行链路**是否真的成立**？哪一步失败了？ |
| 服务于 | Learner State · Coordinator · Method · Trajectory | 开发调试 · 质量验证 · 接线审计 |
| 例子 | 一次作答的 `is_correct` 与其来源 | 「答案提交了但没产生 Evidence」「Evidence 存了但 State 没动」「UI 显示成功但后端没落库」 |
| **绝不能混** | ❌ 不能拿「UI 层级错了」当学习证据 | ❌ 不能拿「用户答错」当管线缺陷 |

### 6.1 已知的 System Evidence（本文档调查时确认的）

| # | 现象 | 位置 |
|---|---|---|
| S-1 | 答案提交了但没进 Evidence | Free Course 三处读取全是 `count()` |
| S-2 | Evidence 存了但 State 未变（无法区分「没变」与「变了但没记」） | 状态是读时算，**无变更日志** |
| S-3 | 决策产生了但 Method 未启动 | `turn_start` 零生产者 + executor 三种 action 空转 |
| S-4 | Method 执行了但结果没回流 | `method_episodes` 零写入方 |
| S-5 | UI 成功而后端未落库 | ⚠️ 未确认 —— **UNKNOWN**，需按 §9 验 |
| S-6 | preview 页只能用固定 id 打开，id 不符时只说「加载失败」 | `FreeCourseBlueprintPreviewPage.tsx:30` |

### 6.2 怎么追踪（**复用现有设施，不建新平台**）

| 手段 | 现状 |
|---|---|
| 事件 / 关联 ID | ⚠️ `Provenance` 有来源，但**无跨组件统一 trace id** |
| 表作为证据 | ✅ 有效 —— 本次多条结论都是直接查库得出的 |
| 断言脚本 | ✅ `render_*.mjs` 离屏断言（⚠️ 结构变更后会失效，须同步） |
| **缺口** | 🔴 **没有「这条 Evidence 被谁读过」的任何记录** ⇒ §3.2 的「只有 2 个触发点」这类结论只能靠人工 grep |

⚠️ **建议的最小做法（PROPOSED）**：不建可观测平台，
只在现有 `Provenance` 上加一个 `consumed_by` 字段或一张极小的读取日志表。
⚠️ **未决策** —— 因为它可能只是让人更容易发现「没人读」这一种情况。

---

## 7 · Eval 四层

⚠️ **不为整个系统设计总分。** 不同回流路径用与其目标匹配的方式。

**A · Evidence Capture** —— 收对了吗
来源可追溯？（`CourseLessonObservation.object_id` ✅）· 有遗漏吗 ·
**有没有把推断存成事实**（User Home 有 candidate/confirmed 分层 ✅，**space 级 Memory 没有** ❌）·
同一事件重复计入？（**UNKNOWN**，§9 要验）

**B · Interpretation & State Update** —— 解释与变更合理吗
有证据支持 · 事实与推断分开 · **能处理冲突与不确定性**（🔴 **今天全部不能 —— 没有置信度字段**）·
**新证据能否纠正旧判断**（结构层 ✅，证据层 ❌）

**C · Decision Influence** —— 真的影响决策了吗
🔴 **今天唯一有抓手的一层**：证据有没有被读取 · 哪项教学行为因此变了 ·
**没有相关证据时行为是否不同**（反事实，需要对照）

**D · Outcome Evaluation** —— 改了之后变了吗
即时效果（`is_correct` 可测）· 相似题独立表现（🔴 需跨课节追踪）·
新情境迁移（🔴 无）· 延迟保持（🔴 无，需跨会话时间轴）

⚠️ **「系统执行了适应」≠「适应成功」。** 需要对照的个性化与学习方法，
必须记录基线、对照条件、结果与未验证假设。

---

## 8 · 路线：第一阶段只做一件事

### 把一次课程作答接进 Learner State

| | |
|---|---|
| **候选路径** | `CourseLessonObservation` → `admit_outcome` → Learner State → 下一次教学 |
| **支持证据** | ✅ `admit_outcome` 存在（`evidence_entry.py:141`）· ✅ Agent 那条 handler 完整 · ✅ `is_correct` 有值 · 🔴 **但新课程没有知识结构** |
| **依赖** | 分析核心（**零改动**）· ⚠️ 知识结构写入面（可能得先做） |
| **不做** | 新表 · 新 prompt · UI · T1/T3/T5 |
| **验收** | ① 答错 → 该 item 变待确认 ② 答对 → 恢复 ③ **同一事件不重复计入** ④ pytest + vitest 全绿 |
| **能验证** | §7 的 **A / B / C** |
| **不能声称** | ❌ 学习效果提升（要 D）· ❌ 迁移 · ❌ 保持 |

⚠️ **这个阶段的阻塞不是「缺一个回流机制」，而是「新产品没有知识结构」** ——
与 wiring report 的 BL-1 同一件事。

---

## 9 · 未决与待验

| | 什么 | 怎么验 | 状态 |
|---|---|---|---|
| **U-1** | Free Course `is_correct` 的语义质量（LLM 判开放题 vs 本地判客观题） | 读 `free_course_service.py` 的判定分支 + 抽样看 | **UNKNOWN** |
| **U-2** | 四种结果无法区分 | 需先定义可测的迁移任务 | **DESIGNED_NOT_IMPLEMENTED** |
| **U-3** | 证据驱动的课程调整收益 | 连基线都没有 | **NOT_DEFINED** |
| **U-4** | 同一事件是否被重复计入 | 查库比对 observation 与 evidence 计数 | **UNKNOWN** |
| **U-5** | 「UI 成功而后端未落库」是否真的发生过 | 按 §6.1 S-5 复现 | **UNKNOWN** |
| **U-6** | Cross-mode 共享哪些状态 | 产品决策 | **NOT_DEFINED** |

---

## 10 · Trajectory 在本体系里的位置

> **Trajectory 不拥有独立的学习语义数据库。** 它是既有语义来源在时间维度上的**投影**。

| | 是什么 | **不是**什么 |
|---|---|---|
| **Trajectory** | Space 随时间如何演化 | ❌ 第二套 Evidence System |
| **Evidence** | 支持具体判断的依据 | ❌ 全部历史事件 |
| **Learner State** | 用户当前的学习状态 | ❌ 状态变化的日志（**它不存历史**）|
| **Space Memory** | 为后续工作保留的空间内信息 | ❌ 「把所有历史塞进记忆」 |

**每个节点要能回答四问**，缺第三问是日志，缺第四问是 AI 编的故事：

```
What happened → What changed → Why we think so → What this changes
```

⚠️ **当前的数据前提**：§4 的表里 **State Change / Goal Change / Method / Milestone 四项缺或弱**，
所以 Trajectory 今天**只能是 mock**。⚠️ 其中最关键的 `State Change` 缺失，
根因就是 Learner State 是**读时算、从不存储** ⇒ 没有「变化」这个事实可读。

交互形态（可拖动 / 缩放 / hover）见 `TRAJECTORY_V0_PLAN.md`；
⚠️ **那一份是 UI 计划，本文是语义边界** —— 两者不要混读。

---

## 11 · 与其它文档的分工

| 文档 | 负责 | **不**负责 |
|---|---|---|
| `backend/ai/knowledge/PORTABLE.md` | 分析核心的**可移植契约** | 证据从哪来 |
| `LEARNER_STATE_V0.md` | State **是什么、怎么算** | 证据怎么进 |
| `SPACE_MEMORY_V0.md` | Space Memory 的规划与边界 | 跨模式共享规则 |
| `GLOBAL_AGENT_V0.md` | Agent **读得到什么** | 全局编排 |
| `METHOD_V0_PLAN.md` | 两种教法的插件化 | 完成判定的运行时 |
| `TRAJECTORY_V0_PLAN.md` | Trajectory 的**交互形态** | 它的语义边界（本文 §10）|
| **本文** | Event/Evidence/State/Structure/Coordinator/Method 的**分界** · 六条链路 · 成熟度 · Eval · 路线 | 上述任何一项的内部定义 |

⚠️ **不重复定义**任何已有概念；发现冲突时**先追溯决策与代码，再写明结论**。

---

## 12 · 明确未定义 / 未决

- **Coordinator 的边界只存在于本文**（§3.5）—— 代码里 executor 不调用任何人，所以那里**没有边界**
- **Method 的完成条件**在 `METHOD_V0_PLAN.md` 里没有对应的运行时判定
- **Cross-mode 共享规则一条都没写**
- **置信度 / 不确定性**在三个 schema 里都没有字段
- **S-5（UI 成功而后端未落库）** 我没有复现，只登记为 UNKNOWN