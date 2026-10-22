# Focus Mode 三项改进 · 执行计划

> 2026-10-19 · 分支 `practice-system`
> 本文只做**调查 + 计划**。写这份文档时没有改任何产品代码。
> 每条判断后面跟着可核的路径 / 符号 / 行号；行号以写这份文档时的 HEAD 为准。

---

## §0 · 体验约束（**先读这一节；后面每个阶段都受它约束**）

上一版技术上可行，但**没有一条能用来否决方案** ⇒ 执行时每一步都会顺着"这也挺合理"加进去，最后界面越来越重。
下面六条是硬约束，**每条都写清它否决了什么**。

| # | 约束 | 它否决了什么 |
|---|---|---|
| **U1** | **一次目的，一次动作。** 为了"把这段话拿去问"，最多 **1 次点击** | 否决"选中 → 找按钮 → 拖过去"三动作链；拖动只能是第二入口 |
| **U2** | **不动视线。** 动作浮在**光标 100px 内** | 否决"去顶栏点 Mala"（顶栏在屏幕最上方，人在正文中间） |
| **U3** | **不假装。** 标题和正文是两套东西，就长得像两套 | 否决"第一行即标题"（两处真相会撕裂） |
| **U4** | **系统内部不外露。** `reasoning` / `tool` / `agent_context` 默认收成一行小字，**不给颜色、不给图标、不进视觉层级** | 否决"五类信息各有色块"；用户眼里只有三类：我问的 / 它答的 / 它拿的材料 |
| **U5** | **安静。** 自动出现的东西默认可忽略：保存提示、悬停浮层、进入动画。**不打断打字，不遮挡正在读的那一行** | 否决"选中就弹大浮层" |
| **U6** | **撤回一步就够。** 引用能删、回应能撤、笔记改动能重来 | 否决任何"已经发生但改不了"的状态 |

### 三个可测的预算

| 预算 | 数 | 怎么验 |
|---|---|---|
| **动作预算** | 一个目的 ≤ **1 次点击** | 数点击次数（CDP 数 `click`） |
| **视线预算** | 动作出现在**光标 100px 内** | 截图量距离 |
| **宽度预算** | 改完之后**正文可用宽度不减少** | 量 px（现在 38rem） |

⚠️ **宽度预算是"失控"最典型的形态**：加边注轨、加折叠面板、加把手，每个都在吃正文宽度。
**功能越来越多、能读的地方越来越小** —— 这条预算就是拦它的。

---

## I · 现状调查

### I.1 页面骨架（已在，不用重建）

`frontend/src/features/learn-space/focus/FocusView.tsx`（1151 行）：

```
顶栏 FocusTopBar（空间名+聚焦 · MethodStatusPill · Mala · 左栏开关 · 对话开关）
├─ FocusRail        材料列表（默认收起，2026-10-18 改）
├─ 正文区            MaterialView（imported）/ BlockEditor（note），38rem
├─ AnnotationRail   边注轨 12.5rem（≥56rem 才显示）
└─ ConversationPanel 对话窗格，三档 normal/full/hidden（FocusView.tsx:507-511）
```

- 三档开关：`panelMode = 'normal' | 'full' | 'hidden'`（`FocusView.tsx:507-511`）。
- 正文和对话是**同屏并存**的，不是两个页面 —— 这一点决定了 B（拖放）有物理落点。

### I.2 Mala 到底是什么（这个名词必须从代码确认）

**Mala = 块级多选 + 一次投送。**

| 环节 | 实现 | 位置 |
|---|---|---|
| 选区 | **块级**，不是文本级：`selectedKeys: Set<blockKey>` | `FocusView.tsx:258` |
| 切换 | `onSelectionToggle(key)` → `toggleKey(prev, key)` | `BlockEditor.tsx:65`，`FocusView.tsx:266` |
| 投送 | `createBoardContext({ projectId, items })`，`items` 是 `{shapeId: block.key, type, text}` | `FocusView.tsx:356-384` |
| 落库 | `BoardContextBundle`，`items` 是 **JSONB 快照**（不是活引用） | `models/board_context.py:30-73` |
| 回到界面 | 变成 `MalaBundleChip[]`（`bundles`） | `FocusView.tsx:276` |
| 展示 | `MalaChips` 插槽，挂在**对话输入框上方** | `ConversationPanel.tsx:395` |
| 发送 | `streamChat` 的 `contextBundleIds` | `streamChat.ts:35/74`，单测 `streamChat.test.ts:26` |

