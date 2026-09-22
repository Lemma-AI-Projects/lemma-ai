# Hyperknow 教学会话 V0

## 下一步（5 行）

1. 起本机库 `lemma_v2`：`python .workbuddy/localdb/setup_v2_db.py`（已建好，只在库丢了时才要跑）。
2. 起后端：`cd backend && DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:55432/lemma_v2 CORS_ORIGINS=http://localhost:5175 .venv/Scripts/python.exe -m uvicorn main:app --port 8000`。
3. 起前端：`cd frontend && npm run dev -- --port 5175`。
4. 登录 → 打开 `/learn-spaces/<space>/free-course/<course>/lesson/<chapter>/session` → 点「开始学习」。
5. 想复核自动化结论：`cd backend && PYTHONPATH=. python .workbuddy/localdb/verify_hyperknow_session.py`。

---

## 这是什么

把 Hyperknow 的**一次教学会话**（Deep Learning Session）在 Lemma 的 **Free Course 内**复现出来：左边白板、右边对话，AI 一边讲一边写，讲到一半停下提问，你说「没懂」它换一种讲法并把白板重画。

**范围**：只动 Free Course。Learn Space、课程生成、Space Context / Memory / Learner State、视频课程、插件、社交一律没碰。唯一被改到的公共文件是「加了一个 AI 用例」所必需的四处接线（见 §6）。

行为规格来自 `hyperknow_user_behavior_reconstruction.html`（真实浏览器观察记录）。视觉参考来自 `planning/hyperknow-visual-style-research.html`（产品端白底 + 靛蓝 `#4c6694`）。

## 复现了哪些行为

| 调研里的行为（Observed） | 这里的实现 |
|---|---|
| 语音 + 手写板书**同步**推进 | 一句一句朗读；每句读完后落这一句的白板动作（动作带 `cue` = 第几句） |
| 白板**逐步构建**（文字→图→标注→动画） | 动作流按序折叠成白板元素；文字用扫出式揭示、线条用描边动画 |
| 开放式提问 → 判定 → 反馈 | `open` 题型；模型按 `expected` 要点判定 |
| Quick Check 多选 | `choice` 题型；**对错在服务端按选项 id 判**（与既有 `submitObservation` 同一策略） |
| 答错 → 即错即纠 → 继续 | 反馈里点名他选的那个选项；**不回退、不重画** |
| 点白板图形触发动画 | 白板带 `id` 的元素可被后续 `move` 驱动（红色小球沿坡下滚） |
| **「没懂」→ 换讲法 + 改白板** | `confused` 信号：返回的新步骤带 `branch="reteach"`，前端据此**把板擦掉重画** |
| Stop 打断 → 转向新问题 | `interrupt` 信号：返回的第一个 step 就是回答，且 `branch="answer"` |
| Previous/Next 禁用、无 Skip | 没有跳转控件；提问处**停下等待**，只能答或问 |

## 怎么验收（Golden Demo：Gradient Descent / The Rolling Ball Metaphor）

打开那一节的 session 页，点「开始学习」，你会看到：

1. **开始学** → 标题先写出来，再画出误差曲面，再标上 `HIGH ERROR PEAK` / `GLOBAL MINIMUM` / `DESCENT DIRECTION`，然后**红色小球沿下降方向滚过去**。
2. 讲到一半**停下**问一个开放式问题（例：如果你蒙着眼睛站在山坡上…）→ 你在右下角用自然语言回答 → 它给反馈，然后继续讲。
3. 再出现一道 **Quick Check 多选** → 故意选错 → 它**点名你选错的那一项**并给出正确说法，然后继续（不回退、不重画）。
4. 说 **「我没懂，换个讲法」**（或直接点那个按钮）→ 它换一套说法，并**在白板上重新画**。
5. 按 **Stop**，然后问自己的问题（例：「为什么梯度要往下走？」）→ 它先回答你的问题，再回到主线。
6. 中途刷新页面 → 会话**接着上次的地方**，不重头开始。

自动化证据：`.workbuddy/research/hyperknow-session/2026-09-22-verify.log`（真模型，走真实 HTTP 接口）。
白板视觉：`.workbuddy/research/hyperknow-session/whiteboard-preview.html`（用真实组件离屏渲染，见 §5）。

## 关键文件与入口

**AI 层（`backend/ai/free_course/teaching/`）**

| 文件 | 作用 |
|---|---|
| `types.py` | 白板与时间线的**词汇表**：`BoardAction`（write/draw/label/highlight/move/pause）、`TeachingStep`、`TeachingQuestion`、`SessionSignal` |
| `planner.py` | `plan_session()` 生成整场会话；`respond_to()` 处理三种信号；**零信任边界**（空叙述、无几何的动作、指空的 move、越界 cue、缺 open/choice 都拒收） |

**服务与接口（`backend/`）**

