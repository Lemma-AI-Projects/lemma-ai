# LemmaHermes Memory Engine 改造调研
## 从「记忆」到「学习者状态系统」——五层架构落地路径

> 调研对象：Hermes Agent（commit `cd6585abf`，branch `main`）
> 调研方式：直接读代码，所有结论附 `file:line` 证据
> 调研目标：把 memory engine 从 `Memory = past information` 改成 `Memory = evolving learner state`（五层结构 + 认知变化驱动更新）
> 边界：本文是改造调研与落地设计，不改代码、不写实现

---

## 0. TL;DR —— 六个核心判断

1. **Hermes 的 memory 基础设施足够承载五层设计，但需要"换引擎"而不是"加功能"**。最干净的落点不是改 `MemoryStore`（文件态、全量注入、2200 字符上限，是死胡同），而是实现一个**新的 `MemoryProvider`**（`agent/memory_provider.py:43` 的 ABC 已定义 `prefetch / sync_turn / on_session_end / on_pre_compress / on_memory_write` 全套钩子），五层状态系统作为 `memory.provider=lemma-learner` 挂进去。

2. **后台自省机制（background review）可以直接复用，且几乎零侵入**——`agent/background_review.py:1006-1012` 显示 review prompt 是从 `agent._COMBINED_REVIEW_PROMPT` 等**类属性**读取的，子类/实例覆盖即换行为。这意味着"认知变化分析"可以替换"记忆提取"，不用动主循环。

3. **结构化基础已经存在，但被埋在插件里**：`plugins/memory/holographic/store.py:17-76` 已有 `facts / entities / fact_entities / memory_banks` 四张表 + FTS5 + `trust_score / retrieval_count / helpful_count`，还有 `record_feedback`（`store.py:402`）——这是 Knowledge Graph 的现成骨架，`mastery` 只是它缺的一列。

4. **唯一真正要新建的，是 Layer 2（Knowledge Memory）的"掌握度"语义**。Hermes 现在只有"有没有这个事实"（holographic facts）和"用没用过这个技能"（`tools/skill_usage.py` sidecar），没有任何"用户掌握到什么程度"的模型。这是五层设计的最大增量，也是价值核心。

5. **注入策略必须从"全量注入"改成"分层注入"**：Hermes 现在的 memory 是 `load_from_disk` 时冻结快照、全量进 system prompt（`tools/memory_tool.py:682-693` 明确"mid-session writes 不影响快照，保 prefix cache"）。五层全量注入会立刻撑爆 prompt——必须把**常驻层（L1 Identity / L5 Meta 摘要）**与**检索层（L2 Knowledge / L4 Episode）**分开，检索层走 `prefetch(query)` 钩子或独立工具。

6. **反馈信号闭环是这个项目欠了最久的债，五层设计正好补上**：Hermes 现有唯一的"学习反馈"是 holographic 的 `record_feedback`（`store.py:402`）——但它在插件里，没接回主回路。五层的 L4 Episode 天然携带 `result / reason / new_strategy`，可以直接回流更新 L2 的 mastery（成功→上调，失败→下调）。

---

## Part A · Hermes Memory Engine 现状全景（代码事实）

### A1. 双存储通道

Hermes 的"记忆"实际有两条互不相干的通道：

```
通道 1：内置文件态（默认，可关闭）
  MEMORY.md + USER.md → MemoryStore → 全量注入 system prompt
  tools/memory_tool.py:148-880

通道 2：外部 provider（默认关闭，memory.provider 配置开启，同时只允许一个）
  8 个插件 → MemoryProvider ABC → prefetch/sync_turn 钩子
  agent/memory_provider.py:43-316，plugins/memory/（mem0/honcho/supermemory/
  byterover/hindsight/holographic/openviking/retaindb）
```

两条通道**互不读写**。内置的写不会进 provider，provider 的召回也不进 MEMORY.md。唯一交集是 `on_memory_write` 钩子（`memory_provider.py:280-297`）——provider 可以**镜像**内置 memory 工具的写操作，但默认没有任何 provider 实现它。

### A2. 内置通道的完整读写路径

**读（启动时一次，之后冻结）：**

