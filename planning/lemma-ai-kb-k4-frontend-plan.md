# kb-engine K4 前端接线计划（最严苛标准）

> 状态：待批准 · 日期：2026-08-15 · 前置：K1（1c07f4e）/ K2（1991dfb）/ K3（e50004e）已完成

## 背景：K4 = 剩余 15% 的第一感知点

知识库引擎（完整）+ 数据（真 PG 验证）+ 服务（读路径通）+ REST 层（K2 挂载全量 API）+ 网关透传（K3 打通）——**HTTP 链路已完整，但用户在界面上仍只能看树**。K4 是用户第一次「摸到可写」的知识库：搜索 / 新建 / 改名 / 删除。

## 0. 决策依据（事实核查，非假设）

| # | 事实（代码证据） | 计划含义 |
|---|---|---|
| F1 | 新建：`POST /api/notes/:parentNoteId/children`（routes/index.ts:93），body 带 title/type/content，query `target=into`（K2 已验证 200，返回 `{note, branch}`） | 前端表单 → 该端点 |
| F2 | 改名：`PUT /api/notes/:noteId/title`（:97），body `{ title }`；**isContentAvailable 检查**——无 blob 的笔记（如根 root）改名会 400（K2 种子补 blob 才过） | 根/无内容节点改名失败需优雅提示 |
| F3 | 删除：`DELETE /api/notes/:noteId`（:90）；**必须带 `?taskId=<随机串>`**（deleteNote 里 `if (typeof taskId !== "string") throw ValidationError`）——Trilium 批量删除的 TaskContext 追踪 | 前端删除调用必须拼 taskId，否则 400 |
| F4 | 搜索：`GET /api/quick-search/:searchString`（:203），普通文本即可（默认模糊），返回 `{searchResultNoteIds, searchResults}`（含 notePath 如 "root/a/b"） | 搜索框 → 该端点 → 结果点击按 notePath 展开树 |
| F5 | 读树：前端现有 `useNotesTree` 走 P0 显式路由 `/api/v1/kb/notes/tree`（TreeNode 结构，app.ts JS 组装多父树）——**K4 读路径不变**，写操作后 invalidate 重查 | 最小改动：不切引擎树结构 |
| F6 | 网关透传（K3）：`/api/v1/kb/api/{path}` → 侧车 `/kb/api/{path}`，method/query/body/状态码透传；侧车门控关 → 引擎 404 → 网关 502 | 前端写/搜走该前缀；502 = 门控关信号 |
| F7 | 门控：Express 侧 `KB_FULL_API_ENABLED`（默认关，K2）；**前端无独立门控**——靠 502 失败提示 + 操作禁用 | fail-open：写失败不崩，读照常 |

## 1. 范围边界

**做**（K4 四步）：
- K4.1 API 层：`knowledgeBaseApi.ts` 加 mutation hooks（createNote / changeTitle / deleteNote / quickSearch）+ `invalidateQueries(notesTreeQueryKey)`
- K4.2 树面板交互：新建（根/节点下「+」→ 标题输入 → text 类型默认）、改名（inline 编辑）、删除（确认 + taskId）
- K4.3 搜索：面板顶部搜索框 → quick-search → 结果列表 → 点击按 notePath 展开树并高亮
- K4.4 门控 fail-open + 测试 + 构建：502/失败时操作提示、树保持只读不崩

**不做**（显式排除，防蔓延）：
- 内容编辑/编辑器（K5 单独决策：A 搬 CKEditor5 / B tiptap / C 最小）
- 属性/标签 UI、拖拽移动、多选批量、笔记类型切换、保护/归档
- 引擎侧任何改动（packages/ 零改动铁律延续）
- 后端/网关改动（K3 已够用）

## 2. 责任三问（每个改动的用户视角验证）

| 改动 | ①用户看到什么 | ②是否符合产品意图 | ③如何从用户侧验证 |
|---|---|---|---|
| 新建 | 树面板「+」→ 输入标题 → 树里出现新节点 | 是——知识库从只读变可用 | 建完节点出现在树中；刷新仍在 |
| 改名 | 双击标题 → inline 编辑 → 回车 → 树内更新 | 是——笔记可维护 | 改名后树与引擎读回一致 |
| 删除 | 右键/悬停「删除」→ 确认 → 节点消失 | 是——软删除语义 | 删除后消失；刷新不回来（isDeleted=1） |
| 搜索 | 顶部搜索框 → 结果列表 → 点击树展开定位 | 是——37 表达式能力的入口 | 搜索词命中 → 树展开到结果节点 |
| fail-open | 门控关时操作按钮禁用/操作失败提示，树只读照常 | 是——韧性红线（不阻塞页面） | 引擎 404/502 时页面不崩，仅提示 |

