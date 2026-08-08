# Lemma AI — 反馈信号最小升级方案（M3 · MVP）

> 日期：2026-08-08 · 前置：M1 内部盘点（`lemma-ai-agent-evaluation-inventory.md`）+ M2 外部参考（`lemma-ai-agent-evaluation-literature.md`）
> 用户拍板：**主攻反馈信号**（15:23）

## 1. MVP 定位（一句话）

**从对话历史提取"教学事件"（教过什么 → 测过没有 → 结果如何），写入 learner L4 episodes，让引擎内置的反馈闭环第一次被喂上真实信号。**

不做：LLM 自评打星、显式反馈 UI、行为埋点、注入（读路径）。全部后置。

## 2. 为什么这是 P0（三份证据）

| 证据 | 来源 | 结论 |
|---|---|---|
| 接收端已存在且深思熟虑 | M1 发现② | learner 的 L4/L2/L5 闭环 + partial 不动 mastery 防自欺闸门，是成品 |
| 导线为零 | M1 发现③ | `lemma_hermes_enabled=False`，services/ 无任何调用——**信号根本不流动** |
| 判 result 的方法已被验证 | M2 arXiv 2606.20138 | 14 特征加权 + 3 票多数决，一致性 94%+ |

## 3. MVP 范围

### 3.1 新组件：对话 → 教学事件提取器（backend 新模块）

```
ai/evaluation/            # 新包（沿 AIClient 拆包风格，独立可测）
├── __init__.py
├── extractor.py          # 从 AiMessage 对话历史提取候选教学事件
├── adjudicator.py        # LLM 独立质检角色：判定 result（success/failed/partial）
├── writer.py             # 写入 learner L4 episodes（走 record_episode 原子闭环）
└── types.py              # 教学事件 schema
```

### 3.2 提取规则（从对话历史，规则优先，不依赖 LLM）

- 识别"教学回合"：assistant 讲解（content 非空）→ user 后续回应
- 学生侧信号（二元特征，源自 arXiv 权重）：
  - user 是否在 2 轮内给出实质回应（correct within 2 turns 的启发式）
  - user 是否重复问同一概念（重问 = failed 信号）
  - user 是否表达困惑（"不懂/没懂/再说一遍/还是不会" 模式）
  - user 是否表达理解（"懂了/明白了/对/原来如此" 模式）
  - user 是否切走/中断（回合后无后续 → partial，不判负）
- **保守原则**：信号不足 → `partial`（不动 mastery——引擎闸门兜底）

### 3.3 LLM 质检角色（adjudicator，仅在规则信号冲突时启用）

- 独立 `AIUseCase.EVALUATE_EPISODE`（新 use case + 模板）
- 输入：教学回合的对话片段 + 规则提取的候选信号
- 输出：结构化 `{ result: success|failed|partial, reason, concept }`
- **3 票多数决**：同一回合跑 3 次独立判定，取多数（arXiv 验证 94%+ 一致性）
- **门控**：`evaluation_v2_enabled`，默认 False；规则信号清晰时跳过 LLM 判定（省成本）

### 3.4 写入 learner（writer）

- 打开 `lemma_hermes_enabled`（**只对写路径**；读路径/注入仍关闭）
- 调 `LearnerCore.record_episode(user_id, goal=space/课程名, concept, method=agent 教学风格, result, reason, new_strategy)`——引擎原子应用 L2/L3/L5 反馈
- 失败静默（写 learner 绝不能影响对话主链路——与 telemetry 同纪律）

### 3.5 触发点（选最小面）

- **对话落库后**（`persist_turn` 成功后）：对新写入的消息对做一次提取（异步、非关键路径）
- 范围先限：**learn space（project）内对话**（有 agent 人格的对话才有"教学"语义）；普通/课程对话暂不处理

## 4. 用户视角效果（三问）

1. **用户看到什么**：几乎无感——对话照常，唯一可感知的是老师下次讲解可能更贴合（那是注入/读路径的后续效果，本 MVP 不承诺）。
2. **符合产品意图**：是——"我们训练的是怎么教你这件事本身"，反馈信号是燃料；且符合"不主动为用户弄任何东西"（这是后台数据，不打扰用户）。
3. **如何验证**（Dev Dashboard）：
   - L4 `learning_episodes` 行数随对话增长（探活已有 `probe_learner`）
   - `success / failed / partial` 分布合理（partial 占大头 = 信号保守，符合设计）
   - 同一概念多 episode 后 L2 mastery 有变化（只有 tested 才动）
   - 遥测通道记录 evaluator 调用次数与成本（新增指标）

## 5. 风险与护栏

| 风险 | 护栏 |
|---|---|
| 判定错误污染 learner | 引擎 partial 不动 mastery；3 票多数决；后续 episode 可修正 |
| LLM 判定成本失控 | 规则信号清晰时跳过 LLM；`evaluation_v2_enabled` 门控；成本进 usage 账本 |
| 写 learner 拖垮对话 | 异步 + 失败静默（telemetry 同纪律） |
| 隐私/合规 | 只处理用户自己的对话；符合"阳光出海"（不向境内公众提供；数据归属中国主体）；episode 的 messages_ref 指向已有消息，不复制敏感原文 |
| 变成自评表演 | adjudicator 是**独立质检角色**（Voyager 原则），不是老师给自己打分；且以规则信号为主、LLM 为辅 |

## 6. 落地步骤（M3 之后）

- [ ] ① `ai/evaluation/types.py` + 提取器（纯规则，先不接 LLM）——单测覆盖
- [ ] ② `persist_turn` 后挂异步提取（门控关）
- [ ] ③ 接 learner writer + 打开写路径门控——dev 验证 episodes 增长
- [ ] ④ adjudicator（新 use case + 模板 + 3 票）——规则冲突时才启用
- [ ] ⑤ Dev Dashboard 展示 episode 分布 + evaluator 成本
- [ ] ⑥ 冒烟：真实对话 → episodes → mastery 变化；再翻转门控

## 7. 明确不做（本 MVP 边界）

- ❌ 显式反馈 UI（👍/👎）——P1，等 MVP 数据验证判 result 可信度后再加（用户主动表达通道，可选可关）
- ❌ learner 注入（读路径）——等有真实 episodes 数据再注入，避免"没数据就注入"空转/幻觉
- ❌ 行为埋点（停顿/删除/切走）——P2 伴随指标
- ❌ 多模态理解检测——否决（M2 结论）
- ❌ LLM 自评打星当主信号——红线，永不做

## 8. 待你拍板

1. **MVP 触发范围**：先只做 learn space 对话（推荐），还是所有对话都提取？
2. **LLM 判定阈值**：规则信号清晰时跳过 LLM（推荐，省成本），还是首个 MVP 全量 3 票判定（数据更干净但贵）？
3. **执行节奏**：按第 6 节六步一口气做完，还是先做 ①②③（规则提取 + 写入，无 LLM）验证信号能流动，再上 adjudicator？
