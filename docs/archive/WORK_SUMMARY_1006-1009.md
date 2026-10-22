# 工作总结 · 2026-10-06 → 10-09

> **分支** `user-profile` · **基线** `656769d6` · **整理时间** 2026-10-09
> 范围：只覆盖**我做的**提交。同一分支上还有别人的提交（`95f00452` 能力/徽章设计规范、
> `656769d6` 服务端语音），**不在本总结范围内**，但它们在时间线上与我的工作交错。

---

## 一句话

> 四天里我做了**三件独立的事**：修 Free Course 的两个真实断链 ·
> 把「Trajectory」这个还不存在的概念第一次变成可体验的页面 ·
> 以及一次把 Learn Space 拆开看的接线审计 —— **而审计的结论反过来否定了前两件的顺序。**

---

## 时间线（按提交）

| 提交 | 时间 | 做了什么 | 规模 |
|---|---|---|---|
| `99929ffd` | 10-06 09:26 | Free Course：修 `mode` 断链（两半）+ 练习计数不刷新 + 一处注释与实现不符 | 5 文件 · 1 测试文件 |
| `df06a656` | 10-06 09:58 | Free Course：让白板课知道学习者要什么（tuning 的 pace/depth 传进 planner） | 3 文件 |
| `75f9e2fe` | 10-06 16:56 | **Trajectory UI 原型**（新概念第一次变成可看的页面） | 7 文件 · 1889 行 |
| `d5bcfa59` | 10-08 07:38 | 重新提交丢掉的两个提交 + 三份计划搬进仓库 | 6 文件 |
| `9824c2ec` | 10-08 07:43 | **Learn Space 接线审计 + Space Ignition 计划**（零代码） | 2 文件 · 670 行 |

⚠️ **中间有一次故障**：`0808ef83`（三份计划搬仓库根）与 `3167a45b`（docs 转移）
**在 10-08 早上不在分支上**，后者不属于任何分支。文件还在，已重新提交为 `d5bcfa59`。
这是本周第二次同类故障（10-06 是未跟踪 README 切分支消失）。

---

## 第一件 · Free Course 的两个真实断链

### B-01 `mode` 断链（修了两半，不是一半）

`CourseListItemOut` 没有 `mode` 字段，而后端不吐 ⇒ 前端 `isFree` 恒 false
⇒ **点 free 课程会走视频课路径，拉一棵没有 point 的空树**。

⚠️ **但只加字段修不好这个问题**：`total_point_count` 走
`progress_service.get_courses_point_counts`，它 join `course_points`（视频课的表），
free 课程没有 point ⇒ 无 entry ⇒ 调用方读成 0/0
⇒ 进度环恒 0/0，且因为「已学完」要求 `totalPointCount > 0`，**free 课程永远进不了那个 tab**。

**⇒ 新增 `free_course_service.course_progress_counts` 按章节算，并复用
`_lesson_progress` 的判据**（`steps>0 and cursor>=steps`）而不是自造一个 ——
两处口径分叉比没有数字更糟（课程页说 1/2 而课程中心说 0/2，用户会以为进度坏了）。

**我在这个函数里写错过一次列顺序**（按 unit_id 分组），症状是**返回一个装满无关课程的
dict、看起来完全正常** —— 是测试抓到的。

### B-05 白板课忽略了学习者的要求

问卷里的**节奏**与**讲解深度**两个答案只到了 blueprint 与 content，
而白板课是同一课的另一种呈现 —— 它**完全无视**这两个答案。
⇒ 选了「紧凑」的人得到一份紧凑的文档，然后是一堂不理会这个选择的课。

⚠️ **我第一版把问卷取值全写错了**（`quick_pace`/`intuitive` 而不是
`intensive`/`intuition`），**而没有任何东西抓到**，因为一个未识别的取值
**不产生 note 也不报错**。
⇒ 护栏改成**读真实问卷**的测试，并且我改名一个取值验证它真的会红，再还原。

**刻意不传 `course_volume`**：它决定大纲多长，而大纲在开课前就写好了 ——
传进去会让「多少算太多」有两个地方说了算。

### 测试基线

| 时点 | 结果 |
|---|---|
| 10-06 早（修完 B-01/02/03） | 509 passed / 0 skipped |
| 10-06 早（修完 B-05） | **516 passed / 0 skipped** |

---

## 第二件 · Trajectory：把一个概念变成能看见的东西

`/preview/trajectory`（公开免登录，独立路由）。**产品代码只增不改。**

