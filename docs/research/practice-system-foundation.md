# Practice System Foundation — 实施报告

> **分支** `practice-system` · **基线** `41e06d51`（`user-profile`）
> **本轮提交** `4a72ae83`（Phase 1）
> **日期** 2026-11-11 · **零 UI 改动 · 零 Prompt 改动**

---

## 1 · Branch Information

| | |
|---|---|
| **分支** | `practice-system`（从 `user-profile @ 41e06d51` 切出） |
| **基线 commit** | `41e06d51` Find out the question bank was finished and never used |
| **本轮提交** | `4a72ae83` A shared contract for practice, and one door in front of the evidence system |
| **原工作区** | ✅ 未破坏。切分支前工作区**只有两个未跟踪产物**（`.shots/` 与我此前生成的 PDF），无未提交代码改动 |
| **合入 / 部署** | ❌ 均未执行 |

---

## 2 · Foundation Architecture

### 2.1 审计回答了六个问题

| 问题 | 回答 |
|---|---|
| **1 · 什么已有能力可直接复用？** | 全部：题目的版本化模型、确定性判分器（`qbank/grading/judge.py`）、会话与尝试模型、判分持久化、`evidence_entry.admit_outcome`、Free Course 的 `CourseLessonObservation` |
| **2 · 哪些职责被重复实现？** | **只有一处：判分结果的记录形状。** 题库存 `slot_results_json`（逐槽位 verdict + score），Free Course 存 `verdict` + `is_correct` + `feedback` ⇒ 同一个概念两套形状 |
| **3 · 哪些公共能力值得现在抽取？** | **只有「统一评价表示」**。其余（题目存储、组卷、判分）已有的比新写的完整，**重写就是本轮要避免的失败模式** |
| **4 · 哪些保留在 Free Course 内部更合理？** | **出题与判分管线全部保留。** 本轮只加一个翻译层（`from_course_observation`），不动它的任何流程 |
| **5 · 哪些现有 Schema 与未来需求冲突？** | ① `question_sets.origin_kind` CHECK 只允许 `'dev'` ⇒ 产品无法建组 ② `QuestionSet` **无 space 归属** ③ 组卷知识点是 **XKW 目录 id**，而 `knowledge_items` 是 Lemma UUID，**两套命名空间不通** |
| **6 · 当前最低成本的完整运行路径？** | **题库这条路已经通了**（见 §5），缺的只是把结果接到 evidence —— 而那需要 ③ |

### 2.2 最终采用的最小结构

```
                    ┌─────────────────────────────┐
                    │  PracticeEvaluation          │  ← 唯一的新概念
                    │  verdict: 不是布尔            │
                    │  supported / partially_      │
                    │  supported / unsupported /   │
                    │  ungradable / pending        │
                    │  method: 怎么判出来的         │
                    └──────────┬──────────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
  from_bank_grade                            from_course_observation
  （题库 · deterministic）                    （Free Course · mixed）
        │                                             │
        └──────────────┬──────────────────────────────┘
                       ↓
              ┌──────────────────┐
              │  两道守卫         │
              │ ① 无信号 → 不写   │
              │ ② 无知识点 → 不写 │
              │ 幂等：同 attempt 一次│
              └────────┬─────────┘
                       ↓
         evidence_entry.admit_outcome（**已有，未改**）
                       ↓
              knowledge_evidence → derive_state
```

**为什么是这个形状**：不是「新架构」，而是**一个翻译层 + 两道守卫**。
翻译层解决「两套判分结果形状不同」；守卫解决「不该进 Evidence 的别进」。

### 2.3 复用了什么 / 保留了什么

| | 决定 |
|---|---|
| 题目存储 | ✅ **原样复用**，一张新表都没建 |
| 判分器 | ✅ **原样复用**，没有重新实现任何判分 |
| 会话与尝试 | ✅ **原样复用** `question_sets` / `question_set_attempts` / `question_attempts` |
| Evidence 判定 | ✅ **原样复用** `admit_outcome` —— 门只有一扇，且不是我新造的门 |
| Free Course 出题/判分 | ✅ **原样保留**，只加翻译函数 |
| Provider 抽象 | ⏸ **本轮没做** —— 见 §6 的判断 |

⚠️ **XKW 仍是唯一的数据源，且本轮没有改变这一点。**
`services/practice/` 里**没有一处 import XKW** ⇒ Practice 契约本身与来源无关；
但**底层的题目仍然只来自 XKW** ⇒ 验收第 10 条（「Practice 不需要知道题目是否来自 XKW」）
在**契约层成立，在数据层尚未成立**。详见 §6。

---

## 3 · Implemented Connections

