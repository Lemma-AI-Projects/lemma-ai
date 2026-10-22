# 支付系统 item 调研报告

> 下一步：① 确认第 4b 节产品列表（11 条）有没有漏你心里的产品 → ② 拍第 6 节的 7 个决定 → ③ 再写实现计划。
> 结论先行：**「产品列表」此前确实不存在——use_case 是内部记账口径不是产品，且 22 个里有 4 个已死（vision_chat / video_qa / video_summary / video_locate，全仓零生产调用方）。本版补上产品列表：11 个产品，收敛成 3 个收费族 + 1 个免费族。真正缺的代码只有一件事：没有任何地方在扣 credits。**

---

## 1 · 先写场景，再谈结论

用户现在能遇到的画面：

- 「我在充值页看到 Starter / Pro / Max 三档，用 PayPal 付了 $9.99」——**能走通**（sandbox）。
- 「我在侧边栏看到当前余额 500」——**能看**，但这个数字**永远不变**。
- 「我跟 AI 聊了一下午、建了三门课、读了两课内容」——**一分钱没扣**，余额还是 500。

所以「即将开始实现支付系统」实际是：**收钱的一半已经建好（9 月 20 日 `7b7fa811`，25 个文件），花钱的一半完全没接线。**

## 2 · 我看到的事实（全部带位置）

| 环节 | 状态 | 证据 |
|---|---|---|
| 卖：3 档 credits 套餐 | ✅ | `backend/services/payments/pricing.py:21-25`（500/$4.99、1200/$9.99、4000/$29.99） |
| 卖：前端展示（含档位权益文案） | ✅ | `frontend/src/features/payments/plans.ts:13-45` |
| 收：PayPal 下单→capture→幂等发放 | ✅ | `services/payments/fulfillment.py:26-68`（行锁+状态机，重放不双发） |
| 收：webhook 去重 | ✅ | `models/payment.py:78-110`（`provider_event_id` UNIQUE） |
| 收：Stripe | ❌ 恒关 | `core/config.py:272-276`（`stripe_ready` 永远 `return False`） |
| 换算：1 credit = $0.01，向上取整 | ✅ 已拍板 | `services/credits/ledger.py:3-35`（拍板日期 2026-08-14 写在注释里） |
| 记：每次 AI 调用一行，带 cost_usd | ✅ | `models/ai_usage_log.py:13-69`（失败/断流也是一行） |
| 记：每次搜索 provider 一行，带 cost_usd | ✅ | `models/provider_usage_log.py:12-47` |
| 记：TTS 按字计，cost_usd 恒 NULL | ✅ 但见第 3 节 | `ai/speech/usage.py:9-11` |
| **扣：`deduct_credits` 生产调用方** | ❌ **零** | `grep "deduct_credits(" backend` → 只有定义处 `ledger.py:79` |
| 赠：注册送 credits | ❌ 零调用方 | `grep "grant_credits("` → 只有 `fulfillment.py:61` |
| 退：退款 webhook | ❌ 没人接 | `api/v1/webhooks.py:106-110` 只处理 `CAPTURE.COMPLETED` / `ORDER.APPROVED`；`payments.status` 有 `'refunded'` 档但没有任何代码写入 |

## 3 · 三个洞（「按成本扣」现在走不通的地方）

1. **AiHubMix 平台不报成本** → 走 AiHubMix 的调用 `cost_usd = NULL`，只有 token 数（`models/ai_usage_log.py:45-47` 注释明说）。要按成本扣，就得自己维护一张 token 价目表兜底。
2. **TTS 永远没有 cost_usd**（按输入字符计费，代码注释明说"never guessed"，`ai/speech/usage.py:11`）。要收 TTS 的钱，必须先给它定价。
3. **搜索成本不记 user_id**。`provider_usage_logs` 只记 `course_id`（`models/provider_usage_log.py:43-45`）——Apify 的钱花了，但**没法归到哪个用户头上**。

## 4 · item 全景

### 4a · 卖的（收入侧）——就 3 个

| id | 名 | credits | 价格 |
|---|---|---|---|
| starter | Starter | 500 | $4.99 |
| pro | Pro（标"最受欢迎"） | 1,200 | $9.99 |
| max | Max | 4,000 | $29.99 |

