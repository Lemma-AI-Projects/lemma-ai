# Lemma Board 研发计划（R&D）

> **状态**：草稿 v0.2 · 2026-08-06
> **定位**：**hyperknow × figma 混合 plus max** —— HyperKnow 的「懂你 + 生成 + 记忆」× Figma 的「无限画布自由」。
> **一句话**：每个 learn space 配一块 Board——AI 学习智能体的全部输出（讲解 / 知识卡片 / 图谱 / 复习），长在一块可无限组织、连接、编辑的画布上。

---

## 1. 背景与定位

- 用户定调（08-05/08-06 多轮校准）：
  - learn space（学习领域容器）取代 workspace 概念；**projects → learn space 升级**（决策已定）。
  - **chat 是一等入口**：用户可直接开聊，不强制先建 learn space。
  - **board 是 learn space 的必要组件**：一个 learn space 可建**多个 board**，board 间可 **merge** 或做其他操作（复制 / 归档 / 导出 / 清空）。
  - **learn space 是开放容器**：目标模板只是其中一个**可插拔组件**（非创建必经），用户后续可把「什么牛鬼蛇神」都加进去（笔记 / 成就 / 偏好 / 未来的引擎产物……）——架构必须为"不断加组件"预留。
- 团队草图信号（figma 08-05 截图）：「每个对话都会自动配备一个 Board」；笔记画布 = figma + notion 缝合怪；笔记本可导出 PDF / 打印。
- HyperKnow 调研结论（08-06 联网）：它是 AI 学习智能体（深度解题 / cheatsheet / 闪卡 / Learner's Persona 长期记忆），**不是画布产品**——我们要的混合 = 它的「懂你」层装进 figma 级画布。
- 技术路径调研：**tldraw SDK** 为 Figma 级画布开源首选（React 原生 / 40K+★ / AI starter kits / @tldraw/sync 可自托管）。

## 2. 概念模型

### 2.1 用户结构（两入口，互不强制）

```
用户
├── Chat（独立一等入口，轻）——想说就说，无需任何容器
└── Learn space（原 Project 升级，重）——正式学习容器
     └── 组件（开放，可插拔）：
         ├── ★ Board（必要组件，可多个、可 merge/复制/归档/导出）
         ├── 对话（归属 learn space）
         ├── 知识图谱 / 掌握度
         ├── 复习队列
         ├── 课程 / 物料
         ├── 目标模板（可选组件，非创建必经，可后加）
         └── …（用户后续可添加任何新组件——开放容器原则）
```

### 2.2 核心关系（对话 → Board → 图谱）

- **对话 = 时间流**（问答发生的地方）
- **Board = 空间**（知识沉淀的地方）：对话中 AI 讲懂的知识，一键「落」到 Board 变成卡片
- **知识图谱 = 结构骨架**（卡片之间的语义关系 = KST 的边）

三者一体：**对话产生 → Board 呈现 → 图谱结构**。

### 2.3 Board 层级（对话级 → 领域级）

- **对话级 Board（轻）**：每个对话自动配备的临时画布（figma 草图「每个对话都会自动配备一个 Board」）——聊到哪画到哪。
- **领域级 Board（重）**：learn space 内的正式长存画布（可多个、可 merge）。
- **晋升动作**：对话级 Board 的内容可一键 **merge 进领域级 Board**——两条路（直接 chat / 先建 learn space）最终汇入同一个 Board 生态。

### 2.4 创建流程（用户视角）

**路径 A · 直接开聊**：打开 → 对话（现有 New chat 行为不变）→ 可选「移入 learn space」归属。

**路径 B · 先建 learn space**：
1. 侧栏「+ 新建 learn space」（原 New Project 改名升级）
2. 填名称即可（目标模板为**可选**，可跳过、可后加）
3. 创建完成 → **自动配备第一个 Board**（必要组件，零配置）
4. 之后在 learn space 内：直接对话 / 新建多个 Board / Board merge·复制·归档·导出 / 后续任意添加组件

## 3. 技术路径

> ✅ **08-06 拍板**：**tldraw SDK 为底座**（用户拍板：技术优先，不纠结许可）。tldraw 为画布 SDK 而生的架构（自定义 shape / binding / AI 管线 / 性能索引 / 协作）全面匹配本产品需求。

| 方案 | 结论 |
|---|---|
| **tldraw SDK（底座）** ✅ | 自定义 shape 一等公民、binding 语义连线内建、`editor.createShape()` AI 管线成熟、四叉树+视口虚拟化、@tldraw/sync 协作可自托管、AI starter kits。商用授权成本已接受（08-06） |
| Excalidraw | 白板应用而非 SDK：自定义元素受限、无 binding、无 AI 管线、大画布性能弱。仅当"轻手绘白板"定位时可选 |
| 自研（Konva / Fabric） | 等于从零写画布，工程量大，否决 |
| Miro / FigJam | 是产品不是 SDK，不可嵌入，否决 |