| 连接 | 状态 | 证据 |
|---|---|---|
| **Question Bank → Practice** | 🟡 **契约层成立** | `from_bank_grade()` 消费 `GradeResult`；`PracticeEvaluation` 不含任何来源信息 |
| **Practice → Attempt / Evaluation** | ✅ **成立** | `reference` 指向 `question_attempts.id` 或 `course_lesson_observations.id`；两个 adapter 都有测试 |
| **Evaluation → Evidence** | ✅ **门接好了，但此刻必然被守卫挡住** | `submit_as_evidence()` → `admit_outcome()`；两道守卫有测试 |
| **Free Course → Shared Contract** | ✅ **成立** | `from_course_observation()` + 3 条测试（含 `method == "mixed"`） |
| **Evaluation → Learner State** | 🔴 **未接** | 依赖 §6 的知识点映射；`admit` 之后会自动触发 `compute_state`，但今天进不去 |

---

## 4 · Database / API Changes

### 4.1 迁移 `a1b2c3d4e5f6`

| 变更 | 内容 | 兼容性 |
|---|---|---|
| **放宽 CHECK** | `origin_kind in ('dev')` → `('dev','subcourse','on_demand','daily','learn_space','manual')` | ✅ **`dev` 仍在列表里** ⇒ 已有行继续通过 |
| **加两列（nullable）** | `question_sets.context_kind` · `question_sets.context_ref` | ✅ 已有行不受影响 |
| **加一个 CHECK** | `context_kind is null or context_kind in (...)` | ✅ null 允许 |
| **降级路径** | 窄化回 `('dev')`，**若已有非 dev 行则失败** | ⚠️ 这是刻意的：静默丢行的降级不是降级 |

⚠️ **没有加 `project_id`** —— 题目还不能属于 Learn Space。
理由写在迁移的 docstring 里：**一个没人写的可空列比没有这列更糟。**
它等第一个真正需要它的 surface。

**已对真实数据库执行并回读验证**：
```
alembic_version: a1b2c3d4e6
origin CHECK: CHECK (((origin_kind)::text = ANY (ARRAY['dev','subcourse','on_demand','daily','learn_space','manual'])))
```

### 4.2 API

**本轮零 API 变更。** 六个既有路由（三个用户侧 + 三个管理侧）签名与行为不变。

⚠️ 这是刻意的：守卫 ① ② 意味着**今天任何 API 调用都不会产生 Evidence**，
在知识点映射解决之前开一个「提交并回流」的端点只会让人以为闭环通了。

### 4.3 模型

`services/practice/` 三个文件（`contracts.py` · `evidence.py` · `__init__.py`）——
⚠️ **不含任何 ORM 模型**，因为本轮不需要新表。

---

## 5 · Tests

### 5.1 执行结果

| 测试 | 结果 |
|---|---|
| `tests/test_practice_contracts.py`（新增 10 条） | ✅ **10 passed** |
| **全量后端回归** | ✅ **526 passed / 0 failed**（基线 516 ⇒ +10） |
| **迁移** | ✅ 对真实库执行成功，`pg_get_constraintdef` 回读确认 |
| **`scripts/smoke_qbank.py`** | ✅ **ALL PASS**（16 项断言） |

⚠️ 随机顺序下 `tests/api/test_scheduled_tasks_api.py` 有已知的 flaky
（**本分支之前就存在**，见 `architecture/evidence-flow.md` 记录），本轮用 `-p no:randomly` 取得稳定结果。

### 5.2 smoke 脚本跑通了什么（验收 3、4）

```
PASS batch view has 5 questions
PASS answer view leaks no answers
PASS other user cannot read the set (IDOR)
PASS error content_version_mismatch / not_found / invalid_submission
PASS batch graded with reviews
PASS every picked question is machine-graded
PASS batch session closed on submit
PASS immediate set built ready / immediate submit of one question
PASS error already_submitted
PASS open session resumes with its result after a refresh
PASS ledger rows written (2)
ALL PASS
```

⇒ **组卷 → 取题 → 作答 → 判分 → 落账 → 会话关闭，这条链是通的。**

⚠️ **一个诚实的限制**：脚本**结束时删掉自己建的 set**，只保留抓来的题目。
所以我跑完之后查库，六张表**又回到 0 行** ⇒
**我验证的是「脚本内断言通过」，不是「事后可在库里查到一行」。**
⚠️ 这恰好回答了审计里的 U-1（"smoke 是否真跑过"）：**它能跑通，但它不留痕迹。**

### 5.3 未能验证的部分

| | 什么 | 为什么 |
|---|---|---|
| **U-1** | **真实 Evidence 写入没跑过** | 🔴 守卫 ② 会挡住：题库知识点是 XKW id，`knowledge_items` 是 UUID，**无映射** ⇒ 今天调 `submit_as_evidence` 必然返回 `UNBINDABLE`。**这是设计如此，不是缺陷** |
| **U-2** | **幂等守卫没跑过真库** | 两条守卫（无信号 / 无知识点）用「会抛异常的假 db」测到「未调用」；**重复提交去重那条读的是真表，本轮没测** |
| **U-3** | 前端 | 本轮零 UI 改动 |