## 3. 步骤卡（每步独立 commit 可回滚）

### K4.1 API 层（铺路，无用户感知）
- 改动：`knowledgeBaseApi.ts` 加 `useCreateNote` / `useChangeTitle` / `useDeleteNote` / `useQuickSearch`；成功后 `invalidateQueries(notesTreeQueryKey)`
- 关键事实落实：deleteNote 拼 `?taskId=${randomString(10)}`（F3）；createNote body `{ title, type: 'text', content: '' }` + `target=into`（F1）；changeTitle body `{ title }`（F2）
- 验证：现有 37 前端测试不回归 + 新增 mutation 单测（mock apiClient）
- 门控：无（纯 API 层）

### K4.2 树面板交互（第一感知点）
- 改动：`NotesTreePanel.tsx` 加新建/改名/删除交互（inline 输入、确认态、loading 态、错误提示）
- 关键事实：根节点改名失败提示（F2：isContentAvailable）
- 验证：组件测试（点击「+」→ 输入 → mutation 调用 → 树更新）+ i18n key
- 门控：502 → 操作失败提示，树只读（fail-open）

### K4.3 搜索
- 改动：面板顶部搜索框 → `useQuickSearch`（debounce 300ms）→ 结果列表（标题 + 路径）→ 点击按 notePath 展开树
- 关键事实：notePath 是 "root/noteId/..." 链（F4）；展开 = 逐级 setExpanded
- 验证：组件测试（输入 → 结果 → 点击 → 展开断言）+ i18n
- 门控：502 → 搜索框禁用 + 提示

### K4.4 门控 fail-open + 全量验证
- 改动：统一错误处理（mutation 失败 → toast/内联提示，不抛全局）；操作按钮在失败后保持可用（重试）
- 验证：37+ 前端测试全绿 + `npm run build` + dev server 手动冒烟（门控关：树可见 + 写操作提示失败）
- 门控：本步就是门控体验的验收

## 4. 依赖与门控矩阵

| 能力 | 前端入口 | 门控关（KB_FULL_API_ENABLED=false）行为 |
|---|---|---|
| 读树 | `/api/v1/kb/notes/tree`（P0 显式路由，恒挂载） | 正常显示（无门控依赖） |
| 写（新建/改名/删除） | `/api/v1/kb/api/*`（K3 透传） | 引擎 404 → 网关 502 → 操作提示失败，树只读 |
| 搜索 | `/api/v1/kb/api/quick-search/*` | 502 → 搜索禁用提示 |

**回滚**：K4 每个 commit 独立可 revert；整体回滚 = 还原前端文件（引擎/后端零改动）。

## 5. 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| deleteNote 忘带 taskId → 400 | 高 | F3 已识别，K4.1 落实随机串 |
| 根/无 blob 节点改名 400 | 中 | F2 已识别，K4.2 错误提示兜底 |
| quick-search 对中文/空串行为 | 中 | K4.3 空串不请求 + debounce |
| 树定位 notePath 与 TreeNode 结构（branchId 多父）不匹配 | 中 | 按 noteId 链展开（TreeNode 有 noteId）；真数据验证留部署 |
| 真实侧车未部署，端到端只验证到 mock | 已知 | 部署验证清单项（同 P0 遗留） |

## 6. 验收清单（可勾选）

- [ ] K4.1：4 个 mutation hook 单测通过，deleteNote 带 taskId
- [ ] K4.2：新建/改名/删除 UI 测试通过，失败提示不崩
- [ ] K4.3：搜索测试通过，点击展开树
- [ ] K4.4：门控关 fail-open 验证（502 → 只读 + 提示）
- [ ] 前端全部测试绿 + `npm run build` 通过
- [ ] i18n 双语对齐（zh/en）
- [ ] `git diff packages/` 为空（引擎零改动）
- [ ] 部署验证项（真侧车）：建→搜→改→删闭环 + 树定位

## 7. 框架留位关联

K4 的前端是**纯消费方**：所有操作经网关窄 API（/api/v1/kb/api/*）→ 侧车 → PG。未来 learner 框架（P2 融合）消费知识库时走同一入口，K4 不引入任何前端到引擎内部的直接耦合——「窄契约 + 消费方零耦合」的留位原则延续。
