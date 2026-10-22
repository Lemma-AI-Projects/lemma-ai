# 语音层 · 契约

> **分支** `user-profile` · **日期** 2026-10-08 · **状态**：事实（已核对）+ 约定（标注处）+ 未定（标注处）
> **代码为准**：与本文冲突时以代码为准。

---

## 1. `Voice` 接口（**事实**，也是本层唯一的公共面）

```ts
// frontend/src/features/free-course/session/speech.ts:23-33
interface Voice {
  available: boolean
  speak(text: string, opts: { onStart?(): void; onEnd(): void }): void
  cancel(): void
}
```

**契约要点：**

1. `speak` **必须**在结束时调用 `onEnd`——无论成功、失败还是被取消。
   时间线靠它推进，不调用 = 课程卡死。
2. `cancel()` 之后**不得**再调用 `onEnd` 之外的任何回调；实现须自己保证幂等。
3. `available: false` 表示这条通道现在不通。**调用方必须据此降级，而不是静默无声。**

## 2. 三种实现（前两种**事实**，第三种**约定**）

| 实现 | 状态 | 出声 | 时长来源 | 位置 |
|---|---|---|---|---|
| `createBrowserVoice` | 事实，已实现 | 是（`speechSynthesis`） | `estimateSpeechMs` **估算** | `speech.ts:84-147` |
| `createSilentVoice` | 事实，已实现 | 否 | `setTimeout` 模拟 | `speech.ts:61-82` |
| `createRemoteVoice` | **约定，未实现** | 是（后端合成） | 真实音频时长 | — |

**契约：三者必须可互换。** 调用方只认 `Voice` 接口，不得感知自己拿到的是哪一种。

**降级链（约定）**：`remote → browser → silent`。三级都必须存在，
因为"语音失败 ≠ 课程失败"要求任何一层挂掉都还有下一层。

> ⚠️ `createBrowserVoice` **不得删除**。它从"主实现"降级为"fallback"，但删掉就等于删掉降级路径。

## 3. 传输状态机（**约定**）

现状：**不存在**。今天只有课程侧的 `PlaybackPhase`。

```ts
// useTeachingPlayback.ts:45-51
type PlaybackPhase = 'idle' | 'playing' | 'awaiting' | 'awaiting_click'
```

约定新增的传输侧状态，**4 个状态 + 1 个事件 + 1 个标志**：

| 名 | 类型 | 语义 |
|---|---|---|
| `idle` | 状态 | 没在说也没在听 |
| `speaking` | 状态 | 正在播 TTS |
| `listening` | 状态 | 麦克风开着，等用户说话 |
| `processing` | 状态 | 音频在转写 |
| `interrupt` | **事件**（不是状态） | 用户打断。结果是"停播 + 回 `listening`/`idle`"，它是一个转移，不是停留点 |
| `unavailable` | **标志位**（不是状态） | 这条路现在不通。语音失败不是一种"正在进行的模式" |

**为什么不设 `INTERRUPTED` / `ERROR` 两个状态**：做成状态会多出"停在 INTERRUPTED 等谁""等 ERROR 自己恢复吗"的歧义。

**不变量**：传输状态**不得**与 `PlaybackPhase` 合并。二者正交（见 [index.md](index.md) §三条边界）。

## 4. signal 契约（**事实** + **约定**）

### 4.1 今天（**事实**）

```python
# backend/schemas/free_course.py
signal: Literal["answer", "confused", "interrupt"]
```

| signal | 语义（`ai/free_course/teaching/types.py:253-265`） | `planner.respond_to` 行为 |
|---|---|---|
| `answer` | 用户作答（选项或文本） | 判分 + 反馈 + 继续（`planner.py:213-225`） |
| `confused` | 用户说没懂 | 换一种讲法 + 重建白板（`planner.py:185-190`） |
| `interrupt` | 用户按停止并问了自己的问题 | 第一个 step 回答他，再接回主线（`planner.py:191-196`） |

