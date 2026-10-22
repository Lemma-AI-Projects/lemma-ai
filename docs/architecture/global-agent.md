# Global Agent V0

一个活在 Learn Space 里的 Global Agent：它读得到**当前空间**的资料，回答里看得出来，
并且每一轮都能在界面上核对「它到底看到了什么」。

**这一版刻意不做**：Learner State / Space Memory / KST / Method Runtime / Scheduler /
Multi-Agent / Planner / 复杂 Agent Runtime。V0 只有一个目标 ——
**让用户立刻感觉到「它知道这个 Space」**。

---

## 1. 启动

### 1.1 数据库（本机库，团队那个云库一行都不动）

```bash
cd .workbuddy/localdb
./pg.sh start          # 本机 PostgreSQL 17.6 @ 127.0.0.1:55432
./pg.sh status         # pg_ctl start 的退出码不可靠，用这个判断
```

库已经建好（schema 从 base 跑完整条 alembic 链，数据是从云库只读拷来的真数据）。
要重刷数据：`python sync_cloud_data.py`。细节与两个坑见同目录 `README.md`。

> `backend/.env` 的 `DATABASE_URL` 已指向本机库，`DOC_FULL_API_ENABLED=true`；
> 云库那一行注释保留在同一个文件里。

### 1.2 灌入演示资料

```bash
cd backend
.venv/Scripts/python.exe scripts/seed_demo_space.py --space "AI for Math"
```

会在这个空间里放三份资料（可重复执行，每次以脚本内容为准）：
`Linear Algebra Notes` · `Eigenvalue Notes` · `Research Roadmap`，
外加一段对话，好让 Space Context 面板的 Conversations 不是空的。

### 1.3 起服务

```bash
# 后端（必须 cd backend —— 启动依赖 CWD）
cd backend && .venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001

# 前端
cd frontend && npm run dev      # http://localhost:5173
```

打开 → 登录 → 进 `AI for Math`。

---

## 2. 看什么（五个动作）

| # | 动作 | 你该看到 |
|---|---|---|
| 1 | 进 Learn Space | 右侧是 **Global Agent** 面板（不是原来那个把输入接力到 /chat 的空壳） |
| 2 | 直接问「这个空间里有哪些资料？」 | 答出**三份资料的确切标题** —— 通用 ChatGPT 给不出这个 |
| 3 | 问「根据我的资料，我现在最应该关注什么？」 | 它会引用 `Research Roadmap` 里的「第一阶段 · 语言」与出关标准 |
| 4 | 问「解释一下我资料里的 eigenvector」 | 用 `Eigenvalue Notes` 的内容解释（`Av = λv`、几何意义） |
| 5 | 点回答下面的 **Agent Context** | 展开看到这一轮用了哪些资料、哪些正文进了 prompt、动作是什么 |

**Space Context 面板**（底部 dock 的雷达图标）：列出这个空间的 Sources（每份多大、
是否被摘录）、Conversations，以及最关键的一项 —— **真正交给模型的 prompt 原文**。
它和聊天用的是同一份装配，所以面板不可能与 Agent 实际拿到的东西不一致。

---

## 3. 它为什么「知道」这个空间

每一轮对话，服务端在调模型之前算一次 **Agent Context**：

```
空间 + 资料清单（标题/类型/字数）
     + 摘要正文（预算 6000 字，单份上限 2400 字，从最近改动的往下取）
     + 本空间其他对话（只有标题，正文读不到）
     + 本轮重放的历史条数
        ↓
   渲染成 $space_context，填进 text_chat.system.txt
        ↓
   同一次计算同时产出「摘要 digest」→ 写进这条回答（ai_messages.agent_context_json）
                                    → 并在 done 之前用 SSE 的 context 事件发给前端
```

三件值得说清楚的事：

- **摘要正文是硬预算内的**，并且每条都标注「这是摘录，可能被截断」。
  需要全文时 Agent 调 `read_page`。清单与正文的边界写在 prompt 里，不是靠模型自觉。
- **digest 是当时记下的，不是现在算的。** 空间会变，事后重算会把今天的空间说成那一轮的
  —— 那是假证据。所以每条回答都带着它自己那一刻的事实。
- **其他对话只给标题。** 这一版没有 Memory，prompt 里明说读不到，并让 Agent 如实承认。

Agent 的工具（极简）：`read_page`（读某份资料的正文，标题或 id，歧义一律拒并返回候选）
· `save_note`（把结论存成**新**资料；不能改用户的）。两者都只在空间内生效。

---

## 4. 自动化测试

```bash
cd backend

# 仓库测试（不碰数据库、不碰模型）—— 56 passed
# 用「根检出」的 venv 当 runner：这个 worktree 的 venv 里没装 pytest。
# cwd 在本目录 ⇒ sys.path 从这里解析 ⇒ 跑的是本分支的代码。
"D:/github projects/lemma-ai/backend/.venv/Scripts/python.exe" -m pytest tests -q

# 端到端（本机库 + 真模型，跑四个演示问题）
# 脚本在仓库根的 .workbuddy/ 下，而本目录是 .worktrees/main-v3/backend ⇒ 往上三层。
PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe \
  ../../../.workbuddy/localdb/verify_global_agent.py
```

- `tests/services/test_global_agent_context.py` —— **Space Context → Global Agent → Response**：
  断言模型收到的 `prompt_vars["space_context"]` 里有资料与正文；断言流回到了调用方；
  断言 SSE 的 digest 与写库的那份完全相同。模型被打桩，因为「会调用外部服务」的测试
  失败时说明不了任何关于这段代码的事。
- `verify_global_agent.py` —— 真模型那一侧：走 `POST /api/v1/chat` 的 SSE，
  断言 Q1 说出三份资料的确切标题、Q3 用得上 `Eigenvalue Notes` 的内容、
  digest 落库且刷新后还在。单元测试守不住的部分由它守。

---

## 5. 边界（写清楚，免得误会）

- **不做** Learner State / Space Memory / KST / Scheduler / Multi-Agent。
- **不做** 检索/向量/排序：预算内的摘录取自最近改动的资料，规则简单、可解释、可核对。
- **Action 只报确定性的事实**：`answer`，或挂了卡片时的工具名。工具被调用但没产出卡片
  （`read_page`）在面板里看不到 —— 说它调过是猜。
- 提示词注入是**尽力而为**的：doc 层不可用时 `space_context` 为空串，
  聊天照常，但绝不编造空间里有东西。
