# Hermes Code Recon Report

> 代码侦察报告 · 基于 commit `cd6585abf` (branch `main`)
> 方法：直接读代码，不采信 README / 宣传文档。所有结论附 `file:line` 证据。
> 边界：本报告只回答「现在有什么、怎么实现的、哪里值得关注」，不提架构建议。

---

## 0. 规模基线

| 指标 | 数值 |
|---|---|
| Python 文件 | 3,725 |
| 最大单文件 | `cli.py` 873 KB / `hermes_state.py` 401 KB / `run_agent.py` 7,551 行 |
| 核心 Agent 类 | `run_agent.py:409` `class AIAgent` |
| 主循环 | `agent/conversation_loop.py:1142` `run_conversation()` |
| 模型可见工具（core） | 61 个（`toolsets.py:31-86`） |
| Toolset 分组 | 34 个（`toolsets.py:101`） |
| 工具注册调用 | 89 处 `registry.register()`（`tools/*.py`） |
| 内置 skills | 70 个 `SKILL.md`（14 分类） |
| 可选 skills | 111 个 `SKILL.md` |
| 插件（含 plugin.yaml） | 95 个 |
| 测试文件 | 2,632 个 `.py`（`tests/`，29 MB） |

**第一印象**：这是一个**产品级单体**，不是一个 agent 框架。`agent/`(177) + `tools/`(127) + `hermes_cli/`(255) + `gateway/`(86) 四块加起来才是"Hermes"，而其中只有 `agent/` 的一小部分是真正的 agent 内核。

---

## 任务 1：代码结构扫描

### 1.1 入口点

```
pyproject.toml:348-351
  hermes       = hermes_cli.main:main      # 主 CLI（gateway/cron/doctor 等子命令）
  hermes-agent = run_agent:main            # 直接跑 agent
  hermes-acp   = acp_adapter.entry:main    # ACP 协议适配（IDE 集成）
```

### 1.2 顶层目录

```
path: agent/
purpose: Agent 运行时内核。会话循环、prompt 组装、工具执行、上下文压缩、
         多家 LLM provider 适配、记忆/技能的后台自省、凭证与计费。
         这里混装了「通用 agent 内核」和「Hermes 产品特性」。
important files:
  conversation_loop.py      (7141行) 主循环 run_conversation()
  prompt_builder.py         (2188行) system prompt 分块组装 + skills 索引缓存
  tool_executor.py          (2089行) 工具分发、nudge 计数复位
  context_compressor.py     (6708行) 上下文压缩（默认 50% 阈值）
  turn_context.py                    turn 前置：memory nudge 判定
  turn_finalizer.py                  turn 后置：skill nudge 判定 + 派发后台自省
  background_review.py      (1027行) 后台记忆/技能自省 fork
  curator.py                (2018行) 技能生命周期管家（归档/合并/pin）
  learning_graph.py / learning_mutations.py / learning_graph_render.py
                                     "journey" 学习可视化（桌面端）
  learn_prompt.py           (150行)  /learn：把用户描述转成 SKILL.md 的 prompt
  memory_provider.py        (315行)  外部记忆插件桥接
  agent_init.py                      AIAgent 初始化，记忆/技能配置在此落地
  agent_runtime_helpers.py           prompt cache 断点策略（cache_control）
  anthropic_adapter.py / bedrock_adapter.py / codex_responses_adapter.py /
  gemini_native_adapter.py           各家 wire format 适配
  moa_loop.py                        Mixture-of-Agents 循环
  pet/                               桌面精灵动画（Petdex）——纯装饰

path: tools/
purpose: 模型可见工具的实现。每个文件用 registry.register() 自注册
         schema + handler + check_fn（运行时可见性门控）。
important files:
  registry.py       (932行) 工具注册表，register() 在 :497
  memory_tool.py   (1224+行) memory 工具 + MemoryStore（文件后端）
  todo_tool.py              todo 工具 = 唯一的"规划"机制
  skills_tool.py   (1828行) skills_list / skill_view
  skill_manager_tool.py (1768行) skill_manage（create/patch/edit/delete）
  skills_hub.py    (4419行) 外部技能仓库源（GitHub）、lockfile、隔离区、审计
  skill_usage.py            技能使用遥测 → curator 的反馈信号
  delegate_tool.py          子 agent 委派（进程内构造子 AIAgent）
  async_delegation.py       异步委派（落 DB 表）
  terminal_tool.py / file_tools.py / browser_*.py / mcp_tool.py …

path: hermes_cli/  (255 py)
purpose: CLI 命令层 + 大量产品化子系统（认证、计费、备份、doctor、
         kanban DB、projects DB、可观测性、技能 hub CLI）。
important files:
  main.py, commands.py, cli_commands_mixin.py
  kanban_db.py     kanban.db（tasks/task_links/task_comments/task_events/…）
  projects_db.py   projects/project_folders/project_meta/discovered_repos
  sqlite_runtime.py, sqlite_safe_read.py

path: gateway/  (86 py)
purpose: 消息网关。会话路由、投递保障（ledger）、去重、限流、平台注册、
         优雅停机、多平台并发。
important files:
  run.py, session.py, session_state.py, delivery.py, delivery_ledger.py
  platform_registry.py, platforms/（api_server / signal / whatsapp / weixin /
  yuanbao / bluebubbles / webhook …）

path: plugins/  (194 py, 95 plugin.yaml)
purpose: 插件层——真正的"边缘扩展"。
important files:
  platforms/       21 个消息平台（telegram/discord/slack/feishu/matrix/…）
  memory/          8 个外部记忆后端（mem0/honcho/supermemory/byterover/
                   hindsight/holographic/openviking/retaindb）
  model-providers/ (67 文件) 模型供应商
  context_engine/, cron_providers/, observability/, kanban/, image_gen/,
  video_gen/, spotify/, google_meet/, hermes-achievements/

path: skills/  (70 SKILL.md)
purpose: 仓库自带技能，按 14 个分类目录组织，每类一个 DESCRIPTION.md。
important files:
  <category>/<skill>/SKILL.md  (+ scripts/ 等附属文件)
  index-cache/*.json  外部技能仓库索引缓存（anthropics/skills、
                      openai/skills、lobehub）——技能市场

path: optional-skills/  (111 SKILL.md)
purpose: 默认不激活的官方技能，通过 skills hub 安装。

path: cron/  (11 py)
purpose: 定时任务。jobs.json 存储、调度、执行记录、建议目录。
important files: jobs.py, scheduler.py, executions.py, suggestions.py,
                 suggestion_catalog.py, blueprint_catalog.py

path: 根目录状态层
purpose: SQLite 会话持久化 + 全文检索。
important files:
  hermes_state.py         (401KB) SessionDB 主体
  hermes_state_common.py          所有 CREATE TABLE 在这里
  hermes_state_schema.py          迁移/列对账
  hermes_state_search.py  (89KB)  FTS5 检索（含 CJK）
  hermes_constants.py     (58KB)  HERMES_HOME 与路径解析
  toolsets.py                     工具集分组 + _HERMES_CORE_TOOLS
  model_tools.py                  工具 schema 编排层（薄）
  run_agent.py                    AIAgent

path: native/fts5_cjk/
purpose: 自研 SQLite FTS5 CJK 分词器（C 扩展）。
important files: fts5_cjk.c, build.sh

path: acp_adapter/ (11 py) / tui_gateway/ (22 py) / ui-tui/ / web/ / apps/desktop/
purpose: 四套前端接入：ACP 协议、TUI 网关、TUI 界面、Web 仪表盘、
         Electron 桌面应用（apps/desktop 1473 文件）。

path: tests/ (2632 py, 29MB)
purpose: 测试。规模超过被测代码本身，是这个项目最硬的资产之一。

path: batch_runner.py / mini_swe_runner.py / datagen-config-examples/
purpose: 批量评测 / SWE-bench 风格跑分 / 数据生成。RL & eval 场景。
```