**核心决定**：**节点 = 一次有意义的改变，不是一次活动。**
因为活动日志回答「你做了什么」，而三周后的人问的不是那个。
每个节点必须能回答四问 —— **少了第四问是日志，少了第三问是 AI 编的故事**：

```
发生了什么 · 什么变了 · 凭什么这么判断 · 这对接下来的意义
```

第三问是 `EvidenceDrawer` 存在的全部理由（判断 → 依据 → 原始记录，两级）。
而**没有依据的节点照样显示**，只是显出「没有记录支撑」——
一个不区分「记录」与「断言」的页面会教会读者不要相信它。

### 这一件我做得不好，用户指出后我改了计划

反馈是两条：**单向 changelog 不够，要可拖动缩放的树**；**UI 风格不达标**。

⚠️ **第二条我认，而且那是我审计上的漏洞**：我核了 design token 存在，就直接开始做，
**从没把 Focus 或 Goal 的真图放在我的页面旁边比过**。
对比之后（Focus 三栏 + 20 图标 + chip + focus ring；Goal `rounded-xl border` 卡片），
我的页面是**单栏、零卡片、零 chip、裸文字按钮、图标全 12px、无交互态** —— **差 2–3 个档次**。

**token 只保证「能用」，不保证「够好」。**

重构计划在 `TRAJECTORY_V0_PLAN.md`，**停在第 1 步之前，一行代码未动**。
§6 按「谁说的」分开记了双方观点：共识两条、我的反对一条、待拍板两条。

**其中一个反对是关于「科技树」这个形态的**：科技树隐含解锁语义（先做 A 才拿到 B），
而真实节点不互相解锁（9/26 的突破不是 9/22 练习的解锁结果）。
**树状图会编造用户没经历过的因果。** 建议改成纵向=时间、横向=这个变化触及了什么。

⚠️ **另外发现一件事**：项目里**已经有** `BoardCanvas`（221 行完整 pan/zoom），
空壳挂在 `/sandbox/board` ⇒ **「加拖动缩放」从「写一套交互」降级为「换一个宿主」**，
且**不需要引任何图库**。

---

## 第三件 · 接线审计：结论反过来否定了前两件的顺序

两份文档，**零代码改动**：`learn-space-wiring-report.md` · `learn-space-space-ignition-plan.md`。

### 最重要的发现（我 10-06 那份行为层研究没看到的）

> **新空间没有知识结构 ⇒ Evidence 根本写不进去。**

```
import_structure 的调用方 → 只有两个 seed 脚本
add_edge                → 零调用者
api/v1/knowledge.py     → GET structure / GET brief / POST evidence
                          ⇒ 没有任何写结构的路由
```

而 `record_evidence` 的门禁是 `resolve_item` 必须解析出**已存在**的知识点
⇒ 新空间必然 `unknown_item` ⇒ **不写**。
（模型层甚至预留了 `user_added`/`user_confirmed` 两个来源枚举，产品层没暴露。）

### 第二个：Focus 里零个交互通向 Evidence

五类交互逐个核过（编辑/漫游/大纲/顶栏/右栏对话）—— 全断。
且**没有提问机制**（`ConversationQuizTool` 存在但没有 `QuestionPlayer` 挂载）。

**Focus 实际是「一个可写的文档阅读器 + 一个通用聊天侧栏」**，
它自己的注释写着「没实装（也不假装）」。

### ⇒ Space Ignition 的真正阻塞点不是 onboarding

`Name → Intent → First Move → Focus` **几乎全是前端流程**，
而它依赖的能力**全都已存在**（建空间只写 name · Goal 已有「抽取→回述→一次点击确认」·
Focus 路由存在）⇒ **全部能跑，但把人送进一个空房间。**

**三条 P0 都在学习层**，不在 Ignition 层。

### 一条被误当断线的设计

**Goal 刻意不进 prompt** —— `method_service.py:152-156` 给了原话：
「a goal printed into every prompt becomes a topic the model keeps bringing up」。
⇒ **这是约束，不是 bug**，而且它直接决定了 Ignition 的形态（Intent 必须落 `space_goals`）。

### 与 10-06 行为层研究的对照

`docs/learn-space-user-behavior-map.html` 从**用户行为**出发，本轮从**组件接线**出发。
两份**结论一致**（Learner State 入口缺失 / 承诺层悬空 / 主动行为只有被动触发），
本轮**多一条**：知识结构只能由 seed 写。
⇒ **交集可信；差异是新增认知，不是矛盾。**

