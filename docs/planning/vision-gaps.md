# 愿景缺口清单（VISION GAPS）

> 这份表只记一件事：**当初在跟 ChatGPT 的设计对话里说好要做、但今天还没做到的东西。**
> 它是**活的** —— 每完成一条就把那一行改掉，并写下证据；发现新缺口就往下加。
> **最后更新：2026-10-31**（`practice-system` @ `7ec60d07`）

## 来源（三个文件，都在这份表里反复引用）

⚠️ **这三份都不在 worktree 里**：`§` 只在**主检出根**；后两份只在**主检出**的 `.workbuddy/research/`（`.workbuddy/` 整块被 gitignore，worktree 里连这个目录都没有）。要核"原话"回主检出找。

| 代号 | 文件 | 是什么 |
|---|---|---|
| **§** | `chatgpt-理解学习方法集.md`（主检出根，09-26，86 节） | 用户 ↔ ChatGPT 逐字对话。**§6** = Global Agent v1.0 功能列表；**§66** = MVP 地基清单 + 正式验收实验；**§82** = 长期重构地图 |
| **推演** | `.workbuddy/research/learn-space-lifecycle-reference.md`（主检出，10-01） | 与 GPT 的一次 runtime 推演（TOEFL 冲刺 20 步）。**它是验收口径和界面文案原话的来源** |
| **三模式** | `.workbuddy/research/learn-space-three-modes-brief.md`（主检出，09-30） | 给 ChatGPT 的背景说明：三种模式 + 七条不能破的原则 |

## 怎么读这张表

每条给四样：**问题** · **当初怎么说的（出处 + 原话）** · **今天的证据** · **完成判据**（怎么才算做完，能机械地判）。

⚠️ **"做好了但没验过"不等于完成** —— 那些单独放在 §E。**"当初明确说冻结/以后做"的不算缺口** —— 那些放在文末，防止将来误判。

---

## A. 那条生命循环（最核心，也是 §66 的正式验收）

### A1 · 那个验收实验从没跑过
- **问题**：整条链（学习 → 证据 → 状态 → 决策 → 提醒 → 用户回来）**一次都没有端到端跑通过**。
- **当初怎么说的**（§66 十二节，原话）：「我甚至建议我们不要用"组件完成率"验收。直接做这个实验：**一个新用户创建 Learn Space，然后在里面连续学习 3 次**」—— 第一次产生证据并更新状态；第二次 Agent 知道发生过什么、知道用户掌握什么、Coordinator 判断下一步；第三次离开后 Scheduler 触发通知、用户回来继续。
- **今天的证据**（2026-10-24 真库逐表 count）：`free_course_sessions` **7** 行、`knowledge_evidence` **11** 行、
  `coordinator_decisions` **7** 行、`notifications` **7** 行（全是 09-24~09-27 的 reminder）。看着"有东西"，
  但对不上那个实验：同一章（`090035a2…`）虽有 **5 条**会话散在 09-23/25/26 三天，其中 **4 条 `transcript_json` 为空、
  `cursor=0`** —— 是打开过没学过的壳，不是三次学习。这条是 A2–A5 的总出口。
- **完成判据**：**照着上面那三步真跑一遍**，每一步都留下数据库里的行（不是日志）。

### A2 · 证据回不到学习状态（两条判分主线绕过唯一入口）
- **问题**：用户在自由课程/题库里答对答错，**不会**变成"系统知道他会了"。
- **当初怎么说的**（§66 第六节）：「不要简单堆功能…**不要让 Learner State 自己凭空变化**。必须：`Experience → Evidence → State Update`」。
- **今天的证据**（2026-10-24 复核）：唯一入口 `evidence_entry` **有**真实调用方（`api/v1/knowledge.py:125`、Agent 的 `record_evidence` 工具
  `conversation_tool_service.py:603`）；但**两条判分主线仍绕过它** —— 自由课程判分只写 `CourseLessonObservation`
  （`free_course_service.py:605-612`），题库判分只落题库（`question_attempt_service.submit:94`）。
  新出现的第三条路 `services/practice/evidence.py:32` **走的是同一扇门**，真库也有 **7 行** `surface=practice` 的证据
  （全是 2026-10-12）—— 但**唯一调用方是 `backend/scripts/smoke_practice_evidence.py`**，没有任何生产路由调用它
  （`grep -rn "from services.practice" backend --include=*.py` ⇒ 只有该脚本与 `tests/test_practice_contracts.py`）。
