# 证据层 · 契约

> **分支** `user-profile` · **日期** 2026-09-27（**④ 结构修订落地后**） · **状态**：事实（带 `文件:行号`）· **代码为准**
>
> 这份文档描述**现在代码里成立的契约**。要改它，先改代码，再回来改这里。

---

## 1. 公共入口 = 核心的全部公共面

`backend/ai/knowledge/__init__.py:18-58` 导出的就是全部：

| 名称 | 作用 |
|---|---|
| **`admit(evidence) -> AdmissionResult`** | **写入策略**：能不能写、写下去算不算数（`state.py:326`） |
| **`Admission` / `AdmissionResult`** | 三值 `COUNTS` / `INERT` / `REFUSED`；带 `reason`、`.writable`、`.counts`（`state.py:295-325`） |
| `is_evidence_admissible(evidence)` | 准入过滤 —— "算不算数"那一步的实现，被 `admit` **复用**而非重写（`state.py:282`） |
| `Item` / `Edge` / `Evidence` / **`Structure`** | 领域类型。`Structure = items + edges`，存在的唯一理由是让 `revise` 有单一入参与返回值（`state.py:185`）。`Edge` 另带 `counterexample_count` 与 `confidence`（见 §9） |
| `derive_state(items, edges, evidence)` | 状态派生（纯函数，零 I/O） |
| `compute_fringes(state, items, edges)` | 外边缘 / 内边缘 |
| **`revise(structure, evidence) -> Structure`** | **结构修订**：被两条反例顶破的 `agent_drafted` 边从返回的结构里去掉（`state.py:642`，规则见 §9） |
| **`count_counterexamples(structure, evidence)`** | 每条边被几条证据顶破。`revise` 用它决定退役；**退役的边不在返回结构里，所以"要持久化/要显示"的那个数只能从这里拿**（`state.py:607`） |
| `summarize(state, fringes, items)` | 渲染成提示词块 |
| `Tier` / `Verdict` / `StateValue` / `Origin` / `B_LEVEL_MIN_EVIDENCE` / **`EDGE_REVISION_MIN_COUNTEREXAMPLES`** | 枚举与常量 |

## 2. 枚举语义（这些是语义，不是风格）

| 枚举 | 值 | 含义 |
|---|---|---|
| `Tier`（`state.py:103-109`） | `A` | **确定性判定器**（选择题、数值、求解器…） |
| | `B` | **评分标准判定**（LLM + rubric，**必须记理由**）；同一 item 要 **2 条**才算数（`B_LEVEL_MIN_EVIDENCE`） |
| | `C` | **只有行为** —— 写得下，但**永不改变状态** |
| `Verdict`（`state.py:111-114`） | `correct` / `incorrect` / `no_verdict` | `no_verdict` 不采纳 |
| `StateValue`（`state.py:117-120`） | `mastered` / `not_mastered` / `unassessed` | 状态的三个取值 |
| `Origin`（`state.py:123-131`） | `observed` | 直接来自一条被采纳的证据 |
| | `inferred` | 沿先修顺序推出来的 |
| | `self_reported` | **只在 wire 契约里**：自述不是证据，也**不允许传播** |

## 3. 写入策略：两个问题，一个家（`admit`，`state.py:326-352`）

问的顺序就是语义：

1. **能不能写？** tier B 没写 `reasoning` → `REFUSED`，reason = `reasoning_required_for_tier_b`
   （"无法复核的评分不是证据"）。
2. **写下去算不算数？** = `is_evidence_admissible`（复用，避免两处规则漂移）：
   - `tier == C` → 不算数；
   - `verdict == no_verdict` → 不算数；
   - `verdict == correct` → **只有** `independent and not hint_used` 才算数（"答对是弱方向"）；
   - 其余（`incorrect`）→ 算数。

三个结果，中间那个是重点：

| `Admission` | 含义 |
|---|---|
| `COUNTS` | 写下去，且会被派生采纳 |
| `INERT` | 写下去，但**永远不动状态**（tier C / 靠提示答对 / 无判定） |
| `REFUSED` | **根本不写** |

