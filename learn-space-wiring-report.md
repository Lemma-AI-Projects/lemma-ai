# Current Runtime Wiring Map

> **基线** `user-profile @ 95f00452` · **日期** 2026-10-08 · **库** `lemma @127.0.0.1:55432`
> 全部结论带 `文件:行号`。**没找到 = 我 grep 过且零命中**，不是"大概没有"。
> ⚠️ 本轮**没有 runtime 观察**（登录要云端 Supabase，本机无账号）⇒ 标 `UNKNOWN(RUNTIME)` 的项是代码事实、运行时未验。
>
> **下一步（≤5 行）**
> ① 图上标 🔴 的六条断线里，**`Goal → Knowledge Structure` 是唯一一条 Space Ignition 会直接踩到的**。
> ② 它的后果是链性的：新空间没有知识结构 ⇒ `record_evidence` 必然 `unknown_item`
>    ⇒ Evidence 永远写不进去 ⇒ Learner State 永远返回「什么都没有」。
> ③ 而 `Learner State → Coordinator → Method → Focus` **整段已经断了**（turn_start 零生产者）。
> ④ ⇒ **Ignition 把人送进 Focus，而 Focus 后面没有闭环** —— 这是 §17 的答案。
> ⑤ 有一处**刻意设计**必须先承认：Goal 不进 prompt（`method_service.py:152-156`），
>    它不是断线，是决定 Ignition 形态的约束。

---

## 1 · 主链路（真实形态）

```
User
 ↓  POST /api/v1/projects                     ✅ CONNECTED
Space（只写了一个 name）
 ↓  ❌ 没有任何后续动作                        🔴 DISCONNECTED
   （无 goal · 无 context · 无知识结构 · 无导航提示）
 ↓
User 在网格工作台打开 Goal 面板                 ✅ CONNECTED 但位置错（不在 Focus）
 ↓  POST /goals/extract → 抽取 → 回述 → create+confirm   ✅ CONNECTED（一次点击）
Space Goal（active）
 ↓  ⚠️ 刻意不进 prompt                          🔵 BY DESIGN
   （method_service.py:152-156：「a goal printed into every prompt
     becomes a topic the model keeps bringing up」）
 ↓
User 打开 Focus
 ↓  ✅ CONNECTED
Focus = 可写的文档阅读器 + 通用聊天侧栏          🔴 UI ONLY（对学习而言）
 ↓
用户做任何交互（编辑 / 点开 / 漫游）
 ↓  ❌ 零个出口通向 evidence                    🔴 DISCONNECTED
 ↓
（唯一可能路径）右栏对话 → POST /chat
 ↓  ✅ CONNECTED
模型**自主决定**是否调 record_evidence            🔴 AUTONOMOUS ONLY
   （ai/client.py 无 tool_choice；模板无任何要求调用的话）
 ↓  🔴 必须先 resolve_item 解析出已存在的知识点
   冷启动空间没有知识结构 ⇒ 必然 unknown_item ⇒ 不写
 ↓
evidence 写入 → admit_outcome                  ✅ CONNECTED（代码完整）
 ↓
Learner State 重算（读时算，从不存储）           ✅ CONNECTED
 ↓  每轮重算进 prompt（agent_context_service.py:501）
Coordinator 事件                                 🔴 只在「证据写入后」发
   turn_start 零生产者 ⇒ 没有任何路径在一轮开始时问决策层
 ↓
executor                                         🔴 三种 action 空转
   INTRODUCE/REVIEW/CONTINUE ⇒ return "handed_to_global_agent"，无 agent 被调用
Method episodes                                  🔴 BACKEND ONLY（表有 2 行数据、零写入方）
 ↓
下一轮教法真正改变                                 ❌ 不存在
```

**一句话**：**从 Goal 到 Learner State 是通的，从 Learner State 往前是断的。**
而 Ignition 要走的 `Name → Intent → First Move → Focus` **整段都在断线的另一侧**。

---

## 2 · Component Matrix