### 1.3 磁盘状态布局（`HERMES_HOME`，默认 `~/.hermes`）

`hermes_constants.py:59` → `Path.home()/".hermes"`；支持 profile 隔离 `~/.hermes/profiles/<name>`（`:173`）；Windows 走 `%LOCALAPPDATA%\hermes`。

```
~/.hermes/
  config.yaml          所有行为配置（.env 只放密钥）  hermes_constants.py:1293
  .env                 密钥                          hermes_constants.py:1308
  state.db             会话 + 消息 + FTS             hermes_state.py:236
  kanban.db            看板                          hermes_cli/kanban_db.py
  MEMORY.md            agent 自己的笔记
  USER.md              用户画像
  SOUL.md              人格/身份（注入 system prompt）
  memories/            agent/learning_mutations.py:33
  skills/              用户 + agent 创建的技能        hermes_constants.py:1302
    .usage.json        技能使用遥测                  tools/skill_usage.py:5
    .archive/          curator 归档区
    .curator_state     curator 状态
    .skills_prompt_snapshot.json   skills 索引磁盘快照
  cron/jobs.json       定时任务                      cron/jobs.py:4
  cron/output/{job_id}/{ts}.md
```

### 1.4 state.db 表（`hermes_state_common.py`）

`schema_version` / `sessions` / `messages` / `session_model_usage` / `state_meta` /
`gateway_routing` / `compression_locks` / `async_delegations`

FTS 虚表三套：`messages_fts`（标准）、`messages_fts_trigram`、`messages_fts_cjk`（`hermes_state_search.py:1456`，依赖 `native/fts5_cjk.c`）。

`sessions` 表字段很宽（`hermes_state_common.py:140-175`）：除会话标识外，直接内联了
`input_tokens / output_tokens / cache_read_tokens / cache_write_tokens / reasoning_tokens /
billing_provider / billing_base_url / billing_mode / cwd / git_branch / git_repo_root`。
→ **计费和 git 上下文被烧进了会话主表**，不是旁路。

**关键负向发现：`state.db` 里没有 memory 表。** 记忆完全是文件态。

---

## 任务 2：核心模块追踪

### 2.1 Memory

**存储位置** — 两个纯文本文件，不是数据库：

- `~/.hermes/MEMORY.md`（agent 自己的笔记）
- `~/.hermes/USER.md`（用户画像）

证据：`agent/learning_mutations.py:23` `_MEMORY_FILES = {"memory": "MEMORY.md", "profile": "USER.md"}`；
`agent/agent_init.py:1632` 注释 `# Persistent memory (MEMORY.md + USER.md) -- loaded from disk`。

**数据格式** — prose，用裸 `§` 分隔成"卡片"：

> `agent/learning_graph.py:196` — *"``MEMORY.md`` / ``USER.md`` are prose split on bare ``§`` separators"*

没有 schema、没有类型、没有时间戳、没有重要度评分、没有衰减、没有 embedding。唯一的约束是**字符预算**：