- **完成判据**：在自由课程里答一道题 → `knowledge_evidence` 表**多一行**。

### A3 · 一段学习没有开头，也没有结尾
- **问题**：「这一轮学到什么程度算完」在代码里没有任何地方执行。
- **当初怎么说的**（推演，三层时间结构）：一轮 / **一段（一个做法 = 一次交互，结束＝完成判据达成或继续无收益）** / 一个目标周期。
- **今天的证据**（2026-10-24 复核，原 10-15）：`open_episode` / `close_episode` / `completion_met`
  仍然**没有生产调用方**。`grep -rnE "open_episode|close_episode|completion_met" --include="*.py" backend`
  ⇒ 除定义（`services/method_episode_service.py:118/166`、`ai/methods/completion.py:82`）、
  `__all__` 导出、docstring 之外，调用方**只有测试**（`tests/ai/coordinator/test_method_selection.py:587/611/723/749`、
  `tests/ai/methods/test_completion.py`）。（2026-10-28 重跑同一命令，结果不变。）
  ⚠️ 真库 `method_episodes` 有 **3 行**，别误读成"有了"——三行是同一段文案（`换元后的上下限`、`连续做对两道`）、
  分属三个不同 space/user、`opened_at` 是 10-05 与 10-10、**`closed_at` 全 NULL**，
  写入者是探针 `.workbuddy/localdb/verify_method_episode.py:274`，不是任何产品路径。
- **完成判据**：一次聚焦交互能被记成"一段"，并有一个真实调用方去开/关它。

### A4 · 决策层只在被动触发
- **问题**：系统不会在你进空间、或到时间的时候自己判断"接下来该做什么"。
- **当初怎么说的**（§66 第四节）：「它只需要证明：Learn Space 开始具备"决定下一步"的能力」。
- **今天的证据**（2026-10-29 重跑，原 2026-10-21）：Coordinator 生产调用方只有 **2 处**（`knowledge.py:148` · `conversation_tool_service.py:646`）；`_execute`（`services/coordinator_service.py:403-421`）里只有 `NOTIFY`（`:414`）自己动手，`INTRODUCE/REVIEW/CONTINUE` 一律 `return "handed_to_global_agent"`（`:421`）。
- **完成判据**：进空间时（或到点）真的产出一条非 `NO_ACTION` 的决策，并且**那一条真的改变了接下来发生的事**。

### A5 · 系统说不出「这个做法不行，换一个」
- **问题**：规则层判不出「做法**错了**」与「做法**没做完**」的差别 —— 后者的出口是 HOLD，前者**没有任何出口**。
- **当初怎么说的**（三模式 §4.3：聚焦是"唯一能写"的一屏，也是各种学习方法流程呈现的地方）。
- **今天的证据**（2026-10-29 重跑，原 2026-10-21）：`MethodSelection` 的五个值都定义好了（`ai/coordinator/types.py:349` 起：
  `NO_INTERVENTION / HOLD / END / START / SWITCH`），`SWITCH` 连"必须带理由"的校验都写了（`ai/coordinator/types.py:403-408`）
  —— 但 `grep -rn "SWITCH" ai/coordinator/rules.py` **零命中**；`rules.py` 只产出四处
  `NO_INTERVENTION`（`:296/301/306`）· `HOLD`（`:315`）· `END`（`:319`）· `START`（`:336`），`SWITCH` 一次都不会发生。
- **完成判据**：用户说"换个方式"时，真的结束这一段、按它开新的一段。

### A6 · 主动性只写进了提示词，一次行为观察都没有
- **问题**：prompt 现在要求"提出一个具体的下一步"，但**没有一条真实回复被看过** —— 不知道它是否还在反问"你想学什么"。A4 说的是规则层（Coordinator），这条是模型层。
- **当初怎么说的**（§66 第四节）：「它只需要证明：Learn Space 开始具备"决定下一步"的能力」。
- **今天的证据**（2026-10-30 重跑，原 10-21）：`b3f13c0e` 给 `ai/prompts/templates/text_chat.system.txt` 加了 Initiative / Evidence boundaries / Acting on the environment 三段（`:19`/`:35`/`:43`，重跑行号不变）；
  `tests/ai/test_prompts.py` 5 passed —— 只证模板渲染与三段没被删，**不证行为**。
  `decisions/agent-principles.md:156-175` 自己写了四条人工抽查，但全仓 grep「我们开始吧 / 你想学什么」只命中该文档的**描述**，**零条执行记录**。
  连"这段 prompt 真进了请求"都没验过 —— 研究纲领把它列为主轨第一件（`planning/research-cycle-01.md:109`），
  而那份文件第一行就写着 `Proposal (not started)`。
