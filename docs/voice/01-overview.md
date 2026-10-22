# 语音层 · 总览

> **分支** `user-profile` · **日期** 2026-10-08 · **状态**：事实（已核对）+ 约定（标注处）
> **代码为准**：与本文冲突时以代码为准。

---

## 1. 它回答什么

语音层只回答一个问题，而且是**辅助**问题：

> **这堂课现在用什么声音讲出来？用户能不能用嘴回答？**

它不回答"接下来讲什么"（那是 Course Pipeline / `planner`），不回答"他会不会"
（那是证据层 / Learner State），也不回答"他喜欢怎么被教"（那是 User Home）。

链条：

```
Course Pipeline 决定讲解内容（narration / prompt / feedback）
        │
        ▼
   Voice 层：文本 ──► 声音            （TTS，今天只有浏览器实现）
   用户的话 ──► 文本 ──► 既有 signal   （ASR，今天完全不存在）
        │
        ▼
   回到 Course Pipeline（通过 signal，不是通过语音层）
```

**关键**：语音层是**旁挂的通道**，不是承重结构。删掉它，课程逻辑仍然完整（见 §4）。

## 2. 边界（约定，也是既有红线）

1. **Voice 不决定内容。** 没有任何"让语音选择下一段"的接口。
   讲什么由 `planner.respond_to` 决定，语音只负责把结果读出来。
2. **Voice 失败 ≠ 课程失败。** 语音不可用时课程必须照常推进，且用户**必须看得见**
   这件事（今天看不见，见 [04](04-now-and-gaps.md) §3 断点 ①）。
3. **Voice 不是能力证据。** 不许把"说了几次""听了几段"变成任何形式的掌握度。
4. **Voice Runtime 不得引用课程模块。** 它和 Course Pipeline 之间只通过 signal 通信
   （`answer` / `confused` / `interrupt`；约定加 `no_response`）。

## 3. 四层结构（术语）

| 层 | 是什么 | 落在哪 |
|---|---|---|
| **Adapter** | 实现 `Voice` 接口的具体发声方式 | 今天：`createBrowserVoice` / `createSilentVoice`（`speech.ts`）；约定：`createRemoteVoice` |
| **Runtime**（约定） | 模式（Auto/Manual）、传输状态机、静默判定、打断取消 | **今天不存在**，逻辑内联在播放 Hook 里 |
| **通道** | TTS（说）与 ASR（听）两条独立通道 | TTS：`speak()`；ASR：**完全不存在** |
| **Provider** | 真正合成/转写的服务 | 今天：浏览器 `speechSynthesis`；约定：后端 + AIHUBMIX |

今天的现实是：**只有第 1 层的两个实现，第 2、4 层不存在，第 3 层只有一半。**

## 4. 语音从哪来、到哪去（今天的实际形状）

```
         Free Course 教学会话
                 │
        useTeachingPlayback.ts          ← 唯一真正的消费方（speech.ts:39）
                 │
              speech.ts
        ┌────────┴────────┐
        ▼                 ▼
 createBrowserVoice  createSilentVoice
 speechSynthesis     setTimeout 时间线
   （真出声）          （只走时间，不出声）
                 │
                 ▼
          SessionRail.tsx
      转录文本 + 静音按钮（仅此一个控件）
```

- 前端**没有任何 ASR**：全仓无 `SpeechRecognition` / `MediaRecorder` / `getUserMedia`。
  用户输入只有两条路——点选项（`option_id`）或打字。
- 后端**没有任何 TTS/ASR**：全仓命中都是注释（`tasks/video_ingest.py:16` 那句 ASR 是 TODO）。
- **没有麦克风权限处理**：仅有的权限代码属于浏览器通知，与音频无关。

**如果今天把浏览器 Speech API 全部拿掉，还剩下什么？**

几乎全部：白板继续画（句子时间线由 `createSilentVoice` 的 `setTimeout` 驱动）、
转录继续渲染、选择题 / `awaitClick` / 恢复进度全部正常——**只是没有声音**。

> 这既说明耦合很浅（迁移成本低），也说明**今天的语音是纯增量能力，不是承重结构**。

## 5. 一句话记住

**语音是同一堂课的 delivery 通道，不是决策者。**
它把已经定好的讲解读出来、把用户的话收回去，然后**用一个 signal 把控制权还给课程管线**。
任何"语音自己决定讲什么"的设计都是越界。