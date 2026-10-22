# Learn Space Canvas & Focus Mode Prototype（Stage 0 计划）

> 分支 `practice-system` · 2026-10-22 · 状态：**计划 · 未写 UI 代码**
> 上游：`docs/decisions/agent-principles.md`（D1）· `docs/research/README-rnd-programme.md` ·
> `docs/planning/focus-activity-workspace-prototype.md`（已完成的 Proposal B 原型，本文复用其产物）
> 本计划只覆盖 **Stage 0**；§8 的分阶段表在获批后逐段执行。

---

## 1 · 审计结论（决定方案形状的四条事实）

### ① 现有画布：有拖动和缩放，但节点只有一种

`workspace/WorkspaceCanvas.tsx`（159 行）：
- **拖动自己实现**（pointer events，无依赖；`setPointerCapture` 的坑注释里写着，拖动期间挂 window）
- **缩放**：`zoom` 百分比 → 整层 `transform: scale()`
- 节点：`WorkspaceNode { id, title, href?, x, y }` —— **只有「对话卡片」一种**，单击 `onOpenNode` 打开
- 位置是画布态不落库；拖动阈值 4px 区分"拖"和"点"

### ② Focus：两条现成的路

- 真页面 `/learn-spaces/:id/focus`（`FocusView.tsx`，1151 行，连后端）
- 原型 `/preview/focus-activity`（上一轮做的，mock、带"模拟 Agent 插入"，**已支持 URL 参数**）

### ③ Insight：`InsightPanel` 是**受控组件，可直接复用**

`insight/InsightViews.tsx:133` —— props 是 `action / onAction / onClose`，
内容来自 `INSIGHT` fixture（V0 本来就是规则 + 固定内容），**不依赖路由**。
⇒ Decision A 的"Reuse the existing Insight Component"**可以直接成立**，不需要 mock 一份新的。

### ④ 引用审计：动谁不动谁

用引用扫描核过：根目录 22 份 md 已全部迁入 `docs/`（`f7cdd9c1`），代码里引用文档名的只剩
`AppRouter.tsx:109` 一处（已改为新路径）。⇒ 本轮**新增文档无破坏风险**；
反过来，本轮也**不迁移** `.workbuddy/research/` 里那 12 份（`docs/README.md` 末尾已记为待办）。

---

## 2 · 方案

### 入口

**`/preview/space-canvas`**（顶层免登录路由，与 `/preview/focus-activity` 并列）。
不改 `LearnSpaceWorkspace.tsx` / `LearnSpaceWorkspacePage.tsx` —— 它们连后端
（`pagesQuery` / `conversationsQuery`），原型不该被真实数据绑住。

### 文件（7 个）

```
frontend/src/pages/SpaceCanvasPreviewPage.tsx        页面壳（三区 + 状态）
frontend/src/features/space-canvas/
├── canvasData.ts            元素 mock（3 类）+ CanvasElement 类型
├── PrototypeCanvas.tsx      拖动 + 双击 + 三类渲染（拖动逻辑来自 WorkspaceCanvas，见下）
├── CanvasElementCard.tsx    三类卡片的视觉与交互分发
├── NoteCard.tsx             note 的就地编辑
└── InteractiveCard.tsx      interactive 的内嵌实验（复用 EigenExplorer）
（insight 复用 learn-space/insight/InsightViews.tsx 的 InsightPanel —— 不复制）
```

### 拖动：复制而不是抽象（一条明确的取舍）

`WorkspaceCanvas` 的拖动逻辑约 60 行。两条路：

- **A. 提取 `useCanvasDrag` 共享 hook** —— 干净，但要重构生产组件且它没有测试保护；
- **B. 原型内复制这份逻辑**，注释标明来源，转正时再提取。

**选 B。** 理由：本轮的目的是**验交互模型**，不是给画布做工程整顿；
复制 60 行的代价（转正时合并一次）远小于"原型阶段就动生产组件"的代价。
报告与本文都会记：**如果原型转正，第一件事是把拖动提取成共享 hook。**

### 元素类（三类，视觉可辨）

| 类 | 卡片形态 | 交互 | 拖动起手 |
|---|---|---|---|
| **File** | 文件卡（图标 + 文件名 + 类型行） | 单击选中 · **双击进 Focus** | 全卡 |
| **Note** | 便签底色 + 直接可编辑文本 | 单击进入编辑 · 改字 | **只从头部条**（否则输入会被拖动劫持，见 §6 风险 1） |
| **Interactive** | 深色边 + 内嵌 EigenExplorer | 滑杆可拖 | **只从头部条**（滑杆也在卡上） |

三类用**左边框 + 头部图标 + 底色**区分（file = 白底 + 文件图标；note = 淡黄底；
interactive = 白底 + 赭色顶条）。不引入新色板。

### Canvas ↔ Focus（Decision B）

