# Learn Space 行为地图 · README

**交付物**：`learn-space-user-behavior-map.html`（约 79 KB，16 节，可交互工作台）
**代码基线**：`user-profile @ df06a656` · 2026-10-06 · **产品代码零改动**

---

## 研究范围

对 Learn Space 做一次**行为层逆向工程**：96 条用户行为，每一条都追问「用户做 X 之后，
哪个 UI 接收 → 产生什么 state → 写哪里 → AI 能否感知 → 后续行为能否利用」。

**审计方式**：四个方向并行（Space 诞生与方向 / 上下文与学习证据 / 持续与退出 / 主动行为），
**六条最重的断线我亲自 grep 复核**，不只依赖 agent 报告。

**本报告不做什么**：不改代码 · 不设计功能 · 不提架构方案 · 不把"当前不能做"当"用户不会需要"。

---

## 核心发现

### 三层结构，实现质量逐层递减

| 层 | 状态 | 证据 |
|---|---|---|
| **基础设施层** | ✅ 真实且扎实 | Scheduler 每 5 秒真在跑（`main.py:25-29`），原子认领已实现；FK 全覆盖；**Learner State 是读时算的纯函数，从不存储** |
| **服务层** | ⚠️ 实现了但**零接入** | `open_episode` / `close_episode` / `completion_met` / `rule_owes_completion` **全仓无生产调用方** |
| **决策与主动行为层** | ❌ 只有被动触发 | Coordinator 只有 2 个调用方；executor 三种 action 一律 `return "handed_to_global_agent"`，**而没有任何 agent 被调用** |

**一句归纳**：Learn Space 现在具备 Chat 的全部能力，加上一个用户能看见的入口；
而「它记得你」这件事，**一次都没有发生过**。

### 18 条断线，全部是三种形态之一

- **入口缺失**（10 条）：数据��构都在，就是没人调
- **空转**（3 条）：机制都在，最后一跳没接
- **空壳**（5 条）：枚举值、字段、表都在，但没有产生方

**没有一条是「两处规则不一致」** —— 因为 Learner State 读时算从不存储，
断线不可能是"历史数据已经错了"，只可能是"某一步没人调"。**这让它们全部可补。**

---

## 行为总数与分布

**96 条**，覆盖 15 个生命周期阶段（任务书给 15 段，我拆了 2 处、新增 1 个并列阶段）。

| 实现状态 | 条数 | 说明 |
|---|---|---|
| SUPPORTED | 7 | 整条链可走通且有测试 |
| PARTIALLY_SUPPORTED | 25 | 一半可用 |
| UI_ONLY | 3 | 界面在动、后端无对应事实 |
| BACKEND_ONLY | 6 | **代码完整但无生产调用方** |
| IMPLICITLY_SUPPORTED | 8 | 无显式入口 |
| NOT_SUPPORTED | 47 | 完全不存在 |

**最关键的一个数字**：认知/学习动作只有 4 条行为，**而系统只承认其中一种（答对/答错）**。
grep `recall|retrieval|reflection|transfer` 扫 `models/*.py` 零命中。
⇒ **一个人可以全答对而完全不理解，而系统看不出区别。**

---

## 最重要的行为链

**Learning Chain**（最完整的一条）：
```
尝试 → 判定（record_evidence）→ Learner State 重算  ✅ 全连
     → 干预  🔴 断：executor 三种 action 空转
     → 下一次动作
```

**Continuity Chain**（最残缺的一条）：
```
Session → 离开 → 时间 → 文本恢复 ✅
                          → 承诺 ✕（prepare_turn 不读 method_episodes）
                          → 时间感 ✕（消息不带时间戳，模型不知道隔了三天）
                          → 位置 ✕（Focus 的 conversationId 初始 null 且从不恢复）
```

**Revisit 整类 10 条行为，覆盖最多，而断点最密集** ——
「回来」是 Learn Space 相对于 Chat 的全部卖点。

---

## 最大的断线

### 🔴 B-03 / B-04：三条最正式的"做题"路径里，只有一条进了 Learner State

- Global Agent 里的作答 → ✅ 全连
- **Free Course 判分**（`free_course_service.py:605`）→ 🔴 不调 `admit_outcome`
- **题库判分**（`question_attempt_service.py`）→ 🔴 同样不调

两个文件的 grep 命中都是 **0**。⇒ **用户在产品里"正式做题"的地方，做的题对系统认识他零贡献** ——
而 Free Course 是浅用户最可能停留的地方。

### 🔴 B-01：改了 Goal，决策层不知道

`Snapshot.goal` 被填进快照，而 `ai/coordinator/rules.py` grep `goal` = **0 命中**。
唯一后果是下一轮的教学指令变了；决策层、Learner State、排序、终止判据全部不动。

### 🔴 B-05 / B-06：承诺层整类悬空

`method_episodes` 表约束完整、五条退出都要求解释，
而 `open_episode` / `completion_met` **全仓无生产调用方**。
⇒ 「我们说好你要连做 3 道题」这件事，用户回来时系统一字不记得。

### 🔴 B-08：通知点进去什么都不发生

`NotificationCard` 组件自陈 *"no dismiss, no snooze, no 'open'"*，
组件内 `onClick|navigate|href` grep = **0** —— 而 `metadata.projectId` 就在那里躺着没人读。

---

## 尚无法确认的部分

⚠️ **本报告没有 runtime 观察。** 登录走 Supabase，本机无 token、无 dev bypass ——
「代码告诉你系统可能做什么」这一半做到了，**「实际运行告诉你允许用户做什么」这一半没做到**。

具体影响这五条结论：

1. 用户实际会不会创建多个 Space（使用率未知）
2. **draft goal 遮住 active goal 的实际影响**（我从渲染优先级推断，没看过它运行）
3. 通知在真实页面上是否会堆积（无 `read_at` 是代码事实，堆积程度是推断）
4. 三周后回来时模型的实际表现（无时间戳是代码事实，它会怎么反应是推断）
5. Free Course 判分不进 Learner State 的**后果轻重**（断线是代码事实，后果是推断）

另外：**本报告零用户数据**，因此不含任何与用户实际行为频率相关的判断。

---

## 一句话收束

> Learn Space 与 Chat 的本质差异不是"有文件夹"，而是**"有跨会话的主体"**——
> 具体是三件事：状态在会话之间活着、系统在用户不在时做事、空间本身会演化。
>
> 第一件半连（文本恢复，语义不恢复）· 第二件一次都没兑现过 · 第三件只增不减。
