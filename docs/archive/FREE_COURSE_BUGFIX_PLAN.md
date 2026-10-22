# Free Course · 修 bug 计划

> 2026-10-06 更新：**P0 三条与 B-05 已修**（`99929ffd` `df06a656`，516 passed / 0 skipped）；
> **B-04 降级**（核实后发现它需要一次建模决策，见下）。
> 2026-10-05 · 分支 `user-profile` @ `5efae5f2`
> 依据：`free-course-pipeline-brainstorm.html` 的代码审计（基线 `connecting-page @ d7a9299c`）
> 每条带 `文件:行号`；未带行号的判断标「推断」。
>
> **下一步（≤5 行）**
> `① **已修**：P0 三条（`99929ffd`）+ B-05（`df06a656`）。基线 516 passed / 0 skipped。
> `② **B-04 降级为建模决策**，三个选项见 `free-course-rebuild-plan.md` §1.1 —— **需要你定**。
> `③ P2 / P3 建议**跟着谁被碰到就顺手做谁**，不单开一轮。
> `④ **B-06 属 Learn Space 那条线**，不在 Free Course 内，单独立项。
> `⑤ 重构的第四步与全局顺序见 `free-course-rebuild-plan.md`。

---

## 分档标准

不是按「严重程度」分，是按**「谁在受损」**分：

| 档 | 判据 | 处理时机 |
|---|---|---|
| **P0** | 用户的一个操作得到了**错误的结果** | 立即 |
| **P1** | 系统**以为**记下了，其实没记 | 本轮 |
| **P2** | 内部不一致，无用户症状 | 有空就做 |
| **P3** | 注释/假象会**误导下一个读代码的人** | 跟着它被碰到的那次改 |

分档的理由：P0 影响当下体验，P1 影响**未来能不能做对事**，
P2/P3 影响**人**。混在一起做，会把「明天必须做」的拖到「有空再说」。

---

## P0 · 用户现在就在受损（3 条，全部小改动）

### B-01 `mode` 字段断链 —— free 课程在课程中心进错页面

**现象**：课程中心的自由课程卡片被当视频课处理，点进去拉一棵空树；
进度环恒 0/0；「已学完」tab 永远看不到它。

**根因**：`CourseListItemOut` 没有 `mode` 字段，而后端用
`CourseListItemOut.model_validate(course)` 构造，不会吐出未声明的字段；
前端 `types/course.ts:70` 声明了 `mode: 'video' | 'free'` 并在
`CourseCenterCourseCard.tsx:31` 用它分叉。

```
backend/schemas/course.py:148-165     CourseListItemOut 无 mode
frontend/src/types/course.ts:70       声明并依赖 mode
frontend/src/features/course/CourseCenterCourseCard.tsx:31  isFree = mode === 'free'
```

**改法**：`CourseListItemOut` 加 `mode: str`；`total_point_count` 对 free 课程
改为按 `course_chapters` 计（否则「已学完」tab 仍然恒假 —— 这是同一个 bug 的第二半）。
**别只加字段不改计数**，那会把「进错页面」修好、「永远显示进行中」留着。

**完成标准**：free 课程卡片显示真实进度环；点进去进 `/free-course/:id` 而不是视频详情；
学完的 free 课程出现在「已学完」tab。

**风险**：低。加字段是加法；改计数要确认 `progress_service` 的 join 不会影响视频课。

---

### B-02 练习计数答题后不刷新

**现象**：答完题返回课程页，练习计数仍是旧数字，必须刷新页面才更新。

**根因**：`useFreeObservation` 成功后只 invalidate lesson 的 query key，
**没有** invalidate detail；而练习计数 `practice.answered/total` 是在 detail 上显示的。

```
frontend/src/features/free-course/freeCourseApi.ts:127   只 invalidate freeLessonQueryKey
frontend/src/features/free-course/FreeCourseDetailView.tsx:107-114  计数在 detail 上
```

**改法**：`onSuccess` 里加一次 detail 的 invalidate。
**不要**改成 `refetchType: 'all'` 式的粗暴做法 —— 那是用一个性能问题换一个显示问题。

**完成标准**：答完题后课程页计数即时更新（不需要刷新）。

**风险**：极低。

---

### B-03 「本地判分」注释与实现不符

**现象**：注释写 `graded locally against the option ids`，实际是把 `optionId`
发给后端判。**这不是功能 bug，是文档 bug** —— 但它会让人以为前端有判分逻辑，
从而在改判分规则时找错地方。

```
frontend/src/features/free-course/FreeCourseLessonView.tsx:373-375  注释
frontend/src/features/free-course/FreeCourseLessonView.tsx:386      实现
```

**改法**：改注释。**不要**为了"让注释成立"而把判分搬到前端 ——
后端判分是刻意的（`free_course_service.py:585-587`），前端本地判分会立刻引入
"两处规则"这个更严重的问题。

**完成标准**：注释与实现一致，且注释说明**为什么判分在后端**。

**风险**：零（只改一行注释）。

---

## P1 · 数据丢了 / 记错了（3 条，其中一条属于另一条线）

### B-04 会话判分不入库 ★ 已降级为「需要一次建模决策」

> **⚠️ 2026-10-06 核实结论：按原计划做不了。**
> `CourseLessonObservation.object_id` 是 **NOT NULL 外键**指向
> `course_lesson_objects`（`models/free_course.py:176-180`），
> 而 `TeachingQuestion` **没有 object_id**
> （`ai/free_course/teaching/types.py:184`）——
> 白板课的问句是模型**现场生成**的，不对应任何预先生成的 lesson object
> （objects 是「讲解要用的材料」，问句是「讲解中途停下来问的东西」）。
> ⇒ **「复用课内练习的写入面」这条路是断的。**
>
> 三个选项（A 问句引用 lesson object / B `object_id` 改可空 + 加 `step_id` /
> C 另建 `session_observations`）与代价写在
> `FREE_COURSE_REBUILD_PLAN.md` §1.1。
> **我倾向 A，但这是产品判断，不该由修 bug 的轮次替用户定。**
>
> 下面是原计划的内容，保留作为决策的依据。

**现象**：白板课（教学会话）里学习者的**每一次答题**，
既不写 `course_lesson_observations`，也不进 `evidence_entry` / Coordinator。
只有课内练习会写。

```
backend/services/free_course_session_service.py:444   只写 session.transcript_json
backend/services/free_course_session_service.py:49    CourseLessonObservation 只出现在 import
```

**为什么这一条最要紧**：白板课是全套里**唯一真的在发生**的部分
（按步、按句、随回答延伸），也是学习者投入最多的部分
（§9 的「30 分钟」档）。而它的每一次学习行为**没有进入任何可被推理的数据面**。

**改法**：在 `submit_turn` 里，当 `signal.kind == "answer"` 且有 `option_id` 时，
复用课内练习的写入面（`free_course_service.submit_observation` 的落库部分），
写一条 `kind="answer"` 的 observation。

**三条纪律**：
1. **只写 observation，不接 Coordinator** —— 那是 Learn Space 那条线（B-06），不要混进来
2. **不改变任何返回给前端的形状** —— 这一步是纯补记，行为零变化
3. **写失败不能使这一轮失败** —— 学习者的答案已经产生了，
   为一条记录丢掉它是用确定的事实换不确定的便利（与 `handle_event_safely` 同一条理由）

**完成标准**：白板课答一题后，`course_lesson_observations` 有一行对应记录；
既有 4xx/409 行为不变；`transcript_json` 仍然照旧写（它是"忠实记录"，不是替代品）。

**风险**：中。需要在 `submit_turn` 里加一次写入，而它在事务中间 ——
要确认失败时的回滚行为与现有的 `await db.commit()` 一致。

---

### B-05 tuning 断在教学会话之前

**现象**：用户认真选了「紧凑 / 概念侧重」，生成阶段生效，
**白板课完全不知道**。

```
backend/services/free_course_session_service.py:336-342   plan_session 没传 tuning
```

**根因**：`courses.tuning_json` 只在 blueprint / content 两步被读；
`plan_session` 的入参里没有它。

**改法**：`start_session` 读 `course.tuning_json`，把 `pace` / `depth`
映射成 `plan_session` 的两个入参（`course_volume` 在白板课里无意义 —— 它管的是大纲长度）。

**完成标准**：选「紧凑」生成的白板课，讲解节奏与选「系统学」的不同（可断言 prompt 内容）。

**风险**：低。**但要注意不要把 `course_volume` 也传进去** ——
那会让白板课试图控制"这一课讲多少"，而那是 blueprint 的职责，会造成两个地方都在决定长度。

---

### B-06 free course / 题库判分不进证据层 —— ⚠️ 属于 Learn Space 那条线

**现象**：全仓确认 `free_course` 与 `question_attempt_service` 都不触发
`evidence_entry` / `coordinator_service`。

```
backend/services/question_attempt_service.py   grep evidence_entry|coordinator → 空
backend/services/free_course_*.py              同上
```

**这一条不在 Free Course 内。** 它是 10-05 研究里记的「断头 1 / 断头 2」，
属 Learn Space 的 Evidence Pipeline。**建议单独立项，不要塞进这一轮** ——
它的影响面是跨产品的 Learner State，而 B-04 的影响面只在 Free Course。

**完成标准（本轮只做一件事）**：把这条写进本文件（`.workbuddy/` 是 gitignore 的，写在那里不落版本控制）并在
`memory/MEMORY.md` 的断头清单里标上「已立项，未修」——
**不要让它只活在一次对话里**。

---

## P2 · 内部不一致，无用户症状（今天可以完全不动）

| # | 是什么 | 位置 | 改法 |
|---|---|---|---|
| B-07 | `CourseLessonObservation` 死 import | `free_course_session_service.py:49` | B-04 修完它就不是死 import 了 ⇒ **跟着 B-04 一起走** |
| B-08 | `createFreeCourse` 前端定义无调用方 | `freeCourseApi.ts:26-37` | 删，或让前端真的调它。**先查清为什么没用**（课程创建隐在 agent 回合里，可能是刻意的） |
| B-09 | 「本节还没有内容」空态不可达 | `useFreeLessonGeneration.ts:36` | 删死分支，或修 `isGenerating` 初值。**先确认哪个是对的** |
| B-10 | `finished` 分支写两遍 | `TeachingSessionView.tsx:456-469` | 删第二个（不可达） |
| B-11 | `status` docstring 说 "until the learner finishes"，但**从不写 finished** | `models/free_course_session.py:38` | 改 docstring。⚠️ **不是 bug** —— `cursor` 承担了"讲完了"的判断，且 `restart` 路径完整（我核过 `sessionApi.ts:29-32`） |
| B-12 | `pipeline.generate()` 非流式包装无调用方 | `ai/free_course/pipeline.py:209-227` | 删 |
| B-13 | `ai/free_course/__init__.py` 惰性再导出层全仓无调用 | 同文件 `:50-100` | 删整层 |
| B-14 | `split_sentences` 对外无调用 | `teaching/planner.py:44` | 删导出（内部在用） |

**为什么单独列一档而不是立刻做**：
B-08 / B-09 都需要**先查清"是不是刻意的"**，而查清要花的时间与直接修差不多。
其余四条是纯删除，风险低但**收益也低** —— 它们的唯一价值是让下一个读代码的人不被误导。

**建议**：**跟着谁被碰到就顺手做谁**。不单开一轮。

---

## P3 · 假象（会误导人）

| # | 是什么 | 位置 | 备注 |
|---|---|---|---|
| B-15 | `question.hint` 有 wire 字段，**前端无消费者** | `schemas/free_course.py:388` | ⚠️ 它的线在后端（`teaching/types.py:199`），且是**扁平字符串无分级**。要么接上（并分级），要么标成未接线。**不要**接一半 |
| B-16 | 首页 `todayTaskProgress = 40` 硬编码 | `HomePage.tsx:31` | 注释自认 `TODO: wire to real schedule data`。**留着也行**，但那个进度环在画假数据 |
| B-17 | `mock/learningBrief.ts` 指向不存在的假课程 id | `:42,48,74` | mock 文件，标注"后端未接"。**不算 bug**，但它会被误当成真实响应 |
| B-18 | 三个 `InputMenu` 是 `aria-hidden` 空壳 | `ChatInput.tsx:137,156,175` | 同上 |
| B-19 | 4 个「随便试试」chip 无 `onClick` | `HomePage.tsx:73-79` | ⚠️ 这**不是 bug 是未兑现的承诺** —— 它属于 10-05 研究的 E03 实验，不属于修 bug |

---

## 执行顺序

```
第一组（一次提交）  B-01 · B-02 · B-03        ← P0 全做完，无依赖
第二组（一次提交）  B-04 · B-05 · B-07        ← P1 + 跟着 B-04 走的
第三组（文档）      B-06                     ← 只写立项，不修
第四组（随手）      B-08…B-14                ← 跟着谁被碰到做谁
第五组（随手）      B-15…B-18                ← 同上
```

**为什么 P0 一次做完**：三条都小、互不依赖、且都能立刻验。
拆成三个提交只会让 review 的人三次回到同一批文件。

**为什么 B-04 单独成组**：它是这一轮唯一改「什么被记录」的，
需要单独的测试与单独的 review 视线。

---

## 验证方式

| 组 | 怎么验 |
|---|---|
| 第一组 | `pytest` 全绿 + **前端手动验一次课程中心**（free 课程卡片点进去对不对、计数动不动）。⚠️ 这一组**大半是前端 bug，pytest 验不到** |
| 第二组 | 新增真库测试：白板课答一题 → `course_lesson_observations` 有一行；`transcript_json` 仍照旧写 |
| 第三组 | 无（只是文档） |
| 第四五组 | `pytest` + `tsc` + `eslint` 干净；删除类改动要确认没有 import 残留（`grep` 一次） |

**基线门槛**：`pytest` **0 skipped**（本机 PG 会在半死状态下大批 skip 而看起来全绿 ——
先 `pg.sh status`，🟡 就 `heal`）+ `tsc` + `eslint` 干净。

---

## 明确不做

| 不做 | 为什么 |
|---|---|
| 把前端判分搬到本地 | 会产生"两处规则"，比注释不符严重得多 |
| B-06 的实际修复 | 属 Learn Space 的 Evidence Pipeline，混进来会让这一轮的影响面失控 |
| B-19（4 个 chip） | 它是 E03 实验的一部分，不是 bug —— 混进修 bug 会让"修 bug"这个集合变得不可信 |
| 掌握度 / KST | 在有 Attempt 记录之前做它，是在没刻度的尺子上画刻度 |
| 答错允许重试 | **不是 bug** —— `SessionRail.tsx:8-15` 的注释明确说 "no skip, no next, no jump" 是刻意的 |
| 把 transcript 当作 evidence 的替代品 | 它是"忠实记录"，与 observation 是两种东西（10-05 研究 §1.3） |
