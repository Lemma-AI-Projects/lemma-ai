# 决策日志 · User Trajectory 分类

> 2026-11-02 · 五档，不混写。每条都带：**依据**（文档行/数据 id）与**可被什么推翻**。
> "已确认"= 别处已经定过，我不重新决定；"强建议"= 我认为该这么定，但没人批过；"工作假设"= 先这么用，能被证伪。

---

## 1 · 已确认（Confirmed Decisions）

这些不是本文的发明，是从既有文档里读出来的。本文只是**遵守**它们，并在冲突处标出来（见 §2-13）。

| # | 决定 | 依据 |
|---|---|---|
| C-1 | **Trajectory 是投影，不是第二套语义库** | `architecture/evidence-flow.md`:315 |
| C-2 | **状态派生、不缓存、不外流任何数值** | `architecture/learner-state.md` §1（三条红线） |
| C-3 | **「答错」是 Evidence；「待确认困难」是 State；「他不理解」是 Interpretation** | `evidence-flow.md` §1.1 |
| C-4 | **来源 ≠ 类型；"谁断言的" ≠ "从哪个面看到的"** | `trajectory-inputs.md` §4.1 / §4.3 |
| C-5 | **活动 ≠ 证据**，中间有准入这一步（`admit_outcome`，`UNBINDABLE` 不写证据） | `trajectory-inputs.md` §2.B / §4.2 |
| C-6 | **产出物 ≠ 能力**（Artifact ≠ Capability） | `trajectory-inputs.md` §4.4 |
| C-7 | **一个对象可以有多个语义维度**，分类是视角不是列 | `trajectory-inputs.md` §4.5 |
| C-8 | **不采用固定认知层级 / 永久人格标签 / 百分比** | `design/adaptive-insight.md` §3 |
| C-9 | **"不生成"是一等结果** | `adaptive-insight.md` §4.5 |
| C-10 | **一条启示必须能展开看见它引用的那几行证据** | `adaptive-insight.md` §5 C-1 |
| C-11 | **布局：纵向时间 × 横向 focus；不画依赖树（会编造因果）** | `design/trajectory.md` §3 |
| C-12 | **"干预对象"是分类轴不是层级**（知识/推理过程/表达/策略/元认知/情绪与坚持） | `adaptive-insight.md` §3 |

**C-1 到 C-12 没有一条被本文改动。** 本文改的全部在 §2。

---

## 2 · 强建议（Strong Recommendations）

按"改了会怎样"排序。每条都写了**我为什么认为它对**与**代价**。

### R-1 · 把 Project 与 Artifact 拆成两类

- **依据**：12 件产出里 3 件没有项目（`out-07` PR、`out-12` 没发的邮件、`out-11` slides）；
  6 条证据挂在产出上（`ev-04/09/16/17/24`），只有 1 条间接指向项目。
- **理由**：项目有开发史、有状态；产出物有边界、能被打开。C-6 要求"产出不等于能力"，
  那就必须先有一个"产出"的对象，否则这句话没有主语。
- **代价**：多一个概念。用户要理解"我做的东西"和"我做的这件事"不是一回事。

### R-2 · 删掉 "Learning Event"，理解/突破归入 Interpretation

- **依据**：`evidence-flow.md` §1.1（C-3）；数据集里"突破"从来不是观察，是 `ins-08` 这类带日期的判断。
- **理由**：没有人能观察一次理解。留着它，第四问必然变成编故事。
- **代价**：时间轴上少一种节点。补偿是解释自带日期，仍然落在轴上，但显示为"被断言"。

### R-3 · 把 Reflection / Correction / Withdrawal 拆到三个层

| 原提案 | 归到 | 依据 |
|---|---|---|
| Reflection | II-a Activity（type=reflect） | `act-058`、`act-081`、`act-101` 都是他做的事 |
| Correction | **记录层**（Provenance） | `cor-05`：7-02 那天他没发生任何事 |
| Confirmation / Withdrawal | User Control 维度 + II-b Transition | `ins-04` 5-24 被否、`ins-10` 4-28 撤回 |

- **代价**：多了一个"记录层"的概念。它是本文最不受欢迎的一条建议——但它挡不住：
  `act-064` 的日期是错的，真值在 `cor-05` 里，这两条不属于同一个层。

### R-4 · 证据四种，去掉 External 与 Self-reported

