# Space Ignition · 实施计划

> **基线** `user-profile @ 95f00452` · **日期** 2026-10-08 · **计划（未动代码）**
> 上游：`learn-space-wiring-report.md`（同一轮的接线审计）· 行为层对照
> `docs/learn-space-user-behavior-map.html`
>
> **下一步（≤5 行）**
> ① ⚠️ **本计划的 P0 结论是：Ignition 本身不需要多少新代码，真正的阻塞在 P0-3
>    （知识结构没有任何写入路径）。**
> ② 换句话说：**先做 Ignition 的三步前端流程，它能跑；但用户会在 Focus 后面撞到空墙。**
> ③ 建议顺序：**P0-3 先做**（它是唯一会让 Ignition 变成"有意义"的那一件），
>    Ignition 的 UI 可以并行做，因为它不依赖 P0-3。
> ④ **不做 Initial Context**（按要求），也不做 Goal 表单 —— 现有 Goal 能力已经够用。
> ⑤ 每一步都写清了**改哪些现有文件**，以及**哪些现有能力直接复用**。

---

## 0 · 一句话结论（先说，因为它决定整个计划的形状）

> **Space Ignition 的三个步骤（Name → Intent → First Move → Focus）全部是前端流程，
> 而现有代码已经能承载它们。真正的问题是它们把用户送到 Focus，而 Focus 后面没有闭环。**
>
> 所以本计划分两部分：**Ignition 怎么做**（§2–§4，改动很小）
> 与 **Ignition 的前提是什么**（§5，一条 P0 断线，不修则 Ignition 只是把人送进空房间）。

---

## 1 · 回答审计的七个问题

### Q1 · 现在用户创建 Space 后真实发生了什么？

**一件事**：`POST /api/v1/projects` 写一行 `name`（`project_service.py:18-25`）⇒ 侧栏出现 ⇒ 用户被丢进一个空白 Space。

**没有任何后续动作** —— 没有 goal、没有 context、没有知识结构、没有导航提示。
`LearnSpaceWorkspace` 的首屏是一个空网格加一个「新建或上传」。

⚠️ 而**创建对话框里还有一个纯装饰的死按钮**（图标选择器，`CreateProjectDialog.tsx:140-149`，无 `onClick`）——
它会让用户以为创建后能设置外观。

### Q2 · Intent 最适合在哪个位置进入现有系统？

**三个候选，我逐一评估：**

| 候选 | 结论 |
|---|---|
| **A. 写进 prompt 当上下文** | ❌ **明确不做，且这是刻意设计**。`method_service.py:152-156` 的原话：「a goal printed into every prompt becomes a topic the model keeps bringing up」。目标只给决策层与方法层 |
| **B. `space_goals` 的 draft → confirm** | ✅ **唯一现成的落点**。一次点击 create+confirm 已经在 `GoalBlock.tsx:366-385` 实现了 |
| **C. 对话里说出来（`origin=user_stated`）** | ❌ 枚举存在（`models/space_goal.py:58`）而**前端零使用**，代码自认「它今天还没接」 |

**⇒ 选 B。** 但要动两处：

1. **位置**：现在 `GoalBlock` 挂在**网格工作台**（`LearnSpaceWorkspace.tsx:264`），而 Ignition 发生在**创建之后立刻** ⇒ 需要一个能在 Space 首屏触发的轻量入口
2. **形态**：现有 `GoalComposer` 是「一个 textarea + 一个『读一遍，让我确认』按钮」+ 回述卡。
   **它的形状已经就是 Intent 采集器** ⇒ 不需要新组件，只需要让它能在别处出现

⚠️ **一条要遵守的纪律**：Intent **不建复杂 Goal workflow**。
现有链路已经是「抽取 → 回述 → 一次点击确认」，这条链**很轻**，不要在上面加字段。

### Q3 · First Move 应该由什么东西决定？

**不应该由固定列表决定**（按要求）。而它必须**由 Intent 决定**。

⇒ Intent 一旦落成 `space_goals` 的结构化字段（`target_text` / `purpose` / `context`），
**First Move 的输入就已经存在了**。

