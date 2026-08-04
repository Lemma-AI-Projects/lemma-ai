# Lemma Monorepo 方案 — LemmaAI × LemmaHermes 依赖管理模式

> 状态：定稿（P0 准备阶段）
> 日期：2026-08-03
> 背景：LemmaAI（产品，FastAPI + React + Supabase）与 LemmaHermes（引擎 = Hermes 内核 + learner 魔改）采用 **monorepo 依赖管理模式**。本文定义布局、工具链、引擎包化、接口契约与分阶段落地。

---

## 1. 布局（uv workspace 管 Python，npm 保留前端）

```
lemma/                        ← monorepo 根（uv workspace root）
├── pyproject.toml            ← [tool.uv.workspace] members 声明（无包体）
├── uv.lock                   ← Python 侧统一锁（双方现都用 uv）
├── apps/
│   ├── lemma-backend/        ← 现 lemma-ai backend（lemma-backend 包）
│   └── lemma-frontend/       ← 现 lemma-ai frontend（npm，保留 package-lock）
├── packages/
│   └── lemma-hermes/         ← 现 lemma-hermes 仓库 → 引擎包
│       ├── pyproject.toml    ← name="lemma-hermes"（可安装包）
│       └── <内核清单>         ← 见 §3
└── contracts/                ← 接口契约文档（引擎 ↔ 产品）
```

**工具链事实**（已核实）：
- lemma-ai backend：`pyproject.toml` + `uv.lock`（uv）✅
- lemma-hermes：`pyproject.toml` + `uv.lock`（uv）✅
- lemma-ai frontend：`package-lock.json`（npm）——**前端不动**，保留 npm

→ Python 侧统一 `uv workspace` 是零摩擦的（双方已用 uv）；前端维持现状，避免无谓的工具链迁移。

## 2. 依赖方向（不可违反）

```
apps/lemma-backend ──► packages/lemma-hermes（引擎）
     ▲                        │
     └────── 仅经契约层交互 ───┘
```

- **单向**：产品依赖引擎；引擎**永不** import 产品
- 产品通过 `contracts/` 定义的接口消费引擎：Python 包 API / 数据表 / 事件
- 引擎独立版本（semver），产品锁版本（uv workspace 内依赖）

## 3. 引擎包化（lemma-hermes 从"模块堆"变"可安装包"）

lemma-hermes 现在是 3725 文件的 Hermes 源码 + learner 魔改。包化 = 按内核清单裁剪出 `lemma_hermes` 包：

| 层 | 内容 | 依据 |
|---|---|---|
| 核心内核 | agent loop / prompt / tool_executor / registry / toolsets / provider 适配 | recon 报告 §4「通用基础设施」 |
| learner 魔改 | `agent/learner/`（纯 stdlib，零 Hermes 依赖，已验证） | 本项目 M1-M3 |
| 业务绑定（排除） | 21 平台 gateway / 桌面 GUI / 计费 SaaS / kanban / pet | recon 报告「场景绑定」清单 |

**依赖策略**：核心依赖收敛（当前 Hermes 依赖树含 provider extras，按 lazy 加载拆 `[providers]` extra）。

## 4. 接口契约（产品侧已开始留，见 lemma-ai 根契约文档）

| # | 接口 | lemma-ai 位置 | 现状 |
|---|---|---|---|
| C1 | 动态上下文块 | `ai/agents.py` `LemmaDeps.lemma_context_blocks` | ✅ 已留（空列表零影响，`_inject_system_prompt` 拼接） |
| C2 | 配置门 | `core/config.py` `lemma_hermes_*` | ✅ 已留（默认 disabled，引擎未落地前零行为） |
| C3 | 工具注册 | `ai/tools/declarations.py` ToolSpec 注册表 | 注册表就绪；`LEARNER_STATE` spec 待引擎落地时注册 |
| C4 | 存储 | alembic 迁移（learner 五层表 PG 化） | 待引擎落地（P2/P3） |
| C5 | 任务 | `tasks/` Celery（会话后自省） | 待引擎落地（P2/P3） |
| C6 | 会话事件 | conversation_service 落盘处钩子 | 待引擎落地（P2/P3） |

## 5. 分阶段落地

| 阶段 | 内容 | 交付物 |
|---|---|---|
| **P0（当前）** | 方案定稿；lemma-ai 留 C1/C2 接口；契约文档 | 本文 + `LEMMA_HERMES_INTEGRATION_CONTRACT.md` |
| **P1** | 引擎包化：lemma-hermes 内核清单 → `lemma_hermes` 可安装包 + 收敛依赖 | packages/lemma-hermes/pyproject.toml |
| **P2** | uv workspace 合并（两 pyproject 进一个 workspace）；learner 表 PG 化迁移（C4） | monorepo 根 + alembic 迁移 |
| **P3** | 适配层实装：动态块接入（C1 消费）、learner_state 工具（C3）、自省任务（C5/C6） | 产品侧行为上线 |
| **P4** | 前端 learner dashboard（React，消费 mastery 数据） | frontend feature |

## 6. 风险与红线

- **产品零破坏**：P0/P1 阶段 lemma-ai 行为不变（接口默认 inert）
- **git 历史**：两仓库并入 monorepo 用 subtree/graft 保留历史（P2 决策点）
- **引擎依赖面**：包化必须收敛（provider 拆 extras），否则产品背上 Hermes 全量依赖树
- **async 模型**：Hermes 同步 loop vs lemma-ai async——引擎服务化时处理（P3 核心难点）
