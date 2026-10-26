# Method System 重构 · 脑暴与计划（对照 V0 提案）

> 分支 `practice-system` · 2026-10-26 · 状态：**脑暴 / 计划 · 未写任何代码**
> 对照物：用户 2026-10-26 的《Method System 潜在设计方案 V0》提案
> 仓库事实来源：`backend/ai/methods/` · `backend/ai/coordinator/` ·
> `docs/architecture/method-system.md` · `docs/decisions/rnd-real-time-interaction.md` · `VISION_GAPS.md`

---

## 1 · 最重要的结论：V0 提案描述的系统，80% 已经在仓库里

V0 提案读起来像从零设计；把它逐条对照代码，现状是：

| V0 提案 | 仓库现实 | 判定 |
|---|---|---|
| 轻量 Plugin System，核心只做发现/选择/执行/切换 | `Method` Protocol（`types.py:390`）+ 注册表 + `execute()` 纯函数（**不调模型**，刻意保住工具与证据链） | ✅ 已有 |
| Method 定义目标 / 适用情境 / 行动原则 / 退出条件 | `AppliesWhen` / `Restraint`+`Behaviour` / `CompletionRule` / `EvidenceTarget` —— **四要素全是数据** | ✅ 已有（措辞不同） |
| 核心负责选择 | `method_service.py`（唯一集成点）+ `ai/coordinator/`（rules 产出 START / HOLD / END / NO_INTERVENTION） | ✅ 已有 |
| 不绑定特定界面 | MethodDirective 只进 system prompt（`$method_block`，`chat_service.py` 填充），不碰 UI | ✅ 已有 |
| Socratic 作为独立插件 | `ai/methods/socratic/method.py` | ✅ 已有 |
| **Method 指导 Agent 选择 Learning Move** | directive 给 Agent 的是**话**（`discipline` / `system_move` / `learner_move`），不是**可执行的动作域** | ❌ **差距 1** |
| **动态切换**（用户改方向 → Agent 调整或切换） | `SWITCH` 在 `coordinator/types.py:349` 定义、`:403-408` 校验，**rules.py 零命中**（VISION_GAPS A5） | ❌ **差距 2**：有定义无执行 |
| **交互闭环**（观察反馈 → 继续/调整/切换） | `completion.py` 生产零调用、`method_episodes` 零写入方（VISION_GAPS A3） | ❌ **差距 3**：闭环断的 |
| GEB Recursive / Structural Reconstruction 插件 | 不存在 | ⬜ 新增项（2 个） |

**所以这次"重构"的准确名字是：三次定点补缺 + 两个新插件，而不是重建。**
真正不该做的是 V0 提案里没出现、但容易被顺手带上的东西：Method Runtime、插件市场、
Move 类型系统 —— 用户的提案自己已经刹了这道车（"而不是立即开发复杂的 Method Runtime"），
这与决策日志 D6 和 `AGENT_PRINCIPLES_V0.md` 的 F 原则是同一句话。

---

## 2 · 三个真缺口，每个给选项

### 缺口 1 · Learning Move 怎么接进 Method（本轮的核心脑暴）

现状：Agent 从 directive 拿到的是教学姿态（"不给答案、只问一个问题"），但**不知道
环境里有哪些动作可做**。而工具早就存在：`render_desmos_graph` / `save_note` /
`read_page` / `record_evidence`（`ai/tools/declarations.py:21-40`）。于是：

- Socratic 想让学习者"自己走一遍"，却表达不成"往画布上放一个可以操作的图"；
- 一个讲结构的方法想"组织概念关系"，没有一条通路告诉 Agent 这是在**本方法下**被期望的动作。

三个选项：

| | 做法 | 判断 |
|---|---|---|
| A | Learning Move 枚举 + runtime（每种 move 一个执行器） | ❌ 违反提案自己的刹车；P1 在决策日志里仍是 Provisional，不该现在定型 |
| B | 维持纯文本（现状） | ❌ V0 的核心诉求落空；"指导选择"变成一句空话 |
| **C（推荐）** | **`MethodDirective` 加 `moves: list[MoveHint]` 字段**：`MoveHint = { name, prompt_line, tool? }` —— 纯数据声明："本方法下，这些动作是被期望的、工具是这些"。渲染进 `$method_block` 的 moves 段。**没有执行器、没有枚举校验、没有 runtime** —— Agent 结合已有工具自行完成，判断力仍在模型 | 声明成本一个 dataclass；方法间差异立刻可表达；runtime 留给证据说话 |

`MoveHint.tool` 可空：`追问` 没有对应工具（它就是说话），`插入可视化` 指向
`render_desmos_graph`，`记录概念关系` 指向 `save_note`。**可空tool = 说话类与操作类
move 同列**，这正是 D1（不只聊天）在 Method 层的落点。

### 缺口 2 · 切换（SWITCH 零命中）

- **推荐：本轮只做一条规则** —— "用户明确改变探索方向或拒绝当前活动 → 产出 SWITCH
  （落到 `direct_explanation`，即回到解释态）"。一条规则、一个测试、可观察
  （prompt 里 method_block 变了）。
- 不做：自动判断"学习效果不好所以切换"——那需要闭环（缺口 3），而且
  `AGENT_PRINCIPLES_V0.md` U4/E 早已警告这类推断。
- **冲突预警**：提案说"Agent 根据学习证据选择 Method"，但证据层当前只有
  对错判定（`knowledge_evidence`），假设无处存放（决策日志 D5）。**"根据证据选
  Method"在本轮只能落地为"根据用户显式动作"，其余是未来目标** —— 这条边界要写进
  决策日志，不许在 prompt 里伪装成已实现。

