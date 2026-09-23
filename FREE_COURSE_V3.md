# Free Course V3（LS-lab）· 迁移与验收

把 Free Course（含 Hyperknow 式教学会话）从 main-v2 搬到 **LS-lab**，并按
`hyperknow_user_behavior_reconstruction.html` 补上昨天漏掉的两处观察到的行为。
计划见同目录 `FREE_COURSE_V3_PLAN.md`；本文是**做完之后的事实**。

---

## 下一步（5 行）

1. **现在就能看**：本机 `lemma` 库已 apply 迁移；演示课
   `ce286a45-67be-4e04-972e-2a32cdb60c6f`（理解梯度下降）已生成。
2. **要看界面**：`cd .worktrees/main-v3/backend && .venv/Scripts/python.exe -m uvicorn main:app --port 8001` +
   `cd ../frontend && npm run dev`（5173，`localhost` 不是 `127.0.0.1`），登录后课程中心 → 免费课。
3. **要重跑验收**：`.venv/Scripts/python.exe ../../.workbuddy/localdb/verify_hyperknow_session_v3.py`
   （真模型，约 6 分钟；**必须让 `HTTPS_PROXY` 生效**，见 §6）。
4. **要重看白板**：`dump_board.py` + `render_board.mjs` 两个脚本已参数化，两个分支共用（§5）。
5. **唯一待你定的事**：白板上跨 step 累积的文字会重叠（§7 第 1 条）——改不改提示词，你说了算。

---

## 1. 人话结论

昨天做的那套「白板 + 朗读」教学会话，**现在跑在 LS-lab 上了，而且是用真模型现生成的一节课跑通的**：
白板会逐步画出来、会停下来等你点一个圆圈、答错会点名纠正并继续、说「没听懂」会换一种讲法重画一块板、
按 Stop 问自己的问题会被正面回答、**答对了会发一张成就卡**。
唯一的视觉毛病是：同一个白板上先后写的字有时会压在一起（§7），这个毛病在 main-v2 上一模一样，不是搬过来的新问题。

## 2. 这次做完的事

| # | 做了什么 | 结果 |
|---|---|---|
| A | 恢复 v3 主动删掉的免费课宿主（units/chapters/lesson_objects + `courses.mode`/`tuning_json`） | 迁移 `b1c2d3e4f5a6`，**只加不删**，视频课那棵树一行未动 |
| B | 新建教学会话表 | 迁移 `c2d3e4f5a6b7`（`free_course_sessions`），挂 A 之后 |
| C | AI 层整块拷（`ai/free_course/**` 16 + `teaching/**` 3 + 8 个提示词模板） | 跨包依赖只有 `ai.*`，零改动 |
| D | 8 个用例接线（enum / agent / 默认路由 / `.env`） | 分支内可用渠道：aihubmix → openrouter |
| E | 服务与接口（`free_courses.py` 12 条路由 + 3 个 service + schema） | 前端与 v2 同一份契约 |
| F | 前端整块拷（`features/free-course/**`）+ 4 条路由 + 课程中心按 `mode` 分流 + i18n | — |
| G | **按解析 HTML 补两处新行为**：白板上可点的元素、答对后的成就卡 | 见 §3 |
| H | 数据库 → seed → 真模型端到端 → 测试 → 白板出图 | 见 §4 |

## 3. 本轮新补的两处行为（对照解析 HTML）

| 观察到的行为（原文行号见解析文档） | 落点 |
|---|---|
| 白板上有个可点的图形元素，点了才出现下一段板书/下一题 | 后端 `teaching/types.py` 新增 `awaitClick`；`planner.py` 绑定时**必须有 target**；前端 `useTeachingPlayback.ts` 多一个 `awaiting_click` 阶段、`Whiteboard.tsx` 多一个可点元素态、`SessionRail.tsx` 多一句「等点击」提示 |
| 答对 → 肯定 + 成就卡「YOU GOT AN AWARD」→ 点 Got it 继续 | 后端 `TeachingTurn.award`（**只在 `verdict == "correct"` 时保留**，答错给成就是撒谎）；前端 `TeachingSessionView.tsx` 的 `AwardCard` |

