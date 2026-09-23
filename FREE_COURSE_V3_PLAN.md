# Free Course → LS-lab 迁移计划

把 Free Course（含昨天做的教学会话）搬到 **LS-lab**，并按
`hyperknow_user_behavior_reconstruction.html` 把昨天漏掉的两处**观察到的行为**补齐。

**范围**：只搬 Free Course。视频课管线、Learn Space、Space Context / Memory / Learner State、
聊天、插件一律不动 —— 迁移是**只加不删**的。

---

## 下一步（5 行）

1. **后端整块拷**：`ai/free_course/**`（16 文件，跨包依赖只有 `ai.*`）+ `teaching/**`（3）+ 8 个
   `free_course_*.system.txt` + `schemas/free_course.py` + 三个 `services/free_course_*.py` +
   `api/v1/free_courses.py`；再补 8 个 AI 用例的接线（enum / agent / 默认路由 / `.env`）。
2. **两个只加不删的迁移**（挂 v3 头 `f8b9c0d1e2f3`）：把 v3 主动删掉的免费课宿主加回来，再建
   `free_course_sessions`。视频课那棵 module→lesson→point 一行不动。
3. **前端整块拷**：`features/free-course/**` 28 文件 + 4 条路由 + 课程中心按 `mode` 分流 + i18n。
4. **按解析 HTML 补两处**：白板上可点的图形元素（原文的 "Circle" 按钮）、答对后的成就卡。
5. **最后才碰数据库**：本机 `lemma` 库 apply → seed 演示课 → 真模型端到端 → 中文提交。

---

## 1. 为什么这不是一次 cherry-pick

`git log --since=2026-09-22` 显示昨天在 main-v2 上只有一个提交（`8afa3a3e`，29 文件 = 教学会话），
但它**站在 Free Course 上**，而 LS-lab 上 Free Course 一个文件都没有：

| 事实 | 证据 |
|---|---|
| v3 重建了课程域，并在同一条迁移里删掉 v2 的宿主 | `c3f1a9b2d5e7_course_four_level_rebuild` 建 `course_modules/lessons/points`，同文 **DROP `course_units`/`course_chapters`** |
| v3 还把免费课的标记列删了 | `e6f1a3c8b2d7_drop_main_v2_leftovers` 的 `_COLUMNS` 含 **`courses.mode`、`courses.tuning_json`** |
| v3 上这些文件一个都没有 | `ai/free_course` / `api/v1/free_courses.py` / `services/free_course_*` / `schemas/free_course.py` / `models/free_course*.py` / `features/free-course` 全 **0 文件** |

而整个 Free Course 长在 units/chapters 上（`course_lesson_objects.chapter_id → course_chapters.id`、
`blueprint_json` 挂在 chapter、接口路径 `.../chapters/{chapter_id}/...`）。所以先要**把宿主加回来**，
代码才有地方落。

**好消息**：`ai/free_course` 的跨包依赖**只有 `ai.*`**（`ai.types` / `ai.client` / `ai.errors` + 包内），
零 `core` / `models` / `schemas` / `services` —— AI 层与教学运行时是**整份可拷**的。
前端 `features/free-course` 的依赖也只在 `@/components/ui/*`、`@/features/conversation/*`、`@/lib/*`
里（v3 全都有），没有 tldraw / dnd 之类的重依赖。

## 2. 与 v3 的三处必须适配

| 冲突 | 解法 | 代价 |
|---|---|---|
| v3 删了 `courses.mode` | **加回来**（`video` / `free`），列表与详情按它分流 | 视频课行为不变；只是共享表上又多了一个管线区分符 |
| v3 的状态机没有 `building` | 免费课建课用 v3 既有的 **`materializing`**（语义相同：不可进入、仍在生成） | **不动 v3 的 `ck_courses_status`** |
| v3 删了 `course_units` / `course_chapters` | **加回来**，并在模型与迁移里写明：这两张表现在**只服务免费课**，视频课用 modules/lessons/points | 同一张 `courses` 表下并存两棵树 —— 这正是 v3 当初想去掉的形态，这里是有意识地把它请回来 |

## 3. 分步与落点