- **完成判据**：四条抽查里至少一条留下回复原文 —— 有 Goal + 有材料时说"我们开始吧"，它直接给出一个具体动作，而不是反问。

---

## B. 记忆与学习状态

### B1 · 「记住」停在第三台阶：会自动积累，但没证明影响下一轮
- **问题**：空间记得的只是"最近 20 条原文"（不排序、不检索），**也没有一次观察能证明**下一轮对话真的用上了上一轮的结论。
- **当初怎么说的**（§34 附近）：五个台阶 —— 记住 → 想起来 → **自动积累 → 持续更新 → 影响行为**；「V0 验收 = 一对话重要的事情在另一对话能准确想起」。
- **今天的证据**（2026-10-25 复核，原 10-18）：三条边界里**第一条、第三条仍成立** —— 挂在空间不挂对话；
  `list_for_space`（`space_memory_service.py:91`）按 `created_at desc` 取 `MEMORY_LIST_CAP`（=20，`ai/prompts/space_context.py:43`，截断在 `:189`）条原文
  （`space_memory_service.py:117-118`），无排序无语义检索；服务头注释明写 no update / no delete / no merge / no expiry。
  **第二条已经不准**：不只是 Agent 显式记住的才进 —— 改目标、关目标会**自动**写一条
  （`space_goal_service.py:290`、`:380`），这些记忆每轮都进 prompt。⇒ 台阶 3（自动积累）有了，
  但**"上一轮的结论被下一轮用上"从没被观察过一次**（没有哪条对话记录能指出来）。
- **完成判据**：不手动点"记住"的情况下，下一次对话用上了上一次的结论。

### B2 · 学习状态只知道"答对/答错"
- **问题**：**一个人可以全答对而完全不理解，系统看不出区别。**
- **当初怎么说的**（§16 附近，借鉴 ALEKS）：Knowledge State 由 assessment/evidence 推断；`Mastered / Not Mastered / Ready to Learn`。
- **今天的证据**（2026-10-22 复核，原 10-15）：认知/学习动作只承认一种（答对/答错）——
  证据表的判定值就三个：`VERDICTS = ("correct", "incorrect", "no_verdict")`（`models/knowledge.py:51`），
  第三个是"没判"，**不是"讲过一遍"**。
  `grep -rniE "recall|retrieval|reflection|transfer" backend --include="*.py" --exclude-dir=.venv --exclude-dir=tests`
  共 **16** 处命中，**全部**是"网络检索 / 上传分块 / 记忆取最近 20 条"（`no web retrieval`、`TransferConfig`、
  `V0 retrieval is "the most recent N, verbatim"`）—— **没有一处**是认知动作。
- **完成判据**：至少有一种"不是答题"的证据能改变状态（例如"复述/解释"）。

### B3 · Inspector 有入口，但 ✓ / → / ○ 一次都没显示过
- **问题**：用户看不到"系统现在认为我会什么、下一步该学什么" —— 界面写好了，但没人确认过它真能显示。
- **当初怎么说的**（§20）：`learner_state_v0` 要交付 **Learner State Inspector**（✓ mastered / → outer fringe / ○ not ready）。
- **今天的证据**（2026-10-25 复核，原 10-18；原话「全仓没有面向用户的入口」**已过期**）：入口就在简报面板里 ——
  `LearningBriefPanel.tsx:115` 挂 `KnowledgeStructureBlock`（`:217` 起），这个块自己调 `GET /knowledge/structure`，
  每行行首按派生结果渲染 ✓ / → / ○，后面跟「N 条记录」；挂载点是真工作台 `LearnSpaceWorkspace.tsx:280`
  （`fd951795`，09-22）。⇒ **界面在代码里存在、也在真页面上**。
  ⚠️ 但**没人见过它长什么样**：登录后页面本机打不开（E3），预览页拿不到 brief（`brief !== undefined` 才渲染），
  所以三态一次像素都没出现过；真实空间里有没有知识点可显示，也没核。⇒ 按纪律仍**不算完成**。