**我建议的映射**（不是产品功能列表，是「Intent 落在哪个字段上」）：

| Intent 里的成分 | 落点 | 影响 First Move 的什么 |
|---|---|---|
| `target_text`（原话） | `space_goals.target_text` | 讲什么 |
| `purpose` | `space_goals.purpose`（枚举，如 `exam_performance`）| **这是最关键的一个** —— 它决定「先诊断 vs 先练习 vs 先看要求」 |
| `context`（如 TOEFL / 论文） | `space_goals.context` | 领域词汇 |
| 「我还不知道，先聊聊」 | **不落 goal** | ⇒ 走「聊聊」分支 |

⚠️ **`purpose` 是唯一真正决定 First Move 的字段**，而它现在由 AI 抽取时硬填 `other`（降级路径 `GoalBlock.tsx:228-238`）。
⇒ **First Move 的质量取决于抽取质量**，而抽取失败时用户直接看到 First Move 变泛。
**这是本计划里唯一一处"AI 不确定性直接影响 UI"的地方，必须显式处理**（见 §3.3）。

### Q4 · 当前代码里是否已有足够能力做 First Move？

| 需要 | 已有？ | 位置 |
|---|---|---|
| 从 Intent 得到结构化判断 | ✅ | `goal_extract_service.py:42-82`（`purpose` 已经在抽）|
| 一个三选一的界面 | ✅ **现成的** | `GoalBlock.tsx:215-227` 的选项 chip 就是这个形状 |
| 跳转进 Focus | ✅ | `/learn-spaces/:id/docs/:pageId` 与 `/learn-spaces/:id/focus` 都存在 |

**⇒ First Move 不需要新组件**，只需要一个把 Intent 的抽取结果映射成三个选项的函数 + 一个跳转。

### Q5 · 进入 Focus 后，当前系统是否真的能产生一次完整的学习行为？

# 🔴 不能。

这是本轮最重要的发现，**它决定整个计划的形状**：

> **Focus 里零个交互通向 `admit_outcome`。**

| Focus 交互 | 产生 Evidence？ |
|---|---|
| 编辑正文 / 自动保存 / 冲突覆盖 | ❌ `pages.py` 内 evidence 零命中 |
| 「开始写」加空段落 | ❌ |
| ← → 漫游资料 / 大纲跳转 / 打开文件 | ❌ 纯前端 |
| 顶栏状态栏 / goalLine | ❌ 只读 |
| **右栏对话发消息** | ⚠️ 间接，**且模型自主决定**要不要调 `record_evidence` |

**Focus 里没有提问机制**：`ConversationPanel` 是自由文本输入 + 三颗快捷胶囊，点了把整句话发出去，
**没有任何接收答案的组件**。Focus 自己的注释确认了这点（`FocusView.tsx:62-71`：「没实装（也不假装）」）。

⇒ **Focus 实际是「一个可写的文档阅读器 + 一个通用聊天侧栏」。**

**而且更靠前的一格也是断的**：新空间**没有任何知识结构**
（`import_structure` 只有两个 seed 脚本调用，`api/v1/knowledge.py` 只有 3 个路由、没有写结构的）
⇒ `record_evidence` 的 `resolve_item` 必然返回 `unknown_item` ⇒ **即便模型想记也记不进去。**

### Q6 · 哪里需要新代码？

**Ignition 流程本身：3 处**
1. Space 首屏的一个 Intent 采集入口（复用 `GoalComposer`，不新造组件）
2. 一个 Intent → First Move 的映射函数（纯函数，可测）
3. First Move → Focus 的跳转（已有路由，只需传参）

**而它真正依赖的那一条：1 处**
4. **知识结构的写入路径**（P0-3）—— 没有它，Ignition 走完四步之后仍然是空的

### Q7 · 哪些事情只是"看起来有"，但实际上没有接通？

