# Lemma AI — Agent 评估底层框架实施计划（L0 存储抽象 + L2 信号管道）

> 版本：v1.0 · 2026-08-08 · 状态：**已拍板待开工**
> 拍板记录：L0 选 A（引擎内 Storage 抽象）+ L2 选 A（对话落库后异步提取）
> 标准：**最严苛**——每个改动标注用户视角、每层带验收指标、全链路可回滚
> 前置调研：`lemma-ai-agent-evaluation-inventory.md`（M1）/ `literature.md`（M2）/ `mvp.md`（M3）

---

## 0. 目标与非目标

### 目标（本计划覆盖）
1. **L0 引擎内存储抽象**：`LearnerCore` 从 `sqlite3` 紧耦合 → `Storage` 协议（SQLite/PG 双实现），保持引擎独立可测
2. **L1 数据模型补强**：concept 规范化 + episode 判定来源/置信度字段
3. **L2 信号管道（写路径）**：对话落库 → 异步教学事件提取 → `record_episode` → 引擎反馈闭环
4. 每层门控 + 全链路可回滚 + 遥测覆盖

### 非目标（明确不做）
- ❌ L3 多信号一致性校验（下一期）
- ❌ L4 读取/注入路径（依赖 L2 有真实数据后再做）
- ❌ L5 观测面板（Dev Dashboard 扩展，最后做）
- ❌ 显式反馈 UI（表征层，用户明确先放下）
- ❌ 修改引擎的反馈闭环算法本身（partial 不动 mastery 等不变——它是成品）

---

## 1. 现状核实（开工前必须核对的事实）

### 1.1 引擎存储耦合面（已核实）
- `learner_core.py`：**18 处** `with self._connect() as conn:` 直连 SQLite
- `_connect()`：`sqlite3.connect(db_path, timeout=5.0)` + row_factory + busy_timeout + foreign_keys=ON
- 存储方法清单（全部经 `_connect`）：identity(2) / concept(4) / patterns(2) / episodes(1, 原子闭环) / rules(3) / review(4) / injection(2) / handle_action 分发
- **关键**：`record_episode` 单事务内联动 L2/L3/review/L5 四条反馈路径——抽象后必须保持**同事务原子性**

### 1.2 Lemma 侧接入面（已核实）
- `core/config.py`：`lemma_hermes_enabled=False`（默认关）、`lemma_hermes_engine_package="lemma_hermes"`、`lemma_hermes_learner_db_url=""`（空 ⇒ 用主库 PG）
- `core/database.py`：async SQLAlchemy engine（Supabase PG，池纪律严苛：pool_size=3、max_overflow=2、timeout=10s）
- `conversation_service.persist_turn`：**单条 SQL 原子写 user+assistant**，独立连接、绝不抛错——是 L2 触发点的理想锚点
- `admindev/monitor.py`：已有 `probe_learner` 探活（读路径）

### 1.3 引擎内部依赖（已核实）
- `learner_schema.py`：7 表（identity / knowledge_nodes / knowledge_edges / learning_patterns / learning_episodes / meta_rules / review_queue）+ schema_version
- 纯 stdlib（sqlite3/json/datetime/re）——**无 SQLAlchemy、无 async**：抽象必须保持引擎零框架依赖
- learner 其余模块（router/scheduler/assess/injector）经 `LearnerCore` 方法访问存储，不直接连库

---

## 2. 架构决策（本次拍板，不可再翻）

| # | 决策 | 结论 | 理由 |
|---|---|---|---|
| D1 | L0 抽象形态 | **引擎内 Storage 协议**（SQLite/PG 双实现） | 引擎独立可测；Lemma 侧零侵入 |
| D2 | L2 触发模型 | **对话落库后异步提取** | 不依赖模型自律；信号确定性高 |
| D3 | **同步/异步边界（新发现）** | **引擎保持同步纯 stdlib；PG 实现用同步驱动（psycopg2/sync SQLAlchemy）；Lemma 侧经 `asyncio.to_thread` 调用** | 引擎 18 处同步 `_connect` 改 async = 引擎重构 + 双框架依赖；同步 PG + to_thread 改动最小且不阻塞事件循环 |
| D4 | Storage 事务语义 | `transaction()` 上下文管理器，SQLite=现有 commit 语义；PG=真实事务 | `record_episode` 原子性不可破坏 |
| D5 | 迁移策略 | **PG 实现新建 Alembic 迁移建 7 表**；存量 SQLite 数据**一次性迁移脚本**（单向，不回迁） | 数据是学习资产；但 dev/prod 未上量，迁移脚本保守可验证 |
| D6 | 门控 | `lemma_hermes_enabled` 保持 False 到 **L2 端到端冒烟通过**才翻转；新增 `evaluation_extract_enabled` 独立门控 | 双门控 = 引擎接入与信号采集解耦，可分别回滚 |

