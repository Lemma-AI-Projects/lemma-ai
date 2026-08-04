# LemmaHermes Memory Engine 深度集成方案
## 从「旁路 Provider」到「第一公民内核」——最大化 memory engine 上限

> 调研对象：Hermes Agent（commit `cd6585abf`）
> 前置阅读：`LEMMA_MEMORY_ENGINE_RESEARCH.md`（五层架构差距分析）
> 本方案回答：如何把集成度提到最高，让 memory engine 不再是"记忆插件"，而是**横切整个 agent 的学习者状态内核**。

---

## 0. 一句话结论

上一轮方案把五层状态系统做成 `plugins/memory/lemma-learner/` 插件 provider——**那是旁路，有天花板**。深度集成方案是：新建 **`agent/learner/` 第一公民内核**（不占 MemoryProvider 槽位、不受 one-external limit 约束），通过 **四通道注入**（静态 / 动态 / 工具 / 决策）+ **闭环学习循环**（plan → teach → assess → update + spaced repetition）打通 Hermes 全部 12 个 memory 挂载点，让"学习者状态"成为 agent 每个决策环节都可读、可写、可计算的**横切状态核心**。

---

## 1. 现状盘点：memory 在 Hermes 的全部挂载点（本轮补查的修正）

上一轮报告只覆盖了 MemoryStore（文件态）和后台自省。本轮补查 `agent/memory_manager.py`、`agent/system_prompt.py`、`agent/turn_context.py` 后，**Hermes 的 memory 管道其实比想象中完整**——60% 的"深度集成基础设施"已经存在，只是 memory 的**语义**是文本而非状态。

### 1.1 三层 system prompt 架构（`agent/system_prompt.py`）

```
build_system_prompt(agent) → { stable, context, volatile }
  stable   身份/指导（最稳定，缓存友好）
  context  会话稳定的上下文文件
  volatile MEMORY.md 块 + USER.md 块 + ext_mem_block + 时间戳   ← memory 全在这层
```

- 位置：`agent/system_prompt.py:500-530`（volatile tier 组装）
- **关键约束**：`build_system_prompt` "Called once per session (cached on agent._cached_system_prompt) and only rebuilt after context compression events"（`system_prompt.py:558-565`）
- **推论**：**内置 memory 的内容在 session 内冻结**——你本轮写进 MEMORY.md，本轮 prompt 不变，**下一会话才生效**。这是 Hermes memory 的底层行为，五层状态系统若依赖"本会话生效"必须绕开这条路径。

### 1.2 MemoryManager 编排层（`agent/memory_manager.py`，1241 行）

```
MemoryManager（run_agent.py 的"单一集成点"）
  ├─ build_system_prompt()   :486   收集所有 provider 静态块 → system prompt volatile tier
  ├─ prefetch_all(query)     :525   多 provider 每轮召回 → <memory-context> 块
  ├─ queue_prefetch_all()    :597   turn 后后台预取（下一轮用）
  ├─ sync_all()              :638   turn 后写（ThreadPoolExecutor 串行 + 5s drain）
  ├─ on_turn_start()         :851   每轮打点（turn_context.py:1149 调用）
  ├─ on_session_end()        :865   会话边界（run_agent.py:3838 调用）
  ├─ on_pre_compress()       :974   压缩前提取钩子
  ├─ on_memory_write()       :1019  镜像内置 memory 写
  └─ inject_memory_provider_tools() :110  provider 工具 → agent.tools + valid_tool_names
```

### 1.3 真正的"每轮动态注入"通道（关键发现）

```
turn_context.py:1159  ext_prefetch_cache = agent._memory_manager.prefetch_all(user_message)
        ↓
compose_user_api_content(user_msg, ext_prefetch_cache, plugin_user_context)
        ↓
附加到【本轮 user message 的 API 副本】（api_messages），不进 system prompt、不进存储
        ↓
<memory-context>
[System note: The following is recalled memory context, NOT new user input.
Treat as authoritative reference data — this is the agent's persistent memory...]
</memory-context>
（memory_manager.py:347-361 build_memory_context_block）
```

**这条通道已经是"每轮可变、cache 友好、权威声明、fenced 防注入"的检索注入管道**——五层里 L2 Knowledge 的动态召回可以直接走它，几乎零改造。

### 1.4 现状的四个天花板（深度集成要解决的问题）