- **完成判据**：有一张截图（或一次真实空间打开的记录）能看见 ✓ / → / ○ 三态都出现过。

### B4 · 结构性前提没有被真正消费
- **问题**："掌握了 A ⇒ B 是合理的下一步"这条链在决定下一步时**没有被真的用上**（有一处回落还在按位置取）。
- **当初怎么说的**（§66 第五节）：「Knowledge Structure 是 Learner State 的空间…作用不是展示漂亮知识图谱，而是回答：**如果用户掌握 A，那么 B 是否成为一个合理的下一步？**」
- **今天的证据**（2026-10-05 核到；2026-10-29 重跑仍成立）：`select_focus` 的 `outer_fringe[0]` 回落
  **仍然在**（`ai/methods/types.py:488`）—— `grep -rn "select_focus" backend` ⇒ 两个 method
  （`socratic/method.py:105`、`direct_explanation/method.py:91`）各调一次、各算各的目标，与 Coordinator 的
  `NEXT_STEP` 目标重复。docstring 自称由 `test_the_focus_fallback_is_a_dated_duplication` 钉住，
  **那个名字的测试已经不在**（现名 `tests/services/test_methods.py:410 test_focus_falls_back_to_the_outer_fringe`）
  —— 债还在，但"钉住它"的那个名字过期了。
- **完成判据**：下一步的选择能指出"依据是 A→B 这条边"。

---

## C. 用户能感知、但还没做的承诺

### C1 · 「这份资料你覆盖了什么、哪儿没测过」——没有
- **问题**：聚焦里没有语义层，Lemma 与普通阅读器的差别就没了。
- **当初怎么说的**（三模式 §4.3）：聚焦 = 一份资料 + **它的语义层** + 你的边注 + Global Agent。
- **今天的证据**：不是没做，是**还没开工**（计划的 F3 批次）。
- **完成判据**：正文下方出现这条判断，**且每条都能点回它依据的那一段**（做不到就别假装能做到）。

### C2 · 「回到上次读的地方」——没有
- **问题**：离开再进来，回到开头。
- **当初怎么说的**（推演里"离开 → 回来"是完整闭环的一步）。
- **今天的证据**（2026-10-20 复核，2026-10-28 重跑仍 0 命中）：计划的 F4 批次，本轮明确不做。
  `grep -rniE "last_read|reading_position|lastRead|resume_position|scroll_position" backend frontend/src`
  ⇒ **0 命中**：前后端都没有任何"读到哪"的存储。
- **完成判据**：离开再回来，停在之前那一段。⚠️ 红线：**阅读位置 ≠ 掌握**，它不许进学习状态。

### C3 · 主动推送没提过的知识 —— 完全没有
- **问题**：系统不会主动创造学习机会。
- **当初怎么说的**（§54–58）：两个东西分开命名 —— **Review Reminder**（重新激活已学 Item）与 **Proactive Knowledge Push**（主动创造学习机会）；三个硬条件：当前状态允许学习 · Item 已 ready/due · 最近没刚推过类似的。
- **今天的证据**（2026-10-30 重跑，原 10-22）：发送器在（`services/notification_service.py`），但**上游一个都没有** ——
  调度器只认一种任务：`TYPE_NOTIFICATION = "notification"`（`services/scheduler_service.py:63`）；
  `grep -rniE "review_due|due_items|proactive|push_" backend --include="*.py" --exclude-dir=.venv --exclude-dir=tests`
  ⇒ **0 命中**。⇒ "为什么是这一条"这个上游（B1/B2 的状态 → 哪些 Item 到点）**根本不存在**，不是断在中间。
- **完成判据**：没人要求的情况下，系统推一条，且它能说出为什么是这一条。

### C4 · 空态只有一条路
- **问题**：聚焦空态只有"去网格挑一份"。
- **当初怎么说的**（推演 §8）：空态三件事（挑一份 / 继续上次 / 让 Agent 推荐）。
- **今天的证据**（2026-10-31 重核，三个行号全部未变）：`FocusEmptyState`（`FocusView.tsx:1122-1171`）只有第一件 —— 一条
  「去网格挑一份」（`:1167`，唯一出口是指回 `/learn-spaces/:id`），另有"这个空间还没有资料 —— 先去放一份进来"（`:1158`）。组件注释自己写明
  "继续上次"与"让 Agent 推荐"刻意不做（前者缺阅读位置，后者等拍板）。
