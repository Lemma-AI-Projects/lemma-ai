# 数据集映射 · 现有记录 → 五类范畴

> 只读映射，**没有修改 `synthetic-trajectory-data.json`**（快照见 `synthetic-trajectory-data.round1.json`）。
> 依据：`taxonomy-specification.md` v0.1。凡是映射需要"改数据"的地方，一律写成建议，不落地。

---

## 1 · 总表

| 现有数组 | 条数 | 落到哪一类 | 映射难度 |
|---|---|---|---|
| `materials` | 29 | I-a Material | 干净 |
| `learning_experiences` | 6 | I-b Learning Experience | 干净 |
| `projects` | 7 | I-c Project | 干净 |
| `outputs` | 12 | I-d Artifact | 干净 |
| `focus` | 7 | I-e Focus | 干净（需补 `absorbed` 生命周期值） |
| `interests` | 10 | I-f Interest | 干净 |
| `goals` | 11 | I-g Goal | 干净 |
| `activities` | 135 | II-a Activity | 干净**除了 `learned` 字段**（§5-1） |
| （无独立数组） | ~22 | II-b Transition | **目前只是对象上的状态字段，不是事件** |
| `milestones` | 9 | II-c Milestone | 干净（`planned_date` 与 Goal 有重叠，§5-3） |
| `evidence` | 25 | III Evidence（24）+ IV Interpretation（1） | 1 条要改类（`ev-18`） |
| `insights` | 13 | IV Interpretation | 干净 |
| `evidence_relations` | 11 | 关系，不是实体 | 干净（其中 1 条极性建议删除，§5-2） |
| `periods` | 6 | **不属于五类**：时间上的分段视图 | 见 §4 |
| `corrections` | 6 | **不属于五类**：记录层操作 | 见 §4 |
| `external_records` | 6 | 混合（§4） | 最脏 |
| `loose_clusters` | 2 | **不属于五类**：分组视图 | 见 §4 |
| `person` | 1 | **不属于五类**：根节点 | 见 §4 |
| `_meta` | 1 | 文档 | — |

**映射后的数量**：对象 82 · 事件 166（135 活动 + 22 转变 + 9 里程碑）· 证据 24 · 解释 14 · 状态 0（派生）。

---

## 2 · 干净落位的记录

### 2.1 对象（82 条全部干净）

| 类 | 代表 | 为什么干净 |
|---|---|---|
| Material | `mat-09`《数学：确定性的丧失》（读 30% 放弃） | 作者不是他、独立于课程存在、有开始与最后一次交互 |
| Learning Experience | `lx-04` 理解人的意识（无结束日期） | 有意图（"这个问题我没法推给别人"），允许不结束 |
| Project | `prj-05` 笔记库（213 天，强度从周 8 条掉到月 2 条） | 有开发史、有状态、**不是**那个笔记库文件本身 |
| Artifact | `out-03` 未发布的博客草稿 | 有边界、是他写的；"没发出去"不影响分类 |
| Focus | `foc-02` 表征的跨域用法（02-13 → 仍在） | 有起止、不绑单一项目、横跨 3 个项目 + 2 段经历 |
| Interest | `int-01` 神经渲染（强→弱） | 不需要起止，允许变冷 |
| Goal | `goal-06` 把 GEB 读完（12-31 截止，停滞） | 有意图、有截止日、可以被完成或放弃 |

### 2.2 事件（活动 135 条中 135 条干净，转变 22 条是"补出来的"）

- **活动 135 条全部可落位**：`type` 十个值直接对应 II-a 的子类型，`ts` 提供时间点。
- **里程碑 9 条全部可落位**：`ms-*` 本来就是"被标记的时间点"。
- **转变 22 条不是现成记录**，是从对象字段里读出来的：

| 来源字段 | 条数 | 例子 |
|---|---|---|
| `goal.status` + `abandoned_at/completed_at/reformulated_at` | 7 | `goal-02` 4-20 放弃 · `goal-01` 9-05 改口径 |
| `interest.status` + 退役日 | 1 | `int-07` 9-02 退役 |
| `focus.status` + `to` / `absorbed_into` | 6 | `foc-03` 5-24 被吸收 |
| `project.status` + 完成/归档日 | 4 | `prj-01` 5-26 归档 |
| `insight.user_status` + 回应时间 | 4 | `ins-04` 5-24 被否 · `ins-10` 4-28 撤回 |

⚠️ **这 22 条今天没有 id、没有独立时间戳、不能被引用。** 它们是"对象上的一个日期字段"，
不是"一条可以被指向的事件"。这正是 `evidence-flow.md`:326 说的 State Change 缺失的具体形态。

---

## 3 · 有多个语义角色的记录

