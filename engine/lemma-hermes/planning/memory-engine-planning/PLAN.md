# LemmaHermes Memory Engine — 共同制定计划

> 状态：**计划定稿，M0 完成，等待开工**
> 创建：2026-08-03
> 前置调研（必读）：
> - `LEMMA_MEMORY_ENGINE_RESEARCH.md` — 五层架构差距分析
> - `LEMMA_MEMORY_ENGINE_DEEP_INTEGRATION.md` — 深度集成方案
> 决策记录：见同目录 `DECISIONS.md`

---

## 1. 目标（一句话）

把 memory engine 从「记录过去信息的文本文件」改造成「驱动整个 agent 行为的学习者状态系统」：五层状态（Identity / Knowledge / Learning Pattern / Experience / Meta）+ 认知变化驱动的更新机制 + 可计算的反馈闭环。

## 2. 已确定的前提（除非推翻否则不再讨论）

1. Hermes 主循环与 prompt cache 契约（system prompt 冻结）是 sacred，改造必须绕过或兼容。
2. 每轮动态注入走现成管道：`turn_context.py:1159 prefetch_all` → `<memory-context>` 块。
3. 认知变化分析通过覆盖 `agent._COMBINED_REVIEW_PROMPT`（`background_review.py:1006-1012`）实现，不改主循环。
4. 结构化骨架参考 holographic provider（`plugins/memory/holographic/`）。
5. 唯一真正的增量是 Layer 2 的「掌握度」语义 + 反馈闭环。

## 3. 已决策（详见 DECISIONS.md）

| # | 问题 | 结论 |
|---|---|---|
| D1 | 集成路线 | **第一公民内核** `agent/learner/` |
| D2 | MVP 范围 | **P0 + P1**（内核接线 + assess 闭环） |
| D3 | 数据存储 | **独立 `~/.hermes/learner.db`**（SQLite WAL） |
| D4 | 依赖策略 | **纯标准库**（sqlite3 + stdlib） |
| D5 | Q1 默认开关 | **默认开**（`learner.enabled=true`） |
| D6 | Q2 工具形态 | **单工具 `learner_state` multi-action** |
| D7 | Q3 压缩兜底 | **延后到 P2**（P1 只做两源提取） |
| D8 | Q4 静态标签 | **独立 `<learner-state>`** |
| D9 | Q5 episode 列 | **加 `concept` 列** |
| D10 | Q6 user_id | **CLI=agent_identity/profile 名，默认 `"default"`** |

## 4. 目录结构

```
planning/memory-engine-planning/
├── PLAN.md          ← 本文件
├── DECISIONS.md     ← 决策记录
└── (phase-0/1 工作包明细在下方里程碑内，暂不单独建目录)
```

## 5. 里程碑与工作包（P0 + P1）

### M0 · 计划定稿（当前）
- [x] 目录创建、调研归档、D1-D4 决策
- [x] 本计划经确认开工（M0 完成信号）

### M1 · Learner Core 内核与接线（P0）—— ✅ 完成（2026-08-03）
- W0.1-W0.8 全部落地；M1 验收（`planning/memory-engine-planning/m1_acceptance.py`）40 项全 PASS。
- 接线 5 个核心文件（agent_init / system_prompt / turn_context / agent_runtime_helpers / background_review）+ 新建 `agent/learner/` 8 模块。

| ID | 工作包 | 说明 | 验收信号 |
|---|---|---|---|
| W0.1 | 包结构 | `agent/learner/` 下建 `learner_core / learner_injector / learner_assess / learner_scheduler / learner_router / learner_projection` 模块骨架 + `__init__.py` | import 通过 |
| W0.2 | DB schema | `learner.db`：identity / knowledge_nodes / knowledge_edges / learning_patterns / learning_episodes / meta_rules / review_queue 6+1 表 + 索引 + WAL | 建库脚本可重复执行（幂等） |
| W0.3 | 状态模型 | learner_core 的读写 API（按 user_id 分键） | 增删改查单测过 |
| W0.4 | 更新函数 | mastery（Beta）/ pattern 累加 / rule 验证（active/retired）/ SM-2 重排，纯 SQL | 数值变化单测过 |
| W0.5 | agent 接线 | `agent._learner` 挂上 AIAgent（`agent_init.py`），`learner.enabled=true`（默认开） | 会话启动不报错 |
| W0.6 | 静态注入 | system prompt volatile tier 并列 `learner_block`（L1+L5+L3 摘要） | prompt 含 learner 块 |
| W0.7 | 动态注入 | 接入 `turn_context.py:1159` prefetch 链，返回 `<memory-context>` | 每轮召回注入 |
| W0.8 | 工具注入 | `learner` 工具集（upsert_concept / record_episode / query_knowledge）进 agent.tools | 模型可调用 |

**M1 验收**：跑一个会话 → learner.db 有 identity + 空知识表；system prompt 长度与 cache 命中无回归。

### M2 · Assess 闭环（P1）—— W1.1-W1.3 ✅ 完成（2026-08-03）；W1.4 验收并入 m1_acceptance

| ID | 工作包 | 说明 | 验收信号 |
|---|---|---|---|
| W1.1 | 认知变化分析 | 覆盖 `_COMBINED_REVIEW_PROMPT`（加 cognitive-change 段）+ fork 白名单加 learner 工具 | review fork 能写 learner 工具 |
| W1.2 | Episode 提取 | 三源：显式测验（learner 工具 record_episode）/ 用户演示（review 判定）/ on_pre_compress 兜底 | 三类来源都能落 episode |
| W1.3 | 回流管线 | episode.result → L2 mastery / L3 success_rate / L5 confirmed-refuted / review_queue 重排 | 模拟数据回流正确 |
| W1.4 | 验收测试 | 模拟会话：同一概念学 3 次 mastery↑，fail 后 ↓；复习队列生成 | 端到端演示通过 |

**M2 验收**：完整演示「教 → 测 → mastery 变化 → 复习队列生成」。

### M3 · 决策与调度（P2，接续）
- learner_router：tool_executor 分发 hint（挂 `registry.register()` 配套回调）
- learner_scheduler：SM-2 due 队列 + cron 复习 job（默认关）
- `memory` 工具语义升级（upsert 替代 add，兼容旧 action）

### M4 · 投影与可观测（P3，接续）
- learner_projection：与 MEMORY.md/USER.md 双写 + 外部 provider 互通
- journey 升级 learner dashboard
- `batch_runner.py` 评测结果回流校准

## 6. 设计上限

参见上限分析（当前对话）。本设计的上限 = **"单机、纯标准库、对话内数据前提下，学习状态系统的理论上限"**。能力层（状态可计算 / 闭环学习 / 四通道注入 / 可评测可追溯）已到该边界内的可能最优解。五条硬边界（无语义检索 / 本地单机 / assess 靠模型 / 单 agent 视角 / 注入带宽有限）是 D1-D4 决策的有意取舍，每条对应一条突破杠杆（本地 embedding / 同步层 / 确定性 quiz / 外部数据导入），这些是未来产品决策，不纳入当前 MVP。

## 7. 变更日志

- 2026-08-03：创建目录骨架；D1-D4 决策完成；P0+P1 工作包细化。
- 2026-08-03：上限分析与 Q1-Q6 拍板完成，D5-D10 落档；M0 完成。
