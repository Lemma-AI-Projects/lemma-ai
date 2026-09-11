# Credits 页面迁移计划（main → main-v2）

> 与 main 的唯一结构差异：**入口从侧栏挪到 profile 菜单的子选项**，侧栏不加任何东西。

---

## 1. main 上的 Credits 是什么

### 前端 `features/payments/`（7 文件 / 649 行）

| 文件 | 行数 | 作用 |
|---|---:|---|
| `PayPage.tsx` | 244 | 充值页：余额头、套餐卡（最划算徽标）、成功/失败态 |
| `PayPalButton.tsx` | 149 | PayPal SDK **运行时注入**下单 + 捕获 |
| `StripeCheckoutButton.tsx` | 76 | 走后端建单后跳转 |
| `usePayments.ts` | 41 | `useBalance` / `usePaymentConfig` |
| `types.ts` | 52 | CreditPack 等 |
| `paymentApi.ts` | 50 | 建单 / 捕获 / 配置查询 |
| `plans.ts` | 37 | CREDIT_PACKS 档位 |

**好消息：前端零新增 npm 依赖**（PayPal SDK 是运行时 `document.createElement('script')` 注入，不碰 `index.html`）。

### 后端（10 文件 / 约 1137 行）

`api/v1/credits.py`(88) · `api/v1/payments.py`(170) · `api/v1/webhooks.py`(184) · `models/payment.py`(141) · `schemas/payment.py`(57) · `services/credits/ledger.py`(148) · `services/payments/{fulfillment,paypal_client,stripe_client,pricing}.py`(349)

数据：三处 —— `profiles.credits_balance` 列 + `payments` 表 + `payment_webhook_events` 表（2 条迁移）
依赖：`stripe>=11.0`（PayPal 走 httpx，无 SDK）
配置：`paypal_mode` / sandbox+live 的 `client_id`·`client_secret` / `paypal_webhook_id` / Stripe keys

**v2 现状：后端支付相关一行都没有，配置一个都没有。**

---

## 2. 入口改造（本轮与 main 的关键差异）

v2 的 profile 菜单里现在有一个**死控件**：

```tsx
<ActionMenuItem
  label="升级套餐"
  icon={Sparkles}
  onSelect={() => handleAction('Upgrade plan')}   // handleAction 只是 console.log
/>
```

**建议：把它接成真的** —— 文案改「Credits」（或「积分」），点击跳 `/credits`；路由存在但**不进侧栏**，只能从 profile 菜单进。既满足「不放 sidebar」，又顺手消灭一个假按钮。

---

## 3. 分阶段

| 阶段 | 内容 | 用户可见效果 | 验证 |
|---|---|---|---|
| **P1 页面 + 入口** | 搬 7 个前端文件；`/credits` 路由（不在侧栏）；profile 菜单「升级套餐」→「Credits」 | 点头像 → Credits → 进入充值页。**此时后端未接**：余额显示 `—`，支付按钮因 `paypalReady/stripeReady=false` 禁用 | 无痕打开 `/credits` 能渲染；菜单点击能跳 |
| **P2 后端** | 搬 model/service/api/webhook；2 条迁移（**重挂 down_revision**）；加 `stripe` 依赖；补 config | 无 | `alembic upgrade head` 建出表；`/api/v1/credits/balance` 返回 0 |
| **P3 打通** | 配置 sandbox 密钥；前后端联调下单与 webhook 入账 | 余额变数字；下单走通 sandbox；webhook 到账后余额增加 | sandbox 下单 → 余额变化 → ledger 有记录 |
| **P4 合规校验** | 核对红线：一次性购买、**禁自动充值**、credits 永不过期 | — | 逐条对照商业红线 |

---

