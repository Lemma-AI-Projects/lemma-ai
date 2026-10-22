# 语音层 · 现状与缺口

> **分支** `user-profile` · **日期** 2026-10-08 · **状态**：事实（全部已核对，带 `file:line`）
> **这是快照，会过期。** 过期了就更新它，别在旁边再写一份。

---

## 1. 现状快照

### 1.1 前端（**事实**）

| 位置 | 事实 |
|---|---|
| `features/free-course/session/speech.ts:23-33` | `Voice` 接口：`available` / `speak()` / `cancel()` |
| `speech.ts:53-59` | `supported()` 检查 `window.speechSynthesis` |
| `speech.ts:84-147` | `createBrowserVoice()` |
| `speech.ts:61-82` | `createSilentVoice()` |
| `speech.ts:43-51` | `estimateSpeechMs()`：按 **5.2 字/秒** 估算 |
| `speech.ts:113` / `:131` / `:141` | **全部** Speech API 调用点（3 处） |
| `useTeachingPlayback.ts:39` | 唯一真正的消费方 |
| `useTeachingPlayback.ts:128-153` | 创建两种 voice 并手工合并（mute 靠切换实现） |
| `useTeachingPlayback.ts:162` | mute 时立刻 cancel 浏览器语音 |
| `useTeachingPlayback.ts:292` | 逐句 `voice.speak(sentence, {onEnd})` |
| `useTeachingPlayback.ts:373` | 对外暴露 `voiceAvailable` |
| `SessionRail.tsx:119-133` | 静音按钮；**`voiceAvailable === false` 时直接隐藏** |
| `SessionRail.tsx:208-297` | 用户输入：选项 / 打字（**无麦克风**） |
| `TeachingSessionView.tsx:347-360` | 打断：`playback.stop()` 后 `respond({signal})` |
| `sentences.ts:18-44` | 前端切句 |
| `confusion.ts:49-59` | `classifyLearnerMessage` → `confused` / `interrupt` |

**`speech.ts` 是前端唯一的语音模块。** 全仓搜索
`SpeechRecognition` / `webkitSpeechRecognition` / `MediaRecorder` / `getUserMedia` /
`navigator.mediaDevices` / `AudioContext`：**零命中**。

### 1.2 后端（**事实**）

| 位置 | 事实 |
|---|---|
| `tasks/video_ingest.py:16` | TODO 注释提到 ASR fallback，**未实现** |
| `ai/types.py:49`、`ai/free_course/teaching/types.py:10`、`api/v1/free_courses.py:249` | 注释里提到 voice，**无实现** |
| `services/question_bank_service.py:181-236` | 题库 `<audio>` 素材，**与语音合成无关** |
| `schemas/free_course.py` | `signal: Literal["answer","confused","interrupt"]` |
| `services/free_course_session_service.py:455` | **唯一**写 `cursor` 的地方（在 `submit_turn` 内） |
| `services/free_course_session_service.py:373-380` | `submit_turn`：**唯一**能追加教学步骤的入口 |
| `services/free_course_session_service.py:394-398` | `SessionSignal` 由 `payload` 构造 |
| `services/free_course_session_service.py:442-444` | `raw_steps.extend(...)` |
| `services/free_course_session_service.py:183-190` | `_wire_step` 带出 `narration` |
| `ai/free_course/teaching/types.py:50-57` | `PropKind`：`write`/`draw`/`label`/`highlight`/`move`/`pause`/`awaitClick` |
| `ai/free_course/teaching/types.py:74-77` | `cue` = 该动作属于第几句 |
| `ai/free_course/teaching/types.py:184-191` | 题目是"停点"：会话不会自己越过它 |
| `ai/free_course/teaching/types.py:202-210` | `narration` 是"spoken text" |
| `ai/free_course/teaching/planner.py:47-81` | 后端切句（与前端**必须一致**） |
| `ai/free_course/teaching/planner.py:185-196` | `confused` / `interrupt` 分支 |
| `ai/free_course/teaching/planner.py:213-225` | `answer` 分支 |

**后端没有 TTS 路由、没有 ASR 路由、没有语音 provider 客户端。**

### 1.3 可复用的基础设施（**事实**，接入时该用的）