| 看起来有 | 实际 |
|---|---|
| `method_status` 每轮返回「现在在怎么教」 | **活的**（`FocusView.tsx:142` 真在调）但返回**静态文案**，`focus` 恒 `None`；一个从未聊过的空间读到的是满屏动词 |
| `method_episodes` 表有约束、本地库有 2 行数据 | **零生产写入方** ⇒ 那 2 行是 seed/测试留下的 |
| `ai/methods/completion.py` 有完整判定与 17 条测试 | **整个模块生产零调用** |
| `learner_state` 每轮都在算、都进 prompt | **真的** —— 但冷启动时返回「还没有任何证据，也没有可判断的项」 |
| `POST /knowledge/evidence` 是第二条真实写入口 | 真的，但**前端唯一调用方挂在 `/schedule` 的 dev 面板** |
| 创建对话框的图标选择器 | **纯装饰按钮，无 onClick** |

---

## 2 · Ignition 的形态（Step 1–3）

```
Create Space（只输名字）
   ↓
Space 首屏立刻出现一张卡：
   「你在这个空间里想做什么？」
   一个输入框 + 「先聊聊」这个出口
   ↓
Intent 落成 space_goals（draft → 一次点击确认 → active）
   ↓
**不建复杂 Goal workflow** —— 到 active 为止，就三步
   ↓
First Move：三选一（由 purpose + context 决定）
   ↓
直接进 Focus（**不经过 Dashboard / Setup / Tutorial**）
   ↓
Learner Action → Evidence   ← 🔴 这一步今天不存在
```

**关键决定**：
- **不做 Initial Context**（按要求）⇒ 第一版**不上传任何材料**
- **不强制 Goal form** ⇒ 用现有的抽取 + 回述 + 一次点击，**不新增字段**
- **进 Focus 就是终点** ⇒ 不加中间页

---

## 3 · 三步分别怎么落地

### 3.1 Step 1 · Name → Intent

**改哪里**
```
frontend/src/features/learn-space/goal/GoalComposer.tsx  ← 复用，不改
frontend/src/features/learn-space/goal/GoalRestatement.tsx ← 复用，不改
frontend/src/features/learn-space/workspace/LearnSpaceWorkspace.tsx:264  ← 挂载点
```

**做什么**
1. Space 首屏（空网格状态）加一个引导卡：一句问话 + `GoalComposer` + 一个「先聊聊」出口
2. 复用现有的 `GoalComposer`（`GoalBlock.tsx:187-268`）—— 它已经就是「textarea + 读一遍 + 回述 + 确认」这个形状
3. 「先聊聊」⇒ **不建 goal**，直接给一个输入框进对话（现有的空间会话）

**为什么不用现成的 `GoalBlock` 整块**
`GoalBlock` 会显示「已暂停 / 已完成 / 已被别人推进」四种态（`GoalBlock.tsx:155-174` 的优先级），
在新空间上那些态永远不会出现 ⇒ **首屏只需要空态那一块**。

**⚠️ 一个已存在的数据问题会在这里显形**
`GoalBlock.tsx:155-174` 的渲染优先级是 `draft ? 回述卡 : goal ? GoalCard : Composer`，
而前端**没有任何查询能看到 draft 行**（`goalApi.ts:31` 只读 `/goals/active`）
⇒ **一个未确认的 draft 会把已有的 active goal 在界面上完全遮住**，而用户看不到那条 draft。

⇒ **Ignition 必须在 create+confirm 之后才刷新**，不要留在 draft 态。
或者：把 `create` 与 `confirm` 合成**一次调用**（现在的前端已经是两次点击，但可以后端合成）。
**后者更干净，但那是后端改动，属于 P1 而不是 Ignition 本身。**

### 3.2 Step 2 · Intent → First Move

**改哪里**：**一个新纯函数 + 一个新组件**
```
frontend/src/features/learn-space/ignition/firstMove.ts   ← 纯函数，映射
frontend/src/features/learn-space/ignition/FirstMove.tsx  ← 三选一
```

**做什么**：一个纯函数 `(goal) => FirstMoveOption[]`，最多三个选项。
选项的形状照抄 `GoalBlock.tsx:215-227` 的选项 chip（**复用那个视觉**）。