**顺手修掉的两处代码瑕疵**（都不改变行为）：
`planner.py` 里 `awaitClick` 分支写了两遍，第一遍没有 target 校验就 `continue`，第二遍的校验成了死代码
—— 等于「没有 target 的点击」会被放过，而那正是会**把时间线卡死、学习者永远等不到下一步**的唯一失败。
已把校验并进唯一那条分支，并把「至少一次 awaitClick」提升为和 `move` 同级的硬约束（不满足则带说明重试一次）。

## 4. 实际运行效果与测试结果

**演示课（真模型生成，未手工插一行数据）**

| 项 | 值 |
|---|---|
| 课程 | `ce286a45-67be-4e04-972e-2a32cdb60c6f` · 「理解梯度下降：从直觉到发散」· `mode=free` · `ready` |
| 结构 | 4 个单元 / 10 节课；起始课「优化问题：目标与方向」已写内容 |
| 起始课内容 | 6 个对象：explanation ×2、example ×1、practice ×2、assessment ×1 |

**教学会话端到端**（`verify_hyperknow_session_v3.py`，全部 PASS）

| 检查 | 结果 |
|---|---|
| 会话形状 | 5 个 step / 32 条动作 / 动作种类 `awaitClick, draw, label, move, write`；含 1 个 open + 1 个 choice |
| 可点白板 | 板上带 id 的元素 `ball, current_x, descent_arrow, parabola, slope_line`；`awaitClick` 的 target = `ball`，**在板上确实存在** |
| 答错 Quick Check | `verdict=incorrect`、反馈 46 字（即错即纠）、继续讲、**没有重画板**、**没有成就卡** |
| 「我没懂」 | 产出 `branch=reteach` 的新 step、第一笔就是擦板、说法与上一版不同 |
| 答对同一个 Quick Check | `verdict=correct`、**`award="目标函数造型师"`** |
| Stop 打断提问 | 第一个 step `branch=answer`，正面回答「为什么梯度要往下走」 |
| 刷新 | 同一个 session、整份计划都在 |
| 数据库 | 1 行 `free_course_sessions`、13 个 step、4 条学习者信号、`cursor == 13` |

**其它**

| 项 | 结果 |
|---|---|
| 后端 `pytest tests` | **74 passed** |
| 前端 `npx tsc -b` | 干净 |
| 前端 `npx eslint src/features/free-course` | 干净（exit 0） |
| 迁移 | `lemma` 库 `f8b9c0d1e2f3 → b1c2d3e4f5a6 → c2d3e4f5a6b7`，`alembic heads` 仍是**单头** |

## 5. 白板出图（这是「看见」的那一半）

浏览器登录走云认证、没有旁路，所以页面本身要你自己开一眼；但**白板是用真实组件离屏渲染出来的**：

| 文件 | 内容 |
|---|---|
| `.workbuddy/research/hyperknow-session/whiteboard-preview-v3.html` | 13 格，每格是「画到第 N 笔」的白板（Vite SSR 渲染真实 `Whiteboard` + 真实 `applyAction`） |
| `.../shots/whiteboard-preview-v3-full.png` | 整页截图 |
| `.../shots/awaitclick-panel.png` | **等点击那一拍**：红球外面有一圈等待环，标题写着「点击「ball」后继续」 |
| `.../shots/panel-detail.png` | 文字重叠的证据（§7） |

两个脚本已参数化，两个分支共用：
`dump_board.py`（`LEMMA_BACKEND` / `DATABASE_URL`）· `render_board.mjs`（`FRONTEND_DIR` / `BOARD_DUMP` / `BOARD_OUT`）。

