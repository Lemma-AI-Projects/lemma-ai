# DECISIONS — LemmaHermes Memory Engine

> 每条决策：选项 → 结论 → 理由 → 日期。
> 结论可被新证据推翻，但必须在此记录推翻原因。

## D1 集成路线

- **决策**：第一公民内核（`agent/learner/` 核心模块）
- **备选被否**：旁路 Provider（受 one-external limit / core 工具名保护 / volatile 冻结三重天花板）、混合路线（路径过长）
- **理由**：最大化集成上限——可接管 `memory` 工具语义、参与 tool_executor 分发决策、不受 provider 槽位限制；动态注入复用现成 prefetch 管道，静态注入并列 system prompt volatile tier，无需破坏 prompt cache 契约。
- **日期**：2026-08-03

## D2 MVP 范围

- **决策**：P0 + P1 一起交付（内核接线 + assess 闭环）
- **备选被否**：只做 P0（看不到闭环价值）、P0-P2 全做（周期过长、中途改决策成本高）
- **理由**：一次交付形成可用闭环（learner.db 有数据 → episode 回流 → mastery 随测验升降），价值可演示；P2（router/spaced repetition）依赖 P1 的 episode 数据，接续自然。
- **日期**：2026-08-03

## D3 数据存储

- **决策**：独立 `~/.hermes/learner.db`（SQLite WAL）
- **备选被否**：复用 state.db（污染会话主库，sessions 表已内联 billing 的教训）
- **理由**：schema 自由演进、与会话检索解耦、备份仍走 HERMES_HOME（`hermes backup` 自动覆盖）；并发写复用 Hermes 文件锁模式（`memory_tool.py:278-313`）。
- **日期**：2026-08-03

## D4 依赖策略

- **决策**：纯标准库（sqlite3 + stdlib）
- **备选被否**：允许 numpy/SQLAlchemy（开发爽但增加部署体积、与内置风格不一致）
- **理由**：mastery（Beta 分布）、pattern（成功率）、SM-2（间隔/难度）全部可用纯 SQL 表达；与 Hermes 内置记忆实现（纯 stdlib）风格一致。
- **日期**：2026-08-03

## D5 learner.enabled 默认值

- **决策**：默认开（`true`）
- **备选被否**：默认关（LemmaHermes 主打学习者状态，默认关等于没做）
- **理由**：`_learner=None` 时全链路行为不变，风险可控，只是多一个闲置对象。与 `memory_enabled` 解耦，独立 control surface。
- **日期**：2026-08-03

## D6 工具形态

- **决策**：单工具 `learner_state`，`action` 枚举 `upsert_concept / record_episode / query_knowledge / add_rule`
- **备选被否**：多独立工具（`learner_upsert_concept` 等，schema 膨胀）
- **理由**：与 Hermes 内置 `memory` 工具的多 action 模式一致，工具计数不膨胀，模型更少混淆。
- **日期**：2026-08-03

## D7 压缩兜底

- **决策**：延后到 P2
- **备选被否**：进 P1（`context_compressor.py` 改动风险过大，P1 用显式测验+用户演示两源已够验证闭环）
- **理由**：context_compressor 是 6708 行的核心文件，接线风险是 P0+P1 中唯一的高风险改动。P2 与 router/scheduler 一并接线更安全。
- **日期**：2026-08-03

## D8 静态块标签

- **决策**：独立 `<learner-state>` 标签
- **备选被否**：复用 `<memory-context>`（语义不同，且 `memory_tool.py` 的注入扫描不认识新标签不会误伤）
- **理由**：`<learner-state>` 语义自解释；与 `<memory-context>` 分离，排查注入问题时分立。
- **日期**：2026-08-03

## D9 episode 加 concept 列

- **决策**：`learning_episodes` 表追加 `concept` 列
- **备选被否**：不加，用 goal 分词匹配（引入字符串匹配不确定性）
- **理由**：回流时直接 `WHERE concept = ?` 映射 knowledge_nodes，确定性 > 启发式；长宽代价可忽略（每个 episode 一列）。
- **日期**：2026-08-03

## D10 user_id 来源（CLI）

- **决策**：CLI 下用 `agent.agent_identity`（profile 名），默认 `"default"`
- **理由**：与 Hermes 多 profile 机制一致（`hermes_constants.py:173`）；gateway 用 `user_id`（`memory_provider.py:81` 已有该 kwargs）；subagent/cron 沿用 `agent_context` 判断跳过写入。
- **日期**：2026-08-03
