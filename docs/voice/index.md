# voice/ · 子目录索引

> **分支** `user-profile` · **日期** 2026-10-08 · **状态**：索引
> **这里只讲语音层**（"这门课用什么声音讲、听不听得见用户"）。
> 上层索引：[../index.md](../index.md)

---

## 这个子目录回答什么

语音层是**同一堂课的另一条 delivery 通道**。它不回答"教什么"（那是 Course Pipeline）、
不回答"他会不会"（那是证据层 / Learner State）、也不回答"他喜欢怎么被教"（那是 User Home）。

它只负责一件事：

> **把已经决定好的讲解，变成声音送出去；把用户说的话，变成文字收回来。**
> **它不参与任何"接下来讲什么"的决定。**

## 文件与阅读顺序

| # | 文件 | 讲什么 | 什么时候读 |
|---|---|---|---|
| 1 | [01-overview.md](01-overview.md) | 它回答什么、四条边界、四层结构、语音的流向 | **第一次接触，从这里开始** |
| 2 | [02-contract.md](02-contract.md) | 契约：`Voice` 接口、状态机、signal 语义、可朗读字段、时序不变量、读写面 | 要动语音，或要判断"这个实现算不算合规" |
| 3 | [03-integration.md](03-integration.md) | 怎么把一个新的 Experience（Learn Space / Focus …）接进语音：适配器四问、检查清单、反模式 | **要让某个功能会说话** |
| 4 | [04-now-and-gaps.md](04-now-and-gaps.md) | 现状快照：带 `file:line` 的实况、四个硬事实、五处断点、孤儿字段 | 想知道"今天到底通到哪" |

**按角色的最短路径**

- 只想知道"这东西怎么运转" → 1 → 4
- 要让某个功能会说话 → 1 → 3 → 4
- 要改契约（`Voice` 接口 / 状态机 / signal） → 2 → 4

## 状态图例（每份文档开头都会标）

| 标记 | 意思 |
|---|---|
| **事实** | 在标注分支上核对过，带 `文件:行号`；与代码冲突时以代码为准 |
| **约定** | 定下来要遵守的规则，可能**还没实现** |
| **未定** | 明确不知道的，别当结论引用 |

## 三条最容易搞混的边界（先记住）

1. **三套状态是正交的，不许合并。**
   - `PlaybackPhase`（`useTeachingPlayback.ts:45-51`）= **课程侧**：播到哪、在等什么
   - session `status` = **会话生命周期**：empty / active / archived
   - **Voice Runtime 状态**（约定）= **传输侧**：麦克风开没开、正在说还是在听

   `awaiting`（课程在等答案）和 `listening`（麦克风开着）是**两件事**。

2. **Voice ≠ Agent。** Voice Runtime 不得决定讲什么、不得引用课程模块。
   它和 Course Pipeline 之间**只通过 signal 通信**（今天三种，约定加一种 `no_response`）。

3. **Voice 不是 Learner State 的依据。** "他答对了"归证据层；Voice 只负责把声音送出去、
   把话收回来。**不许把语音层的任何计数渲染成能力或掌握度。**

## 什么时候回来改这里

- `Voice` 接口的公共面变了（`speak` / `cancel` / `available` 增删改）
- 语音的实现种类变了（今天两种：browser / silent；约定第三种 remote）
- signal 集合变了（尤其**新增了 `no_response`**）—— 2026-10-08 起这项已在计划中
- 新增/删除可朗读字段（`narration` / `prompt` / `feedback` / `award` 之外又加了东西）
- 第一个非 Free Course 的 Experience 接进了语音（Learn Space / Focus / Global）
- 语音偏好的存储位置变了（今天**不存在**，约定放 `user_home`）

改动清单里每一项都会让 04 过期；04 是快照，**过期了就更新它，别在旁边再写一份**。