- **External**：`trajectory-inputs.md` §4.1（C-4）已经说了来源不是类型。`ev-20` 是 Reasoning，来源是第三方。
- **Self-reported**：`trajectory-inputs.md` §2.A 说"明示信息对'他说了什么'是权威的，对'是不是真的'不是"。
  数据集 `ev-18` 已经把它判成 `not_evidence`。⇒ 它是用户的解释，不是证据。
- **代价**：与提案分歧最大的一处。若产品坚持要有"自述"，唯一可接受形态是
  `kind: self_report` + `admission: not_admitted`，且**永不计入状态计算**。

### R-5 · 解释只有一种，靠三个维度区分

`asserted_by`（谁说的）× `subject`（关于自己/作品/世界）× `about`（C-12 的六轴）。
Insight / Claim / Hypothesis / Reflection 都落在这三个维度上；**Trend 不是实体**（见 §5）。

- **代价**：产品文案会失去"这是一条洞察"这种说法。用户看到的是句子，不是类型名——这可能是好事。

### R-6 · 状态全部降为投影

五个配置：Knowledge / Competency / Interest / Goal / Project；**Learner State 是它们的合成，不是同级**。
- **依据**：C-2。`evidence-flow.md`:326 承认 State Change 缺失，根因就是状态不存历史。
- **代价**：状态变化无法作为一个对象被引用。要让它上时间轴，只能写成带日期的解释（`ins-12`）。

### R-7 · 关系从 12 条收敛到 11 条

| 动作 | 关系 | 理由 |
|---|---|---|
| 保留 | engages_with / belongs_to / produces / supports / contradicts / qualifies / derived_from / supersedes / transitions_to | 数据集全用到 |
| **加** | `weakens` | `rel-04/07/08` 三条都在用；与 contradicts 语义不同（降置信 ≠ 不能共存） |
| **加** | `merges_into` | `foc-03`、`foc-05` 被吸收；supersedes 不合适（两边都还在） |
| 删 | `associated_with` | 什么都能表示 = 什么也没表示 |
| 删 | `evidenced_by` | 与 supports 同事实的两方向，留一个 |
| 删 | `advances` | 无可验证语义 |
| 删（数据侧） | `inconclusive` 作为极性 | 那是证据的 admission，不是它对解释的态度 |

允许 `contradicts` 用在 **解释 ↔ 解释** 上（`ins-07` ↔ `ins-13`）。

### R-8 · Epistemic 四值：observed / stated / inferred / imported

去掉 `hypothesized`（那是置信度）；把 `self-reported` 与 `stated` 合并；加 `imported`（6 条外部记录需要）。

### R-9 · Lifecycle 加两个值：`absorbed`、`retired`

`foc-03`/`foc-05` 是被吸收，不是完成也不是放弃；`int-07` 是退役，不是放弃（放弃是他决定的，
退役是一个说法不再成立）。

### R-10 · User Control 加两个值：`unreviewed`、`partially_corrected`

8 条系统解释里 4 条从未被看过。没有 `unreviewed`，"没被否"会被读成"是对的"——
而其中 1 条（`ins-13`）明确是错的。`ins-05` 是部分更正：他只改了周数，没回应结论。

### R-11 · Origin 拆成两个字段

`produced_by`（user / lemma / third_party / external_system）× `observed_via`（A–F，沿用不新建）。
- **依据**：C-4；`ev-20` 是朋友的批评，用三值会把它归成"用户说的"。

### R-12 · Temporal 加 `precision`

`act-105` 的"三月中某天"与"3-13 16:20"不是同一种事实。缺精度只能二选一：假装精确，或丢掉。

### R-13 · 承认存在"记录层"，与发展层分开

记录层 = 关于记录本身的记录（`cor-*`、`revisions[]`、`supersedes`）。
它不占发展时间轴，但必须能从被更正的记录上点过去。
- **依据**：`cor-05`（act-064 的日期）。这是原提案完全没有的一层。

### R-14 · 把 `verdict` 拆成 `outcome` + `admission`

`ungradable` / `pending` / `not_evidence` 不是"结果差"，是"没有结果"。
今天它们和 `supported` 排在同一个枚举里，一排序就把 `ev-14`（答"我不知道"）排成最差的一档。

---

## 3 · 工作假设（Working Hypotheses）

先按这个用。每条都写了**什么会推翻它**。