⚠️ **这是本次最重要的发现**：从"选中 → 存包 → 带上 → Agent 收到"这条链**已经通了**，
而且包里带 `shape_id` / `type` / `text` / `mastery` / `connected_ids`（`schemas/board_context.py:23-34`），
**来源信息本来就在里面**。

⇒ B 不是"新建一套引用系统"，是**给已有的 bundle 加一个拖动入口**。

⚠️ 另有一条文本级选区，走的是**边注**（`BlockEditor.tsx:227` 的 `onAnnotationRequest`），
和 Mala 不是同一条。计划里不要混。

### I.3 聊天窗格的消息结构（已分层，缺视觉身份）

`ConversationTurn` = `attachments` + `content` + `meta` + `actions`（`ConversationTurn.tsx:27-30`）。

`ConversationTurnContent.renderBlock` **已经按 6 种类型分支**（`ConversationTurnContent.tsx:12-60`）：

| block.type | 渲染 | 现在的视觉 |
|---|---|---|
| `text` | 用户气泡 | `rounded-[18px] bg-zinc-100` |
| `markdown` | `AssistantMarkdown` | 裸文字 |
| `reasoning` | `ConversationReasoning` | 自己一套 |
| `agent_context` | `ConversationAgentContext` | 自己一套 |
| `tool`（desmos / free_course / quiz / 其它） | 各自的卡片 | 各自一套 |

`ConversationTurnMeta`（36 行）**只有纯文字**：`label` + `description` + `variants`，
没有任何底色、图标或边框。

⇒ C 不是"加类型"，是**给已经存在的类型各自一个视觉身份**。

### I.4 文件类型与笔记的真实路径

- `PageKind = "note" | "canvas" | "imported" | "folder"`（`schemas/doc.py:10`，DB 有 CHECK 约束 `models/doc.py:62`）。
  **`imported` 才是上传件**，`note` 是可编辑笔记。
- 打开笔记：`FocusView` 判 `originalName` 决定渲染 `MaterialView` 还是 `BlockEditor`（`FocusView.tsx:785` 附近）。
- 保存正文：前端 `useSavePageBlocksMutation` → `PUT /pages/{id}/blocks`（`api/v1/pages.py:413`）
  → `doc_service.save_page_blocks`，**整页删掉重插**（`doc_service.py:216`）。
- 改标题：`PUT /pages/{id}`（`api/v1/pages.py:354` → `doc_service.update_page`，**只动 title/kind/parent**）。
  前端已有 `useRenamePageMutation`（`docs/docApi.ts:91`），**只发 `{title}`**。
- 笔记标题现在是**只读**的：`FocusView.tsx:440` 从 `pages` 列表取 title，页面上没有输入入口。

⇒ A 的"标题可写"**不需要后端改动**，复用一个已经存在的 mutation。

### I.5 已经有的测试

- 前端 338 passed / 1 skipped（`vitest`），含 `AnnotationRail.test.tsx`（120 行）、`BlockEditor.test.tsx`（126 行）、
  `blockOps.test.ts`（大纲/块的纯函数）、`focusOrder`、`malaChips`、`streamChat.test.ts`。
- 后端 526 passed 量级（`pytest`），含 `test_board_context_api.py`、`test_page_materials_api.py`、`test_pages_gate.py`。

---

## II · 目标与非目标

### 目标（今天）

| | 交付 |
|---|---|
| **A** | 在聚焦页里**新建一条笔记** → 直接打字（标题就是第一行）→ 离开再回来，内容在 |
| **B** | 在正文里选中块 → **拖到对话面板** → 松手成为引用 → 打问题 → Agent 收到正确的引用 |
| **C** | 对话窗格里**五种信息各自可辨**：我说的 / 它说的 / 引用材料 / 它做了什么 / 出错 |

### 非目标（今天不做）

- ❌ 不做 Apple Notes 的文件夹、标签、搜索、分享、iCloud 式多端同步
- ❌ 不引入新的富文本/Markdown 编辑器依赖（现有 `BlockEditor` 五块够用）
- ❌ 不重做 Focus Mode 布局（顶栏/四栏/三档开关全部保留）
- ❌ 不改 `BoardContextBundle` 的数据结构（`items` 快照格式不动）
- ❌ 不追求"所有材料类型都能拖"（PDF/图片的拖放列为后续验证项）
- ❌ 不做 Coordinator、插件市场或任何与这三项无关的东西

---

## III · 依赖关系与实施顺序

### III.1 真实依赖（不是按 A→B→C 排）

```
A0（笔记能建能改能存） ──▶ 提供"一块可圈选的正文"
        │                        │
        │                        ▼
        │                   B（拖放）
        │                        │
        └──────▶ C（引用长什么样）◀──┘
                  ↑
        B 拖进去的东西 = C 里"引用材料"那一类
```