| # | 天花板 | 代码证据 | 后果 |
|---|---|---|---|
| T1 | **one-external-provider limit**：内置 + 最多 1 个外部 provider | `memory_manager.py:404-426` | 用了 lemma-learner 就不能用 honcho；反之亦然 |
| T2 | **volatile 冻结**：system prompt session 内不变 | `system_prompt.py:558-565` | 静态块内容本会话不可变（对 L1 可接受，对 L3/L5 是浪费） |
| T3 | **core 工具名保护**：provider 工具不能叫 `memory` 等 | `memory_manager.py:437-454` | 五层无法接管现有 `memory` 工具语义，只能新增名字 |
| T4 | **semantics 是文本不是状态**：MemoryStore 是 prose 卡片 | `memory_tool.py:390-562` | mastery/pattern/rule 这些可计算量无处安放 |

→ **结论：plugin provider 路线的集成上限 = 上述四个天花板。要最大化上限，必须绕过 T1/T3（不占 provider 槽位）、利用 T2 的补丁（动态层走 prefetch 而非 static block）。**

---

## 2. 设计原则：为什么是「第一公民内核」

```
❌ 旁路路线（上轮方案）            ✅ 第一公民路线（本方案）
plugins/memory/lemma-learner/      agent/learner/  ← 与 agent/ 平级的核心模块
   └─ 受 one-external limit          ├─ 直接挂在 AIAgent 上（像 _memory_store）
   └─ 工具名不能碰 core               ├─ 四通道注入（静态/动态/工具/决策）
   └─ 静态块被 volatile 冻结           ├─ 与 MemoryProvider 通道并存（投影互通）
   └─ 只能通过 ABC 钩子               └─ 可接管 core memory 工具语义（升级而非新增）
```

**三个理由证明第一公民路线是上限**：

1. **状态必须被"决策"消费才有价值**。L3 的"这个用户别先上公式"如果只在 prompt 里当文本出现，是靠模型自觉；如果挂在 `tool_executor` 分发层（`agent/tool_executor.py`）当结构判断用，是确定性行为。后者需要 learner core 直接可被工具层 import——旁路 provider 做不到。
2. **闭环需要"写入→回流→调度"的时序控制**。spaced repetition 要在 turn 结束、episode 落库后立即重排 `review_queue`；旁路 provider 的 `sync_all` 是 fire-and-forget 线程（`memory_manager.py:638-698`），拿不到完成时序。
3. **上限 = 数据模型 × 消费点数量**。旁路只能消费 ABC 定义的 8 个钩子；第一公民可以消费全部 12 个挂载点，包括 `todo`（学习路径规划）、`cron`（复习调度）、`curator`（规则 GC）、`delegate`（子任务学习回流）这些 ABC 碰不到的。

---

## 3. 总体架构：Learner Core

```
                        ┌──────────────────────────────────────────┐
                        │              agent/learner/              │
   ┌─────────────┐      │  learner_core.py    状态模型 + 更新函数    │
   │  user turn  │─────►│  learner_injector.py  四通道注入           │
   └─────────────┘      │  learner_assess.py   认知变化分析          │
        │               │  learner_scheduler.py spaced repetition   │
        ▼               │  learner_router.py   工具分发个性化         │
   tool_executor        │  learner_projection.py 与内置/外部互通      │
        │               │  learner.db  (SQLite, WAL)                │
        ▼               └──────────────────────────────────────────┘
   plugin 调用 ──hint──►       ▲  ▲  ▲  ▲
                              │  │  │  └─ 决策通道：router 命中 pattern → 注入个性化提示
                              │  │  └──── 工具通道：learner 工具集 → agent.tools
                              │  └─────── 动态通道：prefetch_all → <memory-context> 每轮
                              └────────── 静态通道：system_prompt volatile tier
```

### 3.1 模块与职责

| 模块 | 职责 | 核心挂载点 |
|---|---|---|
| `learner_core.py` | 状态模型：6 表读写、mastery/pattern/rule 更新函数、user_id 分键 | 纯逻辑，无 IO 依赖 |
| `learner_injector.py` | 四通道注入编排：静态块 / prefetch 动态块 / 工具 schema / router 提示 | system_prompt.py:517、turn_context.py:1159、inject_memory_provider_tools |
| `learner_assess.py` | 认知变化分析：覆盖 review prompt + episode 提取（主动标注 + on_pre_compress 兜底） | background_review.py:1006-1012、memory_provider.on_pre_compress |
| `learner_scheduler.py` | spaced repetition：复习队列、间隔算法、cron job 注册 | cron/jobs.py、turn 内 nudge |
| `learner_router.py` | 工具分发个性化：命中高置信 pattern 时注入 hint | agent/tool_executor.py 分发层 |
| `learner_projection.py` | 与内置 MEMORY.md/USER.md 双写 + 外部 provider 互通 | agent_init.py:1653、memory_provider.on_memory_write |