```
agent_init.py:1653 → MemoryStore(2200, 1375) → load_from_disk()
  tools/memory_tool.py:203-240
  ├─ 读 MEMORY.md / USER.md，§ 分隔解析成 entries
  ├─ 去重（list(dict.fromkeys())）
  ├─ 威胁扫描（_sanitize_entries_for_snapshot :243-276，注入 promptware 打 [BLOCKED:] 占位）
  └─ 冻结 _system_prompt_snapshot（:171，session 内永不变化）
之后每次 turn：format_for_system_prompt()（:682-693）返回冻结快照 → system prompt
```

**写（模型主动调 memory 工具）：**

```
memory 工具（tools/memory_tool.py:1152）
  action: add | replace | remove（apply_batch 批量原子）
  target: memory | user
  ├─ _scan_memory_content 注入扫描（:86）
  ├─ _file_lock 独占锁（:278-313，fcntl/msvcrt）
  ├─ _reload_target 磁盘重读 + 外部漂移检测（:322-361，防并发覆盖）
  ├─ 字符预算校验（超限 → _consolidation_failure，引导模型当场合并）
  └─ save_to_disk 原子写（os.replace）
```

**关键约束（改造时要知道的硬事实）：**

| 约束 | 位置 | 对五层设计的影响 |
|---|---|---|
| 字符上限 2200 + 1375，硬校验 | `agent/agent_init.py:1653-1657` | 五层结构化数据放不进这个预算，必须另开存储 |
| 默认关闭 | `agent/agent_init.py:1648-1649` | 现状：大部分人根本没开记忆 |
| 全量注入、无检索、无 scope、无结构 | `tools/memory_tool.py:1155` | 与"知识检索"需求直接冲突 |
| 快照冻结保 prefix cache | `tools/memory_tool.py:682-693` | 常驻层必须低频、静态；动态层必须走检索注入 |
| 单一全局文件，不分用户/会话/平台 | 见上轮报告 2.1 | gateway 多用户共享同一份——学习者状态必须按 user_id 分键 |

### A3. 后台自省机制（现有"自动写入"管线）

```
turn 结束 → turn_finalizer.py:714-722
  └─ _spawn_background_review()：daemon thread，fork 一个 AIAgent 重放对话快照
       ├─ 工具白名单：仅 memory + skills（background_review.py:12-14，教训注释在 :852）
       ├─ prompt：_MEMORY_REVIEW_PROMPT / _SKILL_REVIEW_PROMPT / _COMBINED_REVIEW_PROMPT
       │   （background_review.py:170-179 / 181-304 / 306+）
       ├─ 成本：同模型→全量重放吃 cache；异模型→digest（:31-41）
       └─ 产物：直接写 MEMORY.md / USER.md / ~/.hermes/skills/
```

**现有 review prompt 的窄度（这是要替换的核心）：**

`_MEMORY_REVIEW_PROMPT`（`:170-179`）只问两件事：persona/偏好/个人细节、行为期望。**它不提取知识状态、不记录学习过程、不评估认知变化。**

`_SKILL_REVIEW_PROMPT`（`:181-304`）反而很成熟：class-level 技能、`references/` 支持文件、四档优先级（更新已加载技能 > 更新伞技能 > 加支持文件 > 建新技能）、保护清单（bundled/hub/pinned/user-owned 不可动）、负面清单（环境依赖失败、工具负面断言、未解决的失败不得写成"可靠工作流"）。**这套约束是 Layer 3/5 的现成范本。**

**可覆盖点（关键发现）：** `background_review.py:1006-1012` 从 `agent._COMBINED_REVIEW_PROMPT` 等属性读 prompt——**换 prompt 不用改循环**。

### A4. 结构化基础：holographic provider（Knowledge Graph 现成骨架）

`plugins/memory/holographic/store.py:16-76`：

```sql
CREATE TABLE facts (
    fact_id, content UNIQUE, category, tags,
    trust_score REAL DEFAULT 0.5,      -- 置信度（已有！）
    retrieval_count, helpful_count,    -- 反馈计数（已有！）
    created_at, updated_at,
    hrr_vector BLOB                    -- HRR 向量（已有！）
);
CREATE TABLE entities (entity_id, name, entity_type, aliases, ...);
CREATE TABLE fact_entities (fact_id, entity_id, PRIMARY KEY(fact_id, entity_id));
CREATE TABLE memory_banks (bank_id, bank_name UNIQUE, vector, dim, fact_count, ...);
-- + facts_fts (FTS5 外部内容表) + 三个同步触发器
```

