# WORKPACKAGES — LemmaHermes Memory Engine P0+P1 工作包明细

> 状态：待审查
> 用途：M1（P0 内核接线）+ M2（P1 assess 闭环）的可执行明细。每个工作包含：做什么 / 怎么实现 / 依赖 / 验收 / 风险。
> 配合 `PLAN.md`（概览）与 `DECISIONS.md`（决策）阅读。

---

## 0. 全局执行顺序（依赖图）

```
W0.1 包结构
  └─► W0.2 DB schema ──► W0.3 状态模型 ──► W0.4 更新函数
                                              │
         ┌────────────────────────────────────┤
         ▼                                    ▼
     W0.5 agent 接线（agent._learner 挂载）
         │
         ├─► W0.6 静态注入（system prompt）
         ├─► W0.7 动态注入（prefetch 链）
         └─► W0.8 工具注入（agent.tools）
                   │
                   ▼
              W1.1 认知变化分析（review prompt 覆盖）
                   │
              W1.2 Episode 提取（三源）
                   │
              W1.3 回流管线（episode → L2/L3/L5/队列）
                   │
              W1.4 端到端验收
```

**并行策略**：W0.5 完成后，W0.6 / W0.7 / W0.8 三条注入通道相互独立，可并行开发；W1.x 全部依赖 W0.x 完成。

---

## 1. W0.1 包结构

**做什么**：创建 `agent/learner/` 包，6 个模块骨架 + 空实现（所有方法先 `raise NotImplementedError` 或返回默认值）。

| 模块 | 职责 | 关键符号（骨架） |
|---|---|---|
| `learner_core.py` | 状态模型 + 存储 + 更新函数（纯逻辑） | `class LearnerCore` |
| `learner_injector.py` | 四通道注入编排 | `build_static_block(agent)` / `prefetch_context(agent, query)` / `inject_tools(agent)` |
| `learner_assess.py` | 认知变化分析（review prompt 文本 + 判定辅助） | `BUILD_COGNITIVE_REVIEW_PROMPT()` |
| `learner_scheduler.py` | spaced repetition（P2 用，P0 只留接口） | `class ReviewScheduler`（stub） |
| `learner_router.py` | 工具分发个性化（P2 用，P0 只留接口） | `hint_for_tool(agent, tool_name, args)`（stub） |
| `learner_projection.py` | 与内置记忆/外部 provider 互通（P3 用，P0 只留接口） | `sync_from_builtin(agent)`（stub） |

**依赖**：无。
**验收**：`python -c "from agent.learner.learner_core import LearnerCore; print('ok')"` 通过；所有模块可 import。
**风险**：低。注意 `agent/` 下已有同名模块前缀冲突（无 `learner*` 现存模块，已确认 `ls agent/ | grep -i learn` 只有 `learning_*`，不冲突）。

---

## 2. W0.2 DB schema（`~/.hermes/learner.db`）

**做什么**：建库脚本 + 7 张表 + 索引 + WAL。位置解析用 `hermes_constants.get_hermes_home() / "learner.db"`（参照 `hermes_state.py:236` 的 state.db 模式）。

**连接策略**：每次操作短连接（`sqlite3.connect` per-call）+ `PRAGMA journal_mode=WAL` + `PRAGMA busy_timeout=5000`。不持有长连接（与多进程/多线程 gateway 场景兼容，SQLite 单写者由自身锁保证，不需要外部文件锁）。

**完整 DDL**：

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP
);

-- L1 身份（user_id 分键）
CREATE TABLE IF NOT EXISTS identity (
    user_id    TEXT PRIMARY KEY,
    goals      TEXT DEFAULT '[]',      -- JSON array
    interests  TEXT DEFAULT '[]',
    background TEXT DEFAULT '',
    version    INTEGER DEFAULT 1,
    updated_at TIMESTAMP
);

-- L2 知识节点
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    node_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    concept      TEXT NOT NULL,
    domain       TEXT DEFAULT 'general',
    mastery      REAL DEFAULT 0.0,
    confidence   REAL DEFAULT 0.1,
    attempts     INTEGER DEFAULT 0,
    successes    INTEGER DEFAULT 0,
    last_test    TIMESTAMP,
    last_exposed TIMESTAMP,
    source       TEXT DEFAULT '',
    UNIQUE(user_id, concept, domain)
);
CREATE INDEX IF NOT EXISTS idx_nodes_user ON knowledge_nodes(user_id);