```python
# agent/agent_init.py:1653-1657
agent._memory_store = MemoryStore(
    memory_char_limit=mem_config.get("memory_char_limit", 2200),
    user_char_limit=mem_config.get("user_char_limit", 1375),
)
agent._memory_store.load_from_disk()
```

**2200 + 1375 字符**。这是整个长期记忆的总容量上限。

**读取方式** — 不是检索，是**全量注入**：

> `tools/memory_tool.py:1155` — *"Memory is injected into every future turn, so keep entries compact and high-signal."*

启动时 `load_from_disk()` 一次性读入，随 system prompt 常驻。**没有 RAG、没有向量、没有按需召回**。这与 `state.db` 里那套完整 FTS5 检索（含自研 CJK 分词器）形成鲜明反差——FTS 只服务于 `session_search` 工具（翻历史会话），不服务于记忆。

**写入方式** — 模型主动调 `memory` 工具（`tools/memory_tool.py:1152`）：

```python
"action": enum ["add", "replace", "remove"]
"target": enum ["memory", "user"]
"operations": [...]   # 批量、原子、仅对最终结果校验字符上限
```

工具描述里写死了取舍优先级（`:1166-1174`）：
`用户偏好与纠正 > 环境事实 > 流程`；显式排除 `任务进度 / 完成日志 / 临时 TODO`；
并明确 *"Reusable procedures belong in a skill, not memory"* —— **记忆与技能的职责边界是靠 prompt 约束的，不是靠代码。**

**默认关闭**：`agent/agent_init.py:1648-1649`，`memory_enabled` / `user_profile_enabled` 默认 `False`。

**作用域**：单一全局文件，**不分用户、不分会话、不分平台**。gateway 服务多平台多用户时共享同一份 MEMORY.md。

**外部记忆后端**：`plugins/memory/` 下 8 个可替换 provider（mem0 / honcho / supermemory / byterover / hindsight / holographic / openviking / retaindb），经 `agent/memory_provider.py` 桥接，`memory.provider` 配置选一个，与内置文件存储并存。其中 `plugins/memory/holographic/store.py` 自带 `facts / entities / fact_entities / memory_banks` 表——**真正的结构化记忆在插件里，不在核心。**

### 2.2 Skill System

**文件结构** — 目录 + `SKILL.md` + YAML frontmatter（实例 `skills/research/arxiv/SKILL.md`）：

```yaml
---
name: arxiv
description: "Search arXiv papers by keyword, author, category, or ID."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Research, Arxiv, Papers, Academic, Science, API]
    related_skills: [ocr-and-documents]
---
# arXiv Research
...（正文 10KB，含 Quick Reference 表格、bash 示例）
```

分类目录各带一个 `DESCRIPTION.md`（只有一行 `description` frontmatter）。技能可附带 `scripts/` 子目录。

`description` 有硬约束：**≤60 字符**。原因写在 `agent/learn_prompt.py:40-46`：

> *"the system-prompt skill index truncates the description to 60 chars and loads it every session, so anything past char 60 is silently cut and never routes"*

**加载 / 渐进披露** — `agent/prompt_builder.py:1584` `build_skills_system_prompt()`：

- system prompt 里只放 **紧凑索引**（name + ≤60 字符描述），正文不进 prompt
- 双层缓存：进程内 LRU + 磁盘快照 `.skills_prompt_snapshot.json`，用 mtime/size manifest 校验，跨进程重启存活（`:1590-1596`）
- 支持外部技能目录 `skills.external_dirs`（只读，本地优先）
- `compact_categories`（来自 `agent/coding_context.py` 的 coding posture）可把整个分类降级成"只列名字"，但**从不隐藏**：`:1605-1608` 明确 *"Nothing is ever hidden"*

**调用** — 三个模型工具，全在 `_HERMES_CORE_TOOLS`（`toolsets.py:50`）：

| 工具 | 文件 | 作用 |
|---|---|---|
| `skills_list` | `tools/skills_tool.py` | 列技能 |
| `skill_view` | `tools/skills_tool.py` | 读全文（**无 offset/limit**，AGENTS.md 明令禁止分页） |
| `skill_manage` | `tools/skill_manager_tool.py:1631` | create / patch / edit / delete / write_file / remove_file |

`skill_manage` 的描述把定位写死了（`:1633-1634`）：
> *"Skills are your procedural memory — reusable approaches for recurring task types."*

`delete` 时可传 `absorbed_into=<umbrella>` 区分"合并"与"剪枝"，供 curator 消费（`:1640-1643`）。

**创建** — 三条路径：

1. **模型自主**：直接调 `skill_manage(action="create")`，写到 `~/.hermes/skills/`
2. **人触发 `/learn`**：`agent/learn_prompt.py`。注意其自述（`:18-22`）：
   > *"There is no separate distillation engine and no model-tool footprint: the agent does the work with its existing toolset."*
   即 `/learn` **只是一个 prompt 模板**，把 house style 塞给现役 agent，让它自己用 `skill_manage` 落盘。
3. **后台自省自动创建**：见 2.3。

**Skills Hub** — `tools/skills_hub.py`(4419行)：技能市场。`SkillSource` ABC + `GitHubSource`，
`HubLockFile` 记录来源，带 quarantine / audit log / taps / index cache。
`skills/index-cache/` 里已缓存 `anthropics/skills`、`openai/skills`、`lobehub` 三个源的索引，
每条含 `trust_level`（如 `"trusted"`）。

**Skill / Plugin / MCP / Tool 四者边界**：