### 3.2 数据模型（`learner.db`，6 表）

```sql
-- L1 · 身份（user_id 分键，解决"多用户共享 MEMORY.md"根因）
CREATE TABLE identity (
    user_id    TEXT PRIMARY KEY,        -- gateway user_id / CLI profile
    goals      TEXT DEFAULT '[]',       -- JSON array
    interests  TEXT DEFAULT '[]',
    background TEXT DEFAULT '',         -- 从 USER.md 一次性迁移
    version    INTEGER DEFAULT 1,
    updated_at TIMESTAMP
);

-- L2 · 知识状态（核心增量：mastery/confidence）
CREATE TABLE knowledge_nodes (
    node_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    concept      TEXT NOT NULL,         -- 'attention'
    domain       TEXT DEFAULT 'general',
    mastery      REAL DEFAULT 0.0,      -- successes/attempts（Beta 后验均值）
    confidence   REAL DEFAULT 0.1,      -- 1 - exp(-attempts/5)
    attempts     INTEGER DEFAULT 0,
    successes    INTEGER DEFAULT 0,
    last_test    TIMESTAMP,
    last_exposed TIMESTAMP,             -- 上次被教/被问
    source       TEXT DEFAULT '',       -- 建立该节点的 episode
    UNIQUE(user_id, concept, domain)
);
CREATE TABLE knowledge_edges (
    user_id  TEXT NOT NULL,
    parent   INTEGER REFERENCES knowledge_nodes(node_id),
    child    INTEGER REFERENCES knowledge_nodes(node_id),
    weight   REAL DEFAULT 0.5,
    PRIMARY KEY(user_id, parent, child)
);

-- L3 · 学习模式（方法成功率 → router 决策）
CREATE TABLE learning_patterns (
    pattern_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    concept      TEXT NOT NULL,         -- 'linear algebra'
    method       TEXT NOT NULL,         -- 'visualization' / 'formula_first'
    attempts     INTEGER DEFAULT 0,
    successes    INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.5,      -- successes/attempts
    last_used    TIMESTAMP,
    UNIQUE(user_id, concept, method)
);

-- L4 · 经验（learning episode，五层的燃料）
CREATE TABLE learning_episodes (
    episode_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    session_id   TEXT,                  -- 关联 state.db sessions
    goal         TEXT NOT NULL,         -- 'understand attention'
    plugin       TEXT DEFAULT '',       -- 'paper-reader'
    method       TEXT DEFAULT '',
    result       TEXT DEFAULT '',       -- success|failed|partial
    reason       TEXT DEFAULT '',       -- 'too abstract'
    new_strategy TEXT DEFAULT '',       -- 'use visualization first'
    messages_ref TEXT DEFAULT '',       -- 起止 message id（可追溯原文）
    created_at   TIMESTAMP
);
CREATE INDEX idx_episodes_goal ON learning_episodes(user_id, goal);

-- L5 · 教学规律（关于学习的学习，带验证回路）
CREATE TABLE meta_rules (
    rule_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    rule       TEXT NOT NULL,           -- 'image analogy before equations'
    evidence   INTEGER DEFAULT 1,       -- 支撑的 episode 数
    confirmed  INTEGER DEFAULT 0,       -- 验证成功次数
    refuted    INTEGER DEFAULT 0,       -- 验证失败次数
    domain     TEXT DEFAULT 'teaching',
    source     TEXT DEFAULT '',         -- review|statistical|manual
    status     TEXT DEFAULT 'hypothesis', -- hypothesis|active|retired
    created_at TIMESTAMP
);

-- 复习调度（spaced repetition 队列）
CREATE TABLE review_queue (
    user_id     TEXT NOT NULL,
    node_id     INTEGER REFERENCES knowledge_nodes(node_id),
    ease        REAL DEFAULT 2.5,       -- SM-2 风格
    interval    INTEGER DEFAULT 0,      -- 天
    due         TIMESTAMP,
    last_review TIMESTAMP,
    PRIMARY KEY(user_id, node_id)
);
```

