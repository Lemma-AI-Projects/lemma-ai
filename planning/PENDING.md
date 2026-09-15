# 待完善列表（Pending）

> 用途：已讨论但**尚未动手**的事项集中登记，避免「讨论过就以为做过了」。
> 规则：每条必须写清 **证据（文件:行号）**、**用户可见效果**、**为什么值得做**；没有证据的猜测不进这个表。
> 最后更新：2026-09-14 20:10
>
> **刚完成（2026-09-14）**：① Learning Brief 前端板块（`learning-brief-plan.md` §10，纯前端 + mock，`npm run check:brief` 46 项）② 导入向导四步（`kb-doc-layer-execution-plan.md` §10，纯前端 + mock，`npm run check:import` 40 项）③ 官方 Notion/Obsidian logo 入库（`.workbuddy/research/brand-assets/`）。
> **两件都不是「做完了」**：条目里的前端都只活在 `/preview/` 下，真实入口/真实数据全在等后端 —— 待做项见新增的 **F 段**（Learning Brief）与 **G 段**（导入）。
>
> **刚完成（2026-09-13，commits `765fd6f9` / `978b5ba6`）**：B1 入口三连、B2 后端基线提交、B3 课内 5 个 bug、B5 lint、B4 的缩放控件 —— 详见 `planning/free-course-plan.md` §11。下面 B 段只留**仍未做**的部分。

---

## A. 已拍板 · 等开工（parked）

| # | 事项 | 计划文档 | 拍板时间 | 为什么不现在做 |
|---|---|---|---|---|
| A1 | **画布收敛（A 案：合并两套画布）** | `planning/canvas-convergence-plan.md` | 2026-09-13 | Ceaser 决定**先存 pending**。前置链条较长（先落基线提交 → 加预览路由 → 抽原语 → 切工作台 → 切蓝图 → 删旧文件），且与 Free-Course 收尾抢同一批文件 |
| A2 | **部署配置进仓库** | 无（待写） | — | 仓库里**没有任何** Dockerfile / docker-compose / vercel.json / render.yaml（`git ls-tree` 两分支皆无）。线上环境无法从 repo 复现，"上线"缺环境层 |
| A3 | **视频转存红线 1 改造（官方嵌入 + Gemini 直传 URL）** | `maic-vs-hyperknow-lemma-implications.html` §5.7 | — | 原文：**收费前**必须改造。而 Credits 收费后端已落地（`c75cc6e3`），两条线已撞上。播放器仍吃 `video.playbackUrl`（`CourseVideoView.tsx:115`），无任何官方嵌入路径 |

---

## B. Free-Course 收尾（入口已通，剩蓝图与视觉）

### B1–B5 ✅ 已完成（2026-09-13）

| # | 事项 | 结果 |
|---|---|---|
| B1 | **入口三连** | ✅ `978b5ba6`。输入框按模式发 tool（`ChatInput` 的 `COMPOSER_MODE_TOOL`）；`ConversationComposerTool` 由 `ConversationToolRef` 推导（替掉三处手写窄类型）；`schemas/ai.py` 的 `tool` 放开 `free_course`；`chat_service.stream_free_course_turn` 建壳+挂卡（**零模型调用**，卡本身即进度面）。顺带修好「切模式没反馈」：占位符随模式变 |
| B2 | **后端基线提交** | ✅ `765fd6f9`。11 文件 +1406 行入库；迁移 `d0e1f2a3b4c5` 已 apply，`alembic check` 无漂移，单 head |
| B3 | **课内 5 个 bug** | ✅ `978b5ba6`。开放题可作答（自由文本，模型判定）／正文走 Markdown／不再发写死的 confidence／failed 不再转圈且有重试／页脚给下一节（后端按地图顺序算） |
| B5 | **lint** | ✅ 0 error（`panRef` 改在 effect 里同步） |

**顺带发现并修掉一个真问题（不在原清单）**：`AssistantMarkdown` 只认 `$$…$$`，而生成内容普遍用 `$…$` → `$ar{v}$` 到学习者眼里是 `$ar{v}$`（反斜杠被吃掉）。现改为**可选开启**行内 `$…$`（`inlineMath` prop，默认关闭 → 聊天不受影响），并同步修正提示词的公式约定（两种都写明支持）。

### B3b ✅ 按需生成每节课（2026-09-14，`c04e34b8`）