| Component | Exists | Reads | Writes | Called By | Calls | Persistence | Runtime Status |
|---|---|---|---|---|---|---|---|
| **Create Space** | ✅ | — | `projects` | `CreateProjectDialog` | — | PG | ✅ CONNECTED（**只写 name**）|
| **Space lifecycle** | ⚠️ 无状态 | — | — | — | — | — | ❌ 无 active/暂停/归档（`models/project.py:24-41`）|
| **Space switching** | ✅ | `projects` | — | 侧栏 / 总览 | — | PG | ⚠️ PARTIAL：**同一空间两个入口**（侧栏 `/project/` vs 总览 `/learn-spaces/`）|
| **Goal** | ✅ | `space_goals` | `space_goals` + 一条 memory | `GoalBlock`（在**网格**）| method / 简报 | PG | ✅ CONNECTED · ⚠️ `origin=user_stated` 前端零使用（`GoalBlock.tsx:376-378` 自认）|
| **Space Context（资料）** | ✅ | `pages/blocks` | 同左 | 对话组装 | prompt 拼接 | PG | ⚠️ PARTIAL：**只抽开头字符**（总 6000 / 单源 2400 字）|
| **Space Source** | ✅ | `material_storage` | 同左 | 上传端点 | — | 文件 | ✅ CONNECTED（⚠️ 无向量检索）|
| **Space Memory** | ✅ | `space_memories` | 同左 | **只有 Agent 的 `remember` 工具** | prompt 注入 | PG | ⚠️ BACKEND ONLY · **用户无入口**；无检索（纯时间序）|
| **Evidence** | ✅ | — | `knowledge_evidence` | Agent 工具 / `POST /knowledge/evidence` | state / coordinator | PG | ⚠️ 两条路径，**前端唯一调用方在 dev 面板**（`SchedulePage.tsx:93`）|
| **Learner State** | ✅ | items+edges+evidence | **不存储**（只回写 counterexample）| 每轮 prompt / method / coordinator | — | 读时算 | ✅ CONNECTED（**冷启动返回「什么都没有」**）|
| **Knowledge Structure** | ✅ | `knowledge_items/edges` | 同左 | **只有两个 seed 脚本** | — | PG | 🔴 **BACKEND ONLY** · `api/v1/knowledge.py` 只有 GET structure/brief + POST evidence，**无写结构路由** |
| **Coordinator** | ✅ | state + goal | `coordinator_decisions` | **只有证据写入**（2 处）| executor | PG | ⚠️ PARTIAL（**turn_start 零生产者**）|
| **Method System** | ✅ | goal + state | — | `method_status` ← `FocusView` | prompt directive | — | ⚠️ **UI ONLY**：只有文案接进 UI，`method_episodes` 零写入方 |
| **Grid** | ✅ | `DocPage[]` | 同左 | `WorkspaceGrid` | — | PG | ✅ CONNECTED（**只读 + 改名**）|
| **Board** | ✅ | `board_context` | 同左 | `/sandbox/board` | — | PG | ⚠️ UI ONLY（`BoardCanvas` 空壳，**Focus 的 Mala 投送被 `disabled`**）|
| **Focus** | ✅ | pages/blocks | 同左 | 路由 | `POST /chat` | PG | 🔴 **对学习而言 UI ONLY** —— 零个交互通向 evidence |
| **Global Agent** | ✅ | space_context | pages / memory / evidence / desmos | `POST /chat` | 模型 | PG | ⚠️ PARTIAL（**唯一的证据写入口，且由模型自愿触发**）|
| **Conversation** | ✅ | `ai_conversations` | 同左 | Agent 对话 | context 组装 | PG | ✅ CONNECTED（⚠️ 恢复只取 role+content 两列，**无时间戳**）|
| **Artifact（Doc）** | ✅ | `page_blocks` | 同左 | Focus 编辑 | — | PG | ⚠️ PARTIAL（**编辑不进 Learner State**；整页删掉重插 ⇒ 无版本）|
| **Scheduler** | ✅ | `scheduled_tasks` | 同左 + notifications | app lifespan（**真在跑**）| `notification_service` | PG | 🔴 **BACKEND ONLY**：`schedule()` 非测试调用方只有 API 层，而那个 API 只有 dev 测试按钮 |
| **Notifications** | ✅ | `notifications` | 同左 | Coordinator NOTIFY | — | PG | 🔴 **UI ONLY**：`NotificationCard` 零 onClick，**`metadata.projectId` 没人读** |
| **User Home** | ✅ | `user_home_items` | 同左 | `/me` | prompt 偏好层 | PG | ✅ CONNECTED（**提议必须确认** —— 设计最扎实的一块）|
| **Trajectory** | ✅（昨天）| 同左（时间维度）| — | `/preview/trajectory` | — | **mock** | ❌ **NOT IMPLEMENTED**（数据见 §11）|

---

## 3 · 六条 Wiring 逐条核