## 4. 风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| **迁移链断裂** | `a1b2c3d4e5f6` 的 `down_revision` 是 tuple `(8cb12750614d, 3f1a2b3c4d5e)`，后者 v2 没有；`7f3c9a1b5d2e` 挂在 `3a5b7c9d1e2f`（learn space agent）也没有 | 两条都重挂到 v2 当前 head 串成单链，**禁止建 merge 迁移** |
| 密钥缺失 | v2 无任何支付配置 | 页面已有「未配置」降级态；P3 才需要真实 sandbox 密钥 |
| 生产库升级 | 新表 + profiles 新列 | 按既定策略：先 `alembic upgrade head` 再启用 |
| 合规 | 自动充值触碰 ROSCA/ARL 红线 | main 是一次性 credit pack、无订阅自动续费，文案已写「永不过期」；P4 逐条核对 |
| MoR | 收款主体方案待核实（Paddle / Lemon Squeezy 大陆主体准入） | 不影响本次迁移，但上线前需确认 |

---

## 5. 执行状态（2026-09-11 更新）

| 阶段 | 状态 | 证据 |
|---|---|---|
| P1 页面 + 入口 | ✅ 完成（`370ccaf`） | `/credits` + 头像菜单入口 |
| P2 后端 + 迁移 | ✅ 完成（`c75cc6e`） | 迁移 `b3c5d7e9f1a2` 已 apply；`GET /payments/config` → `paypalReady:true` |
| P3 sandbox 打通 | 🟡 **卡在公网可达** | 建单与入账幂等已实测；webhook 投递需真实域名 |
| P4 合规核对 | ⬜ 未开始 | — |

**已实测**（真跑的，不是推演）：
- `scripts/smoke_paypal_order.py` → 沙箱真实建单成功，返回 approval URL
- `scripts/smoke_payment_loop.py` → 入账一次 / 重放不再入账 / ledger 恰好 1 条 / 未知订单不崩（事务回滚，零残留）
- 无签名 POST webhook → 验签失败被拦（`status=error`）且返回 200，不会让 PayPal 无限重试

---

## 6. 域名到手后的动作清单（`thelemma.ai`）

PayPal 后台的 webhook 已配好：**`https://thelemma.ai/api/v1/webhooks/paypal`**（POST）
订阅事件：`PAYMENT.CAPTURE.COMPLETED`（必需）、`CHECKOUT.ORDER.APPROVED`（可选）
Webhook ID `4S790762KW764124R` 已在 `backend/.env`（**不进 git**；模板见 `backend/.env.example`）。

域名买下并解析后，按顺序做四件事：

1. **配 DNS + TLS**：`thelemma.ai` 指向部署环境并拿到有效证书
   - 后端 `CORS_ORIGINS` 加上 `https://thelemma.ai`（否则前端被 CORS 挡）
   - 前端 `VITE_API_BASE_URL` 指向 `https://thelemma.ai`（API 与站点同域，路径仍是 `/api/v1`）
2. **部署后端**，先探活：
   ```bash
   curl https://thelemma.ai/api/v1/payments/config
   # 期望 {"paypalReady":true,"stripeReady":false,"currency":"USD"}
   ```
3. **PayPal 后台点「Send test event」**，再核对入库结果：
   ```sql
   select provider_event_id, event_type, status, detail
   from payment_webhook_events order by created_at desc limit 5;
   ```
   期望一条 `status=processed`（验签通过）。若是 `error / signature verification failed`，说明 `PAYPAL_WEBHOOK_ID` 与这个 URL 不属于同一个 webhook。
4. **跑一次真实 sandbox 付款**：登录 → 头像 → Credits → 选 Starter → 用沙箱买家账号支付 → 余额 +500，`credit_ledger` 新增一条 `purchase:<payment_id>`

**切 live 的唯一开关**：`backend/.env` 的 `PAYPAL_MODE=live` 与 `frontend/.env` 的 `VITE_PAYPAL_MODE=live` **必须同时切**（live 用 live 凭据、sandbox 用 sandbox 凭据，混用会被 PayPal 拒绝）。

---

## 7. 待拍板

1. **范围**：P1 只搬页面（可立刻评审布局）还是 P1+P2+P3 一次做到能收款？
2. **入口文案**：`Credits`（与产品内 "session/token" 语境一致）还是 `积分`？
3. **路由名**：`/credits` 还是沿用 main 的 `/gotopay`？