一次性买断、不订阅——`plans.ts:4` 注释写明这是**故意的法律决策**（避开订阅退订法 ROSCA / 州法 ARL）。这决定了后面一整类「订阅 item」（月费、续订、计划变更、proration）**不存在**，不用设计。

### 4b · 产品列表（用户视角，v0 草案）

先说清一个区别：那 22 个 use_case 是**内部记账口径**（每次模型调用的标签），不是**产品**（用户买/用的事）。产品列表此前从未存在过，本节补上。

**保鲜度审计（2026-10-18 核）**：4 个 use_case **全仓零生产调用方**——`vision_chat`、`video_qa`、`video_summary`、`video_locate`。`backend/api`、`backend/services` 里没有任何代码引用它们，只剩 smoke/validate 脚本；`api/v1/` 也没有 videos 路由。核实命令：`grep -rln "AIUseCase\." backend/api backend/services`（命中 4 个 service 文件，均不含这四个；`chat_service.py` 只用 text_chat / course_plan_intro）。其余 18 个记账口径都有活的生产调用方。

产品列表——按「用户做的事」列，不按模型调用列：

| # | 产品（用户做的事） | 底层调用链（use_case） | 计费单位 | 记账现状 |
|---|---|---|---|---|
| 1 | 和 Agent 对话（含工具：搜索、画板、知识库；发图也走这条） | text_chat | 每次回答（可能多轮调用） | ✅ cost_usd 落库 |
| 2 | 建一门 Free Course | free_course_intake→map→gap→blueprint | 每门课一次（4 连发） | ✅ |
| 3 | 学 Free Course 一课 | free_course_lesson | 每课 | ✅ |
| 4 | Free Course 答题 | free_course_feedback | 每题 | ✅ |
| 5 | 教学模式（开场 + 逐轮） | free_course_session / session_turn | 开场一次 + 每轮 | ✅ |
| 6 | 课程朗读 | free_course_tts | 每 1k 字符 | ⚠️ cost 恒 NULL，须先定价 |
| 7 | 建老课程（视频课，聊天里触发规划卡片） | course_plan_intro + course_intake + topic_search + course_compose + 搜索 provider | 每门课一次 + 搜索 run | ⚠️ 搜索成本没记 user_id |
| 8 | 看课伴学问答 | course_companion | 每问 | ✅ |
| 9 | /me 背景提取 | user_profile_extract | 每次改资料 | ✅ |
| 10 | 空间目标识别（Learn Space 里说一句话） | space_goal_extract | 每句话 | ✅（成本极小） |
| 11 | 题库练习 | 无模型（`qbank/grading.py` 本地判分） | — | 现状零成本 |

死掉的 4 个（vision_chat / video_qa / video_summary / video_locate）不进产品列表；将来若恢复，按当时定价再加。

**收敛成 4 族**（给价目表用，不是给代码用）：
- **对话**：产品 1
- **建课**：产品 2、7
- **学课**：产品 3、4、5、6、8
- **免费**：产品 9、10、11（要么零成本，要么单次成本远小于 1 credit）

### 4c · 支付系统要管、但代码里还没有的（8 件）

1. 扣费接线（第 2 节那个零）。
2. 失败调用的收费规则——台账原则是"失败也花钱"（`ai_usage_log.py:14-16`），但**向不向用户收**没定。
3. 注册赠送 / 免费额度（`grant_credits(reason=...)` 现成，没人调）。
4. 退款闭环（webhook 只听成功事件；退款要不要收回 credits 没定）。
5. 长任务计费策略：建一门 Free Course = 至少 4-6 次模型调用，做到一半没钱怎么办。
6. credits 有效期（现状：永久）。
7. token 价目表兜底（第 3 节洞 1）+ TTS 字价（洞 2）+ 搜索归属（洞 3）。
8. Stripe 通道（现在只有 PayPal；`CreateOrderResponse.url` 字段已给 redirect 型通道留了位，`schemas/payment.py:42-44`）。

## 5 · 我的判断