### Wiring A · User → Create Space → Space → Intent/Goal

**状态**：`Create Space ✅ → Intent 🔴`

创建后**真实发生的事**：`POST /api/v1/projects` 只写 name（`project_service.py:18-25`）⇒ 侧栏出现 ⇒ 用户被丢进空白 Space。**没有任何后续动作。**

Intent 有两个已存在的入口，都**不在创建流程里**：
- ✅ `GoalBlock`（手填 + AI 抽取 + 回述 + 一次点击 create+confirm）—— 但它挂在**网格工作台**（`LearnSpaceWorkspace.tsx:264`），**不在 Focus**
- ❌ `origin=user_stated`（从对话里听出来）—— 前端零使用，代码自认「它今天还没接」

### Wiring B · Space → Global Agent（真实 prompt 里有什么）

**这一条要特别小心，因为 Goal 的缺席是刻意的。**

模板只有 19 行，两个变量：`$method_block` + `$space_context`（`text_chat.system.txt:18-19`）。装配 `agent_context_service.py:535-546`，五段顺序拼接、**空串则整段不出现**。

| 项 | 有无 | 预算 / 截断 | 何时空 |
|---|---|---|---|
| Goal | **❌ 不进 prompt** | — | **恒定不进**（`method_service.py:152-156` 给出了理由）|
| 资料 excerpt | ✅ | 总 6000 / 单源 2400 字（`space_context.py:35-36`），按 `updated_at desc` | 无资料时输出 `- (empty)` 字样 |
| Space memory | ✅ | 20 条 / 每条 400 字 | 该空间还没有记忆 |
| Learner state | ✅ | 每节 8 项，超出只给计数 | **无知识结构 ⇒ 返回「还没有知识结构」**（`state.py:567`）|
| 对话历史 | ✅ | `load_recent_history` **无 limit** | 新会话 |
| 其他会话标题 | ✅ | 10 条，当前会话被排除 | 只有一段会话 |
| 画板投送 | ✅ | 无 cap | 取不到 → **硬 422**（`ContextRefused`）|
| 偏好栈 | ✅ | 10 条 | 单层时不产栈 |

### Wiring C · User Action → Evidence

**状态**：🔴 **Focus 里零个交互通向 `admit_outcome`。**

| 交互 | 到 evidence？ |
|---|---|
| 编辑正文 / 自动保存 / 冲突覆盖 | ❌ `pages.py` 内 evidence 零命中 |
| 「开始写」加空段落 | ❌ |
| ← → 漫游资料 / 大纲跳转 / 打开文件 | ❌ 纯前端 |
| 顶栏 method 状态栏 / goalLine | ❌ 只读 |
| **右栏对话发消息** | **间接 · 且模型自主决定** |

**Focus 里没有提问机制**：`ConversationPanel` 是自由文本输入 + 三颗快捷胶囊，点了把整句话直接发出去。**没有任何接收答案的组件**（`ConversationQuizTool` 存在但没有 `QuestionPlayer` 挂载）。

⇒ **Focus 实际是「一个可写的文档阅读器 + 一个通用聊天侧栏」**，它自己的注释确认了这点（`FocusView.tsx:62-71`：「没实装（也不假装）」）。

### Wiring D · Evidence → Learner State

**状态**：✅ CONNECTED（代码完整）

```
record_evidence_handler (conversation_tool_service.py:499)
 ├─ resolve_item (:579)          ⚠️ 未知 → 不写
 ├─ admit_outcome (:603 → evidence_entry.py:141)
 ├─ compute_state (:637)         读时重算
 └─ handle_event_safely (:646)   发 Coordinator 事件
```

⚠️ **门禁**：必须先解析出已存在的知识点（`:579-600`），未知返回 `unknown_item` **不写**；`hintUsed` 缺失按 **True** 处理（`:549-550`，理由：宁可少算一次成功）。

### Wiring E · Learner State + Goal + Evidence → Coordinator

**状态**：⚠️ PARTIAL —— **存在，但只在一个触发点上**

- Coordinator **真的存在**（`coordinator_service.py`，规则在 `rules.py`）
- ⚠️ **`rules.py` 从不读 goal**（grep `goal` = **0 命中**）—— `Snapshot.goal` 被填进快照而规则层无视
- **调用方只有 2 个**：`api/v1/knowledge.py:148` 与 `conversation_tool_service.py:646`，**都由证据写入触发**
- `coordinator_service.py:22-26` 自陈「不在循环上调用，没有订阅、没有队列、没有轮询」
- **executor**：`NOTIFY` 有真实副作用；`INTRODUCE`/`REVIEW`/`CONTINUE` 一律 `return "handed_to_global_agent"`（`:421`）而**没有任何 agent 被调用**