### 4.2 约定新增（**约定，未实现**）

| signal | 语义 | `respond_to` 行为 |
|---|---|---|
| `no_response` | **用户没有回应——既不是不懂，也不是有疑问** | 顺着主线继续下一段；**不得暗示用户"没回答"** |

**为什么必须有它**：今天遇到选择题或 `awaitClick`，系统会**永远等下去**（无任何超时，
见 [04](04-now-and-gaps.md) §2 硬事实 3）。这不是语音问题——一个只想安静读下去的用户，
今天就已经卡死。`no_response` 同时也是 Auto 模式的前置条件。

**红线**：`no_response` 分支**绝不能**让模型产出"你没回答，我再讲一遍"这类话——
那会把安静读课的用户变成被催促的用户。

## 5. 可朗读字段（**事实**）

| 字段 | 位置 | 读法 |
|---|---|---|
| `TeachingStep.narration` | `ai/free_course/teaching/types.py:202-210`（注释即"spoken text"）；wire 见 `free_course_session_service.py:183-190` | **主目标**，逐句读 |
| `TeachingQuestion.prompt` | `types.py:184-199` | 读题 |
| `TeachingTurn.feedback` | `types.py:234-250`；wire 见 `:458-463` | 读反馈 |
| `TeachingTurn.award` | 同上 | 可选，简短 |

**约定**：新增可朗读字段必须先登记进本表。**不得**让语音去读 UI 文案、错误信息或系统提示。

## 6. 时序契约（**事实**，最容易踩的地方）

1. **讲解是按"句"播的，不是按"段"。**
   `narration` 先被切句（前端 `sentences.ts:18-44`，后端 `planner.py:47-81`，**两侧规则必须一致**），
   再逐句 `speak`（`useTeachingPlayback.ts:285-292`）。

2. **白板动作靠 `cue` 绑定到句号。**
   `cue` = 该动作属于第几句（`types.py:74-77`）。播到第 N 句时，
   才应用 `cue === N` 的动作与 block（`:297-309`）。

3. **时长基准不统一——这是今天的一个隐患。**
   - 浏览器实现：靠 `estimateSpeechMs` **估算**（`speech.ts:43-51`，5.2 字/秒）
   - 约定远程实现：有**真实音频时长**
   → 两种实现的时序基准不同。**换实现时必须明确"哪个实现用哪个基准"**，否则同步会漂移。

4. **停点是硬停。**
   - `step.question` 存在 → `phase='awaiting'`，返回（`useTeachingPlayback.ts:347-350`）
   - 出现 `awaitClick` → `phase='awaiting_click'`，等 `resolveClick()`（`:324-338`）
   - 二者**都没有超时**（见 [04](04-now-and-gaps.md) §2 硬事实 3）

## 7. 读写面

| 面 | 位置 | 说明 |
|---|---|---|
| **写（今天）** | 无 | 语音层**不写任何库**。它只调 `speak` / `cancel` |
| **读（今天）** | 无 | 不读任何库 |
| **写（约定）** | `ai_usage_logs` | 远程 TTS/ASR 的用量记账，**复用既有 ledger**，不新建表 |
| **偏好（约定）** | `user_home` **单值半区** | `defaultMode`（auto/manual）、`voiceEnabled`。与 `language`/`background` 同类，**不放 `UserHomeItem`**（那是列表形态，见 `models/user_home.py:123-178`） |

## 8. 不变量（违反即视为 bug）

1. `speak` 的 `onEnd` **必达**——任何路径下都要有一次，且只有一次。
2. 语音层**不产生** signal，只**转发**用户的意图。`no_response` 是"没有意图"的表示，不是语音的发明。
3. `available === false` 时，UI **必须可见地**告知用户，不得静默降级。
4. 打断必须**取消在途请求**（远程实现用 `AbortController`），不能只停播已下载的部分。
5. 语音层不得出现任何形式的**掌握度 / 百分比 / 置信度**。