| 机制 | 注册点 | 形态 |
|---|---|---|
| Tool | `tools/registry.py:497 register()` | Python，进 model schema，**每次 API 调用都付费** |
| Skill | 文件系统扫描 → `prompt_builder.py:1584` | Markdown，只有索引进 prompt |
| Plugin | `plugin.yaml` + `plugins/plugin_utils.py` | 可注册 tool（需 `override=True` 才能覆盖内置） |
| MCP | `tools/mcp_tool.py` / `mcp_serve.py` | 外部进程 |

### 2.3 Self Evolution —— 这是最值得关注的部分

Hermes 的"自我改进"**确实存在闭环**，但由三个彼此独立的机制拼成，各自都很朴素。

#### (A) Background Review —— 每轮之后的自动自省

`agent/background_review.py:1-16` 自述：

> *"After every turn, ``AIAgent.run_conversation`` may call ``spawn_background_review`` to fire off a daemon thread that replays the conversation snapshot in a forked ``AIAgent`` and asks itself "should any skill/memory be saved or updated?". Writes go straight to the memory + skill stores. Main conversation and prompt cache are never touched."*

**触发条件是两个独立计数器：**

```python
# agent/turn_context.py:584-590   —— memory nudge：按【用户轮次】
if (agent._memory_nudge_interval > 0
        and "memory" in agent.valid_tool_names
        and agent._memory_store):
    agent._turns_since_memory += 1
    if agent._turns_since_memory >= agent._memory_nudge_interval:
        should_review_memory = True
        agent._turns_since_memory = 0
```

```python
# agent/turn_finalizer.py:699-704  —— skill nudge：按【本轮工具迭代次数】
if (agent._skill_nudge_interval > 0
        and agent._iters_since_skill >= agent._skill_nudge_interval
        and "skill_manage" in agent.valid_tool_names):
    _should_review_skills = True
    agent._iters_since_skill = 0
```

默认都是 **10**（`agent/agent_init.py:1638` `_memory_nudge_interval = 10`；`:1736` `_skill_nudge_interval = 10`）。

**派发点在响应交付之后**（`agent/turn_finalizer.py:714-722`）：

```python
# Background memory/skill review — runs AFTER the response is delivered
# so it never competes with the user's task for model attention.
if final_response and not interrupted and (_should_review_memory or _should_review_skills):
    agent._spawn_background_review(
        messages_snapshot=list(messages),
        review_memory=_should_review_memory, ...)
```

**成本设计很讲究**（`agent/background_review.py:31-41`）：默认用**主模型**跑，因为整段对话已在 prompt cache 里，是廉价的 cache read；只有当用户把 review 路由到别的模型（`auxiliary.background_review.*`）时，才改用**压缩 digest** 重放，以减少冷写 token。

**权限收紧**：fork 的工具白名单只有 memory + skill 管理工具，其他运行时拒绝（`:12-14`）。
`agent/background_review.py:852` 有一条注释记录了曾经的教训：*"Hardcoding ["memory", "skills"] granted the review LLM the MEMORY.md ..."*

> **结论：是的，Hermes 会在没有人要求的情况下自动写记忆、自动创建技能。**

#### (B) Curator —— 技能生命周期管家

`agent/curator.py:1-20`：

> *"an auxiliary-model task that periodically reviews agent-created skills... runs inactivity-triggered (no cron daemon): when the agent is idle and the last curator run was longer than ``interval_hours`` ago, ``maybe_run_curator()`` spawns a forked AIAgent."*

职责：生命周期状态自动流转、pin / archive / consolidate / patch（经 `skill_manage`）、状态存 `.curator_state`。

**硬不变量**（`:16-20`）：
- 只碰 agent 创建的技能（`tools/skill_usage.is_agent_created`）
- **永不自动删除，只归档**，可恢复（`hermes curator restore`）
- pinned 技能豁免
- 用 auxiliary client，**绝不碰主会话 prompt cache**

#### (C) Skill Usage Telemetry —— 唯一的反馈信号

`tools/skill_usage.py:1-23`：sidecar `~/.hermes/skills/.usage.json`，按技能名计数。
计数由 `skill_view` / `skill_manage` 自增，curator 读派生的活跃时间戳做状态转移：

```
active   -> 默认
stale    -> 未使用 > stale_after_days
archived -> 未使用 > archive_after_days（移入 .archive/）
pinned   -> 豁免自动转移
```

刻意做成 sidecar 而不是 frontmatter，避免污染用户手写的 SKILL.md、避免与 hub 技能冲突。

#### (D) Curator Backup —— 变更前快照

`agent/curator_backup.py:1-11`：curator 每次做变更前，先把整个 `~/.hermes/skills/` 打成
`tar.gz` 快照存到 `.curator_backups/<utc-iso>/`，附 `manifest.json`（原因/时间/大小/文件数）。
回滚时会**先把当前 skills/ 树也存成一个快照**，所以回滚本身也可撤销。

> 这是整个自我改进机制里最保守的一环：自动写入 + 归档 + 快照 + 双向可回滚。
> 设计者显然不完全信任 LLM 对技能库的自主修改。

#### (E) `agent/insights.py` —— 与自我改进无关（重要负向发现）

名字有误导性。实际是 **usage analytics 报表**，对标 Claude Code 的 `/insights` 命令：

> `agent/insights.py:1-10` — *"Analyzes historical session data from the SQLite state database to produce comprehensive usage insights — token consumption, cost estimates, tool usage patterns, activity trends, model/platform breakdowns"*

