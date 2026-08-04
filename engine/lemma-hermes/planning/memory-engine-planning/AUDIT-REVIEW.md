# Learner Memory Engine — 严苛审查报告（能用性审计）

> 审查日期：2026-08-03
> 审查方法：真实路径验证（AIAgent 真实构造 + system prompt 真实构建 + invoke_tool 真实分发）+ 静态代码审查 + 76 项验收回归
> 结论：**核心可用**，发现并修复 3 个真 bug（1 严重 + 1 安全 + 1 健壮性），1 项真实 LLM 行为待用户本地验证。

---

## 1. 真实路径验证（此前所有验收都是 mock，本次补真实环境）

| # | 验证项 | 方法 | 结果 |
|---|---|---|---|
| V1 | AIAgent 初始化 | 隔离 HERMES_HOME 真实构造 `AIAgent()` | ✅ `_learner=LearnerCore`、`user_id=default`、`learner_state in tools=True`、review prompt 覆盖生效 |
| V2 | System prompt 构建 | 真实 `build_system_prompt(agent)` | ✅ 造数据后 `<learner-state>` 块真实进入（8210 字符）；空状态不注入属设计行为 |
| V3 | 工具分发 | 真实 `agent._invoke_tool('learner_state', ...)` | ✅ 返回真实数据 `{"success": true, "knowledge": [{concept: attention, mastery: 1.0...}]}` |

> 依赖说明：为跑 V1-V3 安装了 Hermes 核心依赖（venv，隔离于 `~/.workbuddy/binaries/python/envs/default`，未污染系统）。
> 结论：**初始化 / 注入 / 分发三条真实路径全部走通，无异常。**

## 2. 静态审查发现并修复的 bug

### B1 [严重-已修复] `record_episode(result='partial')` 污染 mastery
- **现象**：partial（无测试信号）被当作测试失败处理 → `attempts+1` 但 `successes` 不变 → **mastery 错误下降**。且 `handle_action` 中模型省略 `result` 时默认 `partial`，意味着"模型每次不带 result 的 episode 调用都会错误降 mastery"。
- **根因**：`record_episode` 只判断 `concept` 存在即更新 mastery，未区分"测试"与"非测试"。
- **修复**：`result='partial'` 时只更新 `last_exposed`，跳过 L2/L3/L5/review_queue 全部反馈；测试信号（success/failed）才走完整回流。
- **验证**：partial 不降 mastery（0.5 前后不变）、不写 pattern；failed 降、success 升，原逻辑无回归。m1/m3 验收全绿。

### B2 [安全-已修复] learner 写入无威胁扫描
- **现象**：模型通过 `learner_state` 工具写入的内容（rule/concept/reason/new_strategy）**直接拼入后续 prompt**（静态块 + prefetch 块），且无任何过滤——模型可写入 `<memory-context>` 等标签做嵌套注入（Hermes 内置 memory 工具用 `_scan_memory_content` 防的正是这类）。
- **修复**：`handle_action` 全部写入字段过 `_sanitize_field`（剥离 `memory-context`/`learner-state` 标签 + 2000 字符上限）。
- **验证**：注入标签被剥离、超长截断、回归全绿。
- **备注**：输出侧（prefetch/static 拼装）未再过一道 sanitize（写入侧已挡），属可选纵深防御，未做。

### B3 [健壮性-已修复] `limit=0` 被 `or 5` 吞
- `int(kw.get("limit") or 5)` 中 `0 or 5` → 5。已改 `is not None` 判断。

## 3. 审查通过但记录在案的低风险点

| # | 点 | 评估 |
|---|---|---|
| C1 | `prefetch_context` 词法匹配 `any(t in c or c in t ...)` | 2 字符 token 可能过度召回多个概念——检索质量问题，非致命；D4 纯标准库下可接受 |
| C2 | `_resolve_concept` 用 SQLite `RETURNING` | 需 SQLite 3.35+；真实环境 linked 3.50.4 ✅ |
| C3 | review fork 共享父 `LearnerCore` 实例 | 短连接 + WAL + busy_timeout=5s；`self.user_id` 简单属性读写原子，可接受 |
| C4 | `build_static_block` 空状态返回空 | 设计行为（无数据不注入），非缺陷 |

## 4. 唯一未验证项（需用户本地）

| # | 项 | 原因 | 建议验证方式 |
|---|---|---|---|
| U1 | **真实 LLM 会话端到端** | 本环境无 API key，无法真实调用 LLM | 用户本地跑一个教学会话：确认 (a) review fork 用 cognitive prompt 写 episode；(b) router hint 在工具结果前出现；(c) `learner_state` 被模型正确调用 |

## 5. 结论

**能用。** 判定依据：
1. 三条真实路径（初始化 / prompt 构建 / 工具分发）全部走通，无异常；
2. 76 项验收 + 真实冒烟 + 3 个真 bug 修复（1 严重逻辑 + 1 安全 + 1 健壮性）；
3. 关键防御（partial 不污染、写入 sanitize）已补且回归验证。

**使用前提**：U1（真实 LLM 会话）需在本地跑通一次确认端到端行为符合预期——这是"从能跑"到"生产可用"的最后一公里。

## 6. 变更清单（本审查轮）

- `agent/learner/learner_core.py`：partial 修复 + `_sanitize_field` + limit 修复（相对上个 commit）
- 全部改动未 commit（等待 M3 一起提交或单独提交本审计修复）