**此前只有第 1 节有内容**（实测：9 节课里 1 节）。构建只写路径起点那一节，所以「下一节」和课程详情里的其它课都通向空白页。

- 新增 `GET /free-courses/{id}/chapters/{chapterId}/lesson/stream`：对任意一节跑同一套 blueprint → content，分两步推流（写课是慢步骤，必须看得见）
- 不带 `?force=true` 时**幂等**：已有内容直接 `done`，不调模型
- 地图从**落库的树**重建（不是构建时的输出）——树才是学习者看到的、也是编辑要改写的
- 移除 `plan_lesson`（拆开后已无调用方；同一件事留两条路比没有更糟）
- 前端：无内容的课**打开即生成**（两步进度 + 重试），而不是显示「空」
- 顺带把 SSE 解析/读取抽成 `freeCourseSse.ts`（两条流同协议），步骤文案与图标抽成 `buildStepLabels.ts` + `BuildStepIcon.tsx`（工具卡里原本各有一份）

### B4 ⚠️ 蓝图页仍未完成（缩放已接，其余待做）

- ✅ `zoom={100}` 硬编码已修：右下竖向缩放控件（50–200%，10% 步进，到边界禁用）
- ⬜ 缺参考稿的：`depth chips`（Intuition/Definition/…）、`N sessions` 徽章、底部双按钮确认条
- ⬜ **「全量编辑」未做**（拍板 2）：无 refine 端点、无写回 `blueprint_json` 的路径。**注意**：全量编辑要用到「改结构 → 受影响的课重生」，而重生所需的按需生成（B3b）**现已就绪**，所以这项已无前置阻塞
  → **已出计划：`planning/free-course-blueprint-editing-plan.md`（2026-09-15，rev.2）**。核心结论（rev.2 按 Ceaser 的更正重写）：
  **① 编辑应该发生在「内容还没生成」的暂停点，不是建完之后** —— 而那个暂停点代码里**已经存在**（`free_course_events.py:252` 的 `stream_free_course_build` 是重入的：phase 1 跑 `intent→map→path` 后停在 `questionnaire`，phase 2 从**落库的树**重建 map 再跑 `blueprint→content`）⇒ **暂停期间改树，phase 2 自动用新树，续跑机制一行都不用改**，要加的只有一个写回端点。
  **② rev.1 的「级联删内容」担忧在主路径上不成立**（那时 content 还没跑），它只属于「编辑已建课程」这条**次路径**（`persist_map` 连着两级 `ON DELETE CASCADE`；代码里已把该场景标为 "C phase"）。
  **③ 真前置是三处「按标题定位节点」**（`free_course_service.py:181`、`free_course_events.py:383` 等）—— 支持改名的那一刻全废，**即使只做主路径也得先改成按 id 查**。
  **④ 画布收敛 A1 不是前置**（蓝图画布 `FreeCourseBlueprintCanvas.tsx:53/103/111` 已能拖能缩，A1 只是消除重复实现的技术债）。
  待拍 4 项见该文档 §7，其中 D3（path 重算）已核过并写明残留风险。
- ⬜ **「体量可选择」—— 部分已做，但形态变了**：现在是**生成前的前置问卷**（`FreeCourseTuningCard.tsx` + `POST /free-courses/{id}/tuning`，`free_course_events.py:330` 发 `questionnaire` 帧），不是蓝图页内编辑。四维：course_volume / depth / focus / pace（`free_course_events.py:361-366`）。`FreeCourseCreateIn` 仍无 volume 字段（走问卷而非建课时参数）

### B8 ⚠️ 仓库里有并行会话的在制品（不是我的，别误动）

2026-09-13 22:37 有一个提交 `2c20726d`（日历同步），另有一批**未提交 WIP**（`Page`/`Block` 文档模型 + `frontend/src/features/docs/`）。当前状态：