同一对象被多条线引用，**不复制对象**（`trajectory-inputs.md` §4.5）。

| 记录 | 角色 1 | 角色 2 | 角色 3 | 角色 4 |
|---|---|---|---|---|
| `mat-19` Bengio | Material | `lx-01` 与 `lx-04` 的读物 | `prj-05`/`prj-06` 的引用 | `ev-15`（pending）的落点 |
| `prj-01` recon-lab | Project | `lx-05` 的载体 | 4 条证据的来源 | `foc-01` 的主体 + 3 件产出的容器 |
| `prj-07` repr-view | Project | Artifact 的生产者 | `ev-17`/`ev-24` 的对象 | **`ins-13` 的反例**（系统说"零投入"） |
| `out-09` 长文草稿 | Artifact | `ev-10` 的载体 | `ins-08` 的产物 | `goal-07` 的进度 |
| `act-112` 消融 | Activity | `ev-22` 的来源 | `foc-07` 的一部分 | **什么也没证明** |
| `ev-06` 定位收敛 | Evidence（Behavioral） | 与 `mat-27`（issue #214）构成"独立性打折" | `rel` 无 | — |
| `foc-04` 补数学 | Focus | 5 条活动 + 2 件材料的组织者 | **`related_interests: []`** | — |
| `act-073` 答辩 | Activity | `ms-05` 的来源 | `ev-09` 的来源 | `foc-07` 的终点 |

这八条都能用一套 id 表达四种角色。**没有一条需要复制。**

---

## 4 · 落不进五类的记录

| 记录 | 它其实是什么 | 为什么不进五类 | 建议 |
|---|---|---|---|
| `person` | 根节点/上下文 | 它不是"发展中的对象"，它是那个在发展的人 | 保留为文档头，不做实体 |
| `per-01`…`per-06` | **时间上的分段视图** | 有起止、有标签，但它不"发生"，也没有身份 | 保留为视图；若要做成实体，就是给每个季度造一条假事件 |
| `cor-01`…`cor-06` | **记录层操作** | 7-02 那天他没有发生任何事（`cor-05`） | 进 Provenance 维度，不上发展时间轴 |
| `loose_clusters` | **分组** | 8 条因果活动没有意图、没有起止 | 保留为视图；它是 §2.1 I-b 的反例 |
| `evidence_relations` | 关系 | 关系不是实体 | 直接就是 §4 的关系表 |
| `ext-01` GitHub 87 次提交 | **聚合观察** | 它是 87 件事的摘要，不是一件事 | 拆或不拆是未决问题（spec §7-1） |
| `ext-05` 报了一门课只看 1 讲 | 外部事件（Activity）+ 授权缺口 | 一次活动 + 一条"系统不知道" | 按 Activity 处理，另记 `observed_via: F` |
| `ext-06` 申请截止日 | 外部约束（不是目标、不是里程碑） | 它不在他的意图里，是别人定的日期 | 见 §6-6：今天没有位置 |

**结论**：五类之外还需要两样东西——**视图**（period、cluster、trend）与**记录层**（correction、revision）。
两者都不是实体，都是"看它的方式"。把它们做成实体，是这类系统最常见的一次膨胀。

---

## 5 · 现有表示里混在一起的概念

### 5-1 `activity.learned`（影响 90 条活动）

```
"learned": "yes" | "no" | "partial" | "unknown"   →  yes 35 / no 20 / partial 35 / unknown 45
```

**它把一次判断塞进了一条事件。** "他这次学会了"不是观察，是解释。
按本规范，这 90 条各自应该变成：Activity（保留）+ 至多一条 Interpretation（如果当时真的有人下了判断）。

⚠️ 更麻烦的是：**其中 55 条（yes + no）在证据表里没有任何对应行**。
也就是说这些判断今天无法追溯——它们是"凭印象打的勾"，正是 `adaptive-insight.md` §4.5 要防的东西。

### 5-2 `evidence.verdict` 一个枚举装两件事（影响 25 条）

| 现值 | 其实是 outcome | 其实是 admission |
|---|---|---|
| supported / unsupported / partially_supported | ✅ | |
| inconclusive | ✅ | |
| **ungradable** | | ✅ |
| **pending** | | ✅ |
| **not_evidence** | | ✅ |

后果：`ev-14`（答"我不知道"）今天只能显示成"不可评分"，而这个值在同一条枚举里和"答对了"平级，
UI 一排序就会把它当成"最差的一档"。拆成两字段后它是 `admission: ungradable` + `outcome: ∅`。

### 5-3 Goal 与 Milestone 的日期重叠（影响 11 + 9 条）

`goal.deadline`（11 条有）与 `milestone.planned_date`（7 条有）是同一件事的两种记法。
`ms-01` 计划 2-15、`goal-04` 截止 2-15 —— **同一个日期写了两遍**。
建议：计划日期只存在里程碑上，目标只保留"有没有截止日"。

