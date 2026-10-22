# docs · Lemma AI 文档中心

> 2026-10-21 建立。**从这里开始找任何文档。**
> 这个目录从今天起**入库**（`.gitignore` 那三条旧规则已删，理由写在 `.gitignore:3-8`）。

## 六个问题，各自去哪

| 你要找 | 去哪 |
|---|---|
| **已经定下来的决策** | [`decisions/`](decisions/) —— 每份都标 Accepted / Provisional / Open |
| **正在研究的问题** | [`research/README-rnd-programme.md`](research/README-rnd-programme.md)（研究索引）· [`planning/research-cycle-01.md`](planning/research-cycle-01.md)  · 原型计划见 [`planning/`](planning/)（space-canvas · focus-activity）|
| **研究方法** | [`methodologies/rnd-methodology.md`](methodologies/rnd-methodology.md) |
| **产品与交互设计** | [`design/`](design/) |
| **系统契约与组件边界** | [`architecture/`](architecture/) · 证据层 [`evidence/`](evidence/index.md) · 语音层 [`voice/`](voice/index.md) |
| **历史与被取代的东西** | [`archive/`](archive/) —— 保留理由，不删 |

还有两个必须知道的位置：

- **`planning/vision-gaps.md`** —— 愿景承诺 vs 代码现实。**任何"还差什么"的问题先看这份。**
- **`index.md`** —— 阅读约定（代码是唯一事实来源；每份文档标分支/日期/状态）。

## 目录

```
docs/
├── README.md            ← 你在这里
├── index.md             ← 阅读约定（先读它再读任何设计文档）
├── decisions/           ← 决策记录（2）
├── research/            ← 研究、调研、现状报告（6）
├── methodologies/       ← 可复用的研究方法（1）
├── design/              ← 产品与交互设计（6）
├── architecture/        ← 系统契约与边界（5）
│   ├── evidence/        ← 证据层（5，有自己的 index）
│   └── voice/           ← 语音层（5，有自己的 index）
├── planning/            ← 路线、研究周期、原型计划、缺口（4）
└── archive/             ← 历史材料（6，不删）
```

⚠️ **没有 `experiments/`** —— 一个实验都还没跑过。空目录比没有更误导：它会让人以为那里有东西。
第一次实验有结果时再建。

## 决策的状态词

`decisions/` 里的每一条只能是四个状态之一：

| 状态 | 意思 | 什么能改它 |
|---|---|---|
| **Accepted** | 定了，别在路过的时候重新讨论 | 一条新的、有日期的决策 |
| **Provisional** | 按它做事，但别在它上面签合同 | 证据，或一条明确的决策 |
| **Open** | 真的没定。**不要在代码或文档里悄悄解决它** | 一条记录下来的发现 |
| **Superseded** | 被另一条取代 —— 原文保留，加链接 | 不用再改 |

要点：**每条 Accepted 决策都带一个"什么能推翻它"**。没有推翻条件的，是偏好，不是决策。

## 怎么写新文档

1. 先读 [`index.md`](index.md)（阅读约定）和本文件的目录表。
2. **先搜**：`grep -r "<关键词>" docs/` —— 现在根目录一份 md 都没有，所以搜索是有效的。
3. 能改现有的就改现有的。**同一件事不要有第二份文档。**
4. 只有在下面是**不同种类的知识**时才新建：
   - 是不是决策？→ `decisions/`
   - 是不是研究过程/发现？→ `research/`
   - 是不是"怎么研究"？→ `methodologies/`
   - 是不是"用户会看到什么"？→ `design/`
   - 是不是"系统怎么保证"？→ `architecture/`
   - 是不是"接下来做什么"？→ `planning/`
5. 新文档**开头四行**必须写：`> 分支 · 日期 · 状态（事实/约定/未定）· 上游依赖`
6. 状态没定就写"未定"。**猜出来的结论比没有结论更贵。**
7. 加进本文件的目录表；如果是决策，加进 `decisions/` 的索引。

不需要模板、审批或元数据系统。**四行头 + 一次 grep** 就够了。

## 这一轮做了什么（2026-10-21）

**迁移**：根目录 22 份 md 全部搬进 `docs/`（`git mv`，历史保住了）。`docs/` 原有的
`evidence/` `voice/` 两份子系统保留在原位（它们有自己的 index，且有内部相对链接）。

**改了一条仓库规则**：`.gitignore` 里 `/docs/*` + 三个具名放行删掉了 —— 那条规则写着
"docs 多为本地草稿，不入库"。搬进来之后那个理由不成立了：如果继续忽略，这次迁移等于
**把文档从仓库里藏起来**。

**没做的事**（有意）：
- 没有拆出 8 个子目录。`experiments/` 空、`decisions/` 只有 2 份 —— 空的和只剩两份的
  目录不单独建 README，在本文的目录表里直接列。
- 没有重写任何文档内容。搬动 = 换路径，正文一个字没改（`git mv` 的 diff 是 `similarity 100%`）。
- 没有搬 `.workbuddy/` 里的东西 —— 见下。

## ⚠️ 一个 unresolved 的问题：`.workbuddy/` 里有一批真设计文档

`D:/github projects/lemma-ai/.workbuddy/research/` 下至少 12 份，包括
`focus-mode-design.md` · `mala-design.md` · `method-system-design.md` · `learn-space-design.md` ·
`learn-space-lifecycle-reference.md`（1117 行的 TOEFL 全生命周期推演）· `goal-system-design.md`。

**它们是这个仓库最有价值的一批设计推理，且不在仓库里**（`.workbuddy/` 整目录 gitignore）。

这次**没有搬**，原因只有一条：`.workbuddy/` 是 tooling 的工作目录，里面同时有会话记忆、
本地数据库、临时脚本 —— 整体搬会带进不该进仓库的东西；逐份搬需要先判断哪些是"给人读的设计"、
哪些是"给 agent 读的上下文"，这个判断不该在文档整理任务里顺手做掉。

→ 建议单独立一次任务：逐份过，把设计类搬进 `design/` 或 `research/`，其余留在 `.workbuddy/`。