双击 file → `/preview/focus-activity?from=canvas&file=<名>`：

- `focus-activity` 的顶栏在 `from=canvas` 时显示**返回画布**按钮（+ 当前文件名）；
- 返回 = `navigate('/preview/space-canvas')` —— 原型页的画布状态（元素位置、note 文本、
  insight 开合）都在**页面 state**里，路由切走再回来会重置。

⚠️ **这是本轮最大的坑**：React Router 下两个页面是两个挂载点，"Canvas context preserved"
不能靠路由回退白拿。方案：**把画布状态提升到 sessionStorage**（`useSearchParams` 之外，
一个 `useState` 的初始值从 sessionStorage 读、变更时写回）。约 20 行，原型内自洽，
转正时换成真正持久化。**Prototype-only assumption，记入决策边界。**

### Insight（Decision A）

画布右侧固定一栏（300px，可收），内嵌**现成的** `InsightPanel`：

- `action` / `onAction` 用本地 state（它本来就是这个契约）；
- 内容是它自带的 `INSIGHT` fixture —— **这不算 invent**：V0 的 Insight 本来就是规则产物 +
  固定呈现，原型复用它等于复用已有行为；
- 收起后留一条 32px 的窄条（`启示` 两个字 + 展开钮），**不整栏消失** ——
  D1 说 Insight 在画布模式是 persistent section，整栏收走就违背了"持续可见"。

---

## 3 · 状态模型（页面壳）

```ts
sidebarOpen        // insight 栏开合（默认 true）
elements           // CanvasElement[]（位置/文本可变）
selectedId         // 当前选中元素（file 单击、note 单击都算）
editingNoteId      // 正在编辑的 note
focusFile          // 从画布进入 Focus 时带过去的文件名（null = 不在 Focus）
```

`focusFile` 不路由到独立页面：**画布页内切换**（canvas ↔ focus 是同一页的两个态）。
理由：返回时"context preserved"在同页 state 下是白拿的，跨路由就要 sessionStorage ——
先用最不易错的方案，把交互验掉；路由级跳转留给转正讨论。

⚠️ 这与 `docs/planning/focus-activity-workspace-prototype.md` 的 `/preview/focus-activity`
并存：那个原型验"活动工作区 + Agent Move"，这个验"画布 ↔ 聚焦 + 持续 Insight"。
两个入口都保留，报告里说清各自验什么。

---

## 4 · 分阶段

| 阶段 | 交付 | 验收（可观察） |
|---|---|---|
| **1 画布布局** | `PrototypeCanvas` + 三类卡片 + 拖动 | ① 页面开得开；② 三类元素视觉可辨；③ 元素拖得动、松手停在原处附近；④ 顶栏/布局无破损 |
| **2 持续 Insight** | 右侧 `InsightPanel` 栏 + 收起窄条 | ① 栏开着时元素照常拖动；② 收起后窄条还在；③ 栏不遮画布（flex，非浮层） |
| **3 画布 ↔ Focus** | file 双击 → 同页切到 Focus 态（顶栏变化 + 返回钮） | ① 双击（非拖动）触发；② 顶栏显示该文件名；③ 返回后元素位置、note 文本、insight 开合**原样** |
| **4 类内交互** | note 就地编辑；interactive 滑杆 | ① note 改字后失焦保留；② interactive 滑杆与拖动不抢（拖动只从头部）；③ 无死控件 |
| **5 验证** | 全量检查 + 截图 | 见 §7 |

---

## 5 · 测试

```bash
cd frontend
npx tsc --noEmit -p tsconfig.app.json
npx eslint src/features/space-canvas src/pages/SpaceCanvasPreviewPage.tsx
npx vitest run
npx vite build
```

新增测试只测纯函数（`canvasData` 的类型守卫 / note 持久化的读写），不测 DOM 拖拽 ——
拖拽、双击、Focus 切换用 CDP 真驱动（沿用 `.workbuddy/localdb/verify_focus_activity.mjs`
的骨架，断言三类元素、双击进/返回、状态保留，预计 12–15 条）。

---

## 6 · 风险与没定的事

| # | 风险 | 处理 |
|---|---|---|
| 1 | **note 编辑与拖动抢事件**（pointerdown 在节点根上，输入框会变成拖动起点） | note/interactive 的拖动**只从头部条**起；file 全卡。这本身就是三类差异的一部分 |
| 2 | 双击与"两次单击"的语义冲突 | `dblclick` 原生事件 + 既有拖动阈值已把"拖"吞掉；单击仍是"选中"，不产生副作用 |
| 3 | InsightPanel 是全高面板（`h-full`），放进 300px 窄栏可能溢出 | Stage 2 第一件事就是截图看；溢出则给栏内加一层滚动容器（不改组件） |
| 4 | EigenExplorer 在小卡片里比例失调 | SVG 是 `w-full` 自适应；Stage 4 验，不行就给 interactive 卡片固定 320px 最小宽 |
| 5 | 画布状态 sessionStorage 是原型专属 | 已标注 prototype-only；转正时换真持久化 |