| 能力 | 位置 | 用途 |
|---|---|---|
| Provider 密钥与 base URL | `core/config.py:136-139`（`aihubmix_api_key` / `aihubmix_openai_base_url`） | **TTS/ASR 可零新增密钥**（AIHUBMIX 是 OpenAI 兼容聚合） |
| Settings 声明方式 | `core/config.py:120-125`（`BaseSettings`） | 新增变量进这里 + `.env.example` |
| 用量记账 | `ai/usage.py:39-84`、`:122-154` → `ai_usage_logs` | 记 TTS/ASR 用量 |
| **非聊天 provider 的记账先例** | `ai/search/usage.py:25-54`（`record_provider_call` → `provider_usage_logs`） | **speech 应照这个形状**，不要去改聊天路由 |
| 聊天路由（**不要用**） | `ai/types.py:17-63`（`AIUseCase`）、`ai/config.py:24-31, 72-94` | `validate_routes()` 对未知 channel **启动即抛错**，音频端点语义不同，塞进去是污染 |
| SSE 帧 | `ai/streaming.py:30-31` | 若将来做流式音频 |
| 后台任务 | `tasks/celery_app.py:17-32`（Celery + Redis） | 长音频 |
| 用户偏好存储 | `models/user_home.py:85-96`（单值）、`:38-45`（`auto_*` 语义）、`:123-178`（`UserHomeItem` 列表） | 放 `defaultMode` / `voiceEnabled` |
| `_UNSET` 哨兵 | `services/user_home_service.py:108-149` | 加字段零新逻辑 |

---

## 2. 六个硬事实

1. **前端语音只有一个模块**（`speech.ts`），唯一真消费方是 `useTeachingPlayback.ts:39`。
   耦合很浅——迁移成本低。
2. **ASR 完全不存在。** 不是"耦合在浏览器"，是**根本没有**。
   麦克风权限、录音、上传、转写全部是新建。
3. **没有任何 silence timeout**（前后端都搜过 `setTimeout` / `idle` / `silence` /
   `no_response` / `auto_advance`）。遇到 `question` 或 `awaitClick`，
   **系统会永远等下去**。→ **这与有没有语音无关，今天就是死锁。**
4. **后端零 TTS / 零 ASR。** 全仓命中都是注释。
5. **没有 voice 模式、没有 mic button、没有语音设置。**
   唯一的控件是静音按钮。
6. **删掉浏览器 Speech API，课程仍然完整**——白板继续画（句子时间线由
   `createSilentVoice` 的 `setTimeout` 驱动）、转录继续渲染、选择题 / `awaitClick` /
   恢复进度全部正常，只是没有声音。
   → **今天的语音是纯增量能力，不是承重结构。**

---

## 3. 六处断点

| # | 断点 | 断在哪 | 后果 |
|---|---|---|---|
| ① | **语音不可用时静默失败** | `SessionRail.tsx:119-133` 在 `voiceAvailable === false` 时**隐藏**按钮 | 用户听到一片寂静、界面毫无提示，会以为产品就是无声的。违反 [01](01-overview.md) §2 边界 2 |
| ② | **停点无限等待** | `useTeachingPlayback.ts:324-338`（`awaitClick`）、`:347-350`（`question`）**无任何超时** | 只想安静读下去的用户**现在就卡死**。Auto 模式无法成立 |
| ③ | **ASR 通道不存在** | 全仓零命中 | 想说"我没懂"必须打字或点按钮 |
| ④ | **后端零语音能力** | 全仓命中皆注释 | 无法统一音色、无法记账、无法限流、无法换 provider |
| ⑤ | **语音偏好无归宿** | 无存储、无 UI、无模式概念 | 无法记住"这个人默认用 Auto" |
| ⑥ | **时长靠估算** | `speech.ts:43-51`（5.2 字/秒） | 与白板同步的精度上限被这个估算锁死 |

> **⑥ 是"后端 TTS 不只是为了音质"的硬理由**：真实音频时长比估算更准。

---

## 4. 孤儿与不一致

| 项 | 位置 | 说明 |
|---|---|---|
| ASR fallback TODO | `tasks/video_ingest.py:16` | 注释承诺过，未实现 |
| "voice + board" 注释 | `ai/types.py:49`、`api/v1/free_courses.py:249` | 描述性，无对应实现 |
| **静音按钮行为不一致** | `SessionRail.tsx:119-133` 会隐藏；`BoardSandboxPage.tsx:300-309` 不隐藏 | 沙盒里语音其实已是静音，按钮却还在，按下去没有可见效果 |
| `estimateSpeechMs` 仅服务浏览器实现 | `speech.ts:43-51` | 换远程实现后是否保留**未定**（两种基准不同，见 [02](02-contract.md) §6.3） |

---

## 5. 一句话收束

> 语音层的今天，是**一条只有一半的通道**：
> 它能把讲解读出来（虽然只是浏览器在念），**但完全听不见用户**。
> 而最刺眼的不是"听不见"——是**它连"用户没在说话"这件事都不知道**，
> 所以遇到停点就永远等下去。修这一条不需要任何语音能力。