- ✅ 已替他们补上 `frontend/src/components/ui/dialog.tsx`：`AppleConnectDialog` / `GoogleConnectDialog` 从 `2c20726d` 起就 import 它，但该文件从未提交 → **`npm run build` 在本分支对所有人为红**。补齐为纯新增，未改他们的功能代码
- ⚠️ `npm run lint` 已干净；`tsc` 目前仍因 `src/features/docs/*`（他们的 WIP）报错，**不要在提交里带上这些文件**
- ⚠️ `frontend/src/lib/env.ts` 在模块作用域读 `window.location.origin` → 任何 Node 侧渲染（含本仓用的 SSR 校验法）都会 `ReferenceError`。用「先 shim `window` 再动态 import」绕过；长期建议挪到函数里
- ⚠️ 提交语言包时要**按 hunk 局部暂存**（`git apply --cached`），否则会把他们的 `shelter*` 键一起提交

### B6 ⚠️ 视觉一致性偏差（已量化，见 `planning/free-course-ui-audit.md`）

| 项 | 数字 |
|---|---|
| 按钮几何 | **4 套**：外壳 33/12.5/14px、蓝图 13.5px、课内 34/14/13.5px、详情 38/20/14px |
| 暗色死代码 | 全仓 157 个 tsx 仅 14 个含 `dark:`，其中 **9 个是 free-course（51 处）**，而产品**无暗色开关** |
| 页框 | 其它页面统一 `rounded-md border border-zinc-200/80 bg-zinc-50`，free-course 三个视图都没用 |
| 字重 | 房屋 h1 = `font-medium`(500)；此处 `font-semibold`(600) |
| 圆角 | `rounded-[10px]` / `rounded-[12px]` 绕过 `rounded-xl/2xl` 与 `--radius` |
| 语义色 | 反馈面板硬编码 emerald/amber/red；`index.css` 只有 `--destructive`，无 `--success`/`--warning` |

> **branding desk 位置待 Ceaser 提供**。仓库里**没有任何** branding / 设计规范文件（planning/ 与 frontend/ 全搜过），本次比对的基准是 in-code 令牌 + 既有组件约定。

### B7 缺 `/preview/free-course` 预览路由

现有预览前缀只有 `courses` / `learn-spaces` / `learn-space` / `credits`（`AppRouter.tsx:38-53`）。三屏 free-course 视图**必须登录 + 真数据**才看得到 → 目视评审与画布收敛（A1）都缺验证入口。

---

## C. 其它既有欠账

