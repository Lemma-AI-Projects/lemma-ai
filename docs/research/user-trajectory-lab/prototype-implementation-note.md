# User Trajectory 低保真原型 · 实现说明

> 分支 `user-trajectory` · 2026-11-04 · 状态：**原型（未接后端，未动产品代码）** ·
> 上游：`design/user-trajectory-positioning.md` · `decisions/user-trajectory-experience.md` · `taxonomy/`

打开：**`/preview/user-trajectory`**（免登录）。索引页 `/preview` 的「设计与研究评审」组里有一条。

> 评审时可把任何状态写成一条链接（截图也用这个办法复现）：
> `?view=overview|timeline|explore|insights` · `?sel=<id>`（如 `mat-19` / `act-112` / `ins-13`）· `?panel=0` 收起右栏
> 例：`/preview/user-trajectory?view=insights&sel=ins-13`

---

## 1 · 文件与路由

**新增**

| 路径 | 行数 | 作用 |
|---|---|---|
| `frontend/src/features/user-trajectory/UserTrajectoryView.tsx` | 148 | 外壳：头部 / 路径栏 / 四视角切换 / 右栏 / 弹层 |
| `frontend/src/features/user-trajectory/store.ts` | 273 | **唯一一份状态**（选中、路径、集合、对比、回应、候选） |
| `frontend/src/features/user-trajectory/types.ts` | 181 | 五类对象 + 四态 |
| `frontend/src/features/user-trajectory/parts.tsx` | 146 | 六个零件（Section / 四态记号 / Chip / 行 / 空态 / 键值） |
| `frontend/src/features/user-trajectory/Inspector.tsx` | 434 | 右栏：对象 / 父事件 / 事件 / 证据 / 解释五种主体 |
| `frontend/src/features/user-trajectory/Overlays.tsx` | 238 | 右键菜单 / 对比弹层 / 集合抽屉 |
| `.../perspectives/OverviewPerspective.tsx` | 133 | 概览：地形 + 三条发现 + 最近五天 |
| `.../perspectives/TimelinePerspective.tsx` | 187 | 时间轴：父子事件 + 线索过滤 |
| `.../perspectives/ExplorePerspective.tsx` | 234 | 探索：类型过滤 + 确定性关系图 |
| `.../perspectives/InsightsPerspective.tsx` | 202 | 理解：解释列表 + 候选三态 |
| `.../data/dataset.generated.ts` | 生成 | 从合成数据集抽的子集（**不要手改**） |
| `.../data/narrative.ts` | 179 | 手写：父事件 / 候选 / 连接 / 首页发现 |
| `.../data/index.ts` | 135 | 合并 + 查表 + 中文标签 |
| `frontend/src/pages/UserTrajectoryPreviewPage.tsx` | 22 | 页面壳（挂路由用） |
| `docs/research/user-trajectory-lab/tools/build-prototype-data.mjs` | ~230 | 数据集 → TS 的抽取脚本 |

**修改（各 1 处，都是加一条）**

- `frontend/src/pages/previewRegistry.tsx`：加 import + 一条路由条目。路由与索引都从这份清单渲染，所以只改这里。
- `frontend/src/pages/AppRouter.tsx`：**未改**（`PREVIEW_ROUTES` 自动展开）。

**数据管线**

```
docs/research/user-trajectory-lab/synthetic-trajectory-data.json   (v0.2, 35 万字符)
  └─ tools/build-prototype-data.mjs  ── 按 id 白名单取子集、字段改名、文字不动 ──▶
     frontend/src/features/user-trajectory/data/dataset.generated.ts
```

重新生成：`node docs/research/user-trajectory-lab/tools/build-prototype-data.mjs`

---

## 2 · 页面结构

```
┌ 头部：陈知远 · 35 对象 / 54 事件 / 13 证据 / 9 解释 · [集合 n] [对比 n] [收起右栏] ┐
├ 视角切换：概览 | 时间轴 | 探索 | 理解                                      ┤
├ 路径栏：路径 › 消融跑完… › prj-02             [清空]   换视角时选中不丢，过滤会丢 ┤
├───────────────────────────────────────────────┬──────────────────┤
│ 主区（随视角）                                  │ 右栏 Inspector    │
│  · 概览：七条线索的地形 + 三条发现 + 最近五天      │  对象 / 父事件 /   │
│  · 时间轴：按月的父子事件 + 左栏线索过滤           │  事件 / 证据 /     │
│  · 探索：左栏类型分节 + 确定性关系图 + 关系列表     │  解释（五种主体）  │
│  · 理解：解释列表 + 候选三态                      │                  │
└───────────────────────────────────────────────┴──────────────────┘
```

**一条主张**：只有一份状态，四个视角是它的四种看法。换视角时**选中与路径不丢**，
但 Explore 的「对象类型」过滤与 Timeline 的「线索」过滤**不互相传播** —— 这两处是刻意留的反例。

---

## 3 · 已实现的交互（对照任务 §10 的 12 条）

