# Space Memory V0

让 Global Agent 在一个 Learn Space 里**跨对话连续**：昨天在一个对话里定下的事，
今天新开一个对话，它还知道。

**这一版刻意不做**：Learner State · KST · 用户画像 · 知识建模 · Memory Graph ·
Memory ranking · Memory decay · embedding / 语义检索 · Multi-Agent Memory ·
Coordinator · Scheduler · 新的 Agent Runtime · 独立 Memory Dashboard。

计划：`planning/space-memory-v0-execution-plan.md`。

---

## 1. 实现了什么

| 环节 | 做法 |
|---|---|
| **存** | 新表 `space_memories`（**挂空间，不挂对话**）—— 这一条就是「跨对话」的实现 |
| **写** | Agent 的一个工具 `remember`，它自己判断该不该记；记完**必须在回答里念一遍** |
| **读** | 每轮装配时把该空间的记忆拼进提示词（最近 20 条，有字数上限），并记进这条回答的 digest |
| **看** | 每条回答下方的 **Memory 段**（本次用到／本次写入）+ Space Context 面板里的 **Space Memory 块** |

三条边界（继承 EFF 红线）：记忆**不承载掌握度** · 记忆**不当 Learner State 的证据** ·
记忆是纯文本，**不含任何数值**。

---

## 2. 打开哪个页面

在一个**属于某个 Learn Space 的对话**里（工作台右侧，或 `/chat` 里从空间进入的对话）。

- **看不到 Memory 段？** 说明这个对话没有归属空间 —— 记忆按空间隔离，未归属空间的
  对话与它无关。这是设计，不是缺陷。
- **看当前空间全部记忆**：工作台底部的雷达图标打开 **Space Context 面板**，
  里面有 **Space Memory** 一块。

---

## 3. 第一个对话输入什么（Conversation A）

```
我们这次期末复习先重点解决 Eigenvector proof，暂时不要急着学 diagonalization。
```

**应该看到**：

1. 回答里**明说它记下了什么**（实测原话）：
   > 好的，我已经记下了我们期末复习的重点是 **先解决特征向量证明，暂时不学对角化**。这会在之后的对话中被用到。
2. 这条回答下方的 **Agent Context → Memory** 出现一行绿色的
   **「本次写入：期末复习的重点是先解决特征向量证明，暂时不学对角化。」**
3. 打开 Space Context 面板，**Space Memory** 里出现这条（总数 +1）。

> 「本次用到」此时是**空的** —— 这是对的：这轮新写的记忆不在本轮提示词里（digest 在
> 回合开始就固定了）。把两者并成一列就是在说模型看见了它自己刚写的东西。

---

## 4. 第二个对话输入什么（Conversation B）

**新开一个对话**（同一个空间），输入：

```
继续昨天的复习。
```

第三个对话（也是新开）可以问：

```
我们为什么没有直接学 diagonalization？
```

**应该看到**（实测原话）：

- B：> 根据「Research Roadmap」和「Space memory」，你目前的复习重点是特征向量证明，
  > 暂时不涉及对角化等内容。我们可以从以下几个方面继续复习……
- C：> 根据我们的空间记忆，你之前在对话 «我们这次期末复习先重点解决 Eigenvector proof…»
  > 中决定「期末复习的重点是先解决特征向量证明，暂时不学对角化」。这个决定可能是基于……
- 两条回答下方的 **Memory 段**都能看到这条记忆，并标注**来自哪一段对话**。

## 5. 一条反例（应该**不**发生）

新开对话问一个**完全无关**的问题，例如：

```
今天北京天气怎么样？
```

**应该看到**：回答只讲天气（实测：*我无法获取实时天气信息……*），
**不硬塞**复习计划 —— 但 Memory 段里这条记忆**仍然在**（可用 ≠ 必须用）。

---

## 6. 仍然是 V0 的临时实现（如实说）

1. **写入靠 Agent 判断**（工具 + 提示词纪律），不是自动抽取 —— 模型这一轮没调
   `remember`，就没有记忆。
2. **取回是「最近 20 条，原文照录」**：**没有相关性排序、没有语义检索**。记忆多了
   会漏掉旧的；超出上限时提示词与面板都会明说「还有 N 条更早的没列」。
3. **不做 supersede / 合并 / 过期**：被推翻的旧决定仍留在列表里，靠 Agent 按时间
   读、自己判断哪条更新。
4. **去重只认「文本完全相同」**：换个说法重记一遍会存两条。
5. **记忆不可编辑、不可删除**（没有管理面）—— 只能通过 Agent 去改。
6. **只有归属空间的对话有记忆**；视频课程 / free-course 对话是否归入空间，取决于
   它们创建时是否带了空间 —— 没带就与记忆无关。
7. **不预置任何演示记忆**：上面的第一条必须由对话真的产生。

---

## 7. 怎么跑起来

```bash
cd .workbuddy/localdb && ./pg.sh start          # 本机 PostgreSQL 17.6 @ 127.0.0.1:55432

cd backend
# 迁移（新增 space_memories；单头 f8b9c0d1e2f3）
.venv/Scripts/python.exe -m alembic upgrade head

# 仓库测试（不碰模型；没有数据库时 DB 那组会自动 skip）
"D:/github projects/lemma-ai/backend/.venv/Scripts/python.exe" -m pytest tests -q

# 端到端（真模型，跑上面四个对话并核对落库）
PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe \
  ../../../.workbuddy/localdb/verify_space_memory.py
```

前端与后端：后端 `127.0.0.1:8001`、前端 `http://localhost:5173`（进「AI for Math」）。