> 为什么不是一个 bool：把"写得下但不算数"和"拒绝"合成一个 bool，要么丢掉产品想保留的事实，
> 要么让"只有行为"的证据去决定掌握判定。
> **这条策略过去住在 `services/knowledge_service.py`，现在只住在核心里**（`state.py:331-338`）。

## 4. 派生规则（`derive_state`，`state.py:444-...`）

顺序（这个顺序就是语义）：

1. 只考虑 `active=True` 的 item，以及**两端都 active** 的 edge
2. `_direct_assignments`（`state.py:355-406`）：先滤掉不可采纳的、再滤掉指向未知/已退休 item 的，
   然后**按 item 折叠成一个值**：
   - **tier B 单独计数**：`deterministic + (rubric if len(rubric) >= B_LEVEL_MIN_EVIDENCE else [])`
     —— 一条被误判的开放题不许单独改变状态；
   - **集合判定，不依赖顺序**：同时存在 `correct` 与 `incorrect` → **`not_mastered`（冲突取保守）**；
   - `evidence_count` 记的是**被采纳的条数**（是计数，不是得分）
3. `_upward_negative_closure`：**做不了 A ⇒ 一定做不了 B**（负向沿先修向上）
4. `_downward_positive_closure`：**做得了 B ⇒ 一定做得了 A**（正向沿先修向下，排除已被负向覆盖的）
5. 落成 `ItemStatus`：负向 → `not_mastered`；正向 → `mastered`；其余 → `unassessed`

两条附带产物（**给人看的，不改状态**）：

- `violations`：dependent 被直接判定为 mastered、但它前提最终没进正集的边 —— **结构可能错的信号**
- `overridden_ids`：被直接判 mastered、又被"负向优先"拉回的 item（**暴露，不隐藏**）

**不变量**：`KnowledgeState.is_lower_set(edges)` —— 前提未具备就不可能有 item 被判 mastered（`state.py:259-270`）。

## 5. 边缘（`compute_fringes`）

| 名称 | 含义 |
|---|---|
| `outer` | **接下来可学**：前提全部已具备、自己还没会 |
| `inner` | **正在形成**：已经会了、但还没有东西建立在它之上（所以"不牢"） |

## 6. 渲染（`summarize`）

固定四段：**已经具备 / 正在形成 / 还没测过 / 接下来可学**；没有结构时输出"（这个空间还没有知识结构…）"。
文本里**固定带一段纪律**（契约的一部分）：不要自行推断掌握程度、不要杜撰清单以外的知识点；
认为某条不对就**出题产生新证据**；用户自述"我会"**不算证据**。

## 7. 写入面

**wire**（`schemas/knowledge.py:85-99` `KnowledgeEvidenceIn`）

```
project_id*      必填（空间）
item_id | item_label   二选一（见下面的解析规则）
verdict*         correct | incorrect | no_verdict
tier             A（默认）| B | C
independent      默认 True
hint_used        默认 False
reasoning        tier B 必填
response_ref     任意 JSON —— ★ 现在有语义了，见下
```

**`response_ref` 的语义：provenance（由 `services/evidence_entry.py` 拥有）**

| 键 | 谁写 | 含义 |
|---|---|---|
| `surface` | 入口强制写 | `chat` / `api`（与 Coordinator 的事件来源同一套词汇） |
| `conversationId` | 会话类 surface | 这条证据是哪次对话产生的 |
| `decisionId` | **V0 没有任何 surface 会填** | 哪次 Coordinator 决策促成了这次交互；键**带上了但不发明** |
| 其它键 | 调用方 | 经 `Provenance.extra` **原样保留**，入口不覆盖 |

**item 解析**（`knowledge_service.py:574-594` + `:509-541 resolve_item`）