### 缺口 3 · 闭环（completion / episodes 零调用）

**本轮不修。** 理由：闭环需要"一轮方法干预"有头有尾的记录，而那属于证据回流的
设计（`evidence-flow.md` §3.4 已记录现状）；先跑 SR 的对照验证，让"闭环到底该记什么"
由真实数据决定，而不是先建表。SR 的 `CompletionRule` 照常声明（数据留好，管线后接）。

---

## 3 · 两个新插件（先 SR 后 GEB）

### Structural Reconstruction（本轮要做的那个）

一句话定义（脑暴给出，待用户确认）：**把学习者面前的内容拆成零件——术语、关系、层次——
然后让学习者自己重装；重装的对错就是理解度的证据。**

与 Socratic 的对照（行为级，沿用 method-system.md §3 的表格法）：

| 要素 | Socratic | Structural Reconstruction |
|---|---|---|
| 适用 | 要学习者动手推导 | 面对一段**有结构的材料**（定义/定理/流程） |
| 行动原则 | 不给答案、只问一个、问完停 | **不给完整装配、只给零件与一次装配请求** |
| Learning Moves | 追问 / 请学习者走一遍 | 拆出零件 / 请学习者重装 / 用反例检验装配 |
| 退出条件 | 连续 N 次独立做对 / 一次讲出反例 | 学习者**独立重装一个新例子**且讲得出零件关系 |
| Restraint | `asks_question=1, withholds_answer` | `forbids_full_answer=1, requires_example=0, awaits_learner=1` |

**这正好就是用户要的验证**：两个方法共用同一套 Restraint 结构、同一套工具、同一个
prompt 注入点，行为却分叉 —— "同一套交互能力产生不同且有价值的学习体验"的可检验版本。

### GEB Recursive（Stage 5，只占位）

自指与层级（内容里包含对自身规则的讨论）。V0 只给了名字；等 SR 验证完、move 声明
被证明可用之后再设计 —— 那时它应该是**第三个**插件，其成本就是"新文件 + 测试"，
这个成本本身就是可插拔性的第二次验证。

---

## 4 · 分阶段计划

| 阶段 | 内容 | 验收（可观察） |
|---|---|---|
| **0 本计划** | 对照表 + 三缺口拍板 | 用户对 Q1 选 C、缺口 2 只做一条规则、闭环不修，三点点头 |
| **1 SR 插件** | `ai/methods/structural_reconstruction/`：四要素声明 + `execute()`；**核心零改动**（注册表加一行） | ① 新方法出现在可选列表；② 行为测试：同 input 下 SR 与 Socratic 的 `Restraint`/`discipline` 可观察地不同；③ tsc/pytest 全绿 |
| **2 moves 声明** | `MethodDirective.moves: list[MoveHint]` + 三个方法各自的声明 + `$method_block` 渲染 moves 段 | ① 请求体里 prompt 含 moves 段（CDP/单测断言）；② 三个方法的 moves 集合互不相同；③ 无新依赖 |
| **3 SWITCH 首规则** | rules.py 第一条 SWITCH 规则：用户明确改方向 → 切回 `direct_explanation` | ① 单测：改方向消息 → directive 换成 direct_explanation；② 原有 coordinator 测试不破 |
| **4 双方法对照验证** | 研究周期模式（RESEARCH_CYCLE_01 的方法，换 RQ）：同一特征向量场景，Socratic vs SR 各跑一遍 | ① 两轮回复的可观察差异被记录（五字段）；② 结论进决策日志 P1（Learning Move 从 Provisional 走向 Accepted 或被削弱） |
| **5 GEB 占位** | 第三个插件（只在其一：设计草案，不实现） | 一份插件设计草案进 `docs/planning/` |

依赖：2 依赖 1（SR 的 moves 是第一个非 Socratic 的声明样例）；3 独立可并行；
4 依赖 1+2；5 依赖 4 的结论。

---

## 5 · 风险与待拍板

| # | 问题 | 建议默认 |
|---|---|---|
| 1 | **SR 的定义我替用户写了**（§3 的一句话 + 行为表）——这是提案里没展开的部分 | 请确认或改写；它是 Stage 1 的地基 |
| 2 | `moves` 字段可能沦为**文档性装饰**（Agent 忽略它） | Stage 2 验收钉死：prompt 里 moves 段**必须**注入且三个方法不同；若 Agent 行为不响应，记录并回退到纯 B |
| 3 | SWITCH 规则的误触发（用户随口一句话被当成"改方向"） | 第一条规则只匹配**显式拒绝/明确转向**；误触发率进 Stage 4 记录 |
| 4 | `ai_conversations.method` 手动选择与自动切换打架（用户选了 socratic，SWITCH 又切走） | 自动切换覆盖手动选择，但**在 directive 里注明"因你改了方向而切换"**；冲突升级为设计问题时不实现 |
| 5 | GEB Recursive 若 Stage 5 之前被提起 | 按 §3 占位处理：没有定义就不开工，避免"名字先于设计" |

---

## 6 · 明确不做

- 不做 Method Runtime / 执行引擎 / 插件市场 / 动态加载
- 不做 Learning Move 类型系统或 Schema（决策日志 P1 维持 Provisional）
- 不修闭环（completion/episodes）——由 Stage 4 的数据决定形态
- 不做"根据学习证据自动选方法"——证据层没有承载假设的位置（D5）
- 不动 `chat_service.py` 以外的调用链（`knowledge.py` 的 coordinator 调用照旧）