`InsightsEngine(db).generate(days=30)` → `format_terminal(report)`，给人看的。
**产物不写回任何存储，也从不回注 prompt。** 与 reflection / 经验积累无任何关系。

#### (F) Journey / Learning Graph —— 只是可视化

`agent/learning_graph.py:1-9` 自述 *"Assemble the 'learning made visible' graph for desktop"*。
把 non-base 技能 + MEMORY.md/USER.md 的 `§` 卡片建成图，技能间的边来自 `related_skills`，
记忆↔技能的边来自**词法重叠**（lexical overlap）。
`agent/learning_mutations.py` 提供用户手动 edit/delete 节点（CLI `hermes journey`、TUI `/journey`、桌面 REST）。

> **这不是学习机制，是学习的展示层。** 图不参与任何检索或决策。

#### 自我改进的诚实评级

| 维度 | 实际情况 |
|---|---|
| 自动产出新记忆/技能 | ✅ 有（background review，无需人触发） |
| 遗忘 / 收敛 | ✅ 有（curator 归档 + 字符预算硬上限） |
| 反馈信号 | ⚠️ **只有"使用频次/最近使用时间"**。没有成功率、没有自评分、没有 reward、没有错误驱动修正 |
| 闭环性 | ⚠️ 半闭环：`产出 → 使用计数 → 生命周期流转`，但**技能质量从不被评估**，只被"用没用过"评估 |
| 本质 | **LLM 自我总结写文件 + 基于使用频次的垃圾回收** |

所以答案是介于 (a)(b) 之间、更偏 (b)：**不是真正的闭环学习（没有效果反馈），但也不只是被动的人在环建议——它确实会自主写入。** 唯一的"适应性"来自使用频次这一个非常弱的信号。

`tests/`(2632 文件) 和 `batch_runner.py` / `mini_swe_runner.py` 说明**评测能力是有的**，但那是给开发者跑 CI/benchmark 的，**没有接回 agent 的自我改进回路**。

### 2.4 Agent Loop

**主循环**：`agent/conversation_loop.py:1142` `run_conversation()`

```python
# agent/conversation_loop.py:1316
while (api_call_count < agent.max_iterations
       and agent.iteration_budget.remaining > 0) or agent._budget_grace_call:
```

三个终止条件：迭代数上限（`max_iterations` 默认 **90**，`run_agent.py:443`，与子 agent 共享）、
token/成本预算 `iteration_budget`、以及一次 grace call。
超限走 `run_agent.py:7119 _handle_max_iterations()`。

**规划**：**没有独立的 planner 模块**。唯一的规划机制是 `todo` 工具（`tools/todo_tool.py:267`）——
模型自己维护 session 级任务清单，`merge` 语义，"同一时刻只能有一个 in_progress"。
纯 prompt 约束，无状态机。

**Prompt 组装**（`agent/prompt_builder.py`）分块：

- `build_environment_hints()` `:1155` — 环境探针（含远程后端探测 `_probe_remote_backend`）
- `build_skills_system_prompt()` `:1584` — 技能紧凑索引（双层缓存）
- `load_soul_md()` `:1986` — `~/.hermes/SOUL.md` 人格
- `build_context_files_prompt()` `:2114` — cwd 上下文文件：`.hermes.md` / `AGENTS.md` / `CLAUDE.md` / `.cursorrules`（`:2017-2081`），带按 context length 动态裁剪 `_get_context_file_max_chars()` `:1294`
- MEMORY.md / USER.md 常驻
- `computer_use_guidance()` `:498`

**Prompt Cache 保护**（项目自称"sacred"，代码里确实有强制机制）：

- `agent/agent_runtime_helpers.py:1991` — 计算 `cache_control` 断点，按 provider 能力分流（Anthropic 原生 / OpenRouter / Kimi-Moonshot / Qwen Portal / Copilot 各有分支，`:2073-2140`）
- `agent/conversation_loop.py:905` `_ensure_cached_system_prompt_static()` — 强制 system prompt 静态
- `:608` `_stored_prompt_matches_runtime()` — 校验存储的 prompt 与运行时一致
- `:470` `_restore_or_build_system_prompt()` — 优先复原而非重建
- `:939` `_redecorate_prompt_cache_for_provider()` — 切 provider 时重贴断点
- `agent_runtime_helpers.py:1963` `strip_anthropic_cache_control()` — 不支持的后端剥离标记

**工具执行**：`agent/tool_executor.py`。`tools/registry.py:497` 的 `register()` 带 `check_fn` —— 
工具**按运行时环境动态出现在 schema 里**（如 `read_terminal`/`open_preview` 仅在 `HERMES_DESKTOP` 下可见，
kanban 工具仅在 `HERMES_KANBAN_TASK` 下可见，`toolsets.py:36-40, 75-79`）。
有审批门（`tools/approval.py`）。工具结果有大小上限 `max_result_size_chars`。

**上下文压缩**：`agent/context_compressor.py`，默认 `threshold_percent = 0.50`（`:2156`），
可按模型覆盖 `resolve_model_threshold()` `:1286`。压缩时会显式告诉模型
*"Your persistent memory (MEMORY.md, USER.md) in the system prompt remains fully authoritative"*（`:114, 6358`）。
DB 里有 `compression_locks` 表做跨进程互斥。这是 AGENTS.md 里唯一被允许打破 prompt cache 的操作。

