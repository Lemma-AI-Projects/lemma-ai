# PHASE-2-M3 — 决策与调度（P2）详细计划

> 状态：草案（拍板点见 §5）
> 前置：M1+M2 已完成（commit `471de7d3c`）
> 范围：M3 的 4 个工作包 —— router 个性化 / scheduler 复习调度 / memory 工具升级 / 压缩兜底
> 配合 `PLAN.md`（概览）与 `WORKPACKAGES.md`（P0/P1 明细）阅读

---

## 0. M3 目标

让 learner state 从"被动的状态记录"升级为"主动的行为干预"：
1. **确定性个性化**（W2.1）：用户调用工具时，命中高置信学习模式 → 注入个性化提示（不再靠模型自觉）
2. **主动复习调度**（W2.2）：到期概念主动提醒（due 队列已在 M1 注入，本阶段补工具化入口）
3. **记忆工具语义升级**（W2.3，评估中）：内置 memory 工具的合并语义
4. **会话边界经验回收**（W2.4，评估中）：压缩/会话结束时不丢经验

---

## 1. W2.1 learner_router —— 工具分发个性化提示（核心）

**做什么**：L3 `learning_patterns` 变成确定性行为。当模型调用工具 T 且 pattern 命中（该用户对某概念有高成功率方法偏好）时，在工具结果前注入个性化提示。

**实现要点**：

```python
# agent/learner/learner_router.py（替换现有 stub）
MIN_SUCCESS_RATE = 0.70
MIN_ATTEMPTS     = 3

def hint_for_tool(agent, tool_name: str, args: dict) -> str:
    """Return a personalized teaching hint for this tool call, or ''."""
    learner = getattr(agent, "_learner", None)
    if learner is None or not tool_name:
        return ""
    user_id = getattr(agent, "_user_id", None) or getattr(learner, "user_id", "default")
    # 1) pattern 按 concept 匹配 args 关键词（复用 learner_core._SPLIT_RE）
    # 2) episode 关联：learning_patterns.concept 与当前 args 中的概念词匹配
    # 3) 只取 success_rate >= 0.70 且 attempts >= 3 的高置信 pattern
    # 返回: f"[Learner hint] For <concept>, <method> worked best for this
    #        user (<rate>% over <n> tries) — prefer it unless there's a reason."
    ...

def wrap_with_hint(result: str, hint: str) -> str:
    return f"{hint}\n\n{result}" if hint else result
```

**注入点**（单一汇聚点，M1 已确认）：`agent/agent_runtime_helpers.py` 的 `invoke_tool`（:2725）——所有执行路径（concurrent/sequential/subagent）都经过它。在 if/elif 链分发**之前**查 hint，命中则对 `_execute` 的返回值做前缀拼接：

```python
    _learner_hint = ""
    if getattr(agent, "_learner", None):
        try:
            from agent.learner.learner_router import hint_for_tool
            _learner_hint = hint_for_tool(agent, function_name, function_args)
        except Exception:
            _learner_hint = ""
    ...
    # 在最终 return _finish_agent_tool(result, ...) 处：
    if _learner_hint:
        result = _learner_hint + "\n\n" + result
```

> 备选注入点：tool_executor.py 分发层。否决——invoke_tool 已是唯一汇聚点，改一处覆盖所有路径。

**数据关联**：pattern 的 `concept` 来自 episode.concept（模型在 record_episode 时标注）；router 匹配用 args 关键词（如 `paper-reader` 收到 `{"query": "attention mechanism"}` → 匹配 concept "attention"）。关键词匹配是纯词法（与 M1 prefetch 同一策略，D4 内一致）。

**验收**：
- mock agent：pattern（concept=attention, method=visualization, 85%, 6 tries）→ 调工具 args 含 "attention" → result 前置 hint
- 未命中（success_rate 低 / attempts 少 / 无匹配）→ result 不变
- `_learner=None` → 完全无副作用（不 import 失败、不改变 result）
- `hint_for_tool` 单测：边界（空 args、无 pattern、多 pattern 取最优）

**风险**：低-中。改动集中在 invoke_tool 入口 + 一个纯函数；hint 前缀不改变工具语义（模型可忽略）；全路径 try/except 静默。

---

## 2. W2.2 learner_scheduler —— 复习调度工具化 + cron job

**做什么**：due 队列（M1 已随 prefetch 注入）补两个正式入口：
1. `learner_state` 新增 action `due_reviews`（模型可主动查询）
2. **cron 复习 job**（默认关，`learner.cron_review_enabled`，用户拍板保留）——离线定时提醒到期概念

**实现要点**：

```python
# learner_core.py 新增
def due_summary(self, user_id: str, limit: int = 5) -> str:
    due = self.get_due_reviews(user_id, limit=limit)
    if not due:
        return ""
    return "Concepts due for review: " + ", ".join(
        f"{d['concept']} (mastery {d['mastery']:.0%})" for d in due
    )
```