| 情况 | 结果 |
|---|---|
| 给了 `item_id` 且找得到 | 用它 |
| 给了 `item_id` 但找不到 | **`unknown_item`（拒绝）** |
| 给了 `item_label`：精确匹配 | 用它 |
| 精确匹配命中多个，或唯一包含匹配 | 命中一个 → 用它；**多个 → `ambiguous_item`（拒绝，绝不猜）** |
| **`item_label` 找不到** | **新建一个 concept item**（`kind="concept"`、`origin="agent_drafted"`）——"一个被点名但未知的主题不是错误，它就是那个主题的起点" |
| 两者都没给 | 会走到同一条分支，**建出一个空 label 的 concept**（已知粗糙处，见 04 文档） |

> `knowledge_evidence.item_id` 可空（`models/knowledge.py:203-207`）的真实原因不是"允许未解析证据"，
> 而是外键 `ondelete="SET NULL"`：**item 被删掉时，证据不该跟着消失**。

**拒绝码全集**：`reasoning_required_for_tier_b`（经 `admit` 的 reason）· `unknown_item` ·
`ambiguous_item` · `unknown_scope`（scope 形式不合法）· `bad_confidence` · `would_create_cycle`。

## 8. 读取面

| 读者 | 入口 |
|---|---|
| Global Agent 的提示词 | `knowledge_service.state_for_prompt` / `summarize_for_prompt` |
| 工作台「学习简报」 | `knowledge_service.build_brief`（✓ / → / ○ + 证据条数） |
| Coordinator | `coordinator_service.build_snapshot` → `derive_state` |
| **因果反查** | `evidence_entry.evidence_from_conversation(...)` / `evidence_for_decision(...)` |
| API | `api/v1/knowledge.py`（结构读写；写入走 `evidence_entry`） |

## 9. 结构修订（`revise`）：三条规则

`revise(structure, evidence) -> Structure`（`state.py:642`）—— 证据可以**证伪**一条先修边，
永远不会发明 item 或 edge。

| 规则 | 含义 |
|---|---|
| **只减不增** | 输出是输入的子集：`items` 原样返回，`edges` 只可能变少；没有任何路径能新增 item/edge |
| **人审免疫** | 只有 `confidence == "agent_drafted"` 的边会被退役；`user_confirmed` 的边**计数照记、永不退役** |
| **退役是派生的** | 库里只写 `counterexample_count`；"是否退役"每次读重算 ⇒ 可逆、可审计、**零迁移** |

**什么算一条反例**：`derive_state` 已经算出来的 `violation` —— dependent 被**直接观测**为
`mastered`，而它的 prerequisite 没有进正集。给边记的数是 **dependent 自己被采纳的证据条数**
（`ItemStatus.evidence_count`）：那正是"独立地证明你会了 dependent、而前提始终不成立"的次数。

⚠️ 注意它**不是**什么：**"先学难的"不算反例** —— 前提只是没测过时，`_downward_positive_closure`
会把前提读成"具备"，根本不会产生 violation。只有前提被**明确判定为没掌握**、dependent 又被独立
证明会了，才顶得上一条。这是阈值敢低到 2 的原因。

**两个性质**（`tests/ai/knowledge/test_state.py` 各有断言）：**幂等** —— 计数是
`max(已有, 观测)` 而不是 `+1`，同一批证据重跑不会膨胀；**顺序无关** —— 数来自集合形状的派生，
证据到达顺序不影响结果。

**单调**：计数只增不减。复活（人工确认后清零）是 V1 的决定，不是 `revise` 的副作用。
阈值 `EDGE_REVISION_MIN_COUNTEREXAMPLES = 2`（`state.py:100`）与 `B_LEVEL_MIN_EVIDENCE` 同源，
且**是拍的**（无数据支撑）。

**写回与两个调用点**：`compute_state`（唯一派生路径）先 `count_counterexamples` 把**有变化的那几条**
写回 `knowledge_edges.counterexample_count`，再用 `revise` 之后的边去 `derive_state`
（`knowledge_service.py:170/191`）；`coordinator_service._previous_value` 用**同一套修订**
（`:105`），这样"事件前 / 事件后"比较的两端是同一个结构，不会把"边退役"误报成"学习者退步"。