**委派**：`tools/delegate_tool.py:2778 delegate_task()` → `:1504` 直接构造子 `AIAgent(...)`，
**进程内递归**，共享同一套循环。异步委派落 `async_delegations` 表（`tools/async_delegation.py:142`），
带 `owner_pid` / `delivery_state` / 重试计数——为跨进程崩溃恢复设计。

---

## 任务 3：代码地图（实际流程）

模板里的线性流程与代码不符。实际是**双回路**：主回路同步，学习回路异步且滞后。

```
User Input
   │
   ├─ 入口: hermes_cli.main / gateway.run / acp_adapter / tui_gateway
   │
   ▼
turn_context.py  ── 前置
   │  · 建/复用 session（state.db sessions 表）
   │  · memory nudge 计数 +1，判定 should_review_memory   [:584]
   │
   ▼
prompt_builder.py ── system prompt 组装（首轮后即冻结，保 cache）
   │  · SOUL.md · MEMORY.md · USER.md（全量，2200+1375 字符上限）
   │  · skills 紧凑索引（name + ≤60 字符 desc，不含正文）
   │  · 环境提示 · cwd 上下文文件（AGENTS.md/CLAUDE.md/…）
   │
   ▼
conversation_loop.py :1142 run_conversation()
   │
   ├──►  while (api_call_count < max_iterations(90)          [:1316]
   │            and budget.remaining > 0):
   │        │
   │        ├─ LLM API call（贴 cache_control 断点）
   │        │
   │        ├─ 无 tool_calls → 跳出
   │        │
   │        ├─ tool_executor.py 分发
   │        │     · todo        ← 唯一的"规划"，模型自管
   │        │     · skills_list / skill_view  ← 按需拉技能正文
   │        │     · skill_manage ← 模型可在此当场写技能
   │        │     · memory       ← 模型可在此当场写记忆
   │        │     · terminal / file / browser / web / delegate_task …
   │        │     · check_fn 门控 + approval 审批
   │        │     · _iters_since_skill += 1                  [:1385]
   │        │
   │        └─ 超过 50% 上下文 → context_compressor（唯一允许破 cache 处）
   │
   ▼
turn_finalizer.py ── 后置
   │  · skill nudge 判定 should_review_skills               [:699]
   │  · _sync_external_memory_for_turn()（外部记忆插件）
   │
   ▼
Response  ──────────────────────────────►  交付给用户（到此用户侧结束）
   │
   │   ┄┄┄ 以下为异步学习回路，不阻塞用户 ┄┄┄
   ▼
_spawn_background_review()  daemon thread     [turn_finalizer.py:714]
   │  · fork 一个 AIAgent，重放对话快照
   │  · 工具白名单仅 memory + skills
   │  · 同模型 → 全量重放（吃 cache）；异模型 → digest
   │
   ├──► 写 MEMORY.md / USER.md
   └──► 写 ~/.hermes/skills/<new>/SKILL.md

   ┄┄┄ 另一条独立回路：空闲时触发，无 cron daemon ┄┄┄

maybe_run_curator()   [curator.py]
   │  读 .usage.json 使用遥测
   ▼
active ──未用N天──► stale ──未用M天──► archived (.archive/)
                                        （永不删除，pinned 豁免）
```

**与模板的三处关键差异：**

1. **Planning 不是独立阶段**，是循环内的一个普通工具（`todo`）。
2. **Memory Update / Skill Update 不在主链路上**——它们既可以是循环内模型主动调工具，也可以是响应交付后的异步 fork。用户感知到的"回复完成"早于学习完成。
3. 多了一条**离线 GC 回路**（curator），由空闲触发，不在任何 turn 的路径上。

---

## 任务 4：迁移观察

只做标记，不做判断。

### 通用 Agent 基础设施