三条硬依赖：

1. **B 依赖 C**：拖进去之后"以什么形式呈现"就是 C 里"引用材料"这一类。
   若先做 B，C 又要改 B 刚做出来的样子 ⇒ 返工一遍。
2. **B 依赖 A0**：拖放要有东西可拖。`imported`（PDF）在 `MaterialView` 里是只读渲染，
   块级选择在 `BlockEditor` 才成立（`BlockEditor.tsx:65`）。⇒ **B 的第一条可靠路径必须建在笔记上**。
3. **C 不依赖任何人**，可以最早做。

### III.2 两个备选方案

**方案甲（按列举顺序）：A → B → C**

- 好处：顺着用户列的顺序。
- 坏处：B 做完之后要先决定"拖进去长什么样"（这就是 C），然后 C 又把 B 的呈现改一遍。
  ⇒ **B 和 C 之间必然返工一次**。

**方案乙（推荐）：A0 → C → B → A1**

- A0 = 只做"笔记可用"的最小闭环（新建 / 标题可写 / 保存 / 重开）。
- C 先定五种信息的视觉身份，**B 直接复用 C 的引用卡片**。
- A1 = 把编辑器调成"像 Apple Notes"（去 Plus、调行距、保存提示降噪），**不阻塞任何人**，放最后。

### III.3 推荐顺序与理由

```
A0（半天）→ C（一天）→ B（一天）→ A1（半天）
```

理由三条：

1. **A0 最先，因为它给出"可圈选的正文"**——这是 B 的前提，而它只花半天（后端零改动）。
2. **C 在 B 之前，因为 C 定义引用卡片的形状**，B 才有地方落。反过来做会返工。
3. **A1 最后，因为它是纯视觉且不阻塞任何验收**；万一时间不够，A1 可以挪到明天而不影响 A/B/C 的完成定义。

---

## IV · 分阶段实施计划

### 阶段 A0 · 笔记的最小闭环

> **✅ 已完成（`59edcedc`）**。实际比计划少一件事：**「新建笔记」入口早就有了**
> （`FocusView.tsx:841` 的 `onNewNote: () => handleNewPage('note')`，在顶栏「编辑」下拉里），
> 所以这一阶段只剩「标题可写」，新增 `focus/TitleField.tsx`（无边框、点即写、空则回退、Esc 取消、Enter 提交）。
> 另：左栏标题「空间资料」→「材料」。

**预期结果**：点「新建笔记」→ 打开 → 打字 → 关掉 → 再打开，内容还在。

| 要动的 | 改什么 | 解决什么 |
|---|---|---|
| `FocusView.tsx`（标题区） | 加一个可编辑标题，失焦/回车时调 `useRenamePageMutation` | 标题现在只读（`:440`），Apple Notes 的第一条就是"第一行即标题" |
| `FocusView.tsx`（新建入口） | 「新建笔记」直接 `POST /pages`（`kind: 'note'`）→ `navigate` 到它 | 现在只能从网格建 |
| 空笔记空态 | 光标直接在第一行，不显示任何占位卡片 | 低摩擦 |

**前置**：无（`PUT /pages/{id}` 与 `useRenamePageMutation` 都已存在）。
**风险**：标题的 `PUT` 和正文的 `PUT /blocks` 是两条路（`:354` vs `:413`）。
**必须分开调**，否则会边打字边整页重写。
**验收**：
1. 新建 → 输入标题「10 月 19 日」→ 刷新 → 标题还在。
2. 输入三段正文 → 刷新 → 三段都在，顺序不变。
3. `pages.title` 在 DB 里等于刚才输入的标题（`SELECT title FROM pages WHERE id=...`）。

### 阶段 C · 聊天窗格的信息层级

> ⚠️⚠️ **2026-10-19 修正：C 的前半不是样式问题，是数据问题。**
> `ConversationPanel.tsx:180-204` 组装 `turns` 时只传 `role / message / date / reasoningText / tool / agentContext`，
> **从不传 `attachments`** ⇒ `ConversationAttachments` 永远返回 null（而且 `ChatAttachment` 类型来自
> `@/mock/chatMessages`，是 mock）。也就是说：**Mala 的 bundle 只活在 chip 区，发送之后就消失了**，
> 用户发完消息看不出这条带了哪几段材料。
> ⇒ **C 拆成两步**：
> - **C1 · 让引用进消息**（先把数据打通，否则再好看的卡片也没东西可画）
> - **C2 · 视觉**（这时才轮到色块/边框/折叠）