- **完成判据**：三件事都在（其中"继续上次"依赖 C2）。

### C5 · 学习方法还没有真的改变界面
- **问题**：method 只是一个只读状态栏，不改变交互形态。
- **当初怎么说的**（三模式 §4.3）：「将来各种"学习方法"的自定义流程也在这一屏里呈现」。
- **今天的证据**：顶栏是只读展示（而且**不显示 method 名字**，这是刻意的）；契约只留了位。
- **完成判据**：换一个做法，用户看得见界面真的不一样了。

### C6 · 轨迹（Trajectory）：画布版做好了，但真路由还是列表；真路由的「点回原处」没验过
- **问题**：那条"我走了多远"的纵向时间层，**后端、入口、画布版都写好了** —— 但**真路由打开还是一页文档流列表**
  （画布版只挂在免登录评审页上）；而且真路由上**每一块能不能点回原处，从没验过**。
- **当初怎么说的**（推演）：那份 TOEFL 20 步推演本身就是一条**时间轴**，而清单顶部写明它是
  「**验收口径和界面文案原话的来源**」。§82 的长期地图里也有独立的 **TIME** 层，并指出真正的核心是那个环
  `Evidence → Learner State ↔ Knowledge Structure → Coordinator → Method → Experience → Evidence` —— 轨迹就是这个环的可视化。
- **今天的证据**（2026-10-27 复核「真路由换了没」，其余为 2026-10-17 第四次复核）：
  - 2026-10-27 重跑：`sed -n '1,20p' frontend/src/pages/TrajectorySpacePage.tsx` ⇒ 第 4 行仍
    `import { TrajectoryTimeline }`；`grep -rn "TrajectoryCanvas" frontend/src --include=*.tsx --include=*.ts`
    ⇒ 宿主只有 `pages/TrajectoryEventsPreviewPage.tsx:3/42`。真路由仍是列表。
  - **后端 `cc7ef40`**：`services/trajectory_service.py` + `api/v1/trajectory.py` + `schemas/trajectory.py`，
    挂进 `api/v1/router.py`（`GET /projects/{id}/trajectory`，纯读、不调模型）。**有真跑的输出**：
    探针 `.workbuddy/localdb/verify_trajectory.py` 对真库跑通九类事件、排除无锚点的块、标出近似时间与
    无归属通知、空空间为空；后端 526 passed / 0 skipped。
  - **真路由 `496b6d9`**：`/learn-spaces/:id/trajectory` + `pages/TrajectorySpacePage.tsx`（纵向列表）。
    前端 323 passed · tsc / eslint / build 干净。
  - **入口有了 `ac832fd`**：切换栏第四项「轨迹」（与「聚焦」同一条路：独立路由）。
    ⚠️ 头脑风暴更倾向**原地换**（与网格同类），**尚未定**。
  - **免登录评审路由 `6f9cf85`**：`/preview/trajectory-events`（同一段代码 + fixture，`?state=empty` 看空态），
    已真截图看过。⚠️ 与旧原型 `/preview/trajectory`（假数据、画布+四问+抽屉）**并存，不许合并**。
  - **画布版落地了 `0d037aaa` + `2f5f0c66`**：`trajectory/canvasLayout.ts`（纯函数摆位 + 15 单测）+
    `trajectory/TrajectoryCanvas.tsx`（紧凑节点 + `fixed` 悬停浮层 + 点回原处）。
    **「点回原处」真验过了**：`.workbuddy/localdb/verify_trajectory_canvas.mjs` 用 CDP 真鼠标事件跑 11 条断言全过
    （画布 1414x800 · 9 节点 · 三档 LOD · 拖动不动节点 · 点击落到 `/preview/focus`）。
  - ⚠️ **但验的是 fixture**（`/preview/trajectory-events`）；**真路由没换**：
    `pages/TrajectorySpacePage.tsx:4` 仍 `import { TrajectoryTimeline }`（列表），`TrajectoryCanvas`
    的唯一宿主是 `pages/TrajectoryEventsPreviewPage.tsx:3`。真路由要 token，本机没有（见 E3）。⇒ 按完成判据**尚未满足**。
  - **知识骨架 `40de3e0c`**：`GET /projects/{id}/trajectory` 多返回 `knowledge`（points + prereqs + 每个事件的 `itemId`）。
    真库实测**九类里只有 `evidence` 挂得上（1/9）** —— 其余 8 类没有 `item_id`，"这次对话是关于哪份材料"从没被记录。
  - ⚠️ **"判断"那些句子仍然没人写**：`whatChanged / implication / whatRemains` 不是任何表里的字段，
    本版**刻意一句不写**（没依据就留白）。
  - 计划 `.plans/trajectory-mvp/INDEX.md`（T1/T2/T2.5/T4/T5 ✅；**T6 = 分层树，T6a 骨架已落地，T6b/T6c 未做**）。
    ⚠️ 已知未修：按钮缩放锚在画布中心而内容在左边一条 ⇒ 放大就把卡片推出屏幕（⌘+滚轮锚指针，不会）。