| # | 事项 | 证据 / 状态 |
|---|---|---|
| C1 | **学习空间入口分裂** | 侧栏分组条目仍指 `/project/:id`（旧项目页），总览网格指 `/learn-spaces/:id`（新工作台）。两条详情路由并存，待定：侧栏是否切工作台、旧页是否退化为"对话视图" |
| C2 | **LMS 对接 5 个待拍板未回** | `planning/lms-student-data-import-plan.md` §7：①是否确认不做大陆学生数据 ②learner 层先后 ③教师自助 vs 管理员批量 ④成绩回写范围 ⑤Google OAuth 验证主体 |
| C3 | **Google OAuth 验证未启动** | 长周期（官方称"最长几周"，可能触发独立安全评估）。计划要求与 P1 并行启动，否则技术做完卡上架 |
| C4 | **Credits P3/P4** | P3 卡"公网可达"（`thelemma.ai` 当前 DNS 不解析 → PayPal 无法投递 webhook）；P4 合规核对未开始 |
| C11 | 🔴 **积分只进不出 —— 没有任何东西扣分** | **`deduct_credits` 全仓零调用点**（只定义在 `services/credits/ledger.py:79`）；`InsufficientCredits` 也**从未被 catch**（无 402 处理）。`grant_credits` 唯一调用点是 `services/payments/fulfillment.py:61`（付款发放）。→ **用户买一次积分就永久够用，因为花不出去；没有任何理由复购。** 账本本身实现是对的（行锁 `with_for_update`、`balance_after` 快照、`reason:ref_id`、向上取整、`usd_to_credits`），缺的是「谁来扣」 |
| C12 | 🔴 **订阅计划只写不读，免费额度不存在** | `subscription_plan` 全仓唯一的写点是 `services/user_service.py:46`（建 profile 时写死 `"free"`）—— **没有任何地方读它**。全仓零 quota / rate-limit / free-tier 门控（grep 过 `quota` `monthly_limit` `free_tier` `rate_limit`）。→ 商业模式里的「Free 限额」在产品里**尚不存在** |
| C13 | 用量账与积分账没有通路 | `ai_usage_logs`（token 定价）与 `provider_usage_logs`（搜索定价）都在写，但**没有把 usage 转成 credit 扣减**的路径。这就是 C11 的成因——两本账各记各的 |
| C14 | DB 落后于代码（迁移未 apply） | DB `alembic_version` = `d0e1f2a3b4c5`；代码里更新的迁移 `f7a8b9c0d1e2`（doc 层）与 `a5b3c9d6e1f4`（free_course tuning）**未应用**。实测缺表：`pages`、`page_blocks`、`course_lesson_blocks`、`payment_orders`。→ 任何走 pages 的接口会 500（`ShelterDrawer` 的板块列表首当其冲） |
| C15 | ✅ 已修：CORS 白名单过窄 | 原来是精确匹配 `http://localhost:5173`。实测 `http://127.0.0.1:5173` / `localhost:5199` / `127.0.0.1:5199` 预检一律 **400** → 整站 API 被浏览器挡掉，前端只显示「XX 失败，请重试」。已加 `cors_origin_regex` 放行回环地址任意端口（`core/config.py` + `main.py`），`https://evil.example.com` 仍 400 |
| C5 | **i18n 内容层未接** | 只做了界面框架层；对话流与课程正文仍是硬编码（这是有意排除——那是内容不是 chrome） |
| C6 | **learner 状态层未合并** | `services/learner/` 在 main-v2 是空目录；掌握度/σ 在 main 上。Free-Course 的 `LearnerStateProvider` 目前只能吃自评 + 本课观察数 |
| C7 | **Free-Course 输出语言固定中文** | 含英文请求也返回中文（显式选择）。若要跟随请求语言，需把 `intent.raw_request` 带进下游 prompt 并重写语言策略 |
| C8 | 仓库根残留 throwaway 脚本 | `backend/.workbuddy_list_profiles.py`（别人 P1 smoke 的临时取 user_id 脚本）；另有 41 个 `??` 含 `.env`、`engine/`、`supabase/` 等本地目录 |
| C9 | **暗色模式全仓没有激活机制** | 全仓**零** `classList.add/toggle('dark')`、**零** `prefers-color-scheme` 监听；但 **16 个文件写着 `dark:` 变体**。实测 `agent-browser set media dark` 后页面**仍是亮的**（2026-09-14）。→ **任何面板/页面的 dark 态现在既看不见也验不了**，写下的 `dark:` 全是死代码。真要做暗色时，三个面板正文（Brief / ConversationPanel / ShelterDrawer 都用硬编码 `zinc-*`）要一起过 |
| C10 | **SSR 校验入口不在 tsconfig 覆盖内** | `tsconfig.app.json` 的 `include` 只有 `src`，所以 `scripts/ssr/{brief,import}-entry.tsx` 不做类型检查（由 vite 运行时剥离类型）。风险被断言兜住（改错 prop → 渲染不对 → 断言红）。要更严就挪进 `src/` 或单开一个 tsconfig 引用 |

---

## E. L4 实时双向语音层（已调研 · 等拍板 · 未开工）

> 计划文档：`planning/l4-voice-agent-plan.html`（2026-09-13 起草，含架构 SVG / 复用 vs 隔离矩阵 / P0–P5 里程碑 / 风险表）。代码零改动，纯规划。
> 耦合目标：现有文本管线零侵入，语音为平行隔离模块 `backend/voice/` + 前端 `features/voice/`；`VOICE_ENABLED` 默认 False。

### E-已拍板（架构定调）

| # | 事项 | 计划文档 | 拍板时间 | 为什么不现在做 |
|---|---|---|---|---|
| E1 | **路线 = 级联（STT→LLM→TTS），非端到端** | `l4-voice-agent-plan.html` §2–§3 | 2026-09-13 | 复用现有 `AIClient.stream_chat(COURSE_COMPANION)` 大脑，零改动；端到端（GPT-4o Realtime / Gemini Live）会夺走课程上下文/掌握度能力且贵 10–40×。等 P0 Spike 后再进 P1 |
| E2 | **区域感知语音 I/O + 中国可控大脑** | 同上 §3 修正框 | 2026-09-13 21:00 | 用户面向全球 → 推翻旧"默认国内栈"。大脑永远跑中国主体网关（AiHubMix→Gemini / OpenRouter / DeepSeek）；语音 I/O 按用户区域路由：中国→火山/阿里，海外→Deepgram/Cartesia；VAD=本地 Silero |
| E3 | **LLM 段零新 API** | 同上 §3 | 2026-09-13 | 不引新依赖；不用 Deepgram unified Voice Agent API（那是端到端路线，会替换咱们的大脑） |
| E4 | **红线满足判定** | 同上 §3 修正框 | 2026-09-13 21:00 | 掌握度/档案/课程留中国主体 PG/Supabase 永不出境；语音音频为临时 I/O，海外 API 属"阳光出海"（合法商用）非"泡澡式出海"（设壳规避监管） |