### 5-4 三处都在说"完成了"

`goal-03.status = completed` / `prj-02.status = completed` / `ms-05`（答辩通过）——
三处记录同一次完成。它们不是重复，是三个视角（意图 / 投入 / 时间点），但**必须有一个是权威**。
今天的规则是：谁也不知道。改状态时只能靠人记得改三处。

### 5-5 `insight.related_evidence` 与 `evidence_relations` 两套说法

`ins-02.related_evidence: [ev-03, ev-08]` 是手写的；`rel-01`/`rel-02` 是结构化的。
两套现在一致，但**没有规则保证它们一致**。建议：`related_evidence` 降为派生视图。

### 5-6 `evidence.activity` 是单值，但两条活动都声明了同一条证据

`act-108` 与 `act-124` 的 `evidence` 都含 `ev-19`，而 `ev-19.activity` 只能指向一个（`act-124`）。
今天靠"人是讲道理的"蒙混过去。**建议加 `activities: []` 多值，或明确"证据只挂最后一次观察"。**

### 5-7 `focus.activities` 是派生字段

由 `activity.focus` 反向生成（构建脚本里做的）。方向必须写死：**活动侧是真相，线索侧是索引**。
若两边都手写，迟早打架。

### 5-8 `ext-01` 一条记录代表 87 件事

`observed_pattern` 里写"1 月 41 次、2 月 19 次…"。这是一种**统计摘要伪装成事件**。
它在时间轴上会变成一个点，而它实际上是五个月的分布。

### 5-9 `ins-13` 与 `ext-01` 的因果误读

`ins-13`（"5-22 之后零投入"，confidence: high）的依据就是 `ext-01` 的提交历史。
**一条聚合观察被当成了完整证据**，于是得出"零投入"。这不是字段问题，是分类问题：
`ext-01` 是 Behavioral Evidence 的**一部分**，不是全部。

---

## 6 · 缺信息导致无法可靠分类

| # | 缺什么 | 影响哪些记录 | 后果 |
|---|---|---|---|
| 1 | `produced_by`（谁产生的） | `ev-20`（朋友的批评） | 今天只能标 `input_source: C`，读起来像"系统判的" |
| 2 | 系统解释的**规则编号**（S1/S2/S3） | 8 条系统解释 | 无法回答"这条是怎么来的"，`adaptive-insight.md` §4.2 要求可追溯 |
| 3 | `admission`（独立于 outcome） | 25 条证据里的 3 条 | "没测出来"和"测了不会"分不开（§5-2） |
| 4 | 时间精度 | 只有 `act-105` 有 | 其余 134 条活动的时间精确到分钟，**这是假的精度** |
| 5 | 状态快照 | 全部 | Competency State 无法算（`learner-state.md`：状态不存历史） |
| 6 | 时长 / 投入量 | 全部 | Behavioral Evidence 只能数次数，不能算强度 |
| 7 | 产出的**贡献度**（谁做了多少） | 12 件产出 | `out-07`（翻译一页文档的 PR）与 `out-04`（38 页论文）在数据里长得一样重 |
| 8 | 推断型兴趣的证据指针 | `int-04`、`int-05`、`int-09` | 兴趣条上说"从行为推断"，但没有一条证据能点回去 |
| 9 | `ext-06`（外部截止日）的位置 | 1 条 | 它既不是他的目标，也不是他的里程碑，但它在影响他的决定 |

第 7 条最要紧：`trajectory-inputs.md` §4.4 说「Artifact ≠ Capability」，而数据里**没有任何字段能表达"这份产出里有多少是他的"**。
所以今天所有 Artifact Evidence 都只能停在"东西存在"，不能更进一步——这不是数据编得不够，是产品确实没有这个信号。

---

## 7 · 映射后的分布

| 类 | 数量 | 备注 |
|---|---|---|
| I 对象 | 82 | 7 种：29 / 6 / 7 / 12 / 7 / 10 / 11 |
| II 事件 | 166 | 活动 135 · 转变 22 · 里程碑 9 |
| III 证据 | 24 | Performance 5 · Reasoning 7 · Artifact 5 · Behavioral 5 · pending 2 |
| IV 解释 | 14 | 13 条 insight + `ev-18`（自述改类） |
| V 状态 | 0 | 五个投影，全部派生 |

四种证据种类的分布本身就是一条结论：**Reasoning 7 条、Artifact 5 条、Behavioral 5 条、Performance 5 条**。
看起来均衡，但 24 条摊在 10 个月里，每月 2.4 条。这个密度不足以支撑任何"能力曲线"，
只够支撑"某几件事上，他做过什么"。