**更新函数（纯 SQL，不烧 token）**：

```sql
-- episode.result 回流 L2：一次成功 +0.15 / 失败 -0.10，confidence 向 1 收敛
UPDATE knowledge_nodes
SET mastery = (successes + CASE WHEN ?success THEN 1 ELSE 0 END)
              / (attempts + 1),
    confidence = 1 - exp(-(attempts + 1) / 5.0),
    attempts = attempts + 1,
    successes = successes + CASE WHEN ?success THEN 1 ELSE 0 END,
    last_test = now
WHERE user_id = ? AND node_id = ?;

-- episode 回流 L3：method 成功率累加
UPDATE learning_patterns
SET attempts = attempts + 1,
    successes = successes + CASE WHEN ?success THEN 1 ELSE 0 END,
    success_rate = successes / attempts,
    last_used = now
WHERE user_id = ? AND concept = ? AND method = ?;

-- L5 验证：rule 命中时记录 confirmed/refuted，比例超阈值自动降级
UPDATE meta_rules
SET confirmed = confirmed + CASE WHEN ?hit THEN 1 ELSE 0 END,
    refuted   = refuted + CASE WHEN ?hit THEN 0 ELSE 1 END,
    status = CASE
        WHEN refuted > confirmed * 2 AND confirmed + refuted >= 5 THEN 'retired'
        WHEN confirmed >= 5 AND refuted <= confirmed * 0.3 THEN 'active'
        ELSE status END
WHERE rule_id = ?;
```

### 3.3 四通道注入（利用现有管道，非全量重构）

| 通道 | 内容 | 频率 | 落点 | 实现 |
|---|---|---|---|---|
| 静态 | L1 identity + L5 active rules + L3 top-N 摘要 | session 启动 | system prompt volatile tier | 仿 `memory_manager.build_system_prompt()`，在 `system_prompt.py:517` 旁并列一块 `learner_block` |
| 动态 | L2 knowledge 检索召回 + 到期 episode 提示 | 每轮 | user message API 副本 `<memory-context>` | 直接复用 `turn_context.py:1159` 的 `prefetch_all` 链，learner core 作为"内置第一个 provider"喂给 `compose_user_api_content` |
| 工具 | `learner` 工具集 | 模型调用 | agent.tools + valid_tool_names | 仿 `inject_memory_provider_tools()`（`memory_manager.py:110`），但**允许接管 `memory` 语义**（升级为 `memory` + `learner_*`） |
| 决策 | L3 pattern 命中 → 插件个性化提示 | 工具分发时 | tool_executor 分发层 | 新增 `learner_router`，挂 `registry.register()` 的配套 hint 回调 |

---

## 4. 深度集成矩阵：12 个挂载点逐一改造

| # | 挂载点 | 现状 | 改造 | 效果 |
|---|---|---|---|---|
| M1 | system prompt 组装 | `system_prompt.py:500-530` 只放 MEMORY.md/USER.md/ext_mem_block | 并列 `learner_block`（L1+L5+L3 摘要） | 身份与规则常驻，session 冻结可接受 |
| M2 | 每轮动态召回 | `turn_context.py:1159 prefetch_all` 已存在 | learner core 作为内置 provider 参与，返回 `<memory-context>` | L2 每轮检索注入，cache 友好 |
| M3 | 工具 schema | `inject_memory_provider_tools`（memory_manager.py:110） | learner 工具集注入；`memory` 工具语义升级（upsert 替代 add） | 模型可读写 learner state |
| M4 | 工具分发 | `tool_executor.py` 分发 + check_fn 门控 | learner_router 挂 hint 回调 | "插件调用前知道用户偏好"变为确定性行为 |
| M5 | 后台自省 | `background_review.py:1006-1012` prompt 可覆盖 | `learner_assess` 覆盖 `_COMBINED_REVIEW_PROMPT` + fork 白名单加 learner 工具 | 认知变化分析替代记忆提取 |
| M6 | 上下文压缩 | `context_compressor.py` + `on_pre_compress`（memory_manager.py:974） | 压缩前 episode 兜底提取（复用 `on_pre_compress` 返回文本） | 被丢弃的消息不丢经验 |
| M7 | 技能生命周期 | `curator.py:1-20` | meta_rules/patterns 纳入 curator 归档 GC；复用 `curator_backup.py` 快照 | 规则库也有生命周期管理 |
| M8 | 规划 | `todo_tool.py:267` | learner_scheduler 把"复习"排进 todo（可选） | 学习路径显式化 |
| M9 | 定时任务 | `cron/jobs.py` + scheduler | 注册"复习提醒"cron job（due 队列） | spaced repetition 可离线调度 |
| M10 | 子 agent | `delegate_tool.py:2778` + `on_delegation`（memory_provider.py:232） | 子任务 task+result 作为 episode 回流 | 子 agent 的学习不丢 |
| M11 | 多平台多用户 | gateway sessions + user_id | learner 全表按 user_id 分键 | 根治单全局 MEMORY.md |
| M12 | 可视化 | `learning_graph.py` journey | mastery 属性接入；升级为 learner dashboard | 状态可观测 |