配套 `retrieval.py` 的 `FactRetriever`（`:22-630`）已经实现：`search / probe / related / reason / contradict` 五种召回 + `_temporal_decay` 时间衰减（`:630`）+ `_jaccard_similarity`（`:622`）+ 向量打分（`:444`）。**这是"知识层"现成的引擎，缺的只是"掌握度"维度和"学习事件"语义。**

`record_feedback(fact_id, helpful)`（`store.py:402`）用 `_HELPFUL_DELTA=+0.05 / _UNHELPFUL_DELTA=-0.10` 调整 trust（`:78-82`）——**这是全仓库唯一的、真正的效果反馈信号**，但它只更新 facts 表，不接回主回路，也没有任何东西消费它。

### A5. 图与可视化：journey / learning_graph

`agent/learning_graph.py:1-9` 把 skills + MEMORY.md/USER.md 的 § 卡片建成图；技能间边来自 `related_skills`，记忆↔技能边来自词法重叠（`:196`）。`agent/learning_mutations.py:1-60` 提供 `memory:<source>:<index>` 节点 id 映射和 edit/delete。**纯展示层，不参与决策**（上轮报告 2.3-F 已确认）。

### A6. 数据层现状（state.db）

`messages` 表（`hermes_state_common.py:192-216`）已经有：`tool_name`、`tool_calls`、`effect_disposition`（:200，工具效果判定列！）、`reasoning`、`compacted` 标记。**learning episode 的原始素材已经完整躺在 messages 表里**——提取层只需要读它，不用改 schema。

`state.db` 无 memory 表（上轮报告 1.4 已确认）。`sessions` 表内联 billing/git 列（`hermes_state_common.py:140-175`）。

---

## Part B · 五层设计逐层差距分析

### Layer 1 · Identity Memory（身份层）

**目标**：知道"这个人是谁"——goals / interests / 稳定身份，最低频变化。

**现状可复用**：
- `USER.md` 天然是身份文件（`_MEMORY_FILES = {"profile": "USER.md"}`，`learning_mutations.py:23`）
- `SOUL.md` 注入机制（`prompt_builder.py:1986 load_soul_md`）是"静态人格块"的现成管道
- 内置 memory 工具的 `target="user"` 已支持 add/replace/remove

**差距**：
- USER.md 是 prose 卡片，无 `goals[] / interests[]` 结构化字段
- 无版本概念（身份变化无历史）
- 快照冻结意味着身份更新只在**下一会话**生效——对最低频的 L1 这反而是可接受的行为

**改造**（侵入最小）：

```sql
-- 新表 identity（或放 hermes_state.db；更推荐放独立的 learner.db，见 Part D）
CREATE TABLE identity (
    user_id      TEXT PRIMARY KEY,          -- gateway 的 user_id；CLI 用 profile 名
    goals        TEXT DEFAULT '[]',         -- JSON array
    interests    TEXT DEFAULT '[]',         -- JSON array
    background   TEXT DEFAULT '',           -- 一句话画像（从 USER.md 迁移）
    updated_at   TIMESTAMP,
    version      INTEGER DEFAULT 1
);
```

- **兼容策略**：`load_from_disk` 时若 USER.md 存在而 identity 表为空，首次迁移把 prose 卡片灌进 `background`，之后双写（保持 USER.md 可读）。用户手动编辑 USER.md 仍然是最高优先级——`_detect_external_drift`（`memory_tool.py:807`）的漂移检测机制正好用于检测"用户在文件里改了什么，需要回灌 identity 表"。
- **注入**：随 system prompt 静态块（复用 `system_prompt_block()` 钩子，`memory_provider.py:85-92`）。低频变化 + 跨会话生效 = 不破坏 prefix cache。

### Layer 2 · Knowledge Memory（知识状态）—— 最大改造

**目标**：不存"用户问过 Transformer"，存"用户掌握 Transformer 到什么程度"。`concept + mastery + confidence + last_test + related{}`，形成知识图谱。

**现状可复用**：
- holographic 的 `entities / fact_entities / facts_fts` + `FactRetriever`（图结构、检索、时间衰减全有）
- `learning_graph.py` 的可视化（图已经画得出来，只是节点没有 mastery 属性）