---

## 6 · Remaining Gaps

⚠️ **只列与 Subpractice / On-demand / Daily Quiz 直接相关的。**

### G-1 · 知识点映射 —— **唯一的硬阻塞** 🔴

组卷用 **XKW 目录 id**（`kpoint_ids` / `catalog_ids`），
Evidence 需要 **`knowledge_items.id`**（Lemma UUID），**两者之间没有映射代码**。

⇒ **今天题库的作答无法成为 Evidence**，守卫 ② 每次都会挡住。
⇒ **这不是画像问题，是命名空间问题** —— 先做映射，画像才有意义。

⚠️ **本轮刻意没有顺手做**：`research/question-bank-state.md` 建议
**先用反查验证准确率，失败再决定要不要建映射表** —— 不先建一张表。

### G-2 · 题目不属于任何 Space 🔴

`question_sets` **无 `project_id`** ⇒ Subcourse 与 Learn Space 两种形态**都无法归属**。

⚠️ 本轮只加了两个 nullable 列，**没有加 FK** —— 等第一个 surface。

### G-3 · Provider 层还没真正解耦 🟡

⚠️ **契约层已解耦**（`services/practice/` 里零 XKW import），
**数据层没有**：`core/config.py:289` 默认 `fixture`，且**无 AI 生成题目的管线**。

⇒ 「Practice 不需要知道题目来源」今天在**类型层成立、在数据层不成立**。

### G-4 · Free Course 侧只有适配器，未接线 🟡

`from_course_observation()` 存在且有测试，
**但没有任何生产代码调用它** ⇒ 契约统一了，**数据还没流动**。

⚠️ **这是刻意的**：Free Course 的作答目前连 `Evidence` 都不进（只被 `count()`），
在 G-1 解决前接线只会造出第二条同样断掉的链。

### G-5 · 难度字段全空 🟡

`difficulty` / `difficulty_level` 有列，**实测 10 行全 `None`** ⇒ 按难度选题还没有原料。

### G-6 · 主观题无判分 🟡

题库 essay 类直接 `not-graded`（`judge.py:110-111`），且**题库侧没有 Free Course 那样的 LLM 解释**
⇒ **答了主观题的用户在题库里得不到任何反馈**。

---

## 7 · Next Recommended Batch

### 「一次作答成为 Evidence」—— 一个用户能看见结果的最小闭环

**为什么是它**：G-1 是唯一的硬阻塞，而它**恰好可以先做一半** ——
用**手动指定 `item_label`** 绕开映射，先验证「Evidence 能不能从 Practice 流出去」。

**具体做什么**（下轮，约半天）

| 步 | 内容 |
|---|---|
| 1 | 在 `submit_as_evidence` 上加一个**受控入口**：允许调用方显式传 `item_label`，并在 `detail` 里记「这个 label 来自人工指定，不是自动映射」 |
| 2 | 写一个**真库测试**：题库作答 → `submit_as_evidence` → 查 `knowledge_evidence` 有一行、`response_ref` 带 `practiceRef` |
| 3 | **重跑一次**，确认返回 `DUPLICATE` 且**总行数不变**（验收 5 第一次被真库验证） |
| 4 | 在 `/sandbox/quiz` 加一个「提交并查看是否入库」的最小按钮 —— **这是这一轮唯一的用户可见产出** |

**验收**
- ✅ 一次正确作答 → `knowledge_evidence` 有一行，`surface='practice'`
- ✅ 重复提交 → `DUPLICATE`，**行数不变**
- ✅ 无知识点的作答 → `UNBINDABLE`，**库里没有行**

**这一轮不能声称的**
- ❌ 学习效果提升 · ❌ 迁移 · ❌ 保持
- ❌ 「题库已经接入 Learner State」—— **它只是第一次把数据递到了门口**

⚠️ **而 G-1 的正式解法（XKW → Lemma 知识点映射）应该在这之后单独做一轮**，
且按审计建议：**先量反查准确率，用失败率决定要不要建映射表。**

---

## 8 · 本轮的诚实边界

| | 说明 |
|---|---|
| **没有 UI 改动** | 用户看不到任何变化。`/sandbox/quiz` 的行为完全未变 |
| **没有一次真实 Evidence 写入** | 守卫 ② 挡住了，**这是设计如此**。见 U-1 |
| **幂等未在真库验证** | 两条守卫测到「未调用」，去重那条没测。见 U-2 |
| **`smoke_qbank.py` 不留痕迹** | 跑完即清场 ⇒ **「跑通过」与「可在库里查到」是两件事**，本轮只验证了前者 |
| **题库的 XKW 依赖未解除** | 契约层已解耦，数据层没有 |