- **工具 action**：`learner_injector.LEARNER_STATE_SCHEMA` 的 enum 加 `due_reviews`；`handle_action` 加分支 → 返回 due 列表。
- **cron job（保留）**：按 `cron/jobs.py` 的 jobs.json schema 注册"复习提醒"job（`learner.cron_review_enabled=true` 时自动注册，默认关），job prompt 为"输出到期复习概念清单"，schedule 由用户配置（建议每日）。
  - **实现注意**：需确认 cron 构造的 agent 是否初始化 `_learner`（cron 可能走 skip_memory / agent_context="cron"，`memory_provider.py:74-76` 约定 cron 跳过 provider 写入）。若 cron agent 无 `_learner`，复习 job 直接读 `~/.hermes/learner.db`（`LearnerCore(db).get_due_reviews()`），不经 agent 属性——数据层是同一文件，读取无副作用，安全。
- **CLI（可选增强）**：`hermes learner due` 输出可读列表。

**验收**：
- `due_reviews` action 返回到期概念列表（含 mastery）；到期为空返回空列表不报错
- cron job 注册/删除可用；`learner.cron_review_enabled=false`（默认）时无 job
- job 运行时（mock 执行）输出 due 清单

**风险**：低。工具 action 只加分支；cron job 走既有 jobs.json 机制，默认关闭。

---

## 3. W2.3 memory 工具语义升级 —— 评估中（建议裁剪）

**原计划**：内置 `memory` 工具的 `add` 增加合并语义（同义条目合并而非拒绝重复）。

**重新评估**（M1 落地后视角）：
- D6 已定 `learner_state` 是结构化记忆通道（upsert 语义原生支持）；`memory` 工具仍负责"文本笔记"（MEMORY.md/USER.md），职责已分流
- 改 `tools/memory_tool.py` 的 add 语义（:390-447）动核心记忆工具，风险中；且 MEMORY.md 是 prose 文件，合并语义（相似度判断）需要启发式，收益有限
- **结论倾向**：裁剪本工作包，改为"文档化职责边界"（memory=文本笔记 / learner_state=结构化状态），把精力留给 W2.1/W2.4

---

## 4. W2.4 会话边界经验回收 —— 评估中（建议改造）

**原计划**：上下文压缩前提取 episode（`context_compressor.py:5882 compress()` 入口挂钩）。

**重新评估**：
- 压缩 ≠ 学习事件：盲写 `record_episode(result='partial', reason='compressed')` 会污染 learner state（每压缩一次就多一条无意义 episode）
- `context_compressor.py` 是 6708 行核心文件，D7 延后它的理由依然成立
- **更优替代**：**会话边界提取**——`on_session_end` 时机（`run_agent.py:3838 shutdown_memory_provider` 附近已有 session 结束路径），把"本会话出现过的概念 + 最后状态"落一条汇总 episode。时机自然、不碰 compressor、无污染风险

**改造后实现**：

```python
# learner_core.py 新增
def summarize_session(self, user_id: str, session_id: str,
                      touched_concepts: list[str]) -> None:
    """Session-boundary rollup: one episode per session that touched
    learning concepts, without fabricating test results."""
    # 对每个 touched concept 写 record_episode(result='partial',
    #   reason='session_end', concept=c) —— 只更新 last_exposed/last_test
    # 时间戳，不动 mastery（partial 且无 success 信号）
```

**接线**：`run_agent.py` session 结束路径（`shutdown_memory_provider` / `_shutdown_memory_provider` 附近，:3828/:3860）加：`if agent._learner: agent._learner.summarize_session(...)`。touched_concepts 来源：本会话 messages 里出现过的 knowledge_nodes 概念（learner_core 查询）。

**验收**：会话结束时 learner.db 出现 session episode；mastery 不被无信号写入污染；`_learner=None` 无副作用。

**风险**：低（不碰 compressor；session 结束路径是既有清理点）。

---

## 5. 拍板点（已决策 2026-08-03）

| # | 问题 | 决策 |
|---|---|---|
| M3-Q1 | W2.3 memory 工具升级 | **裁剪**（learner_state 已覆盖结构化通道；改为文档化职责边界：memory=文本笔记 / learner_state=结构化状态） |
| M3-Q2 | W2.4 压缩兜底 | **改为会话边界提取**（压缩≠学习事件会污染；session-end 时机自然且零风险） |
| M3-Q3 | cron 复习 job | **保留**（默认关，`learner.cron_review_enabled`；cron agent 无 `_learner` 时直接读 learner.db） |

## 6. 执行顺序与依赖

```
W2.1 router（核心，独立）────────┐
W2.2 due_reviews + cron（独立）───┤── 无互相依赖，可并行
W2.4 session 汇总（独立）─────────┘
（W2.3 已裁剪 → 文档化边界，纳入 PLAN.md 职责说明）
→ 集成验收（扩展 m1_acceptance → m3_acceptance）
```

## 7. 验收总信号（M3 完成定义）

1. 用户调用工具时，命中高置信 pattern → 工具结果带个性化 hint（可 mock 演示）
2. `due_reviews` 返回到期概念；cron 复习 job 可注册/运行（默认关）
3. 会话结束自动落 session episode，mastery 零污染
4. `_learner=None` / learner disabled 时全链路行为与 Hermes 原版一致（回归）
5. 扩展验收脚本全绿

## 8. 变更日志

- 2026-08-03：创建本计划；挂起 M3-Q1/Q2/Q3。
- 2026-08-03：M3-Q1 裁剪 W2.3；M3-Q2 改会话边界提取；M3-Q3 保留 cron job（默认关）。计划定稿。