**差距（核心）**：
1. **没有"掌握度"概念**——facts 是"世界的事实"，knowledge node 是"用户的状态"。语义完全不同。
2. **没有 mastery 更新函数**——`record_feedback` 只调 trust，没有"测过/学过/忘了"的认知事件。
3. **没有遗忘模型**——`_temporal_decay`（retrieval.py:630）是检索衰减，不是知识遗忘。

**改造**（holographic schema 的直接扩展，或独立 learner.db）：

```sql
-- 知识节点：概念/技能/主题，带掌握度状态
CREATE TABLE knowledge_nodes (
    node_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    concept      TEXT NOT NULL UNIQUE,      -- 'attention', 'transformer'
    domain       TEXT DEFAULT 'general',    -- 'ml', 'math', 'coding'...
    mastery      REAL DEFAULT 0.0,          -- 0..1 掌握度
    confidence   REAL DEFAULT 0.1,          -- 0..1 置信度（样本量驱动）
    attempts     INTEGER DEFAULT 0,         -- 测过几次
    successes    INTEGER DEFAULT 0,         -- 成功几次
    last_test    TIMESTAMP,
    last_exposed TIMESTAMP,                 -- 上次"被教/被问"
    source       TEXT DEFAULT '',           -- 哪个 episode 建立的
    UNIQUE(concept, domain)
);

-- 知识边：掌握度传播（用户说 related 的）
CREATE TABLE knowledge_edges (
    parent_id INTEGER REFERENCES knowledge_nodes(node_id),
    child_id  INTEGER REFERENCES knowledge_nodes(node_id),
    weight    REAL DEFAULT 0.5,             -- 先验相关度
    PRIMARY KEY(parent_id, child_id)
);

-- 掌握度更新函数（伪代码，见 Part C-C4 的认知事件定义）
UPDATE knowledge_nodes
SET mastery    = mastery  + delta_m,          -- 成功 +0.15 / 失败 -0.10
    confidence = 1 - (1 - confidence) * decay,  -- 每次尝试向 1 收敛
    attempts   = attempts + 1,
    successes  = successes + CASE WHEN ?success THEN 1 ELSE 0 END,
    last_test  = now
WHERE concept = ?;
```

**掌握度更新模型建议**（比 BKT 简单、可落地）：用 Beta 分布拟合——`mastery = successes/attempts`（后验均值），`confidence = 1 - exp(-attempts/5)`（样本量驱动的置信度）。学过（attempts↑）但从不测试 → confidence 高但 mastery 可能虚高，靠 L4 episode 的 `result` 校准。

**Knowledge Graph 形态**（用户给的例子即可实现）：

```
Transformer
 ├── attention            mastery 0.65
 │     ├── query_key_value  0.40
 │     └── multi_head       0.80
 ├── embedding            mastery 0.80
 └── positional_encoding  mastery 0.30
```

边的来源：`related{}` 字段（用户/LLM 声明）+ episode 中同时出现（共现计数）+ `FactRetriever.related()` 现有实现。

**注入**：走检索。`MemoryProvider.prefetch(query)`（`memory_provider.py:94-106`）在每轮 API call 前被调用——把 query 里命中的概念及其 mastery 作为"学习者状态"注入 turn 上下文（而不是全量）。这是对"全量注入"的正式替代。

### Layer 3 · Learning Pattern Memory（学习模式）

**目标**：记录"什么方式对这个人有效"。`concept + successful_methods[{method, success_rate}]`。未来插件调用前，系统知道"这个用户不要先上公式"。

**现状可复用**：
- `tools/skill_usage.py:1-23` 的 sidecar 遥测模式（`.usage.json`，按技能名计数）——"什么被用过"已有
- `_SKILL_REVIEW_PROMPT` 里"用户纠正你的 style/approach 是一等信号"的规则（`background_review.py:191-205`）——"什么被纠正过"的识别逻辑已有

**差距**：
- 只有"用没用过"，没有"什么方法成功率高"
- 没有 method 维度（visualization vs formula_first 这种对比不存在）
- skill_usage 是 sidecar JSON，无查询能力

**改造**：

```sql
CREATE TABLE learning_patterns (
    pattern_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    concept     TEXT NOT NULL,               -- 'linear algebra', 'code review'
    method      TEXT NOT NULL,               -- 'visualization', 'formula_first'
    attempts    INTEGER DEFAULT 0,
    successes   INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.5,           -- successes/attempts
    last_used   TIMESTAMP,
    UNIQUE(concept, method)
);
```

