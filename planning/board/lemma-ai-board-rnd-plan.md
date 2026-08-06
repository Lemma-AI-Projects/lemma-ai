# Lemma Board 研发计划（R&D）

> **状态**：草稿 v0.1 · 2026-08-06
> **定位**：**hyperknow × figma 混合 plus max** —— HyperKnow 的「懂你 + 生成 + 记忆」× Figma 的「无限画布自由」。
> **一句话**：每个 learn space 配一块 Board——AI 学习智能体的全部输出（讲解 / 知识卡片 / 图谱 / 复习），长在一块可无限组织、连接、编辑的画布上。

---

## 1. 背景与定位

- 用户定调：learn space（学习领域容器）取代 workspace 概念；projects → learn space 升级（决策已定）。
- 团队草图信号（figma 2026-08-05 截图）：「每个对话都会自动配备一个 Board」；笔记画布 = figma + notion 缝合怪；笔记本可导出 PDF / 打印。
- HyperKnow 调研结论（2026-08-06 联网）：它是 AI 学习智能体（深度解题 / cheatsheet / 闪卡 / Learner's Persona 长期记忆），**不是画布产品**——我们要的混合 = 它的「懂你」层装进 figma 级画布。
- 技术路径调研：**tldraw SDK** 为 Figma 级画布开源首选（React 原生 / 40K+★ / 自带 AI starter kits / @tldraw/sync 可自托管）。

## 2. 概念模型

### 2.1 learn space 底座组件（v1 候选，待确认）

| 组件 | 回答 | 底座 |
|---|---|---|
| **Board（无限画布）** ★ | 所有知识长在哪、怎么连接 | tldraw SDK |
| 对话（Chat） | 问它、它讲、它出题 | 现有 AIClient |
| 知识图谱 / 掌握度 | 你懂哪些、不懂哪些 | learner 五层（Hermes） |
| 复习队列 | 今天该复习什么 | SM-2（Hermes） |
| 课程 / 物料 | 引擎产物（讲义 / 视频 / quiz） | 现有 coursegen |

### 2.2 核心关系（对话 → Board → 图谱）

- **对话 = 时间流**（问答发生的地方）
- **Board = 空间**（知识沉淀的地方）：对话中 AI 讲懂的知识，一键「落」到 Board 变成卡片
- **知识图谱 = 结构骨架**（卡片之间的语义关系 = KST 的边）

三者一体：**对话产生 → Board 呈现 → 图谱结构**。

### 2.3 增强组件（v2+）

笔记本（Board 聚合 → 导出 PDF / 打印实体）、成就系统（按 learn space 隔离）、偏好数据库（用户反馈影响内容 tag）。

## 3. 技术路径

| 方案 | 评价 |
|---|---|
| **tldraw SDK（首选）** | React 原生；内置白板 / 选择 / 撤销 / 暗色；AI starter kits；@tldraw/sync 可自托管多人协作；ClickUp 百万用户级验证 |
| Excalidraw | 更轻、手绘风，SDK 成熟度不足，扩展受限 |
| 自研（Konva / Fabric） | 等于从零写 Figma，工程量大几十倍，否决 |
| Miro / FigJam | 是产品不是 SDK，不可嵌入，否决 |

### 3.1 落地要点

- 架构：Editor Core / UI / Sync 三层解耦（tldraw 内建）；四叉树空间索引 + 视口虚拟化撑大画布性能
- 自定义 shape（AI 内容进入画布的入口）：
  - `KnowledgeCard`（知识卡片：文本 / 公式 / 引用）
  - `ConceptNode`（概念节点，绑定 learner 掌握度显示）
  - `SemanticLink`（语义连线，绑定 KST 边）
- AI → Board：对话回合结束，`editor.createShape()` 把提炼知识生成卡片摆上画布（「沉淀」动作）
- 数据：Board 快照存 PG JSONB；**v1 不做实时协作**（单用户够用），保留 @tldraw/sync 迁移口
- ⚠️ **许可闸门**：tldraw 为 open-core 许可，SaaS 商用条款必须先确认（P0 第一道闸）

## 4. 分期（每期带用户视角效果）

### P0 · 技术验证（先于一切）
- [ ] tldraw 商用许可条款确认（open-core 对 SaaS 的限制）→ **决定底座去留**
- [ ] tldraw demo：前端装 SDK，跑通最小无限画布（拖拽 / 缩放 / 存快照）
- [ ] 自定义 shape 原型：KnowledgeCard / ConceptNode
- 用户视角：无（纯内部验证）；验收 = demo 可在浏览器跑 + 许可结论白纸黑字

### P1 · MVP（learn space 内嵌 Board）
- [ ] learn space 数据模型 + 路由（Board 归属 learn space）
- [ ] 对话「沉淀」动作：回合结束生成 KnowledgeCard 上板
- [ ] ConceptNode 绑定 learner 掌握度（图谱可视化第一步）
- [ ] Board 快照 PG 持久化
- 用户视角：**在 learn space 里看到一块画布，跟 AI 对话后知识自动变卡片长在画布上**
- 验收：UX 剧本「问一句 → 卡片上板 → 拖拽整理」

### P2 · 增强
- [ ] 笔记本（Board 片段聚合 → 导出 PDF / 打印）
- [ ] 复习卡片上板（到期卡片以卡片形态进入画布）
- [ ] @tldraw/sync 实时协作（多端 / 双 dev）
- 用户视角：画布可导出成实体笔记；复习与画布打通

### P3 · 图谱一体化（远期）
- [ ] 语义连线绑定 KST 边，画布 = 图谱的自由表达
- [ ] AI 自动排版 / 组织画布（讲完一章自动摆图）
- 用户视角：打开 Board 就是你的知识地图，AI 帮你越摆越清晰

## 5. 风险与决策点

| 风险 | 等级 | 对策 |
|---|---|---|
| tldraw 许可限制 SaaS | 高（P0 闸） | 许可条款确认；不行则退 Excalidraw / 自研 subset |
| Board 数据膨胀（快照 JSONB） | 中 | 卡片结构化存储 + 快照瘦身；分片 |
| 画布性能（千级元素） | 中 | tldraw 四叉树 + 视口虚拟化内建；实测 |
| 与 Hermes 图谱绑定复杂度 | 中 | P1 只做掌握度显示，连线留 P3 |

## 6. 待拍板项

1. **组件清单**（§2.1 五个 + §2.3 三个）是否符合预期？
2. **tldraw 作为 Board 底座**是否同意？（同意 → P0 深挖许可 + demo）
3. 「对话 → Board 沉淀」核心关系是否正确？
4. 分期粒度（P0-P3）是否合适？
