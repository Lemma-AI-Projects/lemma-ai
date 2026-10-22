# 证据层 · 总览

> **分支** `user-profile` · **日期** 2026-09-27（**④ 结构修订落地后复核**）· **状态**：事实（已核对）+ 约定（标注处）
> **代码为准**：与本文冲突时以代码为准。

---

## 1. 它回答什么

证据层只回答一个问题，而且是**辅助**问题：

> **我们凭什么认为这个学习者掌握了某个知识点？**

它不回答"用户是个怎样的人"（那是 User Home），不回答"这个空间发生过什么"（那是 Space Memory），
也不回答"现在该教什么"（那是 Coordinator / Global Agent）。

链条：

```
一次学习行为 ──► 证据（发生了什么 + 判定） ──► 当前状态（算出来的） ──► 下一步决策
```

## 2. 边界（约定，也是既有红线）

1. **状态是算出来的，不是存起来的。** 删掉任意一条证据，状态必须能重算
   （`backend/ai/knowledge/state.py:444 derive_state` 是纯函数：同输入同输出、零 I/O）。
2. **模型可以产生证据，但永远不产生状态。** 没有任何"设置状态"的接口。
3. **不外流任何数值**：没有百分比、没有掌握度分数、没有权重
   （`state.py:544 summarize` 明确"Facts only — no scores, no percentages"）。
4. **记忆不承载掌握度**：Space Memory 记"这个空间发生过什么"，
   证据/状态记"据此认为他掌握了什么"。两者不互相塞
   （`ai/tools/declarations.py:243` 已把这个分工写进工具描述）。

## 3. 三层结构（术语）

| 层 | 是什么 | 落在哪 |
|---|---|---|
| **结构** | 知识点（item）+ 先修关系（edge，必须无环） | `knowledge_items` / `knowledge_edges` |
| **证据** | 一次学习行为产生的、可判定的记录 | `knowledge_evidence` |
| **状态** | 从证据**派生**的当前结论（已具备 / 没做对 / 没测过） | **不落库**，每次现算 |

核心是**纯的**：`backend/ai/knowledge/` 的包文档写得很直白 ——
"nothing here reads a database, calls a model, or keeps global state"（`ai/knowledge/__init__.py:8-10`）。

术语对照（代码里的名字）：见 [02-contract.md](02-contract.md) §2 的枚举表。

## 4. 证据从哪来、到哪去（今天的实际形状）

```
   空间内对话（Agent 工具）· REST 接口          ✅ 两个入口，都走同一个 evidence_entry
   自由课程作答 / 教学会话 / 题库                 ❌ 仍然没有 surface（原因见 04 §2）
                    │
                    ▼
        knowledge_evidence（挂 project + user）
                    │  派生（纯函数）
                    ▼
        KnowledgeState + Fringes
                    │
     ┌──────────────┼───────────────┬───────────────────┐
     ▼              ▼               ▼                   ▼
 Global Agent   Coordinator     工作台「学习简报」     （没有别的读者）
 提示词 + digest  snapshot→Decision  build_brief
```

- ④ **已接通**：读状态之前，证据会先**修订结构**（被两条独立反例顶破的 `agent_drafted` 边退役；人确认过的边免疫）——见 [02-contract.md](02-contract.md) §9。

九条通道逐条的状态（哪条断、断在哪、为什么）见 [04-now-and-gaps.md](04-now-and-gaps.md)。

## 5. 一句话记住

**证据是"依据"，不是"记忆"，也不是"画像"。** 它唯一的用途是让状态可以被**算**出来，
并且让这个"算"可以**被追溯**（每一条结论背后都有证据）。
