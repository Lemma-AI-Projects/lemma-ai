# 证据层 · 现状与缺口

> **分支** `user-profile` · **日期** 2026-09-27（**④ 结构修订落地后**）· **状态**：事实（逐条核对，带 `文件:行号`）
> **代码为准**。这是**快照**，最容易过期 —— 改动后请回来更新，别在旁边再写一份。

**本次核对（2026-09-27，通道 ④ 落地后）**：

- ④ 从 ⚠️ 变 ✅：`revise()` 有规则了 —— 被**两条**反例顶破的 `agent_drafted` 边退役（`ai/knowledge/state.py:642`）；
  `counterexample_count` 现在**有人写**（`services/knowledge_service.py:170 _persist_counterexamples`，由 `compute_state` 调用）；
  退役本身**不落库**，每次读重算 ⇒ **零迁移**。
- 上一版的三条仍然成立：准入策略在核心（`admit`）、两个写入面收口到 `evidence_entry`（①⑦ 仍 ⚠️）、
  未知标签会**新建 concept item**（不是存一条无主证据；`item_id` 可空是为了 `ondelete="SET NULL"`）。

---

## 1. 九条通道

| # | 通道 | 状态 | 依据 |
|---|---|---|---|
| ① | 学习行为 → 证据 | ⚠️ **入口已收口，但入口只有两个**：Agent 工具 与 `POST /knowledge/evidence`。自由课程、教学会话、题库**仍然没有任何 surface** | `services/evidence_entry.py:141 admit_outcome`；`api/v1/knowledge.py:123`；`services/conversation_tool_service.py:585` |
| ② | 证据 → 状态 | ✅ 纯派生 | `ai/knowledge/state.py:444 derive_state` |
| ③ | 状态 → Coordinator | ✅ | `services/coordinator_service.py:162 build_snapshot` → `:125 derive_state` |
| ④ | 状态 ↕ 知识结构 | ✅ **已接通**：`revise()` 会把被两条反例顶破的 `agent_drafted` 边退役；`counterexample_count` 由 `compute_state` 回写；退役**不落库**（每次读重算） | `state.py:607 count_counterexamples` / `:642 revise`；`knowledge_service.py:170/191`；`coordinator_service.py:105 _previous_value` 用同一套修订 |
| ⑤ | Coordinator → 动作 | ✅ 五个动作含 `NO_ACTION` | `ai/coordinator/types.py:52-65` |
| ⑥ | 动作 → 用户（回执） | ⚠️ 只有通知，且**刻意没有回执** | `models/notification.py:21`："Deliberately absent: `read_at`…" |
| ⑦ | 决策 → 证据（因果） | ⚠️ **部分通**：provenance 已写（`surface` / `conversationId`），可反查"这次对话留下了什么"；但 `decisionId` **没有任何 V0 surface 会填**，所以"决策导致了哪些证据"实际为空；"决策所针对的那条"只能靠决策日志里的 `evidenceId` 反查 | `evidence_entry.py:219-286`（两条反查）；`Provenance` 文档串明说 decisionId 是"carried, not invented" |
| ⑧ | 证据 → Space Memory | ❌ 没有通道 | 记忆只由 `remember` 工具写（`conversation_tool_service.py:435`）；分工写死在工具描述（`ai/tools/declarations.py:243`） |
| ⑨ | Space Memory → 上下文/决策 | ✅ | `agent_context_service.py:435`；`coordinator_service.py:213` |

## 2. 两个硬事实（决定"能接谁"）

1. **证据强制属于一个空间**：三张知识表的 `project_id` 都是 `nullable=False` + FK→`projects.id`
   （`models/knowledge.py:84/135/191`）；作用域今天只有 `space:<uuid>` 一种形式。
2. **最想接的两类学习结果都不在空间里**：
   - **自由课程**：`models/course.py` 里 `courses` **没有 `project_id`**；而它的作答路径的 docstring
     自己写着 "the future learner-state input"（`services/free_course_service.py:553`）。
   - **题库**：`models/qbank_usage_log.py:46` 只有 `user_id`。

⇒ **今天在"空间内"产生的、非模型判断的学习结果，基本不存在。** 这也是①仍然只有两个入口的原因。

## 3. 现场后果

- **状态长期偏空** ⇒ Coordinator 的规则要求前后值有变化，所以它多数时候只能回 `NO_ACTION`。
  不是它没用，是**输入太薄**。
- **知识结构现在会"被改"了**（④ 已接通）：一条 `agent_drafted` 边被两条独立反例顶破就退役，状态随之重算；
  人手确认过的边免疫。**但它只会变瘦** —— 计数单调不减，没有复活机制（§5）。
  另有一个尚未解决的问题：**这条变化在界面上还看不见**（wire 里有 `counterexampleCount`，简报还没渲染）。
- **决策仍然无法评估**：⑦ 只通了一半，`decisionId` 空着 → 答不出"这个决策到底有没有用"。

## 4. 五处断点（① 入口 + 四条回流）

| 断点 | 为什么重要 | 补它的前提 |
|---|---|---|
| ① 入口 | 状态偏空的直接原因 | 先解决 §2 的作用域问题（课程/题库要不要有空间） |
| ⑦ 因果 | **不补，历史永远回不来** | 已有一半：让产生交互的地方知道 `decisionId`（那需要动作回路） |
| ~~④ 结构演化~~ | **已落地（2026-09-27）**：结构会被证据证伪（`revise`） | 剩下的只有 V1 的两件事：复活机制、阈值的数据支撑 |
| ⑧ 事件沉淀 | 让空间历史包含"学习发生过什么" | 定：记忆与证据**共用一个事件 id**，且**记忆不承载掌握度** |
| ⑥ 回执 | 主动学习（复习提醒 / 推送）**无法验证效果** | 通知侧要有回执字段（今天刻意没有） |

## 5. 已知权宜、孤儿与粗糙处（写在这里，免得后人以为是设计）

| 项 | 现状 | 怎么看 |
|---|---|---|
| `response_ref` 承载 provenance | 有形状（`evidence_entry` 拥有）、有反查，但**不是正式字段** | **权宜**。正式做"按决策评估"时该给它列 |
| `decisionId` 键 | 已带、可被 REST 调用方填、反查已支持，**但没有任何 surface 会填** | 通道留好了，线没接 |
| `counterexample_count` | 已被 `count_counterexamples` 算出、由 `compute_state` 每次读时回写（有变化才写） | ④ 已接通。**只增不减**，复活留给 V1 |
| `revise()` | 已实现：只减不增 / 人审免疫 / 幂等 / 顺序无关（`state.py:642`） | 阈值 `EDGE_REVISION_MIN_COUNTEREXAMPLES = 2` 是**拍的**（无数据），具名常量便于改 |
| **两者都不给 item** | 会建出一个**空 label 的 concept item**（`knowledge_service.py:585-594`） | **已知粗糙处**：应拒绝而不是造一条无意义的 topic |
| `self_reported` | 只在枚举与 wire 里，**不参与派生** | 刻意的：自述不是证据 |
| `courses` 无 `project_id` | 自由课程与空间无关联 | V1 的第一个产品决定 |

## 6. 什么时候必须回来改这份文档

- 证据的作用域多了新形式（不再只有 `space:`）
- 新增/删除证据字段（尤其**给 provenance 正式列**）
- ①②④⑥⑦⑧ 任意一条被接通（或状态变化）
- 自由课程 / 题库 / 教学会话 任意一个接进了证据
- 核心里出现/删除 `admit` / `revise` 这类公共面

执行计划在 `.workbuddy/plans/analysis-core-v0.md`（本地计划，不是文档）。
