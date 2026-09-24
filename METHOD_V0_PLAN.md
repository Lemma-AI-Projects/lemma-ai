# Method V0 计划（LS-lab）

给 Learn Space 第一次装上「不同的学习方法」：同一个学习状态、同一个问题，
选不同的 Method 会得到**明显不同的学习行为**。前置的 Space Context / Global Agent /
Space Memory / Learner State 一律不动。

**范围**：只加两个 Method（Socratic、Direct Explanation）与一个切换入口。
不做 Coordinator、不做自动选择、不做 Marketplace / Composer / Graph / Runtime。

---

## 下一步（5 行）

1. **Method 层**（纯函数、无模型调用）：`backend/ai/methods/` —— 统一接口 + 注册表 + 两个实现。
2. **接线**：`ChatRequest.method` → `TurnContext.method` → `text_chat` 模板的 `$method_block`；
   对话行新增 `method` 列（迁移），本轮用哪个 Method 记在对话上。
3. **接口**：`GET /api/v1/methods`（列表来自注册表）；`GET /conversations/{id}` 返回 `method`。
4. **前端**：底栏「…」→ hover 子菜单选 Method；输入框上常显 `Current Method: X`。
5. **验证**：同一问题跑两个 Method（真模型）→ 报告里贴对照；后端 pytest / 前端 tsc+eslint / 既有测试不回归。

---

## 1. 为什么 Method 必须是「改行为」而不是「改标签」

验收标准只有一条：**相同问题 + 不同 Method → 不同的学习行为**。
所以 Method 不许只影响 UI，它必须进入模型这一轮真正读到的那段提示词，并且
**两个 Method 产生的那段话在结构上就不一样**（不是措辞不同）。

## 2. 最小接口

```text
name          标识（socratic / direct_explanation）
description   给人看的一句话
input         MethodInput：用户消息 + Space Context + Learner State + 当前学习目标
execute()     纯函数：读 input，决定「这一轮的教学行为」→ MethodDirective
output        MethodDirective：本轮焦点 + 行为纪律（提示词）+ 机器可读的行为契约
```

`execute()` **不调用模型**，这是有意的：对话这一轮的模型调用必须还是原来那一条
（`AIUseCase.TEXT_CHAT`，带 Global Agent 的工具）。Method 若自己另开一条模型通道，
`remember` / `record_evidence` 这些工具就没了，§9 的「Evidence → 既有 Learner State」
也会断。Method 决定**怎么教**，管线负责**去教**。

| 落点 | 文件 |
|---|---|
| 类型与注册表 | `backend/ai/methods/{types,__init__}.py` |
| 两个实现 | `backend/ai/methods/{socratic,direct_explanation}.py` |
| 服务层（唯一集成点） | `backend/services/method_service.py` |

## 3. 两个 Method 的差别（行为，不是措辞）

| | Socratic | Direct Explanation |
|---|---|---|
| 这一轮做什么 | 只推进**一个认知步骤**，只问**一个问题**，然后停下等他答 | 直接讲清楚：定义 → 直觉 → 一个具体例子 |
| 焦点怎么选 | 优先用户消息里点到的那个知识项，否则取 **Outer Fringe** 的第一项 | 同上（同一个 input，同一套取法） |
| 用 Learner State 做什么 | 「他已经具备的」是提问的**素材边界**：问题必须能从他已有的推出来 | 「他已经具备的」决定**从哪一层讲起**，不复述已知 |
| 一轮里会不会给答案 | 不会。允许给「只差一步」的提示，但不给结论 | 会，且必须给完整 |
| 契约（机器可读） | `expects_question=true`、`forbids_full_answer=true`、`max_questions=1` | `expects_question=false`、`requires_example=true` |

两个 Method 共用**同一份 input 结构**（§4 的要求），
`tests/services/test_methods.py` 直接断言：同一 input 下两个 directive 的契约字段相反。

## 4. Global Agent 的边界（本阶段）

不自动选 Method。用户手动选，流程：

```text
User → Select Method → Global Agent（照旧装配上下文/工具）→ Execute Method（这段纪律）→ Response
```

Method 只**读** Learner State，**不写**。用户作答产生的 Evidence 仍然走既有
`record_evidence` 门，由既有的派生逻辑更新状态。

## 5. V0 简化（写在明面上）

1. 不做 Coordinator / 自动选 Method —— 需要用户在底栏手动选。
2. 只有两个 Method；注册表是代码里的字典，不是插件市场。
3. Method 选择记在**对话**上（`ai_conversations.method`），不记在「学习目标」上。
4. 选择在**下一次发送**时落库（本轮请求就带 `method`）；选了但没发就刷新，会回到上次用过的那个。
5. 首页那个新会话输入框暂不放入口（入口在对话页与 Learn Space 的输入框底栏）。
