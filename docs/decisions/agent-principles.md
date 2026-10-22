# Agent Principles V0

> 2026-10-20 写。**这是 Learn Space 对 Agent 自主性、学习交互、环境操作的唯一一份原则文档。**
> 别处不要再写第二份；具体机制的执行细节放进各自的计划文件，原则只在这里。
>
> 上游约束：`architecture/learner-state.md`（状态契约）· `architecture/method-system.md`（Method 系统）·
> `design/adaptive-insight.md`（观察的边界）· `architecture/evidence-flow.md`（证据怎么流）。
> 本文不改上面任何一份的结论，只补一件它们没说的：**Agent 该主动到什么程度，以及主动性以什么形式体现。**

---

## 1 · 六条原则

### A · Agent 主导判断，用户经历探索

> **Agent owns the initiative; the user experiences the exploration.**

Agent 负责判断"下一步该发生什么"；用户感受到的应该是**在学习**，而不是在操作一个规划系统。

不希望用户每一步都要回答：接下来学什么？要不要补前置？真的懂了吗？该读还是该练？这条路径对不对？

**但这不等于剥夺自主性。** 用户随时可以改方向、提新问题、拒绝某个活动、或者干脆自己翻别的东西。
Agent 主导的是**局部学习判断**，不是**控制用户**。

⚠️ 不要把它简化成 "User-led vs Agent-led" 的二选一。两者不是同一个维度上的对立。

### B · 主动判断是原则，主动打扰不是

三件事要分开：

| | 是什么 | 是不是默认 |
|---|---|---|
| **Proactive judgment** | 主动理解情境、形成判断 | ✅ 核心能力 |
| **Proactive action** | 按判断改变环境 / 组织学习 | ✅ 核心能力 |
| **Proactive interruption** | 主动打断用户当前活动 | ❌ **不是默认行为** |

**主动判断不等于频繁发言。** 有时候"什么都不说、让他继续"本身就是主动判断的结论。

### C · Learning Move 是 Agent 作用在学习环境上的最小操作

> The minimal operation through which an Agent acts upon the Learn Space learning environment.

它**不必**等于：一条 assistant 消息 / 一次完整教学活动 / 一次状态变化 / 一种固定方法 / 一个 workflow。

候选（**说明性的，不是封闭分类**）：在当前画布展示一个例子 · 对某段内容提一个针对性的问题 ·
插入一道练习 · 把相关材料引进当前情境 · 改变材料的呈现方式 · 把一个问题锚到具体内容上。

⚠️ 此阶段**不设计** Learning Move Runtime / DSL / Graph / Scheduler / 固定操作枚举。
它必须保持可扩展、低耦合。

### D · 学习环境，不是只有聊天

聊天不是 Agent 唯一的输出形式。行动可以体现在：对话 · 正文 · 边注 · 材料 · 练习 ·
交互式可视化 · 未来别的界面。

重点不是"生成更多种类的组件"，而是 Agent 能判断：
**下一步该发生哪种学习活动，环境该怎么支持它。**

⚠️ Focus Mode 不该长期退化成"静态材料阅读器 + 聊天窗口"。
⚠️ 但**不能**因此推翻当前布局 —— 这是方向，不是这一轮的重构任务。

### E · 主动性必须有证据垫底

四件事必须分开说：

1. 用户**实际发生的行为**（他重读了这一段）
2. 对当前活动的**情境解释**（他可能在比对两处定义）
3. 关于**认知状态的假设**（他可能没懂）
4. **有足够证据支持的结论**

例：反复读同一段**不必然**意味着没懂。Agent 可以怀疑，可以用低成本互动去检验，
但**不能只凭这个信号就给他贴一个认知标签**。

**证据不足不是不行动的理由。** Agent 仍可主动探索、确认、试探 —— 但要根据不确定性**调整行动方式**
（比如：先问一句，而不是直接讲；先说"我猜"，而不是给结论）。