**C1 要决定的一件事（需要你拍）**：引用**要不要在刷新后还在**？
- 只在内存 → 前端把发送时的 chips 挂到这条用户消息上，改完刷新就没了（诚实但短暂）
- 持久化 → 后端消息表要多存 `bundleIds`，历史回放才能带回来（多一次迁移）
**建议先做内存版**，并在 UI 上不承诺"永久保留"；持久化等这条链路真的被用起来再说。

**预期结果（C2 完成后）**：一屏对话里，三类信息各看各的（**不是五类**，见 U4）。

| 类型 | 现在的样子 | 改成 | 依据 |
|---|---|---|---|
| 我说的 | `bg-zinc-100` 气泡 | 保留 | `ConversationTurnContent.tsx:17` |
| 它说的 | 裸 markdown 文字 | **去掉气泡感**：白底 + 左侧一条细线 | 这一页是"一起看材料"，不是聊天 |
| 引用材料 | `rounded-2xl border-zinc-200` | 暖底 + 材料名 + 一句话摘录 + 「回到出处」 | `ConversationAttachments.tsx:40` |
| 它做了什么 | `meta.label/description` 纯文字 | 一行小字 + **可折叠** | `ConversationTurnMeta.tsx`（无任何语义样式） |
| 出错 | 混在正文 | amber 左边框（与 `ConflictPanel` 同一语义） | `focus/ConflictPanel.tsx:31` |

**步骤**：
1. 新建 `features/conversation/turnPalette.ts`：把五类的色/边框/字号写在一处（参照 `index.css` 里 `--insight-*` 的做法）。
2. 改 `ConversationTurnContent`：`text` 分支不动；`markdown` 分支改成"无气泡 + 左细线"。
3. 改 `ConversationTurnMeta`：包一层可折叠的 `<details>` 或自研折叠，默认收起，只显示一行摘要。
4. 改 `ConversationAttachments`：换色 + 加来源名。

**⚠️ 不要把"不同色块"理解成五种底色。** 先定层级：
- 一级（要读的）：我说的、它说的 → 靠**对齐 + 底色/线条**
- 二级（可查的）：引用材料 → 靠**卡片 + 来源名**
- 三级（系统噪音）：它做了什么 → 靠**小字 + 折叠**，默认不看
- 异常：出错 → 唯一用 amber 的

**验收**：
1. 截图里五类**各自可辨**（我会给截图，由你判定）。
2. 单条消息高度**不超过**改前（气泡变朴素应当更矮）。
3. 折叠起来的 meta **不丢信息**（展开后能看到 `label` + `description`）。

### 阶段 B · 从选中到问它（**一次点击**）

> 受 **U1**（一次点击）、**U2**（100px 内）、**U5**（不遮行）、**U6**（可撤）约束。
> ⚠️ **拖动不是主路径。** 上一版把拖放写成主线，被 U1 否决了：横跨 800px 去表达"我想问这段"，
> 是把实现难度当成了体验价值。

**预期结果**：在笔记里选中 2 段 → 光标旁浮出一个小条【问她】【记一条】→ 点「问她」→
引用进对话输入框上方（1 个 chip）→ **输入框已经聚焦，直接打字** → 发送 → Agent 用到那两段。

| 步 | 做什么 | 依据 |
|---|---|---|
| **B1** | 选区出现**就地小条**（不是把手），贴最后一个选中块下方 8px，两个动作 | 现在只有顶栏的 Mala 按钮（`handleMalaClick`，`FocusView.tsx:356`） |
| **B2** | 「问她」= 调**已有的** `handleMalaClick`，成功后把焦点送进对话输入框 | 复用，不另写投送逻辑 |
| **B3** | 小条绝对定位、不占正文宽度、半透明底 | U5 + 宽度预算 |
| **B4** | 对话面板滚到最新、输入框 `focus()` | 用户下一个动作是打字，不是找地方 |
| **B5** | 「记一条」= 打开已有的边注输入（`onAnnotationRequest`） | 同一个选区的第二个自然动作，零新增逻辑 |
| **B6** | 拖动降级为**可选增强**（chip → 面板），不做也不影响本阶段验收 | U1 |

**不做的事**（避免失控）：不做把手、不做"拖到别处"的提示、不做空态引导文案、
不做 HTML5 drag 的跨组件落点（那是 B6 才考虑的事）。

**验收**：
1. 选中 2 段 → 小条出现在**光标 100px 内**（截图量距离）。
2. 点「问她」→ 出现 `2 段` 的 chip，**且输入框已聚焦**（直接能打字，不用再点一下）。
3. 发送后后端请求体里有 `contextBundleIds`，且 Agent 回答**用到了那两段的内容**。
4. chip 能删，删了之后已发的消息不受影响（U6）。
5. **正文可用宽度不变**（宽度预算，改前 38rem）。