### E-待拍板（2 项，决定后才能进 P0 Spike）

| # | 待定 | 影响 |
|---|---|---|
| E5 | **是否持久化语音录音**（ephemeral 实时不落盘 vs 存储供跟读回放/发音复盘） | 存储 → 触发数据出境评估 + 技术进出口申报 + 与海外厂签 DPA；ephemeral → 合规负担最低。**需你定** |
| E6 | **首版目标语言范围** | 决定 STT/TTS 厂商与音色库第一选择，也决定 P0 spike 用哪家 key 做最小往返 |
| E7 | **`VOICE_REGION` 厂商映射细则** | 中国=火山/阿里、海外=Deepgram/Cartesia，由配置翻转（适配器已隔离，切换=配置）。开发期本机 OpenRouter 曾 403，美国 API 或不可达 → P0 先国内栈验证管线 |

> 旁证（代码现状）：仓库源码层零 WebSocket/音频设施（全 SSE 单向）；伴学/概述"大脑"当前**无课程上下文/掌握度注入**（`stream_chat` 走静态提示+章节视频）——P3 的 `build_agent_context` 共享函数可顺带补此债，文本伴学也能白捡。

---

## D. 明确不做（避免以后又提）

- **不建第二个画布**：蓝图必须复用原语（A1 就是为此）
- **不给 free 课造假镜头**：参考稿第 1 屏的 "Researching the web" 不画——本分支**没有网页检索**（`ai/search/*` 只搜视频）。用「意图解读 chips」代替
- **不建 `learning_maps` / `learning_paths` 表**：地图 = `courses/units/chapters` 树 + `objective` 列；路径由顺序 + gap 派生（且单调）
- **tldraw 画板**：仍推迟（`learn-space-port-plan.md` 既定范围）
- **不做 Free-Course 的多智能体 / 完整 Learner Model / 课程市场 / 教师管理**（spec §12 明令）

---

## F. Learning Brief（前端已落，等后端）— 2026-09-14

> 计划与自查：`planning/learning-brief-plan.md`（§10 前端落地 / §11 逐条自查）。
> 现状一句话：**板块形态已完成并真机验证，但真实空间里它不出现**（`LearnSpaceWorkspacePage.tsx` 不传 `brief` → `undefined` → dock 槽位退回占位、面板不渲染），只活在 `/preview/learn-space`。

### F-待拍板

| # | 待定 | 影响 | 证据 |
|---|---|---|---|
| F1 | **加不加 `courses.project_id`** | 「接下来」那一栏真实来源的**唯一前提**；不加则它只能是空或模型编的 | `backend/models/course.py` 全文件无 project 关联（只有第 90 行一句注释）；空间里点 `+` 开新对话时不带 `conversation_id` —— `backend/services/chat_service.py:171` 写死 `None if context.new_conversation_title else context.conversation_id` → **今天从空间生成的课程，用 projects 查不到** |
| F2 | **面板 Header 要不要显示空间名** | 计划 §2 写「空间名 + 目标」，实现里**去掉了空间名**（顶栏就在正上方 40px 显示同名，判断为噪声） | `LearningBriefPanel.tsx` 的 header 用板块名「学习简报」。**这是判断不是既定要求** —— 要就加回 |
| F3 | **左面板 288px vs 右侧对话面板 272px** | 计划 §5.1 写「与右侧对话面板对称」 | 实现选了 288（与同槽位的 shelter 一致，否则两个左面板互相切换时画布跳 16px）。左右差 16px 肉眼不可辨 |

### F-待做

