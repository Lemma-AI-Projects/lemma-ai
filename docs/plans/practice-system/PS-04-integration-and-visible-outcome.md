# PS-04 · 集成验证与第一个用户可见产出

> 所属：`practice-system` · **Gate 5** · 依赖：**PS-01 + PS-02 必须先通过**

## A. Plan ID & Title
**PS-04 · 两条练习路径的集成测试 + 练习结果的可见反馈**

## B. Objective
1. 证明 Question Bank 与 Free Course 两条路径**互不破坏**。
2. 交付本轮**唯一的用户可见产出**：Free Course 做完一道练习后，
   页面底部出现一行「这次作答已记入你的学习记录 · 测的是「X」」，
   **以及**「这次作答已保存，但暂时无法归到具体知识点」这一版。

⚠️ **两个版本都必须做。** 只做能绑定的那一个，等于违反「不许为了显示闭环成功而强行绑定」。

## C. Current Facts（执行前复核）
- PS-01 已让 Free Course 作答产生真实 Evidence（开关关闭）。
- PS-02 已把钩子接到 `submit_observation()`，**开关默认 `False`**。
- 前端 Free Course 练习界面在 `frontend/src/features/free-course/`；
  `CourseLessonObservation` 的写入方是后端 API。
- ⚠️ **提交接口当前不知道 Evidence 结果** ⇒ 需要一个新的只读查询让前端显示。

## D. Scope
1. 加一个只读端点（或在现有提交响应里加字段）：
   `GET /free-courses/{id}/practice-return?observation_id=...` ⇒ 返回
   `{ "recorded": bool, "concept": str | null, "reason": str | null }`。
   ⚠️ `reason` 取 `not_signalling` / `unbindable` / `duplicate` 三种之一。
2. 前端在练习提交后展示这一行。⚠️ **只展示，不解释机制，不承诺效果。**
3. 集成测试：两条路径各自的 smoke + 一个"同时用两条路径"的场景。

## E. Out of Scope
- ❌ 不改判分、不改学习算法
- ❌ 不做 Subpractice / Daily Quiz 页面
- ❌ 不接 Learner State / Coordinator
- ⚠️ **不承诺"这会提高你的能力"** —— 没有 D 层证据

## F. Dependencies
**硬依赖 PS-01 与 PS-02。** 若钩子仍默认关闭，本批次的可见产出无从展示
⇒ **本批次应包含"为演示把开关打开"的一步，但生产配置保持关。**

## G. Implementation Steps
1. 读 `submit_observation()` 的 API 入口，确认前端如何得知提交成功。
2. 先写后端测试：三种 `reason` 各自返回正确值。
3. 实现端点。⚠️ **不要因为它而去改 `admit_outcome` 的返回**。
4. 前端加一行展示。⚠️ 参照现有 `FreeCourseLessonView` 的排版语言，不要自造样式。
5. 跑集成测试与截图（`.shots/`）。

## H. Files / Modules
- 改动：`backend/api/v1/free_courses.py`（新只读端点）
- 改动：`backend/schemas/free_course.py`
- 改动：`frontend/src/features/free-course/*`（api + 展示）
- 新增：`backend/tests/test_practice_return_visibility.py`

## I. Acceptance Criteria
| # | 判据 |
|---|---|
| 1 | 三种 `reason` 各有一条通过的测试 |
| 2 | 前端在 `recorded=true` 时显示知识点名称 |
| 3 | 前端在 `unbindable` 时**显示的是"已保存但暂时无法归到具体知识点"** |
| 4 | `smoke_qbank.py` 仍 ALL PASS |
| 5 | 全量 `pytest` + `vitest` 全绿 |
| 6 | 有 `.shots/` 里的**真截图**（两种状态各一张） |

⚠️ **不算通过**：只有一种状态；或用 mock 数据截图。

## J. Tests
- 后端：`cd backend && ./.venv/Scripts/python.exe -m pytest tests -q -p no:randomly`
- 前端：`cd frontend && npx vitest run` + `npx tsc --noEmit` + `npx eslint src --max-warnings 0` + `npx vite build`
- 真图：`agent-browser` 打开 preview 路由截图
  ⚠️ **vite preview 只绑 `[::1]`**，用 `localhost` 会 connection refused；
  ⚠️ 免登录评审页用 `/preview/*`，`/preview/user-profile` 那种 id 敏感的页面要用它固定的 id

## K. Regression Risk
| 风险 | 早发现 |
|---|---|
| 前端因为多一个请求而变慢 | 只在提交成功后拉一次；不阻塞渲染 |
| 端点暴露他人作答 | 端点必须校验 ownership（复用既有 `get_owned_*` 模式）|
| 改动影响既有课程页 | 既有测试 + 截图对比 |

⚠️ **回滚**：新端点是只读的、前端一行是加法 ⇒ 直接 revert 两个 commit 即可，无迁移。

## L. Completion Report
报告：改动文件 / 三种状态各自的真截图路径 / 测试输出 /
**明确说明"本轮不能声称学习效果提升"** / 未完成事项 / 对下一轮的建议。