```
Module: 工具注册表 + 工具集门控
Observation: 与 Hermes 业务完全解耦的插件式工具层。register() 带 check_fn 做运行时
             可见性门控，是控制 schema 体积的通用机制。toolsets.py 的分组/别名/
             include 解析也是纯通用逻辑。
Evidence: tools/registry.py:497, toolsets.py:31-86, model_tools.py:294

Module: 会话循环 + 迭代预算
Observation: while(迭代上限 ∧ 预算) 的经典 agent loop，终止条件、grace call、
             max_iterations 处理都不含场景假设。
Evidence: agent/conversation_loop.py:1142,1316; run_agent.py:443,7119

Module: Prompt Cache 断点策略
Observation: 跨 provider 的 cache_control 能力矩阵 + 剥离/重贴逻辑。这是这个仓库
             里最有迁移价值的独立资产之一，与业务零耦合。
Evidence: agent/agent_runtime_helpers.py:1991-2140; agent/conversation_loop.py:905,939

Module: 上下文压缩
Observation: 阈值解析、按模型覆盖、跨进程压缩锁、压缩后 memory 权威性声明。
             逻辑通用，但 6708 行的体量说明积累了大量 provider 特例。
Evidence: agent/context_compressor.py:1286,2156; hermes_state_common.py (compression_locks)

Module: 可插拔上下文引擎 (ContextEngine ABC)
Observation: 上下文管理被抽象成了有完整生命周期的 ABC——on_session_start /
             update_from_response / should_compress / compress / on_session_end，
             引擎还可自带工具（如 lcm_grep）。内置 compressor 只是默认实现，
             config 里 context.engine 一行可换。同时只允许一个引擎激活。
             这是整个仓库里抽象得最干净的扩展点之一。
Evidence: agent/context_engine.py:1-26; plugins/context_engine/;
          agent/conversation_loop.py:1012 _apply_context_engine_selection

Module: Curator 快照 / 回滚
Observation: 变更前 tar.gz 全量快照 + manifest.json，回滚前再快照当前状态，
             使回滚本身可撤销。任何"让 LLM 自主改写持久化资产"的系统都需要
             这层保险，机制与 skill 内容无关。
Evidence: agent/curator_backup.py:1-11

Module: 会话持久化 + FTS 检索
Observation: sessions/messages + 三套 FTS5（标准/trigram/CJK）。检索层通用，
             但 sessions 表内联了 billing_* 和 git_* 列，schema 已被业务污染。
Evidence: hermes_state_common.py:140-175; hermes_state_search.py:332,397,1456; native/fts5_cjk.c

Module: Skill 渐进披露机制
Observation: "索引进 prompt / 正文按需拉取" + 双层缓存（进程内 LRU + 磁盘 mtime 快照）。
             与 skill 内容无关，是纯粹的上下文经济学机制。
Evidence: agent/prompt_builder.py:1584-1640

Module: Skill 生命周期 + 使用遥测
Observation: sidecar 遥测 → 状态机（active/stale/archived/pinned）→ 只归档不删除。
             通用的"技能垃圾回收"骨架。
Evidence: tools/skill_usage.py:18-23; agent/curator.py:1-20

Module: 后台自省 fork
Observation: 响应交付后异步 fork + 工具白名单 + 同模型吃 cache/异模型走 digest 的
             成本策略。机制通用，不依赖 Hermes 的具体记忆格式。
Evidence: agent/background_review.py:1-41; agent/turn_finalizer.py:699-722

Module: 委派 / 子 agent
Observation: 进程内递归构造子 AIAgent + 异步委派的 DB 持久化（owner_pid、
             delivery_state、重试）。跨进程崩溃恢复语义是通用的。
Evidence: tools/delegate_tool.py:1504,2778; tools/async_delegation.py:142-157

Module: Provider 适配层
Observation: anthropic / bedrock / codex-responses / gemini-native / azure 各自
             wire format 适配 + 凭证池 + 故障转移。通用但极其厚重。
Evidence: agent/anthropic_adapter.py, agent/bedrock_adapter.py,
          agent/codex_responses_adapter.py, agent/credential_pool.py

Module: 插件 ABC + plugin.yaml
Observation: 95 个 plugin.yaml 共用一套加载/配置 schema 约定；override=True 才能
             覆盖内置工具。边缘扩展的通用契约。
Evidence: plugins/plugin_utils.py; tools/registry.py:511-522

Module: Cron 调度
Observation: jobs.json + 文件锁 + 执行记录 + 每任务 toolset 解析。通用调度层。
Evidence: cron/jobs.py:1-30, cron/scheduler.py, cron/executions.py
```

### 明显与具体场景绑定

```
Module: 消息平台适配（21 个）
Observation: telegram/discord/slack/feishu/matrix/whatsapp/wecom/line/irc/sms/…
             加上 gateway 的投递保障、去重、限流、配对、优雅停机。
             绑定"个人消息助理"这一形态。gateway/ 86 个 py 全部服务于此。
Evidence: plugins/platforms/ (21 dirs); gateway/platforms/; gateway/delivery_ledger.py

Module: 平台专属模型工具
Observation: 这些工具直接进了工具注册表，是 schema 层面的场景绑定，不只是插件。
             discord / discord_admin / feishu_doc_read / feishu_drive_* /
             yb_send_dm / yb_send_sticker / yb_query_group_* / react_to_message
Evidence: tools/discord_tool.py, tools/feishu_doc_tool.py, tools/feishu_drive_tool.py,
          gateway/platforms/yuanbao*.py

Module: 桌面 GUI 工具
Observation: read_terminal / close_terminal / open_preview / focus_pane 五个工具
             靠 check_fn 挂 HERMES_DESKTOP 门控，注释明说"只在 GUI 下有意义"。
             project_list/create/switch 更是刻意排除在 core 之外。
Evidence: toolsets.py:36-40,60-64; apps/desktop/ (1473 文件); tui_gateway/; ui-tui/; web/

Module: Kanban 多 agent 协作
Observation: 独立 kanban.db（6 张表）+ 13 个 kanban_* 模型工具，靠
             HERMES_KANBAN_TASK 环境变量门控。绑定"多 agent 看板协作"场景。
Evidence: hermes_cli/kanban_db.py; tools/kanban_tools.py; toolsets.py:75-83

Module: 计费 / 额度 / 订阅
Observation: sessions 表内联 billing_provider/billing_base_url/billing_mode +
             7 个 billing/credits 模块 + prompt 里的 entitlement 引导文案。
             绑定"付费 SaaS 产品"，不是 agent 能力。
Evidence: hermes_state_common.py:168-170; agent/billing_*.py, agent/credits_tracker.py,
          agent/account_usage.py; agent/conversation_loop.py:328-455

Module: 智能家居
Observation: ha_list_entities / ha_get_state / ha_list_services / ha_call_service
             四个工具进了 core 列表，靠 HASS_TOKEN 门控。
Evidence: toolsets.py:73-74; skills/smart-home/

Module: 语音 / TTS / 唤醒词
Observation: text_to_speech 在 core 列表；voice_mode、transcription、
             neutts_samples、wakewords 一整套。绑定语音交互场景。
Evidence: toolsets.py:57; tools/voice_mode.py, tools/tts_tool.py,
          tools/transcription_tools.py, tools/wakewords/

Module: 媒体生成（图/视频）
Observation: 6 个 bfl_flux3_* 工具直接进 core 列表（含一个 prompting_guide 工具），
             外加 image_generate / video_generate / xai_video_* / flux3_video_tool。
             对通用 agent 而言这是很重的场景占位。
Evidence: toolsets.py:45-48; tools/flux3_video_tool.py, plugins/image_gen/, plugins/video_gen/

Module: 桌面精灵 Petdex
Observation: 纯装饰。sprite atlas 解析 + 把 agent 活动映射到
             idle/run/review/failed/wave/jump 动画。
Evidence: agent/pet/ (7 文件), agent/pet/__init__.py:1-8

Module: 场景化技能包
Observation: apple(imessage/notes/reminders/findmy)、smart-home、social-media、
             media、email 等分类明确面向"个人生活助理"。
             另有 autonomous-ai-agents/ 分类（claude-code/codex/opencode/hermes-agent），
             面向"驱动其他 coding agent"。
Evidence: skills/apple/, skills/smart-home/, skills/social-media/,
          skills/autonomous-ai-agents/

Module: 编码姿态（coding posture）
Observation: agent/coding_context.py 会把整类技能降级成"只列名字"，
             说明系统对"当前是不是在写代码"有专门分支。
Evidence: agent/coding_context.py; agent/prompt_builder.py:1605-1608

Module: 评测 / RL / 数据生成
Observation: batch_runner.py(59KB)、mini_swe_runner.py(29KB)、
             datagen-config-examples/、trajectory_compressor.py。
             面向研究/跑分，与运行时 agent 无耦合，也未接回自我改进回路。
Evidence: batch_runner.py, mini_swe_runner.py, trajectory_compressor.py

Module: 成就系统
Observation: plugins/hermes-achievements/ —— 游戏化激励，产品特性。
Evidence: plugins/hermes-achievements/ (12 文件)
```