| # | 事项 | 证据 / 现状 | 用户可见效果 |
|---|---|---|---|
| F4 | **后端：`projects` 加 3 列 + `GET /projects/{id}/brief` + 一个 AI 用例 + 缓存判定** | 全仓领域 `grep goal` 零命中；`services/learner/` 在 main-v2 是空目录 | 面板在真实空间里出现 |
| F5 | **前端接线**：加 `learningBriefApi.ts`，页面把 `brief` 从 `undefined` 换成 query 结果、`onRefreshBrief` 接 regenerate | `LearnSpaceWorkspacePage.tsx` 目前不传 `brief` / `onRefreshBrief`（所以刷新按钮也不渲染） | 真实数据替代 mock |
| F6 | **失败态 / 重试** —— **必须和 F5 一起做，不能拖** | `brief` 只有 `undefined / null / 对象` 三态，没有 error 态 | 后端 500 / 超时 / 坏 JSON 时，现在会表现为**什么都没发生**（与「功能没上线」长得一模一样） |
| F7 | **`goal` 可编辑**（`PATCH /projects/{id}`） | 计划 §6 P2；面板现在只读 | 用户能自己写学习目标，而不是只能看系统推断 |
| F8 | **`nextSteps` 条数上限** | 计划说取前 2–3 条；`LearningBriefPanel.tsx:133` 是 `nextSteps.map()` **无 cap** | 后端返 12 条就渲染 12 行。要么后端封顶（写进契约），要么前端加 `slice` |
| F9 | **「接下来」两类步骤的比例与优先级未定义** | 计划说这一栏「真实派生、不交给 AI 编」，§5.2 又允许「没有对应课节的建议」（如「Proof Practice」）—— 建议类步骤的标题**只能由模型生成** | 「不编」的硬承诺在建议步骤上是断的；需要定规则，否则这栏迟早长出编出来的内容 |
| F10 | 文案偏差：「正在形成」应为「目前正在形成」 | `zh.json:114` `briefDeveloping` | 极小，但属抄写偏差不是判断 |
| F11 | `key={item}` 用字符串当 key | `LearningBriefPanel.tsx:231` | 两条一模一样的要点会 React key 冲突（mock 未触发） |
| F12 | **交互 / 视觉零回归保护** | `check:brief` 只覆盖 SSR 结构；hover / focus ring / 滚动 / Tab 顺序 / 动画**没有断言** | 下次谁动这份代码，这些坏了没人知道（`check:import` 有同样的问题） |

---

## G. 导入（UI 已落，后端零）— 2026-09-14

> 计划：`kb-doc-layer-execution-plan.md` §4（Phase 1 Obsidian+文件夹 / Phase 2 Notion OAuth）· §5（四步选择器）· §10（本次落地与取舍）。
> 现状一句话：**四步向导做完并真机逐步验证，但真实空间里的入口仍是禁用的**（`ShelterDrawer.tsx:45` 的 `onImport` 是可选 prop，`:209` `disabled={!onImport}` —— 只有预览页传了）。

### G-待拍板

| # | 待定 | 影响 |
|---|---|---|
| G1 | **Obsidian 走 zip 上传，还是浏览器 `webkitdirectory` 直接选文件夹** | 决定后端接口形状（multipart zip vs 文件清单）、以及「任意勾选子集」在客户端做还是服务端做 |
| G2 | **Notion OAuth 挂在谁的主体下** | 与「阳光出海」口径直接相关（中国主体留境内、身份透明）；不是纯技术选择 |

### G-待做

| # | 事项 | 证据 / 现状 |
|---|---|---|
| G3 | **后端：`POST /projects/{id}/imports` + 解析 + 落库 `pages(kind=imported)`** | 全仓 `grep obsidian/notion` 在 backend **零命中**；计划 §4 图里画的 `imports/obsidian.py` 不存在。数据模型已就位：`pages.source` / `pages.import_ref`（commit `98ed17a8`） |
| G4 | **三条服务端红线必须和 G3 一起做** | 计划 §5：路径穿越（`../`）、大小上限、Markdown 内嵌 HTML 消毒 |
| G5 | **真实页面接 `onImport`** | `ShelterDrawer` 的按钮现在 `disabled`；接上后端后传一个函数即通，按钮与向导都不用改 |
| G6 | **`/knowledge` 的 Upload stub 接同一套导入流程** | `KnowledgeBasePage` 仍读 `mock/knowledgeBaseItems.ts` |
| G7 | **块级选择（Phase 1.5）** | 计划 §5「两级选择」的第二级，依赖 Block 模型（P0.4 TipTap）先落地 |
