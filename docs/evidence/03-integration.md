# 证据层 · 怎么接一个新 surface

> **分支** `user-profile` · **日期** 2026-09-27（**核心重构 + ④ 落地后复核**）
> **状态**：混合 —— §1–§4 是**事实**（代码已经这样）；§5 起是**约定**（对新 surface 的要求）
> **代码为准**：现状与缺口见 [04-now-and-gaps.md](04-now-and-gaps.md)。

---

## 1. 唯一入口已经存在：`services/evidence_entry.py`

```
surface（自由课程 / 教学会话 / 题库 / 空间内对话）
        │  admit_outcome(scope_ref, Outcome, Provenance)
        ▼
   evidence_entry        ← 只做三件事：scope 映射 · 翻译 · provenance
        │                  （它**不拥有任何策略**）
        ▼
   knowledge_service.record_evidence   ← 只做持久化；策略去问核心
        ▼
   ai.knowledge.admit()  ← 策略唯一的家：能不能写、写下去算不算数
```

```python
await evidence_entry.admit_outcome(
    db,
    user_id=user_id,
    scope_ref=evidence_entry.space_scope(project_id),   # 不透明作用域
    outcome=evidence_entry.Outcome(
        verdict="correct", tier="A", reasoning=None,
        item_id=None, item_label="矩阵基础",
        independent=True, hint_used=False,
    ),
    provenance=evidence_entry.Provenance(
        surface=SOURCE_CHAT, conversation_id=conversation_id,
    ),
)
```

**作用域是不透明的**：今天只有一种形式 `space:<uuid>`（`SCOPE_SPACE`）。
`project_from_scope()` 对不认识的形式**拒绝**（`unknown_scope`）—— 因为写错作用域的证据事后无法分辨，
会静默移动另一个学习者的状态。**新 surface 想加一种作用域，就在这个模块加前缀，不要教核心认识产品。**

## 2. 适配器必须回答的四个问题

| 问题 | 决定 | 怎么答 |
|---|---|---|
| **判定是谁下的？** | `tier` | 机器可判（选项/数值/求解器）→ `A`；按要点判 → `B`；只是个动作 → `C` |
| **他自己做的吗？** | `independent` / `hint_used` | 用了提示或看了答案 → 如实填（**答对会被准入规则挡掉**） |
| **挂在哪个知识点？** | `item_id` / `item_label` | 见 §3。**能先自己解析就先解析**（Agent 工具就是这么做的） |
| **谁触发的？** | `Provenance` | `surface` 必填；有会话就带 `conversation_id` |

| 情况 | 选 | 代价 |
|---|---|---|
| 选择题 / 数值 / 求解器能核对 | `A` | 一条即定案 |
| 只有 rubric 能判（开放题、作文） | `B` | **必须给 `reasoning`**，同一 item 要 **2 条**才动状态 |
| 打开页面 / 点按钮 / 停留时长 | `C` | 写得下，但**永不动状态**。别拿它充数 |

> 反模式：为了"让它算数"把 tier 从 B 提到 A，或把 `independent` 强写成 True。那等于伪造证据。

## 3. 挂知识点：会建，但只在一种情况下

| 你给的 | 结果 |
|---|---|
| `item_id` 且存在 | 用它 |
| `item_id` 但不存在 | **拒绝**（`unknown_item`） |
| `item_label` 精确/唯一包含匹配 | 用它 |
| `item_label` 命中多个 | **拒绝**（`ambiguous_item`）——**绝不猜** |
| `item_label` 找不到 | **会新建一个 concept item**（`origin="agent_drafted"`） |
| 两个都不给 | 会建出一个**空 label** 的 concept（已知粗糙处，见 [04](04-now-and-gaps.md) §5） |

因此对接时的判断是：

- **你手里的主题已经是空间里的知识点** → 传 `item_id`（最安全，Agent 工具走的就是这条）。
- **你手里只有一个人写的名字** → 传 `item_label`：**你要接受"它会变成知识结构里的一条新概念"**。
  这是产品语义（"被点名但未知的主题就是那个主题的起点"），不是 bug —— 但它会**改变结构**。
- **你不想改变结构** → 先在空间里把结构建好，或者不要写这条证据。

> `knowledge_evidence.item_id` 可空 ≠ 可以写"没有知识点的证据"。
> 它可空是因为外键 `ondelete="SET NULL"`（item 删了，证据要留下）。

## 4. 因果：已实现，按这个形状写