---

## 5. 闭环学习循环：plan → teach → assess → update

```
        ┌───────────── plan ─────────────┐
        │   learner_scheduler：           │
        │   review_queue.due 到期概念     │
        │   → 注入"今天复习 attention"     │
        │                                ▼
   update ◄────────── assess ◄──────── teach
        │              │                 │
        │              │  用户演示理解/     │
        │              │  测验结果/失败     │
        │              ▼                 │
   episode.result ──► 回流：              │
   ├─ L2 mastery ±0.15/0.10              │
   ├─ L3 success_rate 累加               │
   ├─ L5 confirmed/refuted               │
   └─ review_queue 重排（成功间隔×2，     │
      失败重置）──────────────────────────┘
```

**assess 信号的三条来源**（按置信度排序）：

1. **显式测验**（最高置信）：复习时模型出题，用户答对/答错 → `episode.result` 直接可信。
2. **用户演示**（中置信）：用户自己解释概念、解决例题 → `learner_assess` 判定为 success（review prompt 硬性规定：**只有演示过的理解才算 success**，杜绝"问过=掌握"）。
3. **后台自省**（低置信，兜底）：`on_pre_compress` / session 边界提取，reason/new_strategy 从消息推断。

**spaced repetition 算法**（SM-2 简化版）：

```
成功复习：interval = max(interval * ease, 1) 天；ease += 0.1（上限 2.8）
失败复习：interval = 0（明天重测）；ease -= 0.2（下限 1.3）
到期判定：review_queue.due <= now → 进入"今天要复习"集合
```

**这就是"最大化上限"的闭环**：不只是记录，而是**主动安排复习 → 评估 → 用结果修正状态 → 再安排**。Hermes 现有机制只有"记录"半环，本方案补上"评估+调度"另外两环。

---

## 6. 上限放大器清单（为什么这套是上限，而非又一次重构）

1. **状态可计算**：mastery/confidence/success_rate 全是数值——可排序、可查询（"掌握度最低的 5 个概念"）、可驱动决策（router/cron）。文本记忆做不到。
2. **反馈闭环**：Hermes 唯一缺的"效果信号"补上了，且回流全是 SQL 统计（`record_feedback` 的 delta 模式从 holographic 移植，`store.py:78-82`）。
3. **可评测**：`learning_episodes` 表天然是评测集——`batch_runner.py` 的跑分结果可回流校准 mastery（解决第一轮报告 2.3 的"评测没接回学习回路"遗留问题）。
4. **用户隔离**：全表 user_id 分键，gateway 多用户不再串记忆。
5. **可观测**：journey 可视化升级为 learner dashboard（mastery 图谱 + 复习队列 + 规则库状态）。
6. **不冲突外部后端**：learner core 是内置第一公民（不占 provider 槽位），honcho 等仍可通过 MemoryProvider 通道并存，`learner_projection.py` 做双向投影。
7. **成本受控**：动态注入走已有 prefetch 管道（无新增 token 结构）；回流/调度纯 SQL + cron，不额外烧 LLM（只有 `learner_assess` 的 review 用一次模型，且复用 fork 的 cache 策略）。

---

## 7. 缓存契约与风险

