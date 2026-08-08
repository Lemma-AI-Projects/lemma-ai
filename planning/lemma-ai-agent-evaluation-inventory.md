# Lemma AI — Agent 反馈信号·内部盘点（M1）

> 日期：2026-08-08 · 调研计划：`planning/lemma-ai-agent-evaluation-research.md`
> 范围：**反馈信号**维度（用户 15:23 拍板主攻）——盘点 Lemma 现在到底有哪些信号、哪些没有、断在哪一环。

## 1. 结论先行（诚实评级）

对照截图五维度中的**反馈信号**，我们的评级比截图的"⚠️ 只有使用频次"更难看：

| 信号源 | 现状 | 诚实评级 | 对教学效果的诚实度 |
|---|---|---|---|
| 体验遥测（TTFT/fallback/degraded） | ✅ 有（`ai/telemetry.py`，提交 0ec55c1） | ✅ 有 | ❌ **系统健康信号**，非教学效果信号 |
| 用量账本（tokens/latency/cost/success） | ✅ 有（`ai_usage_logs`） | ✅ 有 | ❌ 成本与成功率，非"学到了吗" |
| 对话历史（ai_messages） | ✅ 有完整原料 | ⚠️ 有原料 | ⚠️ **有原料、零提取**——没有任何代码从对话里提炼信号 |
| Hermes learner 五层（接收端） | ✅ 有完整机制 | ✅ 有 | ✅ 引擎内部就有反馈闭环（L2/L4/L5） |
| **用户显式反馈（👍/👎/评分）** | ❌ **完全没有** | ❌ | — 前端无、后端无、接口无 |
| **信号 → learner 的接入** | ❌ **零接入** | ❌ | — `lemma_hermes_enabled=False`，services/ 无任何 learner 调用 |

**一句话本质**：Lemma 的反馈信号 = **有"接收器"（learner 五层闭环）、有"原料"（完整对话历史）、但没有任何"传感器"（信号采集）和任何"导线"（接入）**。

## 2. 五大发现

### 发现 ①：体验遥测≠教学反馈（别混为一谈）
`ai/telemetry.py` 测的是**用户感知体验**：TTFT、fallback 率、degraded 率——这是基础设施健康，与"这轮讲解是否教会了用户"无关。它可以作为**伴随指标**（教学反馈链路本身不能拖垮体验），但不能充当教学效果信号。

### 发现 ②：learner 引擎内部已经内置了完整的反馈闭环（金矿）
读 `engine/lemma-hermes/agent/learner/learner_core.py` 发现引擎**早就设计好了反馈回路**：

- **L2 knowledge_nodes**：mastery = successes/attempts（Beta 后验均值）、confidence = 1-e^(-attempts/5)；不变量：`exposed`（教过）**不**动 mastery，只有 `tested`（测过）才动——**设计上就杜绝了"讲过就算会"的自欺** ✅
- **L4 learning_episodes**：`record_episode(user, goal, concept, method, result, reason, new_strategy)`，result ∈ {success, failed, partial}；**partial = 无测试信号，必须不动 mastery**——又是一道防自欺闸门 ✅
- **L5 meta_rules**：`confirm_rule(user, rule_id, hit)` —— 教学规则有 confirm/refute 生命周期，证据数 ≥5 才翻转状态 ✅
- **原子性**：episode 插入与反馈应用在同一事务（无半更新 learner 状态）✅

> **这是最关键的发现**：反馈信号的"接收端"不是从零造，引擎里已经是深思熟虑的成品。缺的是**信号源**和**导线**。

### 发现 ③：信号到 learner 的导线为零（断点）
- `core/config.py:175` → `lemma_hermes_enabled: bool = False`（默认关闭）
- `backend/services/`、`backend/ai/` **没有任何** `record_episode` / `confirm_rule` / `test_knowledge` / `LearnerCore` 调用
- 唯一接触点是 `admindev/monitor.py`（探活，只读不写）与 `ai/agents.py`（`lemma_context_blocks` 预留字段，空列表，零行为变化）

### 发现 ④：用户显式反馈为零（产品层）
全库 grep（前端 .tsx/.ts、后端 .py）：无 👍/👎、无 rating、无 vote、无 reaction、无 feedback 接口。**用户对"这讲得对不对"没有任何表达通道**。

### 发现 ⑤：隐式信号有原料但零提取
`ai_messages` 存了完整对话（role/content_text/reasoning_text/tool_json），但没有代码分析：
- 用户是否重复问同一个概念（重问 = 没懂）
- 用户是否在讲解后问更深入的问题（= 懂了的信号）
- 用户是否中断/放弃对话（= 不满或受挫）
- 用户是否切走（= 讲解失败）

## 3. 缺口优先级（候选新信号源）

| 优先级 | 信号源 | 类型 | 诚实度 | 成本 | 说明 |
|---|---|---|---|---|---|
| P0 | **对话 → 教学事件提取** | 隐式 | ⭐⭐⭐ | 中 | 从对话历史提取"讲解 → 测试 → 结果"三元组，喂 L4 episode（result 判定：用户答对=success / 重问=failed / 无测试=partial）。**这是引擎设计好的标准路径** |
| P0 | **learner 接入激活**（写路径） | 导线 | ⭐⭐⭐ | 低 | 打开 gate + 把提取出的 episode 调 `record_episode`（走引擎的原子反馈闭环） |
| P1 | **显式反馈**（👍/👎 + "没听懂"按钮） | 显式 | ⭐⭐⭐ | 中 | 用户表达通道；设计上必须轻量、可选、可关（红线） |
| P1 | **learner 上下文注入**（读路径） | 导线 | ⭐⭐ | 低 | `lemma_context_blocks` 字段已预留，注入 learner identity/knowledge/rules 到 system prompt |
| P2 | **行为信号**（重问率/中断率/切走率） | 隐式 | ⭐⭐ | 低 | 需要新埋点或离线分析；作为伴随指标 |
| — | LLM 自评打分 | 显式 | ❌ | — | **直接否**：截图本质问题，红线 |

## 4. 用户视角（如果做 P0）

- **用户看到什么**：几乎无感——对话照常，后台悄悄把"教过→测过→结果"记入 learner，老师下次讲得更准。
- **符合产品意图**：是——"我们训练的是怎么教你这件事本身"，教学效果反馈是它的燃料。
- **如何验证**：Dev Dashboard learner 探活（已有 probe_learner）；L4 episodes 有数据增长；L2 mastery 随测试变化；后续可做"重问率下降"的长期指标。

## 5. 关键风险

1. **信号误判**：从对话自动判 result（success/failed/partial）是 AI 判断，可能错——但引擎已内置防护（partial 不动 mastery；只有 tested 动），且判断错误可被后续 episode 修正。
2. **隐私**：episode 含对话摘要（messages_ref），须符合"阳光出海"合规底线（不向境内公众提供；数据归属中国主体）。
3. **接入顺序**：先写路径（记录）再读路径（注入），避免"没数据就注入"造成空转或幻觉。
4. **gate 纪律**：`lemma_hermes_enabled` 默认 False；上线须真实跑通冒烟再翻转。

## 6. 下一步（M1 收官 → M2 外部参考）

- [x] 内部盘点完成（本文件）
- [ ] M2 外部参考：Reflexion（对话自反思）、Voyager（技能库）、教育 agent 的"教学事件提取"做法（Khanmigo/多邻国）——重点：**如何可靠地从自由对话判 result，而不是靠用户点按钮**
- [ ] M3 最小方案：P0（对话 → episode 提取 → record_episode）的 MVP 设计，含用户视角/门控/验收