---

## 7 · 明确不做

不接后端 / 不改 `FocusView` / 不改 `LearnSpaceWorkspace` / 不建元素插件系统 /
不引 tldraw / 不做无限画布（无平移、无框选，沿用现有 zoom）/ 不做掌握度 /
不迁移 `.workbuddy/research/`。

---

## 8 · 三件要你拍的事

1. **Focus 态用哪个**：`/preview/focus-activity`（Proposal B 原型，活动为中心）还是
   **本页内的一个简化聚焦视图**？我选**后者**（同页切换，状态保留最可靠、交互流最短）；
   但如果你想让两个原型连成一条流（画布 → Proposal B 活动页），Stage 3 就改走路由。
2. **note 编辑**就地改字（我选这个，最像"便签"）还是点开小浮层？
3. Insight 栏**默认开**（我选开 —— D1 说 persistent）还是默认收（画布最大化）？

---

## 9 · 执行记录（2026-10-22，五阶段全部完成）

| 阶段 | 交付 | 验收 |
|---|---|---|
| 1 画布布局 | `PrototypeCanvas`（拖动/双击）+ 三类卡片 | ✓ |
| 2 持续 Insight | 右栏 300px `InsightPanel`（复用）+ 收起窄条 | ✓ |
| 3 画布 ↔ 聚焦 | file 双击 → 同页聚焦态 → 返回 | ✓ |
| 4 类内交互 | note 就地编辑（真键盘）· interactive 滑杆 | ✓ |
| 5 验证 | CDP **19 条断言全过** · tsc/eslint/338 测试/build | ✓ |

提交：入口 `SpaceCanvasPreviewPage` + `features/space-canvas/`（canvasData / PrototypeCanvas / CanvasElementCard）+ 路由。

### 两个过程发现（都写进了代码注释）

1. **画布/聚焦用「并存渲染 + hidden 切换」，不是条件卸载。**
   条件卸载会在切到聚焦时洗掉滑杆角度、note 编辑态 —— "返回后原样"就要一路提升状态。
   hidden 切换让状态保留免费拿（sessionStorage 仍在，防刷新）。
2. **note 编辑的验收要用 CDP 真键盘（`Input.insertText`）**。value-setter 和 execCommand
   都会出现"DOM 值变了、input 事件发了、React state 没动"的假象 —— 用 console 探针
   证明 onChange 实际触发、state 实际更新之后，才确认是**断言过期**（还在找
   execCommand 时代的文本），不是产品 bug。三条证据链缺一环就会误报。

### 已知限制

- 画布态的持久化是 **sessionStorage**（prototype-only；转正时换真持久化并重审"画布态要不要落库"）。
- 聚焦态是**本页简化视图**（对应文件正文），不是 Proposal B 的活动工作区 —— 两个原型的合并
  是下一个交互设计问题。
- Insight 面板的内容是 V0 fixture（复用，非 mock）。
- 拖动逻辑与 `WorkspaceCanvas` 重复（~60 行）；**转正第一步 = 提取 `useCanvasDrag`**。
- 无平移/框选，沿用现有 zoom。

### 原型揭示的设计问题（不在此回答）

1. Insight 栏在**聚焦态**也持续可见（本轮保留）—— 聚焦要不要有自己的 Insight 形态
   （贴在内容边的注，如 `/preview/insight` 的 focus 视图）？
2. file 双击进的是"对应文件"，但 Proposal B 的工作区是"活动"—— 文件和活动的关系
   （一个文件一次活动？一个文件多次活动？）没有答案。
3. 三类元素的"转正路径"不同：file/note 大概率进真画布，interactive 要看它是不是
   该由 Agent 生成。

### §8 问题 1 已拍板（2026-10-22）：**Path B**

file 双击 → `/preview/focus-activity?from=canvas&file=<名>`（Proposal B 活动工作区），
返回条在其顶栏上方。实现：画布页删同页简化视图（`openFile` 改 `navigate`），
Proposal B 页读参数渲染返回条。

**立场**：活动内容**不**换成文件正文 —— Proposal B 的主对象是活动，文件是上下文；
身份保留靠返回条 + 文件名，不靠把讲义塞进工作区。

验证：`.workbuddy/localdb/verify_path_b.mjs`（14 条，全过）——
拖 interactive 离位 + note 真键盘改字 → 双击进 Proposal B（断言路由/返回条/文件身份/活动内容/可视化）
→ 返回（断言 note 文本、元素数、interactive 位置、Insight 栏全部原样）。
截图 `path-b-focus.png` / `path-b-back-to-canvas.png`。