| 风险 | 影响 | 对策 |
|---|---|---|
| prefix cache 回归 | 动态内容进 system prompt 会打碎 KV 缓存 | 严格四通道分层：静态只放低频；动态全走 prefetch（user message 层，断点在 system prompt 之后） |
| volatile 冻结限制 | L3/L5 变化本会话不生效 | 接受（规则/身份本就低频）；高频 L2 走动态通道绕开 |
| LLM 误判 mastery | "问过"≠"掌握" | assess 置信分级（显式测验 > 用户演示 > 后台推断）；confidence 由样本量约束 |
| 复习调度打扰用户 | cron 推送过多 | review_queue 默认只在 agent 活动时提示，cron job 默认关闭（config 开关） |
| 多进程写冲突 | learner.db 被并发写 | SQLite WAL + 复用 Hermes 文件锁模式（`memory_tool.py:278-313`） |
| 与内置 MemoryStore 双写不一致 | MEMORY.md 与 identity 表漂移 | `learner_projection.py` 单向权威：learner.db 为主，MEMORY.md 只作兼容投影；用户手动编辑用漂移检测回灌（复用 `_detect_external_drift`，`memory_tool.py:807`） |

---

## 8. 路线图（每阶段独立可交付、可验收）

### P0 — 内核与接线（1 周级）
- [ ] `agent/learner/learner_core.py`：learner.db schema + 6 表读写 + 更新函数
- [ ] `agent/learner/learner_injector.py`：静态块（仿 `system_prompt.py:517` 并列 learner_block）+ 动态块（接入 `turn_context.py:1159` prefetch 链）
- [ ] agent_init 接线：`agent._learner` 挂在 AIAgent 上（与 `_memory_store` 平级，`agent_init.py:1653` 附近）
- **验收**：跑一个会话，learner.db 有 identity 行；system prompt 长度与 cache 命中率无回归

### P1 — assess 回路（核心闭环）
- [ ] `learner_assess.py`：覆盖 `_COMBINED_REVIEW_PROMPT` + fork 白名单加 learner 工具（`background_review.py:1006-1012`、`:12-14`）
- [ ] episode 三源提取（显式测验 / 用户演示 / on_pre_compress 兜底）
- [ ] episode 回流更新函数（L2/L3/L5 + review_queue）
- **验收**：同一概念学 3 次 mastery/confidence 单调上升；fail 后下降；复习队列生成

### P2 — 决策与调度
- [ ] `learner_router.py`：tool_executor 分发 hint（挂 `registry.register()` 配套回调）
- [ ] `learner_scheduler.py`：SM-2 重排 + cron 复习 job（默认关）
- [ ] `memory` 工具语义升级：upsert/merge 替代 add（兼容旧 action）
- **验收**：pattern 命中时插件调用前出现个性化提示；due 队列驱动复习提醒

### P3 — 投影与可观测
- [ ] `learner_projection.py`：与 MEMORY.md/USER.md 双写 + 外部 provider 互通
- [ ] journey 升级为 learner dashboard（mastery 图谱 + 队列 + 规则状态）
- [ ] `batch_runner.py` 评测结果回流校准 mastery
- **验收**：多用户隔离正确；评测→校准→再评测闭环跑通

---

## 附 · 证据索引（本轮新增）

| 事实 | 位置 |
|---|---|
| MemoryManager 编排层全貌 | agent/memory_manager.py:364-1073 |
| build_system_prompt 收集静态块 | agent/memory_manager.py:486-503 |
| prefetch_all 多 provider 召回 | agent/memory_manager.py:525-596 |
| 动态注入消费链（turn 级） | agent/turn_context.py:1149-1165 |
| <memory-context> fenced 块构造 | agent/memory_manager.py:347-361 |
| 工具注入（core 名保护） | agent/memory_manager.py:110-170 / :437-454 |
| one-external-provider limit | agent/memory_manager.py:404-426 |
| system prompt 三层架构 + volatile 冻结 | agent/system_prompt.py:500-530 / :558-565 |
| 每轮 on_turn_start 打点 | agent/turn_context.py:1149 → memory_manager.py:851 |
| turn 后 sync/queue_prefetch | run_agent.py:3929 / :3934 |
| 会话边界 on_session_end | run_agent.py:3838 |
| 压缩前 on_pre_compress | agent/memory_manager.py:974 |
| 镜像内置写 on_memory_write | agent/memory_manager.py:1019 |
| 后台自省 prompt 覆盖点 | agent/background_review.py:1006-1012 |
| 文件锁模式（可复用于 learner.db） | tools/memory_tool.py:278-313 |
| 漂移检测（双写回灌用） | tools/memory_tool.py:807 |
| trust 反馈 delta 常数（回流参考） | plugins/memory/holographic/store.py:78-82 |