### Wiring F · Coordinator → Method → Focus

**状态**：🔴 **承诺层整类悬空**

- `method_episodes` 表完整（约束齐全、本地库有 2 行数据）而 **`open_episode`/`close_episode` 生产零调用**（只在测试里）
- `ai/methods/completion.py` 整个模块生产零调用 —— `completion_met`、`rule_owes_completion`、`restore_rule` 的调用方全在测试
- `turn_start` **零生产者**（常量在 `types.py:56`，`coordinator_service.py:314` 消费它，但没人构造它）
- `prepare_turn` **不读 `method_episodes`** ⇒ 用户回来不知道上次说好做什么

⚠️ 而 `method_status` **是活的**（`FocusView.tsx:142` 真的在调，`api/v1/methods.py:42-92`），但它返回的是**用空 user_message 跑一次 method 得来的静态文案**（`method_service.py:104-121`），且 `focus` 恒为 `None`（`:113-116` 自认）。**一个从未聊过的空间读到的仍是满屏动词。**

### Wiring G · Focus → Action → Evidence → State → Next Decision

**状态**：🔴 **跑不出完整 loop，第一个断点在第 3 步**

第一个断点：**Focus 里没有能产生 Evidence 的交互**（Wiring C）。
后续连锁断点（即使那个解决了）：
1. 新空间无知识结构 ⇒ `resolve_item` 失败 ⇒ 写不进去
2. `turn_start` 零生产者 ⇒ 每轮不咨询决策层
3. episode 永不存在 ⇒ 即使补上生产者，`focus` 恒 None ⇒ `NONE` → 不介入
4. executor 三种 action 空转 ⇒ 即使算出了决策，也没有执行者

**⇒ 四层断，任何一层单独修好都不会让 loop 转起来。**

### Wiring H · Exit → Return → Context Recovery

**状态**：⚠️ PARTIAL —— **文本恢复，语义与时间不恢复**

| | 恢复吗 | 证据 |
|---|---|---|
| 对话文本 | ✅ | 最近 40 条（`conversation_service.py:26`）|
| **消息时间戳** | ❌ | `chat_service.py:154` 只取 role + content ⇒ **模型不知道隔了多久** |
| 上次的承诺 | ❌ | 不读 `method_episodes` |
| Focus 位置 | ❌ | `FocusView.tsx:113-120` 全在前端内存，无 localStorage |
| **Focus 会话 id** | ❌ | `:115` 初始 `null`，**从不从服务端恢复** ⇒ 回到那个页面会话已找不到 |
| 三周前的提醒 | ⚠️ | 会一次性全部涌进来（`scheduler_service.py:166-168` 容忍过去时间）|

### Wiring I · Trajectory 需要的数据存在吗

| 需要 | 有吗 | 能不能撑起 Trajectory |
|---|---|---|
| Event | ⚠️ 只有 `ai_conversations` 与 signal | ⚠️ 弱 |
| **Evidence** | ✅ 有表有链路 | ✅ 但**只有 Agent 自愿写的那几条** |
| Artifact | ✅ `page_blocks` | ✅ 但**无版本历史**（整页删掉重插）|
| **State Change** | ❌ | 🔴 **读时算、从不存储 ⇒ 没有「变化」这个事实可读** |
| Goal Change | ⚠️ | 只留一条前后对比文本，无原因、无字段 |
| Method | ❌ | 承诺层零写入方 |
| **Milestone** | ❌ | 无任何地方判断「这件事跨了一个阶段」 |

⇒ **六项里三项缺、一项弱。而最关键的 `State Change` 缺失的根因就是 D/E 那条链今天只有一个触发点。**

⚠️ 而本轮**没有实现 Trajectory backend**（按要求）。上面只判断数据够不够。

---

## 4 · 两条「假连接」

### 假连接 A · `learner_state` 存在 ⇒ 学习状态管线存在

**它每轮都在算、都进 prompt** —— 这部分是真的。
**但冷启动时它返回「还没有任何证据，也没有可判断的项」**（`state.py:588-590`）。

⇒ 对一个刚建完的空间，Agent 拿到的 learner state 等于「这里什么都没有」。

### 假连接 B · `method_episodes` 有表、有约束、有数据 ⇒ 承诺机制存在

