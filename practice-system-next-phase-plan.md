# Practice System — 下一步实施计划

> **分支** `practice-system` @ `5c67a7c9` · **日期** 2026-11-11
> **上一轮已完成** Phase 0/1/2（契约 + 迁移 + smoke 跑通）
> **本文件**：Phase 3–6 的计划。⚠️ **代码现实已重新核对，两处结论与上一轮的报告不同。**

---

## 0 · 先纠正上一轮的两个说法

⚠️ **不重新核对就会把计划建在错的假设上**，所以先写这两条。

### 纠正 1 · `questions.objective` 不是学习目标，是 **boolean**

`models/question.py:51`：
```python
objective: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
```
实测 10 行**全为 `None`**。⚠️ 我在 `question-bank-current-state-report.md` §3.2 里写
「按 `objective` 或 `meta_json.kpoints` 反查」—— **`objective` 用不了，它不是文本。**

### 纠正 2 · 走不通的不是「守卫」，是 **fixture 数据里没有知识点**

| 来源 | 有知识点吗 | 实测 |
|---|---|---|
| `questions.meta_json->'kpoints'` | 🔴 **空数组** | `['[]', '[]']` |
| `questions.objective` | 🔴 boolean 且全 `None` | — |
| `qbank/xkw/types.py:115` | ✅ **解析器会读 `kpoints`** | ⚠️ **所以真实抓取可能有，是 fixture 没有** |
| **`course_lesson_objects.concept`** | ✅ **有真实值** | 见下 |

⇒ **上一轮报告说「今天题库的作答必然被守卫 ② 挡住」——结论对，理由说错了。**
⚠️ 守卫放行 `item_label`；**真正缺的是题目自带的知识点，而 fixture 没有。**

### 而 Free Course 有

```
course_lesson_objects  12 行（explanation 4 · practice 4 · assessment 2 · example 2）
带 concept 的            4 行，实测值：
  practice · 「系统要素识别 (System Element Identification)」
  example  · 「系统分析 (System Analysis)」
  explanation · 「系统 (System)」
  explanation · 「输入 (Input), 输出 (Output), 程序 (Processing)」
```

⚠️ **这改变了 Phase 3 的技术路线**（见 §1）。

---

## 1 · 核心判断：先接 Free Course，不是题库

上一轮我写过「要接一条，**先接题库那条**，因为它判分更可靠」。
⚠️ **这句话本轮要修正为：先接 Free Course 那条，因为它是今天唯一能接通的。**

| | 题库 | Free Course |
|---|---|---|
| 判分可靠性 | ✅ **更高**（纯确定性、逐槽位快照、无 LLM） | ⚠️ 混合（开放题交给模型）|
| **知识点来源** | 🔴 **fixture 里空的** | ✅ **`concept` 有真实值** |
| **能否今天验证真实回流** | ❌ 不能 | ✅ **能** |

⚠️ **判分质量更高 ≠ 能接通。可接通性优先。**
⇒ **Phase 3 走 Free Course**，并在 `detail` 里如实记 `method="mixed"` ——
**让两套证据的可信度差在数据里可见**，这正是 Foundation D 的目的。

---

## 2 · Phase 3 · Evidence 回流（**本轮重点**）

### 目标
**让一条真实的 Free Course 作答产生一行真实的 `knowledge_evidence`，并验证幂等。**
⇒ 直接对应验收 5 与 7（上轮两项都未达成）。

### 2.1 接线方案

```
CourseLessonObservation.verdict / is_correct / feedback
   ↓ from_course_observation()            ← 上轮已建，有测试
PracticeEvaluation(item_label=course_lesson_objects.concept)
   ↓ 守卫 ①：无信号 → 不写 ✅ 已实现
   ↓ 守卫 ②：无 item_id 且无 label → UNBINDABLE ✅ 已实现
submit_as_evidence(scope_ref=space:<project_id>)
   ↓ admit_outcome → knowledge_evidence → derive_state
```

⚠️ **`item_label` 是合法且正确的路径**，不是绕过：
`evidence_entry.py:131-133` 的原话是
> Either the resolved item, or a label the space resolves itself. The chat tool
> resolves first (it must not invent topics); **the REST surface speaks labels
> and lets the space create one.**

⇒ 传 `concept` **不是**我在猜知识点，是**课程自己声明的**。

### 2.2 关键约束（写代码时必须遵守）

| | |
|---|---|
| **不许猜** | `concept` 为 null 的 8 行 ⇒ **不写 Evidence**，返回 `UNBINDABLE` |
| **不许把 label 当成已掌握** | `concept` 是「这条练习测什么」，不是「用户会什么」⇒ label 只用于**让空间解析出 item**，状态仍由 `derive_state` 算 |
| **不许让 Profile 参与判分** | User Profile 的偏好**只影响呈现**（要不要先给提示），**绝不进 `verdict`** |
| **幂等** | 重跑同一条 observation ⇒ `DUPLICATE` 且 `knowledge_evidence` **总行数不变** |

### 2.3 具体动作

| # | 做什么 | 验收 |
|---|---|---|
| 1 | 写一个真库测试脚本 `scripts/smoke_practice_evidence.py`：取一条**带 concept 的 practice observation**，调 `submit_as_evidence(item_label=<concept>)` | 返回 `ADMITTED` |
| 2 | **立即重跑同一条** | 返回 `DUPLICATE`，`knowledge_evidence` **行数不变** ← **验收 5 第一次被真库证明** |
| 3 | 查库核 `response_ref` | 含 `surface='practice'` 且 `practiceRef` 指向该 observation id |
| 4 | 再跑一条 `concept is null` 的 | 返回 `UNBINDABLE`，**库里没有新行** ← **验收 6** |
| 5 | 核 `derive_state` 是否被触发 | `record_evidence` 之后应重算；**记录 Learner State 有没有变** |