- **数据来源**：L4 episode 的 `method` + `result`（成功/失败）逐条回流累加。这是纯统计，不需要 LLM。
- **消费点（插件路由）**：`tools/registry.py:497` 的 `check_fn` 是"工具可见性门控"——扩展一个配套的 `hint_fn`（或直接在 tool 分发时查表）：当用户调用 `paper-reader` 且 `learning_patterns` 显示 `formula_first` 成功率 0.35、`visualization` 成功率 0.85 时，在工具结果/系统提示里注入一行个性化指引。**这是"LemmaHermes 在插件调用前知道用户偏好"的落点**——挂载在 tool_executor 分发层（`agent/tool_executor.py`），不动任何插件本身。

### Layer 4 · Experience Memory（事件记忆 / learning episode）

**目标**：不是 conversation history，而是 `learning episode{goal, plugin, result, reason, new_strategy}`。真正的经验单元。

**现状可复用**：
- `messages` 表已含 `tool_name / effect_disposition / tool_calls`（`hermes_state_common.py:192-216`）——episode 的原始素材
- `MemoryProvider.on_pre_compress(messages)`（`memory_provider.py:220-230`）——**上下文压缩前提取的现成钩子**，压缩丢弃消息前正是提取 episode 的最佳时机
- `on_session_end(messages)`（`:166-174`）——会话边界提取

**差距**：
- 无 episode 结构；messages 是"流水账"，episode 是"有结论的事件"
- 无 result/reason/new_strategy 的标注机制

**改造**：

```sql
CREATE TABLE learning_episodes (
    episode_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT,
    session_id   TEXT,                       -- 关联 state.db sessions
    goal         TEXT NOT NULL,              -- 'understand attention'
    plugin       TEXT DEFAULT '',            -- 'paper-reader'
    method       TEXT DEFAULT '',            -- 'formula_first'
    result       TEXT DEFAULT '',            -- 'success'|'failed'|'partial'
    reason       TEXT DEFAULT '',            -- 'too abstract'
    new_strategy TEXT DEFAULT '',            -- 'use visualization first'
    messages_ref TEXT DEFAULT '',            -- 起止 message id 区间（可追溯原文）
    created_at   TIMESTAMP
);
CREATE INDEX idx_episodes_user_goal ON learning_episodes(user_id, goal);
```

- **提取时机**：两个——(a) 会话内模型/后台自省在"用户表示懂了/不懂了"时写入（主动标注）；(b) `on_pre_compress` 兜底（被动回收）。
- **episode 是五层的"燃料"**：`result` 回流 L2 mastery 和 L3 success_rate；`reason` 和 `new_strategy` 是 L5 meta rule 的归纳素材；`goal` 关联 L1 interests（长期目标→兴趣演化）。

### Layer 5 · Meta Memory（关于学习的学习）

**目标**：记录 Lemma 自己学到的教学规律。100 次经验后归纳出"Beginners understand neural networks faster through image analogy before equations"。

**现状可复用**：
- `_SKILL_REVIEW_PROMPT` 的"教训固化为技能"机制（`background_review.py:181-304`）——**Meta 的最小形态已经存在**：它把"这个用户这个任务类怎么做"写成 skill，跨会话生效
- curator 的技能生命周期（`agent/curator.py:1-20`）——规则库的 GC

**差距**：
- 现有规则是**技能形态**（怎么做事），不是**教学规律形态**（怎么教人）——语义不同
- 无归纳机制（100 次 episode 不会自动变成一条 rule）
- 无"规则被验证"的反馈（规则用完有效/无效无记录）

**改造**：

```sql
CREATE TABLE meta_rules (
    rule_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    rule       TEXT NOT NULL,                -- 'image analogy before equations'
    evidence   INTEGER DEFAULT 1,            -- 支撑的 episode 数
    confirmed  INTEGER DEFAULT 0,            -- 验证成功的次数
    refuted    INTEGER DEFAULT 0,            -- 验证失败的次数
    domain     TEXT DEFAULT 'teaching',
    source     TEXT DEFAULT '',              -- 归纳入口（review/curator/手动）
    status     TEXT DEFAULT 'hypothesis',    -- hypothesis|active|retired
    created_at TIMESTAMP
);
```