### 边界模糊（既通用又已被污染）

```
Module: hermes_state.py
Observation: 401KB 单文件。核心是通用会话存储，但里面混进了
             telegram_dm_topic_mode / telegram_dm_topic_bindings 两张
             Telegram 专属表的建表语句。
Evidence: hermes_state.py:7965,7978

Module: cli.py
Observation: 873KB 单文件。AGENTS.md 自己把它列为需要拆分的 god-file。
             既是入口也是大量业务逻辑的堆放处。
Evidence: cli.py; AGENTS.md "Refactor god-files into clean modules"

Module: 记忆存储
Observation: 内置实现是文件态（MEMORY.md/USER.md，2200+1375 字符，全量注入，
             无检索、无 scope、无结构）；结构化能力全在 plugins/memory/ 的
             8 个外部 provider 里。核心记忆能力本身很薄。
Evidence: agent/agent_init.py:1648-1657; tools/memory_tool.py:1155;
          plugins/memory/holographic/store.py
```

---

## 5. 侦察盲区 / 未验证项

诚实标注本次没能确认的点：

1. **`~/.hermes` 运行时目录不存在**（仓库未在本机跑过），所有磁盘布局结论来自代码常量，未经运行验证。
2. **`cli.py`(873KB) 未通读**，只做了针对性 grep。里面可能还有未被本报告覆盖的子系统。
3. **`hermes_state.py`(401KB) 未通读**，表结构结论来自 `hermes_state_common.py` 的 CREATE TABLE，可能有运行时动态建表遗漏。
4. **`MemoryStore` 类实现细节未逐行读**（`tools/memory_tool.py` 前 1150 行），只确认了 schema、字符上限、加载入口。字符超限时的具体拒绝/截断行为未验证。
5. **`agent/moa_loop.py`（Mixture-of-Agents）** 未展开，不清楚是否默认启用、以及与 prompt cache 的交互。
6. `AGENTS.md` 提到的 `hermes-agent-dev` 技能及其 `references/self-improvement-loop.md`（自我改进循环的不变量文档）**不在本仓库内**，无法交叉验证。
7. `agent/curator.py` 只读了头部 55 行与不变量声明，**2018 行的具体 review prompt 与判定逻辑未逐行验证**。

> 已在本轮补查并关闭的缺口：`agent/insights.py`（确认为 usage 报表，非自省，见 2.3-E）、
> `agent/curator_backup.py`（快照/回滚，见 2.3-D）、`agent/context_engine.py`（可插拔上下文引擎 ABC，见下）。

---

## 6. 一句话总结

Hermes 是一个**产品**，不是一个框架：真正可复用的 agent 内核大约集中在 `agent/` 的十几个文件 + `tools/registry.py` + `toolsets.py`，其余绝大部分体量服务于"跨 21 个消息平台的个人助理 + 桌面 GUI + 计费 SaaS"这一具体形态。

它最有参考价值的三个工程决策是：
1. **narrow waist** —— 61 个 core 工具 + `check_fn` 运行时门控，把 schema 成本压住；
2. **prompt cache 至上** —— system prompt 冻结、跨 provider 断点策略、后台自省 fork 刻意复用父 cache；
3. **技能的渐进披露 + 使用频次 GC** —— 索引进 prompt、正文按需拉、不用就归档（永不删除）。

它最薄的一环是**记忆**：3575 字符的全量注入文本文件，无 scope、无结构、无检索、默认关闭——与它在会话检索上投入的三套 FTS5（含自研 CJK 分词器 C 扩展）形成强烈反差。而所谓"自我进化"，实质是**LLM 定期自我总结写文件 + 基于"用没用过"的垃圾回收**，缺少任何效果反馈信号。