⚠️ **测试数据隔离**：用 fixture 或**新建一个专用 profile**，不污染现有 22 个 profile。

### 2.4 这一轮能声称 / 不能声称

| | |
|---|---|
| ✅ 能 | 「一次 Free Course 作答产生了一行有来源的 Evidence」 |
| ✅ 能 | 「同一条重复处理不会产生第二行」 |
| ✅ 能 | 「没有知识点标签的作答不会产生 Evidence」 |
| ❌ **不能** | 「学习效果提升」·「迁移」·「保持」 |
| ❌ **不能** | 「Evidence 已经影响教学」—— `turn_start` 零生产者，决策层仍不问 |

---

## 3 · Phase 4 · Free Course 最小接入

| # | 做什么 | 注意 |
|---|---|---|
| 1 | 在 `free_course_service.submit_observation()` 之后**加一个可选钩子**，把新 observation 转成 `PracticeEvaluation` 并提交 | ⚠️ **默认关闭**（`context_kind is null` ⇒ 不提交）⇒ **不改变现有行为**（验收 8） |
| 2 | 只在 `practice` / `assessment` 类 object 上启用 | explanation/example 不是作答 |
| 3 | 记录 `context_kind='subcourse'` + `context_ref=<chapter_id>` | 用上轮加的两个 nullable 列 |
| 4 | 端到端测试：提交一次作答 ⇒ 库里有 observation **且** 有 evidence | — |

⚠️ **为什么加钩子而不直接改判分流程**：任务 §7 禁止「重写 Free Course 的练习系统」。
一个默认关闭的钩子**不碰任何现有路径**，而验收 8 要求「Free Course 原有练习体验没有被破坏」。

---

## 4 · Phase 5 · Integration Tests

| # | 测试 | 证明 |
|---|---|---|
| 1 | Free Course 提交作答 ⇒ observation 落库 | 验收 8 |
| 2 | 同上 ⇒ practice 侧**不重复**产生第二行 observation | 两条路径不互相破坏 |
| 3 | 题库 smoke 仍 ALL PASS | 验收 2 |
| 4 | 两套 adapter 对同一语义输入给出相同 verdict | 契约真的统一了 |
| 5 | 全量 `pytest` | 不回归 |

---

## 5 · Phase 6 · 文档与提交

| 产出 | 内容 |
|---|---|
| 更新 `question-bank-current-state-report.md` | ⚠️ **修正 `objective` 的描述**（boolean 不是文本） |
| 更新 `practice-system-foundation-report.md` | 补 Phase 3–4 的真实结果 |
| 提交 | 按阶段：Phase 3 一个 commit，Phase 4–6 一个 |

---

## 6 · 本轮不做（并说明为什么）

| | 为什么 |
|---|---|
| **XKW → Lemma 知识点映射** | §7 禁止大规模映射工程。⚠️ 但**「让题目带 Lemma item_id」是一个列的问题**（`questions` 加一列 + 组卷时写），不是映射工程 —— **值得单独一轮** |
| **AI 生成题目管线** | §7 禁止。⚠️ 但下轮可做**最小版**：一个 provider 实现 + 一个注册点，验证 §10「Practice 不需要知道来源」在数据层也成立 |
| **主观题判分** | §7 禁止 |
| **Subcourse / Daily Quiz 页面** | §7 禁止 |
| **给 `question_sets` 加 `project_id`** | 仍无第一个 surface 需要它 |

---

## 7 · 下一轮的最小用户可见闭环

⚠️ Phase 3–4 全部完成后，**第一个用户能看见的东西**应该是：

> **Free Course 做完一道练习后，页面底部出现一行**：
> 「这次作答已记入你的学习记录 · 测的是「系统要素识别」」
> —— 若知识点无法绑定，则显示
> 「这次作答已保存，但**暂时无法归到具体知识点**」

⚠️ **两个版本都必须做**：能绑定和不能绑定。
**只做能绑定的那一个，等于把 §5 那条禁令（不许为了显示闭环成功而强行绑定）又违反一次。**

---

## 8 · 需要你决定的一件事

⚠️ **已核实（2026-11-11 实测）**：

| 表 | 行数 |
|---|---|
| `course_lesson_objects` | **12**（其中 **4 行带 `concept`**）|
| `course_lesson_observations` | **0** |
| `question_sets` / `question_attempts` | **0** |
| `knowledge_evidence` | **4**（上一轮之前就有的 seed 数据）|

**Phase 3 的第 1 步依赖「有一条带 concept 的 observation」。**
而库里的 observation 是 0 ⇒ **需要先造一条**：

| 选项 | 说明 |
|---|---|
| **A** | 跑一次真实 Free Course 课程生成 + 答一题（需要模型凭证，且慢） |
| **B** | 用 fixture 直接插入一条 observation（快，但要标 `context_kind='manual'` 以便区分） |
| **C** | **先确认库里 observation 是否真的还是 0**（本文件写的是待核） |

⇒ **C 已做完**（见上表）：**observation 确实是 0**，而 lesson objects 有 12 行、
其中 4 行带 `concept`。

⇒ **所以 Phase 3 必须先造一条 observation。** 建议 **B**：用 fixture 直接插一条
（快、可控、标 `context_kind='manual'` 以便区分），而不是 A ——
因为 A 需要模型凭证且慢，而 Phase 3 要验证的是**回流链路**，不是**判分质量**。