- **归纳机制**（两档）：
  1. **轻量统计归纳**：按 `(goal 类, method)` 聚合 L4 episode，`success_rate` 超过阈值（如 0.75 且 n≥5）自动生成候选 rule，状态 `hypothesis`。
  2. **LLM 归纳**：后台自省（复用 fork 机制）周期性跑"review 最近 N 个 episode，归纳教学规律"，写入 `meta_rules`，`source='review'`。
- **验证回路**：rule 生效后，后续 episode 命中该 rule 的 method 时记录 confirmed/refuted——**规则库自己也会被评估**，`status` 可自动降级（refuted 比例高 → `retired`）。这一步正好补上 Hermes"技能质量从不被评估"的债。
- **注入**：active rules 进 system prompt 静态块（Meta 变化极低频，与 L1 同管），或作为 `system_prompt_block()` 的一部分。

---

## Part C · 更新机制改造：从「提取记忆」到「认知变化驱动」

### C1. 现状管线 vs 目标管线

```
现状（Hermes）：
conversation ──► 后台自省 fork ──► "有没有值得记的 persona/偏好/技能" ──► 写文件
                     ↑ 每 10 轮 / 每 10 次工具迭代
目标（Lemma）：
learning event ──► 分析认知变化 ──► 更新 learner state（L2 mastery/L3 pattern）
                    │                   │
                    │                   └─► 更新策略（L5 rule）
                    └─► 存储经验（L4 episode）──► 回流（result→mastery/pattern）
```

关键差异：**不是每句话进 memory，是认知变化进 memory**。判定"这是不是一次认知变化"是新的 review prompt 的职责。

### C2. 改造点 1：新 Provider 承载五层（架构决策）

**不**改 `MemoryStore`（文件态 + 全量注入 + 字符预算，方向性冲突）。
**实现**一个新的 `MemoryProvider` 子类 `LemmalearnerProvider`，放在 `plugins/memory/lemma-learner/`（与其余 8 个 provider 平级），挂 `memory.provider=lemma-learner`。

现有 ABC 钩子与五层的映射：

| ABC 钩子（`memory_provider.py`） | 五层用途 |
|---|---|
| `initialize(session_id, user_id, ...)`（:62-83） | 建 learner.db、按 user_id 分键 |
| `system_prompt_block()`（:85-92） | L1 identity + L5 active rules 静态注入 |
| `prefetch(query)`（:94-106） | L2 knowledge 检索召回（每轮 API 前） |
| `queue_prefetch`（:108-114） | 下轮预取（后台） |
| `sync_turn(user, asst)`（:116-132） | 轻量 episode 线索收集 |
| `on_session_end(messages)`（:166-174） | 会话边界 episode 提取 |
| `on_pre_compress(messages)`（:220-230） | **压缩前 episode 兜底提取** |
| `on_memory_write(action, target, content)`（:280-297） | 镜像内置写入 → 更新 L1 |
| `on_delegation(task, result)`（:232-243） | 子 agent 任务的 episode |
| `get_tool_schemas()`（:134-142） | 暴露 `learner` 工具集 |

**需要小改 ABC 的地方**（唯一侵入点）：现在 `get_tool_schemas` 返回的工具会注册进模型 schema（`one-external-provider limit`，`memory_provider.py:4-9`），这个机制正好给五层一个模型可见的 `learner_state` 工具。**不需要新钩子**——cognitive-change 分析走 C3 的后台自省。

### C3. 改造点 2：换 review prompt（零侵入）

覆盖 `agent._COMBINED_REVIEW_PROMPT`（`background_review.py:306`，读取点 :1006-1012），新增第三段"认知变化分析"：

```
**Learner state**: beyond persona, analyze COGNITIVE CHANGE in this session.
  • Did the user demonstrate understanding of a concept (explained it back,
    solved a problem)? → record a SUCCESS test on that concept (L2).
  • Did the user fail, get stuck, or say "too abstract / I don't get it"?
    → record a FAILED episode (L4) with reason.
  • Did a teaching method work or fail? (user praised an analogy / rejected
    equations) → record method outcome (L3).
  • Write episodes via the learner tool (target=episode, result=...).
  • Never record "user asked about X" as mastery — only demonstrated
    understanding counts. Absence of failure is NOT success.
```