- **产品列表此前不存在，4b 节补上了**：11 个产品、4 个族。内部 use_case 审计后是 18 活 + 4 死——「过时」的部分是死的 4 个，不该按它们定价；活的部分与产品能一一对上，所以定价按产品（4 族）来，不必按 18 个记账口径逐个定。
- **扣费模式二选一**：A 按实报实销（`usd_to_credits(cost_usd)`，规则 8-14 已拍）；B 按**产品族**一口价目表（行业惯例，用户可预期，但成本会随模型价格漂移）。A 的直接障碍是第 3 节三个洞；B 的直接代价是给 4 个族定 4 个价。**我倾向 A + 兜底价目表**：三个洞都是小工程（token 价表一张、TTS 单价一个数、provider 日志补一列 user_id）。
- **失败调用不该向用户收**，哪怕平台真花了钱。理由：用户视角「你什么都没给我」。差额作为平台成本吃下，正好也是 free tier 的自然来源。
- **建议这轮不做**：订阅（法律决策已拍）、Stripe（PayPal 先跑通闭环）、过期机制（一开始给永久 credits 是卖点不是债）。

## 6 · 要你拍板的 7 件事

| # | 问题 | 我的倾向 |
|---|---|---|
| 1 | 扣费模式：实报实销 vs 一口价目表 | 实报实销 + 兜底价表 |
| 2 | 失败/断流的调用向用户收吗 | 不收 |
| 3 | 新用户送多少 credits | 送（金额你定），走现成 `grant_credits` |
| 4 | 建课长任务中途没钱：预检+截断 vs 预扣冻结 | 预检+截断（先别做冻结） |
| 5 | 退款时收回 credits 吗 | 收回（按当日余额最多收回，可为负记调整） |
| 6 | credits 有效期 | 永久 |
| 7 | Stripe 这轮接吗 | 不接，PayPal 闭环优先 |

## 7 · 核实过的代码位置

| 位置 | 内容 |
|---|---|
| `backend/services/payments/pricing.py:21-25` | 3 档套餐价目 |
| `backend/services/credits/ledger.py:3,26-35` | 1 credit=$0.01 拍板 + ceil 换算 |
| `backend/services/credits/ledger.py:44,79` | grant/deduct 定义（deduct 无调用方，grep 留档） |
| `backend/services/payments/fulfillment.py:26-68` | 幂等发放（行锁+前向状态机） |
| `backend/models/payment.py:20-141` | payments / payment_webhook_events / credit_ledger 三表 |
| `backend/ai/types.py:17-63` | AIUseCase 枚举 20 个（审计：16 活 4 死） |
| `backend/ai/speech/usage.py:9-11,26` | TTS 按字计费、cost 恒 NULL、use_case=free_course_tts |
| `backend/models/provider_usage_log.py:12-47` | 搜索台账，只有 course_id 无 user_id |
| `backend/models/ai_usage_log.py:45-48` | cost_usd「平台报了才有，绝不猜」 |
| `backend/api/v1/webhooks.py:106-110` | webhook 只处理两种成功事件 |
| `backend/core/config.py:272-276` | stripe_ready 恒 False |
| `frontend/src/features/payments/plans.ts:4` | 一次性购买避开 ROSCA/ARL 的决策原文 |
| 提交 `7b7fa811`（2026-09-20） | 支付骨架整体落地，25 文件 |

外部出处（● = 本次联网核验）：● Flexprice《Implementing credit-based billing for AI applications》（append-only ledger / idempotency / 实时计量五步法）http://flexprice.io/blog/how-to-implement-credit-based-billing-for-ai-applications ；● CIRISBilling 交易类型枚举 PURCHASE/GRANT/REFUND/ADJUSTMENT https://deepwiki.com/CIRISAI/CIRISBilling/1.2-key-concepts ；● ReelMind 长任务预扣+失败释放模式 https://reelmind.ai/blog/the-financial-flow-stripe-integration-for-membership-and-credit-purchases 。Stripe 设计指南页未提供对象清单，本报告不引用。

## 8 · 这份报告证明不了什么

- 没跑过任何 DB 查询——4b 的清单是从枚举+调用方代码推的，不是从 `ai_usage_logs` 实际 distinct 出来的。
- 保鲜度审计只查了 `backend/api`、`backend/services` 两层的直接引用；如果某条调用藏在动态分发（`getattr`/字符串路由）里，会漏判。`ai/coursegen/__init__.py` 恰好是 PEP 562 懒加载（`__getattr__`），但 use_case 常量引用仍需静态出现，故不影响死活判定。
- 「扣费接线」做完的证明只有一个：**真买一次、真用一次，`credit_ledger` 多出一行负数**。任何测试全绿都替代不了它。