**⚠️ 我不做的事**：不做 AI 生成选项。
第一版用**确定性映射**（`purpose` × `context` → 候选），理由是
**它可测、可预期、且失败时不会给用户三句废话**。AI 生成留到有反馈之后。

**⚠️ 这一步有一个真实的不确定性来源，必须显式处理**
`purpose` 由 AI 抽取，**失败时硬填 `other`**（`GoalBlock.tsx:228-238` 的降级路径）。

⇒ **映射函数必须为 `purpose='other'` 准备一个通用分支**，而不是假设它总是准的。
⇒ 并且：**当 `purpose` 抽得不可靠时，First Move 应该更泛，而不是更具体** ——
一个错误的 `exam_performance` 会给出"做一次水平诊断"这种看似贴心但答非所问的选项。

### 3.3 Step 3 · First Move → Focus

**改哪里**：**已有路由，只需传参**
```
/learn-spaces/:id/focus                      ← 聚焦模式（无资料时的空态）
/learn-spaces/:id/docs/:pageId               ← 聚焦模式（有资料）
```

**做什么**：三选一之后**直接跳转**，不加中间页。

**⚠️ 第一版会跳到哪一个**
因为**不做 Initial Context**，新空间没有资料 ⇒ 只能进 `/learn-spaces/:id/focus`。
而那个空态（`FocusView.tsx:581-587`）现在只有「去网格挑一份」和一个资料列表
⇒ **它不是"学习"，是"请先选材料"。**

**⇒ 这是 Ignition 第一版最难看的一处，而它不是 Ignition 的错，是 Focus 空态的错。**
见 §5 的 P0-3：**如果 First Move 的第一步本身就是"做一次水平诊断"，
那诊断本身就得是一个学习行为，而不是先要材料。**

---

## 4 · Ignition 的最小实施依赖（§17 的回答）

### 4.1 Ignition 最小链路依赖哪些现有连接

```
Create Space      ✅ CONNECTED（只写 name，够用）
Intent → Goal     ✅ CONNECTED（现有能力，移个位置）
Goal → First Move ✅ CONNECTED（新写一个纯函数）
First Move → Focus ✅ CONNECTED（已有路由）
Focus → 学习行为  🔴 **DISCONNECTED** ← 唯一的阻塞
```

### 4.2 结论

> **Space Ignition 的三步本身不需要新的后端能力。**
> `Create Space` / `Goal 创建` / `Focus 路由` **全部已经存在**。

### 4.3 但是

> ⚠️ **如果 Focus 当前不能产生 Evidence，那么 Space Ignition 的真正阻塞点不是 onboarding，而是 Learning Loop。**

**这就是我们最想知道的那句话，而答案是：是的。**

**具体地**：`learn-space-wiring-report.md` 的 **BL-2**（Focus 交互 → Evidence）
是 Ignition 唯一的真实阻塞。而它**不在 Ignition 这一层** ——
Ignition 修到 100% 也只是把一个空白房间的门打开，房间里还是没有东西。

---

## 5 · Ignition 成立的前提：三条断线（P0）

### P0-3 · 知识结构没有任何写入路径 🔴 **最高优先级**

**这是本轮最重要的发现，也是唯一一条会直接决定 Ignition 有没有意义的断线。**

```
Goal（active）
   ↓  🔴 断了
Knowledge Structure（items / edges）
   ↓  🔴 断了（resolve_item 必然 unknown_item）
Evidence
```

**证据**
- `knowledge_service.py:464` `import_structure` —— 调用者只有 `scripts/seed_demo_knowledge.py:138` 与 `scripts/seed_knowledge_structure.py:67`
- `knowledge_service.py:536` `add_edge` —— **无任何调用者**
- `api/v1/knowledge.py` —— 只有 `GET /structure` · `GET /brief` · `POST /evidence`，**没有写结构的路由**
- 模型层预留了 `user_added` / `user_confirmed` 两个来源枚举（`models/knowledge.py:48,50`），**产品层没暴露**

**⇒ 一个刚建完的空间，连"能记什么"都不存在。**

