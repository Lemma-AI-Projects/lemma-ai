# PS-01 · Free Course 的一次作答，真的变成一行 Evidence

> 所属：`practice-system` · **Gate 3 的核心** · 依赖：无（可立即开始）

## A. Plan ID & Title
**PS-01 · Free Course Evidence 回流的真库验证**

## B. Objective
让一条**真实存在**的 Free Course 作答，经由 `services/practice/evidence.py`
产生**一行真实的 `knowledge_evidence`**，并证明两件事：
同一条重复处理不会产生第二行；没有知识点的作答不会产生任何行。

⚠️ **验收目标 7 的第一次真实达成**（此前从未有过一次 Evidence 写入）。

## C. Current Facts（已核实，执行前请复核）
- 分支 `practice-system` @ `ed39f142`；`services/practice/{contracts,evidence}.py` 已存在，
  有 10 条契约测试（`tests/test_practice_contracts.py`）。
- `course_lesson_objects` **12 行，其中 4 行带 `concept`**（含一条 `practice` 对象：
  「系统要素识别 (System Element Identification)」）。
- ⚠️ **`course_lesson_observations` 当前 0 行** —— 必须先造一条。
- `knowledge_evidence` 当前 4 行（早于本分支的 seed 数据）。
- `knowledge_items` 11 行，全部属于 project `c7bfe336-…`（"AI for Math"）。
- `evidence_entry.py:131-133` 明确：`item_label` 是合法入口
  （"the REST surface speaks labels and lets the space create one"）。
- ⚠️ **`knowledge_evidence` 的 `verdict` 只接受 `("correct","incorrect","no_verdict")`**
  （`models/knowledge.py:51`）。
- ⚠️ 题库那条路今天走不通：`questions.meta_json->'kpoints'` 实测为 `[]`，
  而 `questions.objective` 是 **boolean**（`models/question.py:51`），不是学习目标。

## D. Scope
1. 新建 `backend/scripts/smoke_practice_evidence.py`（可重复运行的脚本，不是 pytest）。
2. 脚本内：准备一条 `CourseLessonObservation`（`kind='practice'`、所在 object 带 `concept`），
   调 `submit_as_evidence(item_label=<concept>)`。
3. 断言：`ADMITTED` → 查库 `knowledge_evidence` 多一行且 `response_ref` 含
   `surface='practice'` 与 `practiceRef=<observation id>` → **立刻重跑同一条** →
   `DUPLICATE` 且**总行数不变**。
4. 再取一条 `concept IS NULL` 的 object 做对照 → `UNBINDABLE` 且**行数不变**。
5. 记录 `derive_state` 是否被触发、`knowledge_items` 状态有没有变化。
6. 清理：脚本**默认不删**任何行（保留可查证据），加 `--cleanup` 参数显式清理。

## E. Out of Scope
- ❌ 不改 `free_course_service.submit_observation()`（PS-02 才做）
- ❌ 不改前端
- ❌ 不建 XKW↔Lemma 映射（PS-03）
- ❌ 不动 Learner State / Coordinator / Method
- ❌ 不把任何东西迁移进 Question Bank

## F. Dependencies
**无。** 这是链路上第一个真实验证，前置全部就绪。

## G. Implementation Steps
1. 先跑 `bash .workbuddy/localdb/pg.sh status`，确认库是「🟢 真活」。
   ⚠️ 半死状态会让 `create_all` 与 `pytest` 静默 skip —— **这一步不做，后面的"通过"是假的**。
2. 读 `services/practice/evidence.py` 全文与 `services/evidence_entry.py:120-160`。
3. 查一个带 `concept` 的 `course_lesson_objects.id` 与其所属 `course_id` → 推出 `project_id`，
   据此拼 `scope_ref="space:<project_id>"`。⚠️ **不要猜 project**，从 `free_courses` 表读。
4. 写脚本。幂等断言必须在**同一次运行内**比较两次调用前后的行数。
5. 真跑。

## H. Files / Modules
- 新增：`backend/scripts/smoke_practice_evidence.py`
- 可能改动：`backend/services/practice/evidence.py`（**仅当脚本暴露真实缺陷时**，
  且改动必须有一个先失败的测试作为理由）
- 只读参考：`backend/services/practice/contracts.py` · `backend/services/evidence_entry.py` ·
  `backend/models/free_course.py` · `backend/models/knowledge.py`

## I. Acceptance Criteria
| # | 判据（客观可查） |
|---|---|
| 1 | 脚本退出码 0，且打印每一项断言的 PASS |
| 2 | `knowledge_evidence` 中 `response_ref->>'surface' = 'practice'` 的行**至少 1 行** |
| 3 | 该行 `response_ref->>'practiceRef'` 等于那次 observation 的 id |
| 4 | 重跑后返回 `DUPLICATE`，**`select count(*) from knowledge_evidence` 与首次调用后相等** |
| 5 | 无 `concept` 的那次返回 `UNBINDABLE`，**行数不变** |
| 6 | 全量 `pytest` 仍 **≥ 526 passed / 0 failed** |

⚠️ **不算通过的情形**：只有 `ADMITTED` 没有 `DUPLICATE`；或行数是"看起来没变"但没实际比较。

## J. Tests
| 类型 | 命令 |
|---|---|
| 数据库（真库） | `cd backend && QBANK_XKW_PROVIDER=fixture ./.venv/Scripts/python.exe scripts/smoke_practice_evidence.py` |
| 契约回归 | `cd backend && ./.venv/Scripts/python.exe -m pytest tests -q -p no:randomly` |
| 既有闭环 | 同上命令覆盖 `tests/qbank/`；另跑 `scripts/smoke_qbank.py` 确认题库未受影响 |

⚠️ **必须用 `-p no:randomly`**：`tests/api/test_scheduled_tasks_api.py` 有**先于本分支存在**的
顺序敏感 flaky，随机顺序下会随机挂一条。

## K. Regression Risk
| 风险 | 怎么早发现 |
|---|---|
| 污染真实用户数据 | 脚本只用 `context_kind='manual'` 标记的测试 profile；跑前打印将使用的 id |
| `knowledge_evidence` 被写坏 | 断言 4/5 覆盖"不该写的没写" |
| Learner State 被意外改写 | 脚本记录并打印 `knowledge_items` 前后状态 |

## L. Completion Report
必须报告：改了哪些文件 / 实现了什么 / 测试命令与原始输出 / 
**未完成事项** / 对 PS-02 的影响（契约是否需要改）/ 是否可以开始 PS-02。
⚠️ 若步骤 4 暴露 `evidence.py` 的真实缺陷，报告里要写出**缺陷现象**而不是"已修复"。