---

## 3. 分层实施步骤（每层独立交付 + 验收）

### 阶段 A：L0 存储抽象（先于一切）

**A1. 定义 Storage 协议**（`engine/lemma-hermes/agent/learner/storage/__init__.py`）
- 接口：`connect() -> ContextManager[Connection]`、`transaction() -> ContextManager`、`close()`
- Connection 适配 SQLite/PG 的统一游标语义（`execute(sql, params) -> rows`）
- 纯协议，无实现依赖

**A2. SQLiteStorage 实现**（`storage/sqlite_storage.py`）
- 迁移现有 `_connect()` 全部 18 处 → `self._storage.transaction()`
- 行为零变化：row_factory / busy_timeout / foreign_keys 保留
- **验收**：`learner_core` 单测全绿（现有行为不变）；`grep _connect` 为 0

**A3. PGStorage 实现**（`storage/pg_storage.py`）
- 同步驱动（psycopg2 或 sync SQLAlchemy 2.0），表结构对齐 schema_version
- 事务/游标语义对齐 SQLite 实现
- **验收**：与 SQLite 实现同一套单测参数化跑过（有 PG 环境则跑；无则标注待验）

**A4. LearnerCore 构造改造**
- `LearnerCore(storage)`——db_path 仅作 SQLite 便捷构造；引擎内不再出现 sqlite3 import（storage 包内除外）
- **验收**：`git grep sqlite3 engine/lemma-hermes/agent/learner/` 只剩 storage 包

**A5. Alembic 迁移（Lemma 侧）**
- 新增迁移建 7 张 learner 表（PG 方言，对齐 learner_schema.py）
- **验收**：`alembic upgrade head` 后 7 表存在；迁移链单 head 校验（沿用 AST 脚本）

**A6. 存量数据一次性迁移脚本**（`backend/tools/migrate_learner_sqlite_to_pg.py`）
- 读 SQLite → 写 PG，逐表校验行数；幂等（可重跑）
- **验收**：脚本在空库/有数据库各跑一次，行数一致；失败时日志可定位行

> **A 阶段用户视角**：无感（纯内部重构）。**验证**：引擎单测全绿 + 迁移链单 head + 冒烟（若有 PG）。

---

### 阶段 B：L1 数据模型补强

**B1. concept 规范化**
- `_resolve_concept` 现按字符串精确匹配——易碎（"向量点积" vs "点积"）。加 `concept_normalize()`：去空白/统一大小写/括号内容剥离；`concepts_in_text` 复用
- **验收**：同义写法命中同一 node（单测覆盖 5 组变体）

**B2. episode 判定来源 + 置信度**
- `learning_episodes` 加 `judged_by`（rule / llm / explicit / session_end）+ `confidence`（0-1）两列（PG 迁移 + SQLite schema 同步）
- **验收**：`record_episode` 接受并落库新字段；旧调用（不传）默认 `judged_by='rule'` 或 `'manual'`，兼容

**B3. messages_ref 结构化**
- 现状是自由字符串；改为 `{conversation_id, message_ids[]}` JSON——审计可回溯
- **验收**：写入/读取 round-trip 单测

> **B 阶段用户视角**：无感（数据更准）。**验证**：单测 + 迁移可回滚。

---

### 阶段 C：L2 信号管道（写路径，M3 MVP 落地）

**C1. 提取器接口**（`backend/ai/evaluation/extractor.py`）
- `extract_teaching_events(conversation, messages) -> list[TeachingEvent]`
- `TeachingEvent`: goal/concept/method/result/reason/new_strategy/messages_ref

**C2. 规则提取器**（`rules.py`，纯规则优先，零 LLM）
- 识别教学回合：assistant 讲解 → user 回应
- 信号：重问（failed）/ 表达理解（success）/ 表达困惑（failed）/ 无后续（partial）
- 保守原则：信号不足 ⇒ partial（引擎闸门兜底）
- **验收**：构造 12 组对话样本（success/failed/partial 各 4），规则命中 ≥10

**C3. LLM 质检器**（`adjudicator.py`，规则信号冲突时启用）
- 新 `AIUseCase.EVALUATE_EPISODE` + 模板（独立质检角色，非老师自评）
- 3 票多数决（arXiv 方法），票一致才采纳；冲突 ⇒ partial
- **门控**：`evaluation_extract_enabled`；规则信号清晰时跳过
- **验收**：12 组样本经 LLM 判定，与人工标注一致率 ≥80%（3 票后）