**最小修复（我不实现，只指出形状）**：给知识结构一个写入面。
两个来源都可以 —— **从 Goal 抽取初始结构**（更贴合 Ignition：用户说"我想学线性代数"，
那"特征值/特征向量/行列式"这些点从哪来？），或者**让 Agent 在第一次对话时建**（更省事，但更不可控）。

**⚠️ 我倾向后者** —— 因为 Ignition 明确不做 Initial Context，
而"Intent → 知识结构"这一步在产品上等价于"让 AI 读一遍用户想学什么"，
**那是 Agent 已经擅长的事**，而"从 Goal 抽取结构"要新写一套抽取逻辑。

### P0-2 · Focus 里没有任何能产生 Evidence 的交互 🔴

**证据**：§1 Q5 的表 —— Focus 的五类交互逐个核过，零个通向 `admit_outcome`。

**最小修复的形状**：Focus 需要**一个判定面**（答一道题 / 一个"你说完了我来看"的提交口）。
⚠️ 注意 `record_evidence` 的门禁：它要求 `resolve_item` 能解析出知识点 ⇒ **P0-2 依赖 P0-3**。

**⇒ 这两条的顺序是固定的：先有"能记什么"，再有"在哪记"。**

### P0-4 · 一轮开始时不咨询决策层 🔴

**证据**：`turn_start` 常量定义在 `ai/coordinator/types.py:56`、`coordinator_service.py:314` 消费它，
**生产零构造**。

⇒ **这是 R4g 未做的部分**，与 Ignition 无关，但它是"下一次教学决策"存在的前提。

---

## 6 · 实施顺序（建议）

| 步 | 做什么 | 依赖 | 产出 |
|---|---|---|---|
| **1** | **P0-3 知识结构的写入面** | 无 | Ignition 之后有东西可学 |
| **2** | Step 1 · Name → Intent（复用 `GoalComposer`，移位置） | 无 | Ignition 第一步 |
| **3** | Step 2 · Intent → First Move（纯函数 + 三选一） | 2 | Ignition 第二步 |
| **4** | Step 3 · First Move → Focus（跳转） | 3 | Ignition 第三步 |
| **5** | **P0-2 Focus 的判定面** | 1 | 第一次学习行为能产生 Evidence |
| **6** | P0-4 `turn_start` 接线（R4g） | 5 | 决策层开始被咨询 |

⚠️ **第 1 步和第 2–4 步可以并行** —— Ignition 的三步不依赖 P0-3。
**但如果只做 2–4 而不做 1，Ignition 就是一个把人送进空房间的流程。**

---

## 7 · 明确不做

| 不做 | 为什么 |
|---|---|
| Initial Context / 材料上传 | 按要求。第一版不上传任何材料 |
| 强制 Goal 表单 | Intent 优先于结构化 Goal；现有抽取 + 回述 + 一次点击已经够轻 |
| AI 生成 First Move 选项 | 第一版用确定性映射：**可测、可预期、失败时不说废话** |
| 新的 Goal workflow | 现有链路是好的，只需要换个位置 |
| 改 Focus 的空态 | ⚠️ 它确实是"请先选材料"，但那是 Focus 的问题不是 Ignition 的 —— 记进 P1，不夹带 |
| 多步引导 / 教程 | 按要求 |
| 让 Goal 进 prompt | **刻意设计**（`method_service.py:152-156`），不推翻 |
| 建 Trajectory backend | 按要求 |

---

## 8 · 我没核什么

- 🔴 **没有 runtime 观察** —— 登录走云端 Supabase，本机无账号 ⇒ Step 2 的跳转、Step 3 的 Focus 空态**我都没点过**
- 🔴 **`purpose` 抽取的实际质量不知道** —— 降级路径硬填 `other`，而真实分布里有多少会降级，我没有数据
- ⚠️ **First Move 的三选一没有真实用户验证** —— 那三个选项是我从 `purpose` 映射出来的，不是问出来的
- ⚠️ 「Goal 抽取 → 回述 → 确认」这条链的**实际成功率与耗时未知**