### 阶段 A1 · 编辑器调成"像笔记"

| 步 | 做什么 |
|---|---|
| A1.1 | 去掉 `Plus`（`BlockEditor.tsx:341/395`），回车即新段 |
| A1.2 | 行距 1.75 → 1.9，字号 15，左右留白加大 |
| A1.3 | 保存提示降到几乎看不见（现在有 saving/saved 状态） |
| A1.4 | 保留 `/` 或快捷键切块类型（否则引用/代码块没法写） |

**验收**：1440 宽下正文 ≤ 640px；页面上没有任何加号；打三段字刷新不丢。

---

## V · 测试计划

### 命令（与现有工具链一致）

```bash
cd frontend
npx tsc --noEmit -p tsconfig.app.json    # 裸 tsc 是假的，必须带 -p
npx eslint src/features/learn-space/focus src/features/conversation
npx vitest run
npx vite build                            # 改过路由/页面必跑

cd ../backend
./.venv/Scripts/python.exe -m pytest tests -q -p no:randomly
```

### 需要新增的测试

| 测什么 | 放哪 | 为什么 |
|---|---|---|
| 拖放的数据契约（key 集合 → bundle items） | `focus/malaDrag.test.ts`（新，纯函数） | `createBoardContext` 的 items 形状不能靠手动验 |
| 引用卡片渲染 | `conversation/ConversationAttachments.test.tsx` | 来源名缺失时不能崩 |
| meta 折叠 | `conversation/ConversationTurnMeta.test.tsx` | 默认收起但信息不丢 |
| 笔记标题写回 | `pages` 相关已有测试里补一条 | `PUT /pages/{id}` 只动 title |

### 不能只靠单测的部分（必须真驱动）

- **拖放端到端**：`dragover` / `drop` 是浏览器行为，jsdom 测不出来。
  用 `.workbuddy/localdb/` 下已有的 CDP 脚本范式（`verify_insight_preview.mjs`），
  发真实 `Input.dispatchMouseEvent` 做拖拽，并读 `dataTransfer` 结果。
- **Agent 是否真的收到引用**：看后端请求体里的 `contextBundleIds` + 回答内容。

---

## VI · 风险与待决策

| # | 问题 | 建议默认 |
|---|---|---|
| 1 | **Mala 按钮留不留**（两条路径 vs 一条） | 留，但文案说明"也可以直接拖" |
| 2 | **PDF/图片能不能圈选** | 本轮**不支持**：`MaterialView` 是只读渲染，块选择只存在于 `BlockEditor`。列为下一步 |
| 3 | **"它说的"要不要去气泡** | 去。气泡让这一页读成聊天，而它是共读材料 |
| 4 | **笔记要不要保留 code 块** | 删 code、留 quote（读论文贴引用有用） |
| 5 | **标题改动与正文保存的竞态** | 两条 API 分开调；标题走 `PUT /pages/{id}`，正文走 `PUT /blocks`。⚠️ 若两条同时飞，后到的 `save_page_blocks` 不影响 title（它不写 title 列），已核 |
| 6 | **HTML5 drag 是否足够稳** | B2 就验；不稳则改 Pointer Events |

---

## VII · 完成定义

一次完整流程，全部通过才算三条都完成：

1. 在聚焦页**新建一条笔记**，标题写「10 月 19 日」；
2. 正文写三段，其中一段是**从论文里抄的一句**；
3. **刷新页面**，标题和三段都还在；
4. 选中**两段**（含抄的那句），把把手**拖到对话面板**；
5. 输入框上方出现 `2 段` 的引用；
6. 打「这句为什么这么写」并发送；
7. **Agent 的回答里确实用到了那两段文字**（不是泛泛而谈）；
8. 对话窗格里，**"我说的 / 它说的 / 引用材料"三者在视觉上分得开**；
9. 把引用点掉 → 引用消失，消息不受影响；
10. `tsc / eslint / vitest / build` 四条全绿。

---

## 附 · 这份计划没有验证的事

- **HTML5 drag 在本项目的滚动容器里到底稳不稳** —— 只有写代码才知道，已在 §IV-B 里作为第一优先验证项。
- **`ConversationAttachments` 现在接收什么数据形状**（只看了渲染，没追数据源）—— C 阶段动它之前要先读 `types.ts`。
- **笔记的块选择在长文档里的表现**（滚动时选区是否保持）—— 需要真材料试。