| # | 假设 | 会被什么推翻 |
|---|---|---|
| H-1 | **五个主范畴够用** | 出现一条记录，既不持续存在、也不发生在某一刻、也不是证据、也不是判断 —— 16 个压力测试里没有出现 |
| H-2 | **Focus 是横向切分的正确单位** | 若一个空间有 8 条以上线索，横向列布局失效（`trajectory.md` §3 自己承认了这个上限） |
| H-3 | **自述移进 Interpretation 不丢表达力** | 若产品需要"用户说 X"与"系统测到 Y"并列比较，而并列需要它们同类 |
| H-4 | **一种解释能覆盖 insight / claim / hypothesis / reflection** | 若真实文案里出现"这不是判断，只是一个问题"（见 Q-6） |
| H-5 | **22 条转变可以从对象字段里读出来，不丢信息** | 若某次转变需要自己的原因、作者、附注（`goal-05` 9-01 关闭时没有任何理由记录 —— 已经是一个苗头） |

---

## 4 · 未决（Open Questions）

不假装有答案。每条写清"卡在哪"。

| # | 问题 | 卡在哪 |
|---|---|---|
| Q-1 | `ext-*`（87 次提交压成一条）要不要拆成逐条事件？ | 不拆看不到"哪天做了什么"；拆了一次同步淹没一周。粒度与事件不对等（ST-15） |
| Q-2 | 自述到底进 III 还是 IV？ | 见 R-4；这会影响已有的 `ev-18` |
| Q-3 | 一条 Focus 可以完全没有对应兴趣吗？ | 数据说可以（`foc-04`），产品词表未必接受"没有主题的线索" |
| Q-4 | 同一件事被两个来源描述时怎么合并？ | `trajectory-inputs.md` §5-6 至今无规则；本文也没给 |
| Q-5 | 解释能不能被"部分撤回"？ | `ins-05` 的 `partially_corrected` 是用户控制值，不是解释的语义状态 |
| Q-6 | `adaptive-insight.md` 的第二种表达 `question`（提一个开放问题）算不算一种对象？ | 如果算，"解释"这个类要容纳一个不带断言的言语行为 |
| Q-7 | 状态变化归谁？ | 状态不存历史（C-2），所以"变化"只能是比较或解释。产品要不要专门为它写一条解释？ |
| Q-8 | `loose_cluster` 是对象还是视图？ | 本文说是视图；但没有它，8 条因果活动无处安放 |

---

## 5 · 已否决的替代方案（Rejected Alternatives）

写在这里是为了防止换个名字回来。

| 方案 | 为什么不采用 |
|---|---|
| **把"理解/突破"做成事件** | 不可观察。留着它，第四问必变成编故事（R-2） |
| **Trend 做成实体** | 25 条证据 / 10 个月，两个点连成线就是编。它只能是视图 |
| **状态存历史，好画曲线** | 违反 C-2；而且 `evidence-flow.md` §7 说今天只能测"短期答对"一种结果 |
| **Focus 作为 Interest 的下位类** | `foc-04` 没有对应兴趣；`foc-06` 关闭 135 天后 `int-07` 才退役 |
| **把 External 当作证据种类** | 违反 C-4。下一次"从 GitHub 导入的一次作答"就无处可放 |
| **把 Self-reported 当作证据种类** | 违反 C-3 的同类推理；`ev-18` 已经是 `not_evidence`（若 R-4 被否，用"自述 + not_admitted"的降级方案） |
| **每个对象都带四个时间戳** | 135 条活动里只有 1 条需要 `recorded_at`。全加上等于用结构假装严谨 |
| **`associated_with` 这种万能关系** | 什么都能表示 = 什么也没表示 |
| **能力分数 / 掌握度曲线** | 违反 C-2 与 C-8；数据密度也不支持 |
| **单独设一个 "Course" 对象** | Learning Experience 已经覆盖，且 `lx-04`（问题驱动）根本不是课程 |
| **为每个角色复制对象**（一本书在每门课里存一份） | 违反 C-7；`mat-19` 一个 id 撑起 5 个角色 |
| **加第六个主范畴 "External Record"** | 它是证据或事件，只是来源不同。加一个主类来装来源，是把来源当成了语义 |
| **给解释加"层级"（浅→深）** | 违反 C-8，且 `adaptive-insight.md` §3 明确写过"层次会诱导我们把缺数据包装成高一层" |

---

## 附 · 十条标准的评估（不属于决策，写在最后备查）

见对话正文。结论：**9 条成立或带条件成立，1 条（User Understandability）不成立**。
分类骨架扛得住，最弱的是"用户看得懂"与"记录层"，不是五个主范畴本身。