- **完成判据**：真实空间的真实路由里打开它，看到的是**画布**（不是列表），图上**每一个节点都能点回它的依据**
  （一次交互 / 一份产物 / 一行证据），且**没有依据的节点显式写"没有记录支撑"** —— 而不是让模型补一句话。

### C7 · 启示（Insight）：评审页做好了，真空间里一条都没有
- **问题**：`/preview/insight` 上那句「你做对了，但那次是靠提示做对的」看着能用 —— 但它是**假数据**，
  真空间里不会出现任何启示，用户也没有地方说「以后别提醒这类」。
- **当初怎么说的**（`design/adaptive-insight.md` §7「做」）：V1 只做一种启示（靠提示做对）；**只加一张** `space_insights` 表
  存反馈；`insight_service` 走 S1 规则 → S2 门槛 → S3 一句话（唯一一次模型调用）；**没候选就一条都不生成**。
  §6.3：界面位置先不定，V1 只给免登录评审页。
- **今天的证据**（2026-10-27 复核，原 2026-10-18；两条 grep 重跑仍是 0 命中）：
  - 评审页在：`AppRouter.tsx:110` 只有 `/preview/insight` 一条路由；页面自己写明「数据全是假的」
    （`InsightPreviewPage.tsx:37`）；接受/否决只活在组件 state，刷新就没。UI 收口 `9a1ac768`
    （24 条 CDP 断言、暗色截图 `?dark=1`、三个视图重复度 RESTATE 各 1）。
  - 后端**零实现**：`grep -rniE "insight" backend --include="*.py" --exclude-dir=.venv` ⇒ **0 命中**；
    `grep -rn "space_insights" . --include=*.py --include=*.ts --include=*.tsx --include=*.sql
    --exclude-dir=.venv --exclude-dir=node_modules` ⇒ **0 命中**；`backend/models/` 下没有 insight 表。
  - ⇒ 真空间里既没有启示，也没有地方记「这条被否决过」。
- **完成判据**：真空间里出现一条启示，它引用的每条记录都能点回原处；点「以后别提醒这类」后
  `space_insights` 表**多一行**，且下一次同类候选被 S2 挡掉（不再生成）。

### C8 · 画板：真画布只有「对话卡」一种，语义连接一条都没有
- **问题**：空间的画板本该把资料、笔记、对话铺在一张画布上、画出它们的关系；今天真页面的画布上**只有对话卡片**，
  没有一条连线，也不能在画布上圈一组东西投给 Mala。
- **当初怎么说的**（三模式 §2「画板（Board / Global Board）」原话）：「把空间里**所有 context** 铺在一张可缩放、
  可平移的画布上，并且把**语义连接**画出来……语义连接：文件 → 它覆盖的知识主题 → 主题之间的先修关系。
  这一层不引入 embedding 或文件相似度，只用我们已有的知识结构。」「在画板上可以**选**：Mala 能点击或框选
  画板上的任何元素或群，投送到右侧的 Global Agent。」
- **今天的证据**（2026-10-23）：
  - 真画布只有一种节点 —— `workspace/workspaceTypes.ts:1` 注释自认「**目前只有「对话」一种**，位置是画布态、不落库」；
    `LearnSpaceWorkspacePage.tsx:42-56` 的 `nodes` 就是 `conversations.map(...)`（空空间给一张不可打开的占位卡）。
  - **没有任何连线**：`grep -rniE "svg|polyline|path d=|line" frontend/src/features/learn-space/workspace/WorkspaceCanvas.tsx`
    ⇒ **0 命中**（文件只做拖动 + zoom）。
  - 三类元素（file / note / interactive）**只在免登录原型** `/preview/space-canvas`：`features/space-canvas/canvasData.ts`
    是 mock，位置进 sessionStorage；同一目录 `grep -rniE "edge|line|connect|link|relation"` ⇒ 只有 `resize-none`
    与一条 eslint 注释，**原型里也没有语义连接**。
  - Mala 只在对话侧：`grep -rn "Mala" frontend/src/features/learn-space/workspace/` ⇒ 只命中
    `ConversationPanel.tsx:103/112`（输入框上方的 chips），**画布本身**没有框选/投送。