本地库 `method_episodes` **有 2 行**，而 `open_episode` 生产零调用。

⇒ 那 2 行是 seed 或测试留下的。**表里有数据不等于有人在写。**

**判据（我用的）**：一个组件要算"存在"，必须同时满足 ①有写方 ②写方被真实路径调到 ③读的方是生产路径而不是测试。今天 `method_episodes` 只满足 ①。

---

## 5 · Broken Links

| # | Source | Target | 当前行为 | 为什么断 | 证据 | 最小修复 | 影响 |
|---|---|---|---|---|---|---|---|
| **BL-1** | Goal（active） | Knowledge Structure | 新空间无任何知识点 | `import_structure` 只有 seed 脚本调用；`add_edge` 无调用者；**API 无写结构路由** | `knowledge_service.py:464,536` · `api/v1/knowledge.py` 只有 3 个路由 | 暴露一个写结构的入口（或让 Agent 从 Goal 抽取初始结构）| 🔴 **Ignition 会直接踩到** |
| **BL-2** | Focus 交互 | Evidence | 零个出口 | Focus 是文档阅读器，没有判定面 | `FocusView.tsx:62-71` 自述 · `pages.py` 内 evidence 零命中 | Focus 里加一个判定面（或 Ignition 第一步就是一道题）| 🔴 同上 |
| **BL-3** | Knowledge Structure | Evidence | `resolve_item` 必失败 | 结构为空 | `conversation_tool_service.py:579-600` | 同 BL-1 | 🔴 |
| **BL-4** | 一轮开始 | Coordinator | 从不咨询 | `turn_start` 零生产者 | `types.py:56` 定义 · 生产零构造 | 在 `prepare_turn` 里发一次 | 🔴 R4g |
| **BL-5** | Coordinator | executor | 三种 action 空转 | `return "handed_to_global_agent"` 而无 agent 被调用 | `coordinator_service.py:421` | 把动作接给 Agent 或去掉那句返回 | 🔴 |
| **BL-6** | 决策 | Method 承诺 | 无承诺可读 | `open_episode` 生产零调用 | `method_episode_service.py:118,166` | 在 START 决策后调一次 | 🔴 R4b 建的表空着 |
| **BL-7** | Goal 变更 | Coordinator | 决策层不知道 | `rules.py` grep `goal` = **0** | 快照填了（`coordinator_service.py:344`）规则层不读 | 在规则里读 goal_relation | 🟡 |
| **BL-8** | 证据（Focus/对话） | Learner State | 只有模型自愿写的那几条 | 无 `tool_choice`；Focus 里几乎不答题 | `ai/client.py` 无 tool_choice | 给一个判定交互（=BL-2）| 🟡 |
| **BL-9** | 用户返回 | 上次的承诺 | 不恢复 | `prepare_turn` 不读 episodes | `chat_service.py:94-172` | 同 BL-6 | 🟡 |
| **BL-10** | 用户返回 | 时间感 | 模型不知道隔多久 | 历史消息不带时间戳 | `chat_service.py:154` | ChatMessage 加时间戳 | 🟡 |
| **BL-11** | 通知 | 回到现场 | 点不动 | 组件零 onClick | `NotificationCard.tsx:22-23` 自述 | 加一个跳转 | 🟡 投入最小 |
| **BL-12** | 调度器 | 任何提醒 | 时钟跑但无人提问 | `schedule()` 生产零调用 | `scheduler_service.py` | Coordinator 在需要时调 `schedule()` | 🟡 |
| **BL-13** | 空间内容 | 空间状态 | 无状态字段 | `projects` 只有 id/name/时间 | `models/project.py:24-41` | 加状态列 | ⚪ |
| **BL-14** | 删除空间 | 会话清理 | 会话 SET NULL 留存成孤儿 | 刻意拍板但无清理 | `ai_conversation.py:49` | 标记或清理 | ⚪ |

---

## 6 · Scenario 推演（到第一个断点为止）

### Scenario A · TOEFL

