# PS-03 · 让题库题目带上 Lemma 的知识点

> 所属：`practice-system` · **Gate 1 的延伸** · 依赖：**无**（可与 PS-01 并行）

## A. Plan ID & Title
**PS-03 · Questions 携带 Lemma item_id，使题库这条路可接通**

## B. Objective
给 `questions` 增加一个可空的 `lemma_item_id` 外键列，并在**组卷或落库时**把
XKW 的 `kpoints` 解析成 Lemma 的 `knowledge_items.id`。

⚠️ **不是建映射表** —— 是让题目**自带**它测的是哪个知识点。
两者的区别是本批次的全部要点（见 D）。

## C. Current Facts（执行前复核）
- `questions` 的 `meta_json` 里已有 `kpoints`（XKW 目录 id），
  ⚠️ **fixture 数据实测为空数组 `[]`**；解析器在 `qbank/xkw/types.py:115` 会填。
- `knowledge_items` 11 行，全部属于 project `c7bfe336-…`。
- ⚠️ **两套命名空间目前零映射代码** ⇒ 「按薄弱点抽题」在技术上不可能。
- `Question` 的 docstring（`models/question.py:25-31`）明确：全局内容、
  一份 external_id 一份、**只能通过某个 set 触达** ⇒ 加列不影响这个语义。
- 迁移体系：alembic，`down_revision` 链条上最新为 `a1b2c3d4e5f6`。
  ⚠️ 用 `ScriptDirectory.get_heads()` 或「找出没被引用的 revision」确认，不要凭文件名猜。

## D. Scope
1. 迁移：`questions` 加 `lemma_item_id UUID NULL REFERENCES knowledge_items(id) ON DELETE SET NULL`。
   ⚠️ **必须可空 + SET NULL**：题目可以没有知识点，删除知识点不应连带删题目。
2. 写一个**纯函数** `resolve_lemma_item(kpoints) -> uuid | None`：
   - 逐个 kpoint 的 id 到 `knowledge_items` 里找（⚠️ **通过一个明确的映射来源**，
     见 I.2），找不到返回 `None`
   - ⚠️ **禁止文本模糊匹配**（任务原话：「不要通过模糊的文本匹配直接生成高可信的学习者状态」）
3. 在组卷落库处（`services/question_bank_service.upsert_question`）调用它。
4. 加索引：`ix_questions_lemma_item_id`。

## E. Out of Scope
- ❌ 不建 `xkw_kpoint ↔ lemma_item` 映射表（本批次的结论会告诉你是否需要）
- ❌ 不用这道能力去抽题（那是自适应选题，本轮禁止）
- ❌ 不动 Question Bank 的 API
- ❌ 不动 Free Course

## F. Dependencies
**无。** ⚠️ 与 PS-01 **可并行**：PS-01 改 `services/practice/`，
本批次改 `models/questions` + 迁移 + `question_bank_service`，文件不重叠。
⇒ **但两者都会写知识库 ⇒ 必须串行提交，且本批次必须等 PS-01 跑完它的 smoke 再开始迁移。**

## G. Implementation Steps
1. 确认 alembic head（见 C）。
2. ⚠️ **先量后建**：写一个只读脚本，统计 fixture 的 10 道题里有多少能通过任何**现有**信号
   找到对应 `knowledge_items`。**把数字写进报告。**
   ⚠️ **若能匹配的比例是 0%，就不要加列** —— 直接在报告里说"映射是独立一轮工作"。
3. 若比例 > 0，再做迁移与写入。
4. 补 `Question` 模型的列与注释。

## H. Files / Modules
- 新增：`backend/alembic/versions/<rev>_question_lemma_item.py`
- 改动：`backend/models/question.py`
- 改动：`backend/services/question_bank_service.py`
- 新增：`backend/scripts/probe_kpoint_match_rate.py`（只读探针）

## I. Acceptance Criteria
| # | 判据 |
|---|---|
| 1 | 报告里给出**匹配率数字**（fixture 10 道题中能匹配的比例） |
| 2 | 若匹配率 > 0：`lemma_item_id` 列存在、可空、外键为 `ON DELETE SET NULL` |
| 3 | 迁移可 `downgrade` 成功，且 downgrade 不丢题目行 |
| 4 | `resolve_lemma_item` 对无法匹配的输入返回 `None`，**不抛、不猜** |
| 5 | 全量 `pytest` ≥ 基线；`scripts/smoke_qbank.py` 仍 ALL PASS |
| 6 | ⚠️ **明确写出结论：是否需要一张映射表**，用 1 的数字支撑 |

⚠️ **不算通过**：用文本相似度凑匹配；或在没有数字的情况下断言"已支持绑定"。

## J. Tests
- 数据库：`alembic upgrade head` + `alembic downgrade -1` + `upgrade head` 往返一次
- 单元：对 `resolve_lemma_item` 测「匹配 / 不匹配 / 空输入」三种
- 回归：`pytest -m pytest tests -q -p no:randomly` 与 `smoke_qbank.py`

## K. Regression Risk
| 风险 | 早发现 |
|---|---|
| 迁移不可回滚 | I.3 的往返测试；`ON DELETE SET NULL` 保证不删数据 |
| 拖慢组卷 | 只在落库时多一次查询；用索引 |
| 破坏题目唯一性 | ⚠️ **不要动 `(provider, external_id)` 唯一约束** |

⚠️ **回滚**：`alembic downgrade -1` 即完全恢复，因为新列可空且无数据依赖。

## L. Completion Report
报告：改动文件 / **匹配率数字** / 是否加了列（以及为什么加或不加）/
**是否需要映射表** / 测试输出 / 未完成事项 / 是否可以开始 PS-04。