- **完成判据**：真空间的画板上同时摆着 资料 / 笔记 / 对话 三类，画面上能看见**至少一条**语义连接
  （文件→主题→先修），并且框选一组元素能投送给 Mala。

### C9 · 建议卡：拒绝一次，下次它还会提
- **问题**：Agent 提的每条建议都活不过这一次渲染 —— **被撤销/忽略这件事不被记住**，刷新或下一轮就重新出现；
  「这条建议被采纳过还是被否决过」在库里没有任何一行。V2 报告把这条列为它推翻的两条 V1 结论之一，
  但仓库今天仍是 V1 的样子。
- **当初怎么说的**（`docs/research/focus-mode-technical-report-v2.md` §4.3 原话）：
  「V1 的 AgentMoveCard 完成了一次演示后就没有然后了：它不知道自己被看过、被展开过、被采纳过；
  用户不能移动它、引用它、在上面写字；Agent 不知道它是否还在」。
  §4.2 要求 Move 有生命周期 `prepared→presented→engaged/dismissed/adopted/superseded/expired`，
  并提出第五原语 `track(move)`；修订记录把「拒绝记录必须跨会话持久」标为**推翻 V1**。
- **今天的证据**（2026-10-28）：
  - 前端 `AgentMoveCard.tsx:30-31` 只有 `useState(false)` 存展开态；`ActivityWorkspace.tsx:30-36`
    `dismissMove = () => { setMoveVisible(false); setMoveInserted(false) }` —— **撤销 = 把组件 state 清成初始值**，
    无任何写库/写本地存储。
  - 后端**没有存放建议命运的表**：`grep -rn "__tablename__" backend/models/*.py | grep -iE "move|suggest|hint|interven"`
    ⇒ **0 命中**；`grep -rniE "agent_moves|move_lifecycle|move_status" backend --include=*.py --exclude-dir=.venv`
    ⇒ **0 命中**；`grep -rn "track(move)" . --include=*.py --include=*.ts --include=*.tsx --exclude-dir=node_modules`
    ⇒ **0 命中**（第五原语 `track` 只以文字形式出现在报告里，代码层一次都没有）。
  - 挂载点仍只在免登录原型：`grep -rn "ActivityWorkspace" frontend/src --include=*.tsx` ⇒ 唯一宿主是
    `pages/FocusActivityPreviewPage.tsx:7/120`（`/preview/focus-activity`），真路由没有。
- **完成判据**：否决一条建议 → 某张表**多一行**（`dismissed` + 时间 + 理由）；同源建议在下一次打开时不再出现，
  且用户能看到「它为什么不再提这个」。


---

## D. 愿景要求的能力：**实现了，但不生效**（做完了却是假的，比没做更危险）

### D1 · 「保存撞车三选」永远不会弹
- **问题**：编辑器那套冲突处理界面存在于代码里，但**触发不了**。
- **今天的证据**（2026-10-25 复核，原 10-19）：`save_page_blocks`（`services/doc_service.py:197-228`）
  只比对 `Page.updated_at` 再删块重插、`commit()`，**全程不 UPDATE `Page` 行** ⇒ 时间戳不动
  ⇒ 客户端拿过期版本也永远对得上。对照：`append_blocks` 在 `:302` 手工 `page.updated_at = func.now()`。
- **完成判据**：两个窗口同时改一页，第二个真的收到冲突。

### D2 · 题库系统建成但从未启用
- **问题**：题库整条链一次真实使用都没有 —— **做题记录两张表 0 行**。
- **今天的证据**（2026-10-25 真库实测，`select count(*)` 逐表，数字与 10-19 完全一致）：
  `questions` **10** / `question_versions` **10**（全部 `provider=xkw_fixture`，同一秒 2026-09-26 12:46:19 写入，
  是夹具不是真题库）/ `question_sets` **0** / `question_set_items` **0** /
  `question_attempts` **0** / `question_set_attempts` **0**；`qbank_usage_logs` **4**（同样 `provider=fixture`）。
  ⇒ 原句「6 张表 0 行」**已不准**（题目表有夹具 10 行），但**做题记录确实是 0**。
