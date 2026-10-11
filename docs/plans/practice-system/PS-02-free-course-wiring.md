# PS-02 · Free Course 生产接线（默认关闭）

> 所属：`practice-system` · **Gate 4** · 依赖：**PS-01 必须先通过**

## A. Plan ID & Title
**PS-02 · 把 Evidence 回流接到 Free Course 的真实提交路径**

## B. Objective
在 `free_course_service.submit_observation()` 之后加一个**默认关闭**的钩子：
当且仅当 `practice.context_enabled` 打开且 object 带 `concept` 时，
把这次作答转成 `PracticeEvaluation` 并提交 Evidence。

⚠️ **默认关闭是硬要求** —— 验收目标 8 要求 Free Course 现有体验零回归。

## C. Current Facts（执行前复核）
- `submit_observation()` 在 `backend/services/free_course_service.py:541`；
  客观题本地判分在 `:585-587`，开放题交给模型在 `:592`，反馈生成 `:594-603`，
  落库在 `:605`。
- 它当前的消费方只有计数统计（`:722` 的 `count(distinct object_id)`、`free_course_events.py:553`）。
- PS-01 已证明 `submit_as_evidence` 在真库可写入。
- `question_sets` 有 `context_kind` / `context_ref` 两个 nullable 列
  （迁移 `a1b2c3d4e5f6`）；⚠️ **但 Free Course 不走 question_sets**，
  所以本批次的上下文标记要落在别处（见 D.4）。

## D. Scope
1. 加一个开关配置（建议 `core/config.py`：`practice_free_course_return: bool = False`）。
2. 在 `submit_observation()` 的落库之后，调
   `from_course_observation()` → `submit_as_evidence(item_label=object.concept)`。
3. 只在 object 的 `kind` 属于 `practice` / `assessment` 时启用（explanation / example 不是作答）。
4. 记录上下文：`context_kind='subcourse'`、`context_ref=<chapter_id>`，
   写进 `Provenance.extra`（⚠️ **不要为此改 Free Course 的表结构**）。
5. `concept IS NULL` 时照旧返回 `UNBINDABLE`，**不报错、不影响原有返回**。

## E. Out of Scope
- ❌ 不改判分逻辑、不改反馈生成
- ❌ 不改前端
- ❌ 不把开关默认打开
- ❌ 不建映射表

## F. Dependencies
**硬依赖 PS-01。** 若 PS-01 未能证明幂等，本批次的重复提交会写出重复 Evidence。

## G. Implementation Steps
1. 通读 `free_course_service.submit_observation()` 全文与它的调用方（找出所有入口）。
2. 先写一个**失败**的测试：开关打开时，提交作答后 `knowledge_evidence` 多一行；
   开关关闭时不多。
3. 加配置项（默认 `False`）。
4. 实现钩子。⚠️ **必须是"落库之后"**，且 Evidence 写入失败**不得让提交失败**
   （沿用 `submit_as_evidence` 返回 `REJECTED` 而不抛的约定）。
5. 跑测试。

## H. Files / Modules
- 改动：`backend/services/free_course_service.py`（**只加钩子，不改判分**）
- 改动：`backend/core/config.py`
- 改动：`backend/.env.example`（补一行注释说明，默认关）
- 新增：`backend/tests/test_free_course_practice_return.py`
- 只读：`backend/services/practice/*`

## I. Acceptance Criteria
| # | 判据 |
|---|---|
| 1 | 配置默认 `False` 时，提交作答的**全部既有返回值与副作用不变**（用既有测试证明） |
| 2 | 打开后，`practice`/`assessment` 的作答产生 `surface='practice'` 的 evidence 行 |
| 3 | 同一作答重复提交 ⇒ 行数不变 |
| 4 | `concept IS NULL` ⇒ 返回 `UNBINDABLE`，**且原提交流程无任何异常** |
| 5 | `explanation` / `example` 类 object **不**产生 evidence |
| 6 | 全量 `pytest` ≥ PS-01 的基线数 |

⚠️ **不算通过**：把开关默认打开；或改判分逻辑来实现。

## J. Tests
- 单元/集成：`cd backend && ./.venv/Scripts/python.exe -m pytest tests/test_free_course_practice_return.py -q -p no:randomly`
- 回归：`-m pytest tests -q -p no:randomly`（≥ 526）
- ⚠️ 若存在 Free Course 的 API 测试，必须全过（验收 8）

## K. Regression Risk
| 风险 | 早发现的方式 |
|---|---|
| 改变了既有提交行为 | 配置默认关 + 全量既有测试 |
| Evidence 写入拖慢/打断提交 | 钩子放在落库之后，且失败不抛 |
| 影响 Free Course 性能 | 不在请求路径上做网络调用（AI runtime 初始化检查）|

⚠️ **回滚**：配置项置 `False` 即刻恢复，不需要回退代码或迁移。

## L. Completion Report
报告：改动文件 / 开关名与默认值 / 两种状态下的测试输出 / 
**明确说明"默认关闭时 Free Course 行为未变"** / 未完成事项 / 是否可以开始 PS-03。