`evidence_entry` 拥有 `response_ref` 的形状：`surface`（强制）+ `conversationId` + 可选的 `decisionId`；
你自己额外的引用放进 `Provenance.extra`，**它原样保留、不会被覆盖**。

反查今天有两条（`evidence_entry.py` 底部）：

| 读法 | 回答 |
|---|---|
| `evidence_from_conversation(...)` | 这次对话在 Learner State 里留下了什么 |
| `evidence_for_decision(...)` | 这条决策关联的证据（**两种关系**：决策所针对的那条，靠决策日志里的 `evidenceId`；以及决策**导致**的那些，靠 `response_ref.decisionId` —— **V0 没有任何 surface 会填后者**） |

**新 surface 的义务**：如实填 `surface`；有会话就填 `conversation_id`。
**不要**自己往 `response_ref` 里塞 `surface` / `conversationId` / `decisionId` —— 那三个键由入口拥有，重复写只会制造两个真相。

## 5. 可迁移核心的约束（已经实现，不再只是约定）

`backend/ai/knowledge/` 声称"整份拷走还能跑"，这句话现在是被**强制**的：

- `tests/ai/knowledge/test_portability.py` 用 **AST 扫描**包内每个模块，
  出现**任何非标准库 import**（包括 `models` / `services` / `fastapi` / `sqlalchemy` / `core` / 任何 `ai.*` 兄弟）
  就**失败**；而且是源码级扫描，函数内 import、`TYPE_CHECKING` 也躲不过。
- 这个守卫自己还有两个守卫：确认它**真的读到了包**（空目录会假通过），
  以及**违规真的会被抓到**（"一个不会失败的守卫不是守卫"）。
- 拷走步骤写在 `backend/ai/knowledge/PORTABLE.md`，含**唯一的坑**：
  `ai/__init__.py` 在本仓里 import 了整个框架，**不能拷**；新家需要一个**空的** `ai/__init__.py`。
  最小依赖：Python ≥ 3.11（用了 `enum.StrEnum`），**没有第三方依赖**。

因此当你改核心时：

- **不许**为了让某个 surface 接得上，往核心加 `models` / `services` 的 import；
- **不许**在核心里出现产品名词（`space` / `course` / `lesson` / `project` / `user`）——作用域是不透明的 `scope_ref`；
- 改完跑 `pytest tests/ai/knowledge -q`（含可迁移性断言）。

## 6. 检查清单（提交前逐条过）

- [ ] surface 侧只多了一个适配器文件，**没有第二处**改动
- [ ] 适配器里**没有**准入判断、没有 tier 升降、没有重试策略（策略在核心的 `admit`）
- [ ] `tier` / `independent` / `hint_used` **如实**填，不是为了让证据算数
- [ ] tier B 给了 `reasoning`
- [ ] 传 `item_label` 时，**接受"它会新建一个 concept"**这个后果；不接受就先解析成 `item_id`
- [ ] 知道**你的证据可能会改变知识结构**：同一 dependent 被独立证明 2 次、而前提被明确判为没掌握，会让这条 `agent_drafted` 的边**退役**（`user_confirmed` 免疫）。别把结构当只读常量
- [ ] `Provenance.surface` 填了；有会话就填 `conversation_id`；`surface`/`conversationId`/`decisionId` 三个键**没有自己手写**
- [ ] 没有把数值（百分比 / 掌握度 / 置信度）带进任何读取面
- [ ] `pytest tests/ai/knowledge -q` 绿（含可迁移性断言）
- [ ] 新增表/列？默认**不加**；要加就说明为什么不能复用 `knowledge_evidence`

## 7. 反模式（看到就打回）

1. **在适配器里写策略**（"开放题就算 B 吧"）→ 策略只住在 `ai.knowledge.admit`。
2. **绕过入口直接写 `knowledge_evidence`** → scope 与 provenance 必然漏（`record_evidence` 仍可直接调用，但只给验收脚本/种子脚本这类**非 surface** 用）。
3. **为了让某个 surface 能接，改核心的派生规则** → 派生规则是承重墙，改动要单独论证。
4. **把"证据条数"渲染成掌握度** → 越过"不外流数值"这条红线。
5. **在适配器里 catch 掉拒绝码并静默丢弃** → 丢掉的正是"结构与现实对不上"的信号。
6. **用 `item_label` 图省事**，让每次作答都在结构里长出新的 concept → 结构会被标签噪音污染。
