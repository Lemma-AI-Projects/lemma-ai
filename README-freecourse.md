# Free Course 研究 · README

> ⚠️ **这份文件曾丢失过一次。** 2026-10-05 我在 `connecting-page` 分支写完它之后，
> 分支被切到 `user-profile`，文件随之消失（仓库两个分支都**没有** tracked README，
> 所以它是一次未跟踪文件丢失，不是覆盖）。内容从记忆恢复，文件名改为不与
> 任何产品 README 撞名的 `README-freecourse.md`。

**交付物**：`free-course-pipeline-brainstorm.html`（约 97 KB，12 节，浏览器直接打开）
**代码基线**：`connecting-page @ d7a9299c`

---

## 研究了什么

对 Free Course 做了一次完整代码审计，然后在其上做受约束的发散。

**审计范围**：后端 3,088 行（`free_course_service` / `free_course_session_service` /
`free_course_events` / `course_build_service` / `ai/free_course/**` / `api/v1/free_courses.py`）
+ 前端全链路（`features/free-course/**`、路由、入口、chat/streaming、
exercise/progress/preview 夹具、mock 数据）。

**方法**：先建立「现在到底是什么」→ 找结构性瓶颈（A–E）→
11 个视角各自推到底 + 12 个跨领域系统的 interaction loop 对照 →
收敛出 2 个 primitive 与 6 个 pipeline 的七维比较 → 三个实验。

**没有做**：不改一行代码 · 不设计新架构 · 不提 Multi-Agent · 不接 Learn Space ·
不假设任何理论是正确答案。

---

## 最重要的发现

### 1. Free Course 是一个学习内容的编译器，它缺一个运行时

生成 6 次模型调用产出一棵固定的树 + 若干固定形状的讲解脚本，
学习者在其上按顺序消费。**产物在他开始之前就已经定完了。**

### 2. 学习是一个「读取」过程，只是被读的那份数据从来没有被写

整份报告的承重结论。三个容器都在，零个 reader：

| 容器 | 状态 |
|---|---|
| `course_lesson_observations` | 只被读来做两次 `COUNT(*)` |
| `session.transcript_json` | 代码自认是「忠实记录」，**从不被读来做推理** |
| `learner_state` | 完整接口 + 五个字段 + prompt 渲染，**三个字段全仓无调用方传过** |

**最刺眼的一处**：「下一节课」是 `ordered[index + 1]` ——
课程推进是一个数组下标，而学习不是。
且 Learn Space 的核心规则（`state.py:291`：独立且未受帮助才算）
**在 Free Course 里完全不存在** ⇒ 所以 Free Course 里的「对」和「会」是同一件事。

### 3. 三条转角处的真实断裂

- **会话判分不入库** —— 白板课里学习者的每一次答题只进 `transcript_json`
  （`session_service.py:444`），`CourseLessonObservation` 全文只出现在 import 行。
- **`mode` 断链** —— `CourseListItemOut` 没有 `mode`，前端声明并依赖它
  ⇒ free 课程在课程中心被当视频课。
- **tuning 断在教学会话之前** —— 用户认真选了「紧凑/概念侧重」，白板课完全不知道。

### 4. 值得单独指出的一处设计冲突

白板的 `steps` **只 extend 不 splice**，理由是「transcript 必须是忠实记录」。
而「模拟」方向要求白板能因学习者的操作而改变。
**这两条在数据结构上直接冲突** —— 这不是实现问题，是两种不同的「历史」观。

### 5. 那个从未兑现的承诺

首页 4 个「随便试试」chip **没有 `onClick`** ——
它们承诺过一个从未实现的能力，而那正是浅用户最需要的入口。

---

## 三个最值得下一步验证的实验

按「改动小 / 认知收益大」排序，顺序刻意。

### E01 · 让 transcript 被读一次
白板课第二轮开始时，把已发生的 transcript 读成「他在这段里表现如何」，
据此决定这次先讲什么。**不写新表、不加字段，只加一个 reader。**

- **告诉我们**：transcript 里的信号够不够。
- **证伪**：只有 1–2 轮时差异不可观察 ⇒ 它不是「没被读」而是「里面不够」。

### E02 · 把「我帮过忙」记进 Free Course
加 `hint_used`，让带提示的答对**不改变判定**。
Learn Space 那边整条链路已建好，Free Course 这边是零。

- **告诉我们**：带提示的答对**到底占多少** —— 今天完全不知道且无法估算。
- **证伪**：实测 < 5% ⇒ 这条线索不成立（5% 是我拍的阈值，可调）。

### E03 · 3 分钟 playable
给首页那个死 chip 接上一个不需要描述、30 秒内给出第一次尝试的入口。
**加法不是改法** —— 不生成完整课程。

- **告诉我们**：浅用户是**被门槛挡住**还是**被结果挡住**（后者解法完全不同）。
- **证伪**：第二次尝试转化率无变化 ⇒ 门槛不是瓶颈，主攻方向转向 E01/E02。

---

## 后续规划

见 `.workbuddy/plans/free-course-bugfix-plan.md`（19 条 bug 分四档）与
`free-course-rebuild-plan.md`（四步重构：先修断口 → 让「对」与「会」分开 →
补上那一读 → 给浅用户一条短路）。

---

## 一句话收束

> Free Course 已经把「把知识变成结构」这件事做得比大多数人好；
> 它欠的不是结构，是「读回自己做过什么」的那一读。
> 而那一读需要的不是新表、不是新架构、不是新 Agent ——
> 它需要 `hint_used`、非回忆题，以及把 transcript 从一份存档变成一次观测。