**C4. writer + 触发**
- `writer.py`：调 `LearnerCore.record_episode`（同步引擎 → `asyncio.to_thread`）
- 触发：`persist_turn` 成功后 `aio.spawn_protected` 异步提取（复用既有 protected task 模式，绝不阻塞流、绝不抛错）
- 范围先限：**learn space（project）对话**；普通/课程对话不处理（D 阶段前）
- **验收**：真实对话后 `learning_episodes` 行数增长；`judged_by/confidence` 有值；失败静默不炸流

**C5. 遥测**
- evaluator 调用次数/成本进 `ai_usage_logs`（复用 usage 通道）
- 提取/写入成功/失败计数进 `lemma.ai.telemetry` 通道
- **验收**：日志可查每轮提取的 result 分布

> **C 阶段用户视角**：几乎无感（后台积累真实信号）。**验证**：Dev Dashboard 探活 + episode 分布 + mastery 随 tested 变化（`probe_learner` 已具备）。

---

## 4. 测试策略（最严苛标准）

| 层 | 测试 | 标准 |
|---|---|---|
| 引擎单测 | `learner_core` 现有全量 + 新增 Storage 参数化（SQLite/PG 同套） | 100% 通过；SQLite 为 gate |
| 提取器单测 | 12 组构造样本 | 规则 ≥10/12；LLM 3 票 ≥80% 一致 |
| 迁移测试 | Alembic upgrade/downgrade | 可往返；单 head |
| 冒烟 | `tests/smoke_ai_facade.py`（既有） | 不回归 |
| 端到端冒烟（新） | 真实对话 → episodes → mastery 变化 | 全链路可观察 |
| 回滚演练 | 关门控 → 恢复旧行为 | 秒级，无残留 |

## 5. 风险登记册

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 同步 PG 在 async 进程死锁 | 中 | 高 | `to_thread` + 独立短连接 + 超时；冒烟验证 |
| concept 规范化破坏存量 node | 中 | 中 | 规范化函数先于行为变更，单测 5 组变体；存量不动 |
| LLM 判定成本失控 | 中 | 中 | 规则清晰跳过；3 票仅在冲突；成本进账本 |
| 提取器误判污染 learner | 中 | 高 | partial 保守 + 引擎闸门（partial 不动 mastery）+ 后续 episode 可修正 |
| persist_turn 链路被拖慢 | 低 | 高 | 异步 protected task；失败静默；与持久化完全解耦 |
| 迁移脚本丢数据 | 低 | 高 | 行数校验 + 幂等 + 单向明确标注 |

## 6. 执行顺序（依赖图）

```
A1 → A2 → A4（引擎抽象完成，单测绿）
      ↘ A3（PG 实现）→ A5（Alembic）→ A6（存量迁移）
B1 → B2 → B3（数据模型，可与 A 并行）
C1 → C2（规则提取）→ C4a（writer+触发）→ C5（遥测）
              ↘ C3（LLM 质检，规则稳定后接）
```

**里程碑**：
- **M-A**：A1-A6 全绿 → 引擎双存储可用（门控仍关）
- **M-B**：B1-B3 全绿 → 数据模型就绪
- **M-C**：C1-C5 全绿 → 端到端信号流动，冒烟通过后翻 `evaluation_extract_enabled`；稳定后翻 `lemma_hermes_enabled`

## 7. 红线（沿用调研计划，不可违背）

1. 诚实 > 体面：敢写"偏 (b)"；不做 LLM 自评打星当主信号
2. 不绑架用户：无弹窗、无评分请求（本计划全部后台）
3. 不破坏体验：异步、失败静默、零 latency 影响
4. 门控 + 可回滚：双门控；每阶段独立交付
5. 合规与隐私：只处理用户自己的对话；episode 不复制敏感原文（messages_ref 引用）；数据归属中国主体

## 8. 待你确认的最后两项

1. **D3 同步/异步边界**：引擎保持同步纯 stdlib + PG 同步驱动 + Lemma `asyncio.to_thread`——**确认吗？**（这是本次计划新增的关键决策，因引擎 18 处同步 `_connect` 而引入）
2. **开工顺序**：先 M-A（纯引擎抽象，不动 Lemma），还是 A/B/C 并行推进？（推荐：先 M-A 验证引擎抽象零回归，再并行 B/C）