### 3.1 落地要点

- 架构：Editor Core / UI / Sync 三层解耦（tldraw 内建）；四叉树空间索引 + 视口虚拟化撑大画布性能；signals + record store 状态管理；撤销重做内建
- 自定义 shape（AI 内容进入画布的入口）：
  - `KnowledgeCard`（知识卡片：文本 / KaTeX 公式 / 引用来源）——tldraw shape 完整生命周期
  - `ConceptNode`（概念节点，props 绑定 learner 掌握度三态渲染）
  - `SemanticLink`（语义连线，tldraw **binding 系统**绑定 KST 边——节点移动连线自动跟随）
- AI → Board：对话回合结束，`editor.createShape()` 把提炼知识生成卡片摆上画布（「沉淀」动作）；官方 AI starter kits 可参考
- **多 Board 数据模型**：learn_space_id → boards（1:N）；board 快照（store snapshot JSON）存 PG JSONB；merge = 快照内容合并（卡片去重 + 保留来源可溯）
- **组件开放架构**：learn space 组件注册表（组件类型 → 挂载点 / 数据表），新增组件不动核心结构——「牛鬼蛇神」原则的工程化
- 协作（远期）：@tldraw/sync 自托管多端同步（v1 不做实时，留口）
- 成本备注：tldraw 商用授权费用已接受（用户 08-06 拍板，技术优先）

## 4. 分期（每期带用户视角效果）

### P0 · 技术验证（先于一切）
- [x] 底座定案（08-06 用户拍板 tldraw，技术优先）
- [ ] **tldraw demo**：前端装 SDK，跑通最小无限画布（拖拽 / 缩放 / 撤销 / 存快照）
- [ ] 自定义 shape 原型：KnowledgeCard（文本 + KaTeX）/ ConceptNode（掌握度三态）
- [ ] **binding 原型：SemanticLink 语义连线**（节点移动连线跟随）——本产品差异化核心，必须验证
- [ ] 大画布性能实测（千级元素拖拽流畅度）
- 用户视角：无（纯内部验证）；验收 = demo 可跑 + 自定义 shape/binding/性能三结论白纸黑字

### P1 · MVP（learn space 容器 + 多 Board）
- [ ] learn space 数据模型 + 路由（原 project 升级，含 boards 1:N）
- [ ] 创建流程：learn space（名称即可）→ 自动配默认 Board
- [ ] 对话「沉淀」动作：回合结束生成 KnowledgeCard 上板
- [ ] Board 操作 v1：新建第二个 Board / merge 两个 Board
- [ ] Board 快照 PG 持久化
- 用户视角：**建 learn space 就有画布；跟 AI 对话后知识自动变卡片；能建第二块板、能把两块板合并**
- 验收：UX 剧本「建空间 → 问一句 → 卡片上板 → 建第二板 → merge 合并」

### P2 · 增强
- [ ] 组件开放架构（组件注册表，目标模板作为第一个可插拔组件落地）
- [ ] 对话级 Board → 晋升/merge 进领域级 Board
- [ ] 笔记本（Board 片段聚合 → 导出 PDF / 打印）
- [ ] 复习卡片上板（到期卡片以卡片形态进入画布）
- 用户视角：目标模板可后加；对话里的东西能"晋升"成正式画布内容；画布可导出实体笔记
- 验收：UX 剧本「对话级画布内容 merge 进 learn space Board」

### P3 · 图谱一体化（远期）
- [ ] 语义连线绑定 KST 边，画布 = 图谱的自由表达
- [ ] AI 自动排版 / 组织画布（讲完一章自动摆图）
- [ ] @tldraw/sync 实时协作（多端 / 双 dev）
- 用户视角：打开 Board 就是你的知识地图，AI 帮你越摆越清晰；多端同步

## 5. 风险与决策点

| 风险 | 等级 | 对策 |
|---|---|---|
| tldraw 商用授权成本 | 已接受（08-06 拍板） | 技术优先，费用纳入成本 |
| tldraw 学习曲线（shape/binding API） | 中 | P0 先跑 demo 熟悉 API；官方文档 + starter kits |
| 开放容器导致组件无限膨胀 | 中 | 组件注册表 + 每组件独立数据表；默认关闭、门控启用 |
| Board 数据膨胀（快照 JSONB） | 中 | 卡片结构化存储 + 快照瘦身；分片 |
| 与 Hermes 图谱绑定复杂度 | 中 | P1 只做掌握度显示，连线留 P3 |

## 6. 待拍板项

1. **结构**（§2.1 两入口 + 开放容器 + Board 必要组件可多个可 merge）是否符合预期？
2. **Board 层级**（§2.3 对话级轻 Board → 晋升/merge → 领域级重 Board）是否确认？
3. **tldraw 底座** ✅ 已拍板（08-06，技术优先）→ P0 开工
4. 分期粒度（P0-P3）是否合适？