-- L2 知识边
CREATE TABLE IF NOT EXISTS knowledge_edges (
    user_id  TEXT NOT NULL,
    parent   INTEGER NOT NULL REFERENCES knowledge_nodes(node_id),
    child    INTEGER NOT NULL REFERENCES knowledge_nodes(node_id),
    weight   REAL DEFAULT 0.5,
    PRIMARY KEY(user_id, parent, child)
);

-- L3 学习模式
CREATE TABLE IF NOT EXISTS learning_patterns (
    pattern_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    concept      TEXT NOT NULL,
    method       TEXT NOT NULL,
    attempts     INTEGER DEFAULT 0,
    successes    INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.5,
    last_used    TIMESTAMP,
    UNIQUE(user_id, concept, method)
);

-- L4 经验
CREATE TABLE IF NOT EXISTS learning_episodes (
    episode_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    session_id   TEXT DEFAULT '',
    goal         TEXT NOT NULL,
    plugin       TEXT DEFAULT '',
    method       TEXT DEFAULT '',
    result       TEXT DEFAULT '',      -- success|failed|partial
    reason       TEXT DEFAULT '',
    new_strategy TEXT DEFAULT '',
    messages_ref TEXT DEFAULT '',
    created_at   TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_episodes_user_goal ON learning_episodes(user_id, goal);

-- L5 教学规律
CREATE TABLE IF NOT EXISTS meta_rules (
    rule_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    rule       TEXT NOT NULL,
    evidence   INTEGER DEFAULT 1,
    confirmed  INTEGER DEFAULT 0,
    refuted    INTEGER DEFAULT 0,
    domain     TEXT DEFAULT 'teaching',
    source     TEXT DEFAULT '',        -- review|statistical|manual
    status     TEXT DEFAULT 'hypothesis',  -- hypothesis|active|retired
    created_at TIMESTAMP
);

-- 复习队列
CREATE TABLE IF NOT EXISTS review_queue (
    user_id     TEXT NOT NULL,
    node_id     INTEGER NOT NULL REFERENCES knowledge_nodes(node_id),
    ease        REAL DEFAULT 2.5,
    interval    INTEGER DEFAULT 0,
    due         TIMESTAMP,
    last_review TIMESTAMP,
    PRIMARY KEY(user_id, node_id)
);
```

**迁移预留**：`schema_version` 表 + `migrate(db_path)` 函数，先放空版本列表（0 版建全表），后续加列/加表走版本递增。参照 `hermes_state_schema.py` 的模式但简化。

**验收**：建库脚本连续跑 2 次幂等；`PRAGMA journal_mode` 返回 `wal`；7 表 + 4 索引存在。
**风险**：低。唯一注意点是 `UNIQUE(user_id, concept, domain)` 的 upsert 语义（`ON CONFLICT DO UPDATE`）。

---

## 3. W0.3 状态模型（`learner_core.py`）

**做什么**：`LearnerCore` 类，全部操作显式带 `user_id` 参数（无默认全局上下文——强制调用方传用户，杜绝串记忆）。

**API 签名草案**：

```python
class LearnerCore:
    def __init__(self, db_path: str) -> None: ...

    # L1
    def get_identity(self, user_id: str) -> dict | None
    def upsert_identity(self, user_id: str, *, goals: list[str] | None = None,
                        interests: list[str] | None = None,
                        background: str | None = None) -> dict

    # L2
    def upsert_concept(self, user_id: str, concept: str, *,
                       domain: str = "general", tested: bool = True,
                       success: bool | None = None, exposed: bool = False) -> dict
    def get_knowledge(self, user_id: str, concepts: list[str] | None = None,
                      domain: str | None = None, limit: int = 20,
                      min_confidence: float = 0.0) -> list[dict]
    def add_knowledge_edge(self, user_id: str, parent: str, child: str,
                           weight: float = 0.5) -> None

    # L3
    def record_method(self, user_id: str, concept: str, method: str,
                      success: bool) -> dict
    def top_patterns(self, user_id: str, limit: int = 5,
                     min_attempts: int = 3) -> list[dict]

    # L4 —— 内部自动触发回流（见 W1.3）
    def record_episode(self, user_id: str, goal: str, *, session_id: str = "",
                       plugin: str = "", method: str = "", result: str = "partial",
                       reason: str = "", new_strategy: str = "") -> dict

    # L5
    def add_rule(self, user_id: str, rule: str, *, domain: str = "teaching",
                 source: str = "manual") -> dict
    def list_rules(self, user_id: str, status: str | None = None) -> list[dict]
    def confirm_rule(self, user_id: str, rule_id: int, hit: bool) -> None

    # 复习队列
    def get_due_reviews(self, user_id: str, now: str | None = None, limit: int = 5) -> list[dict]
    def reschedule_review(self, user_id: str, node_id: int, success: bool) -> None

    # 注入辅助（learner_injector 调用）
    def prefetch(self, user_id: str, query: str, limit: int = 10) -> str
```

**并发**：每方法内部 `with self._connect() as conn`（contextmanager 封装 connect + commit + close），`ON CONFLICT DO UPDATE` 保证幂等。
**验收**：单测覆盖每张表的增删改查 + upsert 幂等（同一概念连续 upsert 不产生重复行）。
**风险**：中——`UNIQUE` 冲突时 `ON CONFLICT DO UPDATE SET mastery = ...` 的表达式写法要仔细（SQLite 支持 `excluded.` 引用）。

---

## 4. W0.4 更新函数（纯 SQL，W0.3 内部实现）

**做什么**：把「episode 回流」和「复习重排」定义成确定性函数。核心原则：**每次全量重算而非增量加减**，避免浮点漂移。

**mastery / confidence（Beta 分布）**：

```sql
-- 一次测试后：
mastery    = successes / attempts            -- 后验均值（attempts 至少为 1）
confidence = 1 - exp(-attempts / 5.0)        -- 样本量驱动，5 次后约 0.63，10 次后约 0.86
```

- `tested=True, success=True`：`successes += 1, attempts += 1`
- `tested=True, success=False`：`attempts += 1`（successes 不变）
- `tested=False, exposed=True`：只更新 `last_exposed`，不动 mastery（**"被教过"不是"掌握"**，这是防误判的关键）

**L3 pattern**：

```sql
success_rate = successes / attempts          -- 同 Beta 后验
```

**L5 rule 状态机**（`confirm_rule` 内）：

```sql
UPDATE meta_rules SET
    confirmed = confirmed + CASE WHEN ?hit THEN 1 ELSE 0 END,
    refuted   = refuted   + CASE WHEN ?hit THEN 0 ELSE 1 END,
    status = CASE
        WHEN confirmed + refuted >= 5 AND refuted > confirmed * 2   THEN 'retired'
        WHEN confirmed + refuted >= 5 AND confirmed >= refuted * 3   THEN 'active'
        ELSE status END
WHERE rule_id = ?;
```

**SM-2（简化）**（`reschedule_review` 内）：

```python
if success:
    new_interval = max(int(interval * ease), 1)
    new_ease = min(ease + 0.1, 2.8)
else:
    new_interval = 0
    new_ease = max(ease - 0.2, 1.3)
new_due = now + timedelta(days=new_interval)
```

**验收**：边界单测——attempts=0 除零保护（SQL 里 `attempts + 1` 分母，不会 0）；ease clamp；mastery 单调性（3 连成上升、1 败下降）。
**风险**：低。全是确定性 SQL/纯函数，无外部依赖。

---

## 5. W0.5 agent 接线

**做什么**：把 `agent._learner` 挂到 AIAgent 上，配置化启停。

**改动点**（参照 `agent_init.py:1648-1657` 的 `_memory_store` 模式）：

```python
# agent_init.py，_memory_store 初始化之后
_learner_cfg = config.get("learner", {})
if _learner_cfg.get("enabled", False):          # 默认值待拍板（见问题）
    from agent.learner.learner_core import LearnerCore
    from hermes_constants import get_hermes_home
    agent._learner = LearnerCore(str(get_hermes_home() / "learner.db"))
    agent._learner.user_id = _resolve_user_id(agent)   # CLI=profile 名，gateway=user_id
else:
    agent._learner = None
```

**user_id 解析**（待拍板）：
- CLI：`agent.agent_identity`（profile 名，默认 `"default"`）
- gateway：`user_id`（`memory_provider.py:81` 已有该 kwargs）
- subagent/cron：沿用 `agent_context` 判断（`memory_provider.py:74-76`），非 primary 跳过写入

**配置项草案**：`learner.enabled` / `learner.db_path`（默认 `~/.hermes/learner.db`）/ `learner.user_id_source`。

**验收**：AIAgent 初始化后 `agent._learner` 存在且可访问；`enabled=false` 时为 None 且不影响任何现有路径。
**风险**：中——这是第一个触碰核心文件的改动，必须保证 `_learner=None` 时全链路行为与现状一致（所有调用点都要判空）。

---

## 6. W0.6 静态注入（system prompt）

**做什么**：system prompt volatile tier 并列一块 `learner_block`，内容 = L1 identity + L5 active rules + L3 top-N 摘要。

**改动点**：`agent/system_prompt.py:500-530`（volatile tier 组装处），在 `ext_mem_block` 之后追加：

```python
# Learner state (static tier: identity + rules + top patterns)
if agent._learner:
    try:
        _learner_block = agent._learner.build_static_block()
        if _learner_block:
            volatile_parts.append(_learner_block)
    except Exception:
        pass
```

**块格式草案**：

```
<learner-state>
[User profile: 一句话画像 + goals/interests 摘要]
[Active learning rules: 1. image analogy before equations (evidence=12, confirmed=9)]
[Learning patterns: linear algebra → visualization (85% / 6 tries)]
</learner-state>
```

**标签**：新 `<learner-state>` 标签（**待拍板**：与 `<memory-context>` 分开，还是并入？建议分开——语义不同，且 `memory_tool.py` 的注入扫描不认识新标签不会误伤）。

**缓存影响**：volatile tier session 冻结（`system_prompt.py:558-565`）→ learner_block session 内不变，**不破坏 prefix cache**。identity/rules 本就低频，跨会话生效可接受。
**验收**：启 learner 后 prompt 含 `<learner-state>` 块；session 内两次 build 的 hash 一致（稳定性断言）。
**风险**：低。注意 `_scan_memory_content`（`memory_tool.py:86`）的威胁扫描只作用于 MEMORY.md 写入，不经过这里；但 `sanitize_context`（`memory_manager.py:174`）若被复用在静态块，需确认标签白名单。

---

## 7. W0.7 动态注入（prefetch 链）

**做什么**：L2 knowledge 检索召回 + 到期复习提示，每轮注入 user message API 副本。

**改动点**：`agent/turn_context.py:1149-1165`（`on_turn_start` + `prefetch_all` 区域），追加 learner 召回：

```python
# Learner recall: knowledge nodes matching the user query + due reviews
if agent._learner:
    try:
        _learner_ctx = agent._learner.prefetch(agent._learner.user_id, _query)
        if _learner_ctx:
            _query = _query + "\n\n" + _learner_ctx   # 或并入 ext_prefetch_cache
    except Exception:
        pass
```

**注入位置**：与 `ext_prefetch_cache` 并列（`compose_user_api_content` 的入参），或直接拼接进 prefetch 缓存——**待拍板**（建议：learner 召回并入 prefetch 缓存字符串，保持 `compose_user_api_content` 调用点不变）。

**检索实现**（`LearnerCore.prefetch`）：
1. 关键词匹配：query 分词（空白/标点切分，纯 stdlib）→ `LIKE` 匹配 `concept` 或 `domain`
2. 命中节点输出：`concept (mastery 65%, attempts 3, last_test 3d ago)`
3. 附到期复习：`get_due_reviews` 的 concept 列表
4. 结果包成 `<memory-context>` fenced 块（复用 `build_memory_context_block` 的权威声明，`memory_manager.py:347-361`）

**验收**：turn 内 user message 的 API 副本含 learner 召回；`compose_user_api_content` 行为对 `_learner=None` 时完全不变。
**风险**：中——这条链是 cache 关键路径，任何异常都要静默吞掉（try/except 已设计）。召回内容**绝不进 system prompt**。

---

## 8. W0.8 工具注入

**做什么**：暴露 learner 工具给模型。

**工具形态**（**待拍板**，两案）：
- **案 A（推荐）**：单工具 `learner_state`，`action` 枚举 `upsert_concept / record_episode / query_knowledge / add_rule`——参照 `memory` 工具的多 action 模式（`memory_tool.py:1152`），schema 体积小。
- **案 B**：多工具 `learner_upsert_concept / learner_record_episode / ...`——每个独立，schema 膨胀但调用更直接。

**注入方式**：仿 `inject_memory_provider_tools`（`memory_manager.py:110-170`）但独立实现（不走 provider 通道，因为 T3 天花板：`memory` 是 core 名，且 learner 是内置第一公民）：

```python
# agent_init.py，inject_memory_provider_tools 之后
if agent._learner:
    from agent.learner.learner_injector import inject_tools
    inject_tools(agent)   # append schema 到 agent.tools + valid_tool_names
```

**schema 草案（案 A）**：

```json
{
  "name": "learner_state",
  "description": "Update or query the user's learner state (knowledge mastery, learning patterns, episodes). Call after a user demonstrates understanding or failure, or to check what concepts need review.",
  "parameters": {
    "action": {"enum": ["upsert_concept", "record_episode", "query_knowledge", "add_rule"]},
    "concept": {"type": "string"},
    "success": {"type": "boolean"},
    "goal": {"type": "string"},
    "result": {"type": "string", "enum": ["success", "failed", "partial"]},
    "method": {"type": "string"},
    "reason": {"type": "string"},
    "new_strategy": {"type": "string"}
  }
}
```

**验收**：`agent.tools` 含 learner_state schema；模型可调用；`_learner=None` 时不注入。
**风险**：低。注意 core 工具名保护逻辑（`memory_manager.py:437-454`）不适用（不走 provider），但命名避开 `memory`/`skill*` 即可。

---

## 9. W1.1 认知变化分析（review prompt 覆盖）

**做什么**：让后台自省从「提取 persona」变成「分析认知变化」，写 episode 而不是写文本记忆。

**改动点 1**：覆盖 review prompt（`background_review.py:1006-1012` 读取 `agent._COMBINED_REVIEW_PROMPT`）。在 `learner_assess.py` 提供 `BUILD_COGNITIVE_REVIEW_PROMPT()`，agent_init 里若 `learner.enabled` 则 `agent._COMBINED_REVIEW_PROMPT = ...`。

**prompt 追加段（草稿）**：

```
**Learner state** (new): beyond persona, analyze COGNITIVE CHANGE.
  • User DEMONSTRATED understanding (explained back, solved a problem)?
    → learner_state action=upsert_concept concept=<topic> success=true
  • User failed / got stuck / said "too abstract"?
    → learner_state action=record_episode result=failed reason=<why>
  • A teaching method clearly worked or failed (user praised an analogy,
    rejected equations)?
    → learner_state action=record_episode method=<m> result=success|failed
  • NEVER record "user asked about X" as mastery. Only demonstrated
    understanding counts. Absence of failure is NOT success.
```

**改动点 2**：fork 工具白名单（`background_review.py:12-14`）`["memory", "skills"]` → 追加 `"learner_state"`（或案 B 的 learner_* 名单）。**注意**：fork 构造子 AIAgent 时 `_learner` 会被 agent_init 正常初始化，但 **fork 的 user_id 必须从父 agent 继承**——需在 fork 参数里传（待实现时确认 `_spawn_background_review` 的 agent 复制方式）。

**验收**：review fork 会话中模型能调用 learner_state 写 episode（模拟验证：给 review prompt 喂一段含"用户说太抽象了"的对话，输出含 record_episode 调用）。
**风险**：中——fork 链路（`background_review.py` 的重放逻辑）是 Hermes 自有机制，改动最小化：只换 prompt 字符串 + 白名单数组。

---

## 10. W1.2 Episode 提取（三源）

| 来源 | 触发 | 实现 | 置信度 |
|---|---|---|---|
| 显式测验 | 模型 turn 内主动调 `learner_state(record_episode)` | 工具 handler 直接落库 | 高 |
| 用户演示 | review fork 判定"用户演示了理解/失败" | W1.1 的 prompt 引导，review 调 learner_state | 中 |
| 压缩兜底 | 上下文压缩前 | **待拍板**：learner 不是 provider，没有现成 `on_pre_compress` 钩子。两条路：(a) P1 就接线 `context_compressor` 的压缩前回调，调 `LearnerCore.record_episode(result='partial', reason='compressed')`；(b) 延到 P2 做。 | 低 |

**验收**：三源（或两源，若压缩兜底延后）都能落 `learning_episodes`。
**风险**：中（压缩兜底）——`context_compressor.py` 是 6708 行的核心文件，接线要非常小心，这是本计划里唯一"必须深入压缩器内部"的改动。若用户选延后，P1 风险降为低。

---

## 11. W1.3 回流管线

**做什么**：episode 落库后**同一事务内**自动回流 L2/L3/L5/review_queue，保证原子性（不留半更新状态）。

**实现**：`LearnerCore.record_episode` 内部（单事务）：

```python
with self._connect() as conn:
    # 1. 落 episode
    # 2. 若 goal 能映射到 concept（goal 含概念词，或显式传 concept）：
    #    upsert_concept(concept, success=(result=='success'))
    # 3. 若 method 非空：record_method(concept, method, success)
    # 4. 若 result=='success'：review_queue 重排（间隔×2）
    # 5. 若 result=='failed' 且 new_strategy 非空：L5 add_rule(hypothesis)
    # 6. rule 命中验证：confirm_rule(hit=(result=='success'))
```

**goal→concept 映射**：episode 显式带 `concept` 字段最干净（skill_manage 里已有类似约定）——**待拍板**：schema 里 `goal` 已有，是否再加 `concept` 列（建议加，避免字符串匹配猜测）。若不加，用 goal 分词匹配 knowledge_nodes 已有概念。

**验收**：模拟数据——录 3 条 episode（2 成 1 败），断言 knowledge_nodes/learning_patterns/meta_rules/review_queue 四表数值全部正确联动。
**风险**：低。纯函数 + 单事务，可完整单测。

---

## 12. W1.4 端到端验收

**做什么**：不调真实 LLM 的集成测试脚本（mock agent loop），走完「教 → 测 → 回流 → 复习队列」全链路。

**验收脚本场景**：
1. 模拟用户问"什么是 attention" → `exposed=True`（last_exposed 更新，mastery 不动）
2. 模拟用户复述解释成功 → `upsert_concept(success=True)` → mastery 0.5/confidence 0.18
3. 模拟用户说"太抽象了" → `record_episode(result='failed', reason='too abstract', new_strategy='visualization')` → mastery 降、L5 生成 hypothesis rule
4. 再测成功 → mastery 回升、rule confirmed++
5. `get_due_reviews` 有到期项 → `reschedule_review(success=True)` → interval 翻倍

**cache 回归检查**：`learner.enabled` 开/关各跑一次 `build_system_prompt`，断言开关两态下 system prompt 结构一致（仅多 `<learner-state>` 块），且 enabled 态 session 内 hash 稳定。

**验收**：脚本全绿；PLAN.md 的 M1/M2 验收信号达成。
**风险**：低——纯测试，不碰生产路径。

---

## 13. 已决议项（D5-D10，全部完成）

| # | 问题 | 结论 | 参照 D# |
|---|---|---|---|
| Q1 | `learner.enabled` 默认值 | **true** | D5 |
| Q2 | 工具形态：单工具 multi-action vs 多工具 | **单工具 `learner_state`** | D6 |
| Q3 | 压缩兜底是否进 P1 | **延后到 P2**（P1 只做两源） | D7 |
| Q4 | 静态块标签 | **`<learner-state>`** | D8 |
| Q5 | episode 是否加 `concept` 列 | **加** | D9 |
| Q6 | user_id 来源（CLI） | **agent_identity/profile 名，默认 `"default"`** | D10 |

## 14. 变更日志

- 2026-08-03：创建本明细，挂起 Q1-Q6。
- 2026-08-03：Q1-Q6 全部决议（D5-D10），上限分析完成，计划定稿。