- **完成判据**：至少一条真实的做题记录落进那 6 张表。

### D3 · 建议不告诉你"为什么提这条"
- **问题**：系统提一条建议，但**不记录依据**（只写了来源对话 id）。
- **今天的证据**（2026-10-31 重核，行号未变）：界面仍如实显示"系统未记录提出这条的依据"
  （`frontend/src/features/user-home/SuggestionsInbox.tsx:124`）—— 依据仍然没有被记下来。
  重跑 `grep -rn "__tablename__" backend/models/user_home.py` ⇒ `user_home` / `user_home_items` / `space_preferences`，
  建议行只存 `source_conversation_id`（`conversation_tool_service.py:703` 的 `propose_home_preference_handler`），
  没有任何"依据"字段。
- **当初怎么说的**（§82）：User Home 要从"静态用户资料"升级成"支持稳定偏好、长期信息、**确认式记忆**"。
- **完成判据**：每条建议都能说出一条依据，并且那条依据可回看。

### D4 · 语音没有用户级存储
- **问题**：音色是全局单点，做不了"我的声音"（2026-10-23 复核，原 10-10）。
- **今天的证据**：`ls backend/models | grep -i "voice\|speech"` ⇒ **无输出**（没有任何 voice/speech 表）；音色是配置里一个全局默认
  （`core/config.py:152` `speech_tts_voice: str = "alloy"`）⇒ 换不了、也不跟用户走。
- **完成判据**：音色跟着用户走。

---

## E. 做了、但没验过 —— 所以现在**不能算完成**

### E1 · Mala 真实空间端到端
- 链路（圈选 → 打包 → chips → 发送带上 → 回到出处）代码完整、测试通过，**但从没在真实空间里跑过一次**。

### E2 · 边注在真浏览器 + 真路由
- 后端那条路用真库验过（子页 + 锚点读写）；**"真浏览器 + 真路由"整条没走过**。
- 评审页上已经验过按键路径与对齐（CDP 真驱动，偏差 0px）—— 但那不是真路由。

### E3 · 登录后的任何一个页面
- 本机没有可用 token ⇒ **登录后的像素一次都没看过**。§C、§D 里那些用户在真界面上会遇到的问题，都要从这里开始看。

---

## 附 · 当初明确说「冻结 / 以后做」的 —— **不算缺口**

- **Method System 高级形态**（Method Selection / Specification / Runtime / 组合切换）、**插件市场**：当初说冻结。
- **高级 Memory**（语义检索 / 排序 / 记忆衰减 / Memory Graph / 向量库优化 / 自动总结全部聊天）。
- **高级 Learner Model**（贝叶斯 / 复杂 KST / mastery 概率 / 知识追踪 ML / 认知诊断）。
- **高级 Scheduler**（自适应间隔重复 / 最优复习排期 / 强化学习排期）。
- **高级 Coordinator**（多智能体 / 自主循环 / MCTS / 长期规划 / 自反思 / 策略学习）。
- **多 Agent Runtime**。
- **User Profile 完整形态**（当初明确"不要一开始做"，后来只做了 V0 的 User Home）。
- **PPT / 白板 / 视频接进学习闭环**：§66 明说"暂时不需要全部接进来"。
- **Voicе 的实时化**（打断 / turn-taking / 多模态）：当初排在最后。
- **"第三速度计划" / "死亡搁浅计划"**：用户自己说"有机会再说"。

---

## 怎么更新这张表

1. 一条做完 → 那一行**删掉**，挪到 `memory/YYYY-MM-DD.md` 并写上**证据**（哪张表多了一行 / 哪个截图 / 哪条命令的输出）。
2. ⚠️ **"我改了代码"不算完成** —— 当初踩过：`computed, not yet wired` 冒充"已实现"。完成的判据一律是**能观察到的结果**。
3. 新发现的缺口 → 按同样的四样格式加一行（问题 / 原话 / 证据 / 完成判据），并标明出处代号。
4. 每次更新，改上面的「最后更新」那一行（日期 + 分支 + 提交）。