| 步 | 用户行为 | UI | Frontend | API | Backend | AI context | 下一步 |
|---|---|---|---|---|---|---|---|
| 1 | 建 Space「TOEFL」 | `CreateProjectDialog` | — | `POST /projects` | 写 name 一行 | — | ✅ 侧栏出现 |
| 2 | 期望：问 Intent | **无** | — | — | — | — | 🔴 **断点 1**：创建后零动作 |
| 3 | （手动）打开网格 → Goal 面板 → 写「两个月后 117」 | `GoalBlock` | `LocalGoalDraft` | `POST /goals/extract` → `POST /goals/{id}/confirm` | 写 active goal | **不进 prompt** | ✅ Goal active |
| 4 | 期望：给 First Move | **无** | — | — | — | — | 🔴 **断点 2**：没有这一层 |
| 5 | 进 Focus | `FocusView` | 拉 blocks | `GET /pages/{id}/blocks` | 读 | — | ⚠️ 空文档 |
| 6 | 期望：第一次学习行为产生 Evidence | 编辑文档 / 右栏聊天 | — | `PUT /pages/{id}/blocks` 或 `POST /chat` | 写 blocks；对话则模型自主决定 | — | 🔴 **断点 3**：Focus 无判定交互 |
| 7 | 离开再回来 | — | 位置/会话 id 丢失 | — | — | 不带时间戳 | 🔴 断点 4：只恢复文本 |

### Scenario B · 哲学论文

步 1–5 同上。第 6 步更极端：论文写作需要**产物修订**，而 `save_page_blocks` **整页删掉重插** ⇒ 无版本历史 ⇒ Trajectory 想要的「Artifact 的变化」**没有数据支撑**。

---

## 7 · 优先级收敛

### P0 · 形成最基本 Learn Space loop 必须接通的

| # | 断线 | 为什么是 P0 |
|---|---|---|
| **BL-1** | Goal → Knowledge Structure | **没有它，Evidence 永远写不进去**（`resolve_item` 必失败）⇒ 整条学习链从第一格就断 |
| **BL-2** | Focus 交互 → Evidence | **没有它，用户在 Focus 里没有任何能产生学习记录的动作** |
| **BL-3** | Knowledge Structure → Evidence | 与 BL-1 同源，是它的后果 |
| **BL-4** | 一轮开始 → Coordinator | 决策层唯一缺的就是「每轮问一次」 |

⚠️ **注意 P0 的真实形状**：**它不在 onboarding 层，全在学习层。**
Ignition 可以把用户顺利送到 Focus（那全是前端流程），而 Focus 后面是空的。

### P1 · 接通 P0 之后，Continuity / Trajectory / Proactive 才开始成立

`BL-5`（executor 空转）· `BL-6`（承诺层）· `BL-7`（Goal 不影响决策）· `BL-9`/`BL-10`（返回与时间）· `BL-11`（通知可点）· `BL-12`（调度有生产者）

### P2 · 暂时可以保持断开

`BL-13`（空间状态）· `BL-14`（删除后的会话）· Scheduler 的间隔复习 · Trajectory 的 Milestone 判定

---

## 8 · 我核到什么 / 没核到什么

**核了（代码 + 数据）**
- 六条最重断线**逐条 grep 或读调用链**：BL-1（`api/v1/knowledge.py` 只有 3 个路由）· BL-2（Focus 交互逐个列表）· BL-3（`resolve_item` 门禁）· BL-4（`turn_start` 零构造）· BL-5（executor 三个 return）· BL-6（`open_episode` 只在测试）
- **本地库真实行数**：`knowledge_items` 11 / `knowledge_edges` 8 / `knowledge_evidence` 4 / `method_episodes` **2** / `space_goals` 6 / `ai_conversations` 164
- Goal 不进 prompt 是**刻意设计**，附了原话出处

**没核（本报告的诚实边界）**
- 🔴 **没有 runtime 观察** —— 登录走云端 Supabase，本机无账号 ⇒ 标 `UNKNOWN(RUNTIME)` 的项是代码事实、运行时未验
- 🔴 **没有用户数据** —— 本地库那 22 个 profile / 17 个空间是 seed 与测试留下的，不代表真实使用
- ⚠️ **前端"看起来有"的部分只做了静态阅读** —— 没点过（登录阻塞）
- ⚠️ `documents` 表查询报错（列名猜错），所以产物侧的行数我没给

**与我 10-06 那份行为层研究的对照**
`docs/learn-space-user-behavior-map.html` 从**用户行为**出发得到 18 条断线；本份从**组件接线**出发。
两份的结论**一致**（Learner State 入口缺失 / 承诺层悬空 / 主动行为只有被动触发），
但本份**多了一条那份没看到的**：`knowledge_items` 只能由 seed 脚本写（`BL-1`）。
⇒ **两份的交集可信；差异处是新增认知，不是矛盾。**