### F · 低耦合、可替换

以上都是**产品与交互层面**的指导思想，**不构成必须现在实现的架构**。

明确不做：
- ❌ 不强制引入 Coordinator（已有的不扩展）
- ❌ 不强制引入独立 Scheduler
- ❌ 不修改 Learner State 的定义
- ❌ 不新建 Memory System
- ❌ 不把 Learning Move 硬编码成封闭分类
- ❌ 不把某一种 Method 设成唯一默认教学策略
- ❌ 不因为新理念重新设计所有 Learn Space 页面

将来某个具体机制被实验推翻时，应当能换掉它，而不用推翻整个 Learn Space。

---

## 2 · 能力边界（**按真实代码，不按设想**）

Agent 现在能做的事，全部来自 `ai/tools/declarations.py:21-40` 的九个工具：

| 工具 | 它让 Agent 能做什么 | 属于 |
|---|---|---|
| `read_page` | 读空间里的材料 | 环境（读） |
| `save_note` | 写/改笔记 | 环境（写） |
| `render_desmos_graph` | **在画布上画出图** | 环境（呈现） |
| `read_current_graph` | 读当前画布上已有的图 | 环境（读） |
| `record_evidence` | 记一条学习证据 | 状态（只写证据，不写状态） |
| `remember` | 记住用户说过的事 | 记忆 |
| `load_skill` / `load_point_video` | 取技能说明 / 定位视频 | 辅助 |
| `propose_home_preference` | 建议一条偏好（不能直接确认） | 用户层 |

| 原则 | 当前实现能力 | 现阶段提示词能做到什么 | 后续需要什么 |
|---|---|---|---|
| **A Agent Initiative** | 无强制机制。是否主动完全取决于 prompt 与模型 | 要求它「基于 Goal + 状态 + 材料提出具体下一步」，而不是把选择题抛回给用户 | 一个能被观察的"本轮是否需要推进"判断（不必叫 Coordinator） |
| **B Proactive Judgment** | 同上；`CompletionRule` 已在 Method 层声明"什么算完成" | 区分「可以判断」与「要不要打断」，并要求"不打扰也是一种判断" | 打断成本 / 用户当前活动状态的信号 |
| **C Learning Move** | **已有 4 类真实操作**（读材料、写笔记、画图、记证据），但没有统一抽象 | 要求它在有工具时**用工具改变环境**，而不是用文字描述"你可以画个图" | Learning Move 的**记录**（这一轮做了什么），而非 Runtime |
| **D Environment** | `render_desmos_graph` / `save_note` 已能真正改变可见环境；**不能**插入练习、不能改材料呈现 | 要求"学习行为不只在聊天里"，并点名"有工具时先用工具" | 练习侧的工具；材料的呈现控制 |
| **E Evidence-grounded** | `knowledge_evidence` 只有对错 + 可靠性 + 依据（`architecture/learner-state.md`）；状态是派生的 | 要求区分"观察 / 解释 / 假设 / 结论"，并在不确定时**降低断言强度**而不是沉默 | 一个"假设"的存放处（现在没有：evidence 只能记已经发生的判定） |
| **F Low Coupling** | Coordinator / Method / Insight 都已存在且边界清楚 | 不靠 prompt 实现，只靠文档约束 | —— |

⚠️ **表里最要紧的一行是 D**：Agent 早就能画图了（`render_desmos_graph`），
但 system prompt 里**没有一句告诉它"可以在画布上画"** —— 能力有，提示词不知道。
这是本次最小、最实在的修改点。

---

## 3 · 现有提示词与新原则的冲突（逐条）

主提示词：`ai/prompts/templates/text_chat.system.txt`（19 行，英文）。
它由 `prompts/registry.py` 渲染，注入 `$method_block`（Method 层声明）与
`$space_context`（`prompts/space_context.py` 拼的空间事实）。