同时**扩展 fork 白名单**（`background_review.py:12-14`）：从 `["memory", "skills"]` 变为 `["memory", "skills", "learner"]`（或 provider 注册的工具名）。fork 机制、成本策略（同模型吃 cache）、权限模型全部保留。

### C4. 改造点 3：memory 工具语义扩展

内置 memory 工具的 `add/replace/remove`（`memory_tool.py:390-562`）是"文本条目增删"，表达不了 mastery 更新。五层需要：

- **新工具 `learner_state`**（走 provider 的 `get_tool_schemas`）：`action=upsert_concept(concept, mastery_delta) | record_episode(...) | record_method(...)`。`upsert` 语义替代 `add`——同一 concept 合并而非追加，这正是 Hermes 现有 `add` 缺失的能力（`:421-422` 只拒绝精确重复，不合并同义条目）。
- **现有 `memory` 工具保留**：兼容老行为（写 USER.md/MEMORY.md），通过 `on_memory_write` 钩子镜像进 L1。

### C5. 改造点 4：注入策略分层（prompt cache 契约怎么保）

Hermes 的硬约束：system prompt 冻结保 prefix cache（`memory_tool.py:682-693`、`conversation_loop.py:905 _ensure_cached_system_prompt_static`）。

| 层 | 注入通道 | 频率 | cache 影响 |
|---|---|---|---|
| L1 Identity | `system_prompt_block()` 静态块 | 会话启动 | 无（跨会话变） |
| L5 Meta rules | 同 L1，静态块 | 会话启动 | 无 |
| L3 Pattern 摘要 | 静态块（只放 top-N 高置信 pattern） | 会话启动 | 无 |
| L2 Knowledge | `prefetch(query)` 每轮检索 | 每轮 | 注入 user message / 前置 assistant 上下文，不进 system prompt |
| L4 Episode | 不注入，只在需要时经工具查询 | 按需 | 无 |

**原则**：低频、变化慢的进 system prompt（保 cache）；高频、相关性驱动的走 `prefetch`（`memory_provider.py:94-106` 本来就是为这个设计的——"背景召回、注入上下文"）。这彻底绕开"五层全量注入会撑爆 2200 字符预算"的死结。

### C6. 改造点 5：反馈信号闭环（补上 Hermes 欠的债）

```
L4 episode.result (success/failed)
   │
   ├─► L2: mastery += 0.15 (success) / -0.10 (failed)      [认知状态]
   ├─► L3: method success_rate 累加                        [教学策略]
   └─► L5: rule confirmed/refuted += 1                     [教学规律验证]
         └─ status: hypothesis → active (证据足) / retired (被反驳)
```

参考 holographic 的 delta 常数（`store.py:78-82`：+0.05/-0.10），但 L2 的 delta 应该更大（一次测试的认知信息量 > 一次检索反馈）。**所有回流都是纯 SQL 统计，不额外烧 LLM token。**

---

## Part D · 落地路线（分阶段，每阶段可独立交付）

### P0：地基 —— L1 + L4（1 个 provider + 2 张表）

- [ ] 新建 `plugins/memory/lemma-learner/`：`MemoryProvider` 子类 + `learner.db`（identity + learning_episodes 两表）
- [ ] `initialize()` 接收 `user_id`（gateway）与 `agent_identity`（profile，`memory_provider.py:77-78`），解决"多用户共享 MEMORY.md"的根因——**learner state 天生按 user_id 分键**
- [ ] `on_pre_compress` / `on_session_end` 兜底提取 episode
- [ ] 覆盖 `_COMBINED_REVIEW_PROMPT` 加入 cognitive-change 段；fork 白名单加 learner 工具
- [ ] 迁移：USER.md → identity.background（一次性），之后双写
- **验收**：跑一个教学会话，`learner.db` 出现 episode 行；system prompt 未变（cache 命中率无回归）

### P1：知识层 —— L2（核心价值）

- [ ] `knowledge_nodes / knowledge_edges` 表 + `upsert_concept` + Beta 掌握度更新
- [ ] `prefetch(query)` 实现知识检索注入（复用 holographic 的 `FactRetriever` 检索逻辑或 FTS5）
- [ ] `learner_state` 工具暴露 `upsert_concept / query_concept`
- [ ] journey 图接入 mastery 属性（`learning_graph.py` 只加一个字段，纯展示）
- **验收**：同一概念学 3 次后 mastery/confidence 单调上升；fail 后下降