| # | 要求 | 落点 | 验证 |
|---|---|---|---|
| 1 | 四个视角切换 | 头部 tabs | ✅ CDP 点过 |
| 2 | 打开一条发现预览 | 概览「打开 →」→ 切视角 + 选中第一个引用 | ✅ 手点 |
| 3 | 选中对象或事件 | 任意行 / Chip / 图节点 | ✅ |
| 4 | 看详情与相关信息 | 右栏五种主体 | ✅ |
| 5 | 展开/收起父事件 | 行首 ▸▾；系统并的还能「拆开」 | ✅ 子行 13→22 |
| 6 | 沿连接走 | 探索的关系列表 / 右栏「连接」 | ✅ |
| 7 | 换视角保留选中 | 全局 `selected` | ✅ 路径栏与右栏都在 |
| 8 | 右键 / ⋯ 菜单 | 行右键 + 右栏 ⋯；两段（探索 / 动作），按类型变 | ✅ 对象 6 项、事件 3 项 |
| 9 | 存进临时集合 | 菜单「存入集合」→ 右侧抽屉（可留一句话） | ✅ |
| 10 | 对比 | 菜单「放进对比」→ 头部「对比 n」→ 并排 | ✅ 弹层打开 |
| 11 | 查一条解释背后的证据 | 右栏分组：支撑 / 削弱 / 加条件 / **反驳** → 点进证据 → 再点回原活动 | ✅ |
| 12 | 确认 / 改说法 / 忽略候选 | 理解视角的候选区 | ✅ 状态变「已了结」 |

**额外**：解释本身也能「说得对 / 改说法 / 不是我」，被否的留在列表里（划线 + 「你否掉的」），不消失。

---

## 4 · 数据模型假设

1. **五类不做成五个 tab**：对象 / 事件 / 证据 / 解释 / 候选都是**同一个空间里的东西**，四个视角是看法。
2. **父事件 = 一段过程**：默认两层，`parentId` 为空即顶层。`origin: system|user` 决定是否显示「系统并的」并可拆开。
3. **事件与证据分离**：54 个事件只产 13 条证据，大部分事件 `evidenceIds: []`。右栏对空的那句写的是"什么都没产出，这很常见"。
4. **四态**：`observed` ● / `interpretation` ◐ / `hypothesis` ○ / `confirmed` ◆。
   - 系统解释 → ◐；用户自己写的那几条 → ◆（是他的话，不等于被验证）；
   - `ev-18`（"我能读懂 NeRF 类论文了"）**不是证据**，它是 ○ 假设，且没有任何支撑。
5. **矛盾不裁决**：`ins-13` 是 high confidence 且与 `ev-17`/`ev-24` 冲突，两条 `contradicts` 原样挂着，用户没看过。
6. **解释会过期**：`ins-12` 有 `effective_from 06-08 / effective_to 10-29` 与一段 `reinterpretation`，旧版本不删。
7. **候选三态**：在攒（只给「看它攒了什么」）/ 浮出来（可确认、改、忽略）/ 已了结（到期关闭，沉默不算确认）。
8. **临时结构不动底层**：「集合」只活在页面 state；「提出为理解」产出的是 ○ 假设，作者是用户，标注"系统没有验证过"。

**简化（相对分类规范）**：没有实现「记录层」（`corrections`）在时间轴上的呈现；`period` 不做对象；
`ext-*` 外部记录没有单独入口。这三处是为了压低复杂度，不是判断它们不重要。

---

## 5 · 已知限制

| 限制 | 后果 |
|---|---|
| 只有一份合成数据、一个虚构用户 | 无法测多用户 / 多 Space / 跨来源合并 |
| 没有后端、没有持久化 | 刷新即清空；回应、集合、对比都不落库 |
| 「发现」是手写的 3 条 + 4 条结构连接 | 不能证明"系统能持续产出发现"——**这是最大的未验证项** |
| 关系图是等分确定性布局 | 8 条以上关系会挤；没做力导向（也不想做） |
| 无移动端适配 | 窄屏（1080）可用，手机不可用 |
| 无键盘导航 / 焦点管理 / ARIA 完整标注 | 只有 `aria-label` 的展开按钮与 ⋯；未做无障碍审计 |
| 无深色模式专项调整 | 用的是语义 token，理论上跟随主题，但**没有实际看过暗色** |
| 「加一句话」与「存入集合」合并 | 都要先进抽屉才能写，多一步 |

---

## 6 · 未决的设计问题（原型没回答，也不该由它回答）

1. **首页在"没有发现"时显示什么？** 现在永远有 3 条（手写的）。真实供给不可能天天有。
2. **发现要不要衰减 / 钉住 / 去重？** 现在没有时间戳，也没有"看过"的状态。
3. **第 4 个视角叫 Overview 还是 Development？** 沿用产品文档的 Overview；分类文档里仍叫 Development（冲突 X-3 未解）。
4. **共享上下文的收益是否成立？** 原型证明了"技术上能做"，没证明"用户会跨视角走"。
5. **对比上限 3 个是否合理？** 现在满了就挤掉最早的，用户没有感知。
6. **父事件的"拆开"是永久还是本次？** 现在是本次（内存），真实产品需要决定要不要写回。
7. **解释被否之后去哪？** 现在留在原位划线。是否该折叠到"你否掉的"里，没定。

---

## 7 · 验证记录（我实际做过的）

| 项 | 结果 |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | 通过 |
| `npx eslint src/features/user-trajectory src/pages/UserTrajectoryPreviewPage.tsx src/pages/previewRegistry.tsx` | 通过 |
| `npx vite build` | 通过（18.7s；只有既有的 chunk 体积警告） |
| CDP 交互脚本（`docs/research/user-trajectory-lab/tools/drive-prototype.mjs`） | 深链 / 展开 13→22 / 对象菜单 6 项 / 集合抽屉 / 对比弹层 / 反驳证据 / 证据钻取 / 否认后仍列出 / 候选确认 —— 全部按预期 |
| 截图（Chrome CLI，`.logs/shots/`） | `ut-overview` · `ut-timeline` · `ut-explore` · `ut-insights` · `ut-narrow`（1080）· `ut-index` |
| 既有 preview 路由 | `/preview` 索引正常，原有 16 条未受影响 |

**没验到的**：hover 态、暗色、真实触控、1440 以上的超宽屏、以及"真实用户会不会这样用"。