| # | 现状 | 与新原则的冲突 | 最小修改 |
|---|---|---|---|
| 1 | 全篇只讲"回答问题要准确、要短、要有例子" | **A / B 缺位**：没有任何"你负责判断下一步"的指令 ⇒ 模型默认走"陪聊 + 等指令" | 加一段 *Initiative*：有 Goal/状态/材料时，提出**一个具体的**下一步；不要用"你想学什么"结尾 |
| 2 | `When a question is ambiguous, ask one clarifying question before answering.` | 本身正确，但**只放在"回答问题"语境里**，容易被读成"每轮都该先问一句" | 补一句：澄清是为了把事做成，不是为了把决定权交回去 |
| 3 | `Never invent facts about the user's courses or videos.` | 只覆盖**事实**，没覆盖**认知状态** ⇒ 与 E 冲突 | 扩成：也不要断言"他懂了 / 没懂"，除非有证据；不确定就说"看起来/我猜" |
| 4 | Tool discipline 只有"不要虚报已做的事" | 与 D 只覆盖了一半：**禁了虚报，没让它在有工具时真去做** | 加一句：有工具时优先用工具改变环境（画图 / 写笔记 / 引材料），而不是只用文字描述 |
| 5 | 没有关于"用户改方向"的指令 | 与 A 的"不剥夺自主性"冲突（模型可能把用户拉回原计划） | 加一句：用户改方向或拒绝某个活动时，跟他的方向走；不要劝回来 |
| 6 | 没有"什么时候不说话"的指令 | 与 B 的"不打断"冲突 | 加一句：不推进也是一种判断；不要每轮都以提问或建议结尾 |
| 7 | `$method_block` 由 Method 层声明（`socratic` / `direct_explanation`） | 与 F 的"不把某方法设成唯一默认"**不冲突**（机制本身是切换的），但 prompt 里没说"这是当前方法，不是唯一做法" | 在 Initiative 段里点明：方法由系统选，不代表所有对话都该长成那样 |
| 8 | 提示词没提到任何未实现的工具 | ✅ **没有发现"伪称能力"的问题** | 无需修改 |

⚠️ **有冲突的只有 1–6；第 8 条是干净的** —— 不要为了"显得严谨"去改不存在的问题。

---

## 4 · 明确不做什么

- ❌ 不改 `architecture/learner-state.md` 的状态定义（`mastered` 仍是单值）
- ❌ 不新建 Learning Move 的运行时 / DSL / 枚举
- ❌ 不给 Coordinator 加职责
- ❌ 不改 Focus Mode 的页面结构
- ❌ 不把 `socratic` 或 `direct_explanation` 立为默认
- ❌ 不因为"主动性"而让 Agent 增加发言频率

---

## 5 · 怎么验证这些原则真的落地了

原则写进 prompt 之后，**只能靠行为观察**，不能靠读文案。

可行的最小验证（不需要新测试框架）：

1. **prompt 契约**（`tests/ai/test_prompts.py`）：渲染出来的 `text_chat` 里，
   Initiative / evidence-boundary / no-interruption 三段的关键句必须在。**防止以后被无声删掉。**
2. **行为抽查**（人工，四条）：
   - 有 Goal + 材料时，问"我们开始吧"，看它是否**直接给出一个具体动作**，而不是反问"你想学什么"。
   - 说"我今天不想学这个"，看它是否**跟着改**，而不是劝回。
   - 同一段反复读之后，看它是否说"看起来"而不是"你没懂"。
   - 说"画个图给我看"，看它是否**调用** `render_desmos_graph`（而不是用文字描述一张图）。
3. **Method 差异**（已有测试）：`tests/ai/coordinator/` 与 `tests/ai/methods/` 里已有
   Method 行为断言，改 prompt 后必须仍全过 —— 证明没有把两种方法揉成一种。

⚠️ 这四条抽查**证明不了**"Agent 真的变主动了" —— 它只能证明 prompt 没有明显反着来。
真正的判断要看真实使用。