### P2：策略层 —— L3 + L5（差异化竞争力）

- [ ] `learning_patterns` 表 + episode 回流统计
- [ ] tool_executor 分发层挂 `hint_fn`：命中高置信 pattern 时注入个性化提示
- [ ] `meta_rules` 表 + 两档归纳（统计阈值 / review LLM）+ confirmed/refuted 验证回路
- [ ] curator 兼容：meta_rules 纳入 curator 的归档/GC 范围（复用 `curator_backup` 快照回滚）
- **验收**：模拟 100 个 episode 后自动归纳出规则，且规则被后续 episode 验证

---

## Part E · 风险与兼容清单

| 风险 | 说明 | 对策 |
|---|---|---|
| prompt cache 回归 | 动态内容进 system prompt 会打碎缓存 | 严格分层注入（C5），动态层全走 prefetch |
| 多用户串记忆 | 现状单全局文件 | learner state 按 user_id/agent_identity 分键（P0 解决） |
| LLM 自主写入不可信 | curator 已有教训（`curator.py:16-20` 不变量 + `curator_backup.py` 快照） | learner.db 的写操作同样过 threat scan（复用 `_scan_memory_content`，`memory_tool.py:86`）；L5 rule 默认 `hypothesis`，不自动生效 |
| 误判 mastery | "问过"≠"掌握" | review prompt 硬性规定只有"演示过的理解"才算 success（C3）；confidence 由样本量约束 |
| 与现有 8 个 provider 冲突 | `one-provider limit`（`memory_provider.py:4-9`） | lemmalearner 与 honcho 等互斥，属预期（选型：自带 learner 就不要外部记忆后端） |
| 子 agent 写污染 | `agent_context` 有 "primary/subagent/cron" 区分（`memory_provider.py:74-76`） | 沿用：subagent/cron 上下文跳过 learner 写入 |
| 评测信号缺失（历史遗留） | `batch_runner.py` 等评测未接回学习回路 | 建议后续：episode 表天然可作评测集，跑分结果回流 L2 校准 |

---

## 附 · 证据索引

| 事实 | 位置 |
|---|---|
| MemoryStore 定义 / 快照冻结 / 字符上限 | tools/memory_tool.py:148 / :171 / :165 |
| 全量注入、无检索 | tools/memory_tool.py:1155 |
| 字符预算 2200+1375、默认关闭 | agent/agent_init.py:1653-1657 / :1648-1649 |
| 写路径（add/replace/remove/锁/漂移/威胁扫描） | tools/memory_tool.py:390-562 / :278-313 / :322-361 / :86 |
| MemoryProvider ABC 全套钩子 | agent/memory_provider.py:43-316 |
| one-provider limit | agent/memory_provider.py:4-9 |
| 后台自省 fork / 白名单 / 成本策略 | agent/background_review.py:1-41 / :12-14 / :31-41 / :852 |
| review prompt 可覆盖（类属性读取） | agent/background_review.py:1006-1012 |
| 现有记忆提取 prompt（窄） | agent/background_review.py:170-179 |
| 现有技能提取 prompt（成熟范本） | agent/background_review.py:181-304 |
| holographic 四表 + FTS + 触发器 | plugins/memory/holographic/store.py:16-76 |
| trust 反馈 + delta 常数 | plugins/memory/holographic/store.py:402 / :78-82 |
| FactRetriever 检索族 | plugins/memory/holographic/retrieval.py:22-630 |
| skill_usage sidecar 遥测 | tools/skill_usage.py:1-23 |
| curator 不变量 / 快照回滚 | agent/curator.py:1-20 / agent/curator_backup.py:1-11 |
| journey 图（展示层） | agent/learning_graph.py:1-9 / :196 |
| learning_episodes 素材（messages 表） | hermes_state_common.py:192-216（effect_disposition :200） |
| check_fn 工具可见性门控 | tools/registry.py:497 / toolsets.py:36-40 |
| /learn 与技能创作标准（description ≤60 等） | agent/learn_prompt.py:18-22 / :30-96 |
| nudge 计数器（10 轮 / 10 次迭代） | agent/turn_context.py:584-590 / agent/turn_finalizer.py:699-704 |