---

## 三条线其实是同一条链

这是本轮最有复用价值的产出 —— **Ignition / Trajectory / Free Course 不是三个独立问题**：

```
知识结构 → Evidence → Learner State → Coordinator → Method
   ↑          ↑          ↑
 断了       断了    只有一个触发点
```

- **Ignition** 断在第 1 格（没结构可记）
- **Trajectory** 断在第 3 格（`State Change` 读时算、从不存储 ⇒ 没有「变化」这个事实）
- **Free Course** 断在第 2 格（判分走平行表，不进 evidence）

---

## 交付物清单

### 进了仓库的
| 文件 | 内容 |
|---|---|
| `FREE_COURSE_BUGFIX_PLAN.md` | 19 条分四档；P0 三条 + B-05 已修，**B-04 降级为建模决策** |
| `FREE_COURSE_REBUILD_PLAN.md` | 四步重构，§1.1 是那个待定的建模决策（A/B/C 三选项） |
| `TRAJECTORY_V0_PLAN.md` | 重构计划，§6 是双方观点对照 |
| `learn-space-wiring-report.md` | 接线审计（组件矩阵 · 9 条 wiring · 14 条断线 · P0/P1/P2）|
| `learn-space-space-ignition-plan.md` | Ignition 实施计划（七个问题的答案 + 落地形状）|
| `free-course-pipeline-brainstorm.html` | Free Course 全流程研究（97 KB · 12 节）|
| `docs/README-freecourse.md` | 上面那份研究的入口 |
| Trajectory 原型代码 | `frontend/src/features/learn-space/trajectory/`（3 文件）+ 路由 + 1 个 CSS utility |

### 只在本机（`docs/` 被 gitignore）
| 文件 | 内容 |
|---|---|
| `docs/learn-space-user-behavior-map.html` | **96 条行为 · 15 阶段 · 18 条断线**的可交互工作台 |
| `docs/README-learn-space.md` | 上面那份的 README |
| `.shots/*.png`（15 张） | 真截图证据（含与 Focus/Goal 的对比图）|

⚠️ **`learn-space-user-behavior-map.html` 目前不进仓库** ——
`docs/` 在 `.gitignore` 里（`/docs/*`），只有三个文件被放行。
**要不要给它也加一条放行规则，仍待定。**

---

## 我这四天犯的三个错（记下来因为它们会重复）

**① 只核 token 就动手，没截同族页面的图。**
⇒ 判断一个页面「够不够好」之前，先把同族页面的真图放在旁边比。

**② 以为提交成功了。** `git log -1` 显示的是**别人的**提交，我没核对。
⇒ 用 `git merge-base --is-ancestor <sha> HEAD`，不要只看 `git log -1`。
（本周两次：一次未跟踪文件消失，一次提交本身丢。）

**③ 断言引了 mock 里不存在的措辞，一直红着。**
⇒ 断言必须引**真实存在的字符串**，否则它会在数据改写后静默失效，
而你会以为是实现坏了。

---

## 待办与悬着的事

| | 状态 |
|---|---|
| **B-04 的建模决策**（白板课的问句要不要与 lesson object 绑定） | 🔴 **待用户拍板** —— 三个选项在 `FREE_COURSE_REBUILD_PLAN.md` §1.1，我倾向 A |
| **Trajectory 的重构** | ⏸ 计划已写，**停在第 1 步之前**；§6.3 与 §6.4 待拍板 |
| **Space Ignition** | ⏸ 计划已写；**建议先做 P0-3 知识结构写入面** |
| 行为地图是否进仓库 | ❓ 待用户决定 |
| **登录后的页面** | 🔴 **整个四天都没能验** —— 登录走云端 Supabase，本机无账号 ⇒ 所有 UI 结论都是代码事实 + 真截图，**登录后的一屏都没看过** |

---

## 一个应该记下来的观察

**这四天的产出里，有价值的部分不是代码，是"发现某件事没有接上"。**

`method_episodes` 有表、有约束、有数据（本地库 2 行）而**零生产写入方**；
`completion.py` 有完整判定与 17 条测试而**整个模块零调用**；
`method_status` **真的在跑**而返回的是静态文案；
`learner_state` 每轮都在算而冷启动时返回「什么都没有」。

**这些都通过了「组件存在吗」的检查，而那正是最容易问的问题。**
判据应该是：①有写方 ②写方被真实路径调到 ③读的方是生产路径而不是测试。