| 文件 | 作用 |
|---|---|
| `services/free_course_session_service.py` | 归属校验、持久化、**谁判定什么**（选择题本地判、开放题交模型） |
| `models/free_course_session.py` + `alembic/versions/f1c4a7b2e9d3_*.py` | 新表 `free_course_sessions`（`plan_json` / `transcript_json` / `cursor`） |
| `api/v1/free_courses.py` | `POST/GET …/session`、`POST …/session/turn`、`POST …/session/progress` |
| `ai/prompts/templates/free_course_session*.system.txt` | 两套提示词（开场 / 后续回合），含动作语言表、滚球范例、输出前自检 |

**前端（`frontend/src/features/free-course/session/`）**

| 文件 | 作用 |
|---|---|
| `TeachingSessionView.tsx` | 页面：左白板 + 右对话 + 开始门 + 字幕条 |
| `useTeachingPlayback.ts` | **时间线引擎**：逐句朗读 → 落这一句的白板动作 → 提问处停下 |
| `board.ts` | 动作折叠成白板元素（纯函数，可测） |
| `Whiteboard.tsx` | 1000×600 SVG：手写字体、扫出式写字、描边画线、确定性抖动 |
| `speech.ts` | 语音接缝：浏览器朗读 + 静音朗读（同一个时钟） |
| `SessionRail.tsx` | 右栏：讲解字幕、题目、作答、反馈、Stop、没懂按钮 |
| `sentences.ts` | 断句（**必须与 Python 侧逐字一致**，见 §6） |

**演示数据**

- `.workbuddy/localdb/setup_v2_db.py` — 建 `lemma_v2`（main-v2 自己的库）
- `.workbuddy/localdb/seed_v2_demo.py` — 空间 + 免费课 + 4 节课（golden demo = The Rolling Ball Metaphor）
- `.workbuddy/localdb/verify_hyperknow_session.py` — 端到端验收
- `.workbuddy/localdb/dump_board.py` + `render_board.mjs` — 白板离屏渲染

## 为什么这样搭（几处刻意的取舍）

1. **白板不是图片，是动作流的投影。** 每个 step 是一串小动作，白板 = 这些动作折叠出来的结果。所以「逐步构建」不是动画技巧，而是数据结构本身决定的。
2. **时间线的时钟是朗读，不是定时器。** 逐句朗读、读完落这一句的动作。用两个独立定时器驱动音画，就会得到简报里点名要避免的那件事：AI 在说，旁边放着一张图。
3. **会话状态落库、不落浏览器。** 因为会话会**停下等人**：Stop 要能作废正在播的那一段，「没懂」要知道刚才说过什么，刷新不能重头讲。
4. **选择题的对错在服务端判。** 与既有 Free-Course 作业判定同一条策略：比选项 id 是精确的，模型只负责解释 —— 模型抽一下不能把对的答案变成错的。因此**选项答案从不上网**（响应里没有 `answer`）。
5. **步骤只追加、不替换。** 讲过的 step 索引永不改变，所以 transcript 是学习者真实经历过的那一版（包括他后来要求重讲的部分）。
6. **「答错」和「没懂」是两种信号，走两条路。** 这是调研里最值钱的一条：答错只得到局部纠正，说「没懂」才真正改写讲解和白板。

## 仍然是 V0 的临时实现

1. **语音用浏览器自带朗读**（`SpeechSynthesis`），不是神经网络 TTS。换真人声只需实现 `Voice` 接口并改一行调用。
2. **断句靠标点**（含「ASCII 句点后必须跟空白」的例外），不靠语义；`cue` 是句级，没有词级时间轴。
3. **「没懂」靠措辞识别**（一份关键词表 + 一个一键按钮），不做意图理解；其余输入一律当「打断提问」。
4. **plan 只重试一次**：若模型给的会话缺 open 或缺 choice，会带着明确的纠正说明再要一次；再不行就报 409，不硬塞。
5. **`move` 只能驱动本条 step 里已画出的元素**（不能跨 step 移动）。
6. **进度上报是每步一次小请求**（`/session/progress`），没有批量。
7. **一场会话的 plan 上限 8 步 / 每步 24 个动作**，超出的被截断。
8. **停下来的地方只有两种题型**；没有填空题、没有拖拽、没有白板手写输入。
9. **白板元素不会被擦除**（除了 `reteach` 整块清空）；没有「擦掉这一笔」。

## 已知问题 / 未验证

1. **浏览器渲染我仍未亲眼看过**（登录走 Supabase 云认证，没有开发旁路）。类型检查、端到端接口断言、白板离屏渲染都过了，但**「页面上长什么样」需要你看一眼**。
2. **演示环境是本机 `lemma_v2`**，不是云库 —— 云库现在处于 main-v3 的 schema，**没有** Free Course 需要的表（v3 的迁移主动删掉了它们）。这是刻意隔离，不是遗漏。
3. 本机库是**会话级**的：进程随会话结束而死，丢了按 §下一步 第 1 条重建。
4. 未做：跨会话的课程级记忆、成就（AWARD）、语音输入打断、白板上可点的交互图形（`circle` 按钮那类）。