## 6. 关键文件与入口

| 层 | 文件 |
|---|---|
| 迁移 | `backend/alembic/versions/b1c2d3e4f5a6_free_course_tree_restore.py`、`c2d3e4f5a6b7_free_course_sessions.py` |
| 模型 | `backend/models/free_course.py`（units/chapters/lesson_objects/observations）、`free_course_session.py`、`course.py`（`+mode`/`+tuning_json`） |
| AI | `backend/ai/free_course/**`、`ai/free_course/teaching/{types,planner}.py`、`ai/prompts/templates/free_course_*.system.txt` |
| 服务/接口 | `services/free_course_{service,events,session_service}.py`、`api/v1/free_courses.py`、`schemas/free_course.py` |
| 前端 | `frontend/src/features/free-course/**`（含 `session/` 11 文件）、`pages/AppRouter.tsx`、`features/course/CourseCenterCourseCard.tsx` |
| 脚本 | `.workbuddy/localdb/{seed_free_course_v3,verify_hyperknow_session_v3,dump_board}.py`、`render_board.mjs` |

## 7. 已知问题（诚实清单）

1. **白板文字会重叠。** 同一块板跨 step 累积，模型把后一步的文字写到前一步文字的位置上
   （证据：`shots/panel-detail.png`，第 39 笔那一格）。**这不是迁移带来的**：两分支的教学提示词逐行对比，
   差别只有这次新加的 `awaitClick` 两条，全仓也没有任何防重叠逻辑。修它要动提示词或加一次布局避让，
   属于「课程内容生成」，本轮范围外 —— 需要的话我按一条最小改法来做（限制后续 step 写字的 y 区间）。
2. **一次坏抽签会结束整次建课。** `intent → map → path → blueprint → content` 每步只调一次模型、不重试；
   `_bound` 拒绝空 map 就直接失败。main-v2 同样如此（逐行对比过），**不是回归**。seed 脚本靠整轮重试绕开。
3. **免费课的进度/统计不进 v3 的课程仪表盘**（那套按 point 算），本轮不做适配。
4. **界面本身我没看到**（无登录旁路）；白板是离屏渲染的，页面布局要你自己开一眼。
5. **`courses` 表下现在并存两棵树**：视频课走 modules/lessons/points，免费课走 units/chapters。
   任何新的「遍历课程树」代码必须先看 `courses.mode`。

## 8. 与计划的两处偏差（都记在这）

| 偏差 | 原因 |
|---|---|
| `build/stream` 必须带 `?intent=<一句话>` | 学习者的原话是**查询参数**，不是从行里读的（行里的 `topic` 只有 120 字）。漏了这个参数，接口不报错——模型直接**自己编一个主题**，seed 第一次跑就编成了「有效学习的方法论」。前端本来就是这么调的。 |
| 详情接口里的一节课叫 **`lessons`** 不叫 `chapters` | DB 行是 `course_chapters`，线上契约叫 `lessons`（`FreeUnitOut.lessons`）。写脚本按 DB 名字取会拿到空数组，不报错。 |

## 9. 环境上的一个真发现（重要）

**这台机器上 aihubmix 只能走代理。** 直连 `aihubmix.com:443` 超时；走 `HTTPS_PROXY=127.0.0.1:10090` 返回 200。
而 openrouter 的 `google/gemini-2.5-flash` **在这个区域被拒（403 "not available in your region"）**，
所以「优先级 0 挂了靠优先级 1 兜底」在免费课这条链上**兜不住**。

⇒ 跑任何免费课脚本时**不要**把 `HTTP_PROXY`/`HTTPS_PROXY` 摘掉。早先的验证脚本是摘掉跑的，
它们能过是因为那几条路由的兜底模型（`deepseek/deepseek-chat`）在本区域可用 —— 免费课的路由不是。
（`NO_PROXY` 已含 `127.0.0.1`，本机数据库不受影响。）