| 步 | 动作 | 落在哪 |
|---|---|---|
| **A** | 恢复被删的宿主 | `backend/alembic/versions/<new>_free_course_tables.py` · `models/free_course.py` · `models/course.py`（+mode/+tuning_json） |
| **B** | 会话表 | `backend/alembic/versions/<new>_free_course_sessions.py` · `models/free_course_session.py` · `models/__init__.py` |
| **C** | AI 层整块拷 | `backend/ai/free_course/**`（含 `teaching/**`）· `backend/ai/prompts/templates/free_course_*.system.txt`（8） |
| **D** | 接线 8 个用例 | `ai/types.py`（+8 enum）· `ai/agents.py`（+8 agent）· `core/config.py`（默认路由 +8）· `backend/.env`（`AI_ROUTES_JSON` +8） |
| **E** | 服务与接口 | `schemas/free_course.py` · `services/free_course_{service,events,session_service}.py` · `api/v1/free_courses.py` · `api/v1/router.py` · `schemas/course.py`（+mode） |
| **F** | 前端整块拷 | `frontend/src/features/free-course/**`（28）· `pages/FreeCourse{Blueprint,Tuning}PreviewPage.tsx` |
| **G** | 路由与入口 | `pages/AppRouter.tsx`（+4 条）· `features/course/CourseCenterCourseCard.tsx`（按 mode 分流）· `i18n/locales/{zh,en}.json` |
| **H** | 按解析 HTML 补行为 | `ai/free_course/teaching/types.py` · `planner.py` · `ai/prompts/templates/free_course_session*.system.txt` · 前端 `session/board.ts` · `Whiteboard.tsx` · `useTeachingPlayback.ts` · `SessionRail.tsx` · `TeachingSessionView.tsx` |
| **I** | 数据库与验收 | `.workbuddy/localdb/setup_ls_lab_free_course.py` · `seed_free_course_demo.py` · `verify_hyperknow_session_v3.py` · `render_board.mjs`（复用） |

## 4. 按解析 HTML 的行为对照

`hyperknow_user_behavior_reconstruction.html` 是这次的行为规格。逐条对照：

| 解析到的行为（Observed / 行号见原文） | 昨天 | 本轮 |
|---|---|---|
| 白板**逐步构建**（文字→图→标注→动画） | ✅ | 保持 |
| 语音与白板**同步**推进（一个时间线） | ✅ | 保持 |
| **开放式提问** → 作答 → 判定 → 反馈 | ✅ | 保持 |
| **Quick Check 多选** | ✅ | 保持 |
| **「我没懂」→ 换讲解方式 + 改白板** | ✅ | 保持 |
| **Stop 打断 → 转向新问题** | ✅ | 保持 |
| 强制线性：无 Skip、Previous/Next 不可用、不回答就停住等待 | ✅ | 保持 |
| 答错 → 即错即纠 → 继续（**不回退、不重画**） | ✅ | 保持 |
| **点击白板上的可交互图形元素 → 触发动画 + 引出下一段板书/下一题**（原文 "Circle" 按钮） | ❌ | **本轮补** |
| **答对 → 肯定 + 成就弹窗 "YOU GOT AN AWARD" → 点 Got it 继续** | ❌ | **本轮补** |
| credits 付费墙 | — | **不做**（那是对方的商业漏斗，不是教学行为） |
| 语音输入打断（"Speak to ask or interrupt"） | — | **不做**（原文自己把它列在"下一阶段扩展"） |

## 5. 验收

1. 本机 `lemma` 库 apply 两个迁移；`alembic heads` 仍是单头。
2. seed 一个演示空间 + 一门免费课（Gradient Descent，含 4 节课），内容由其真实生成。
3. 后端 8001 / 前端 5173 起来，登录后：课程中心 → 免费课 → 一节 → **开始学习**。
4. 真模型端到端（`.workbuddy/localdb/verify_hyperknow_session_v3.py`）：
   开场会话形状（≥1 open / ≥1 choice / ≥1 move）· 答错 Quick Check → 点名纠正且不重画 ·
   「我没懂」→ 新解释 + 擦板重画 · Stop 提问 → 第一个 beat 即回答 ·
   **点白板元素 → 播完这一拍并推进** · **答对 → 成就卡** · 刷新可续。
5. 后端 `pytest` / 前端 `tsc` + `eslint` 干净；白板离屏渲染出图。

## 6. 老实写的代价与风险

1. **这是把 v3 的一个决定反过来做**（"drop main-v2 leftovers"）。只加不删，但 `courses` 表上
   重新出现 `mode`，`course_units/course_chapters` 重新出现 —— 团队里读 v3 迁移史的人会疑惑，
   所以迁移文件与模型里都会写明**为什么**。
2. **两棵树并存**：视频课走 modules/lessons/points，免费课走 units/chapters。任何"遍历课程树"
   的新代码都必须先看 `courses.mode`。
3. **免费课的进度/统计不进 v3 的课程仪表盘**（那套按 point 算）。本轮不做适配。
4. **界面渲染我仍然看不到**（登录走云认证无旁路）—— 提供离屏渲染图，页面本身要你看一眼。
