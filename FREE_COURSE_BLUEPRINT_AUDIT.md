# Free Course Blueprint 生成链路审计

> **基线** `user-profile @ f6d2c1e7` · **日期** 2026-10-10 · **库** `lemma @127.0.0.1:55432`
> 目标是判定 `objective` / `blueprint` 到底是真缺、还是某一环丢的。
> **本轮零代码改动。**
>
> **下一步（≤5 行）**
> ① **`blueprint` 为 null 是设计，不是缺陷** —— 它是**每节课单独生成**时才写的（`free_course_service.py:300`），
>    大纲阶段压根不写（`:193` 只写 objective）。我上一轮说「那张蓝图其实没有蓝图内容」**过度解读了**。
> ② 真正的缺陷有两个，都不在生成侧：**前端画布不读 blueprint**（`layoutBlueprint` 只传 objective），
>    以及**大纲阶段 objective 无兜底**（`lesson.get("objective")` 静默 None，而单课阶段有 fallback）。
> ③ ⚠️ **「真实模型在 map 阶段到底产不产 objective」我没能验证** —— 需要真跑一次生成，
>    而本机库半死 + 生成要模型凭证。复现步骤见 §6。
> ④ 因此本审计给的是**机制层面确定的结论**，不是「objective 确实为空」的结论。

---

## 1 · Pipeline 图（实际代码路径）

```
用户输入
  ↓
POST /api/v1/free-courses            api/v1/free_course.py
  ↓
FreeCoursePipeline.run()             ai/free_course/pipeline.py
  ├─ intent   → Intent               ai/free_course/intent.py
  ├─ map      → LearningMap          （单元 + 每课 objective）
  ├─ path     → Path                 ai/free_course/path.py:65  ← 读 unit/lesson/objective 三元组
  ├─ blueprint→ LessonBlueprint      ai/free_course/blueprint.py:33   ← ⚠️ 单课级，不是大纲级
  └─ content  → Lesson + objects
  ↓
持久化（大纲）                        services/free_course_service.py:186-197
  ├─ CourseUnit   ← overview          ⚠️ 没有 objective 列
  └─ CourseChapter← objective ✅       blueprint_json ❌ 完全不写
  ↓
持久化（单课 blueprint）              services/free_course_service.py:300
  └─ chapter.blueprint_json = blueprint ✅
  ↓
GET 课程树                            schemas/free_course.py:129-130
  ├─ objective ✅
  └─ blueprint ✅（读 :456-457 的 blueprint_json）
  ↓
前端类型                              frontend/.../free-course/types.ts:47-48
  ├─ objective ✅
  └─ blueprint ✅
  ↓
前端消费                              FreeCourseBlueprintView.tsx:33-56  layoutBlueprint()
  ├─ objective ✅ 传进节点
  └─ blueprint ❌ 节点类型里没有这个字段
```

---

## 2 · 逐阶段证据表

| # | 阶段 | 文件:行 | `objective` | `blueprint` |
|---|---|---|---|---|
| 1 | 模型 · 单元 | `models/free_course.py:46-70` | **不存在**，只有 `overview`（`:66`） | 不存在 |
| 2 | 模型 · 课节 | `models/free_course.py:110` | `Text, nullable=True` | `models/free_course.py:113` `JSONB, nullable=True` |
| 3 | pipeline 事件 | `ai/free_course/pipeline.py:193` | 进 progress payload | — |
| 4 | path 阶段读 | `ai/free_course/path.py:65` | 从 `learning_map.flatten()` 取 | — |
| 5 | 单课 blueprint 生成 | `ai/free_course/blueprint.py:92` | `blueprint.objective.strip() or step.objective` ← **有兜底** | 产出 `LessonBlueprint` |
| 6 | **大纲落库** | `services/free_course_service.py:193` | `objective=lesson.get("objective")` ← **无兜底，缺即 None** | **完全不写** |
| 7 | 单课落库 | `services/free_course_service.py:300` | — | `chapter.blueprint_json = blueprint` |
| 8 | 树读取 | `services/free_course_service.py:454` | `chapter.objective or ""` | `:456-457` 读 `blueprint_json` |
| 9 | API schema | `schemas/free_course.py:129-130` | `objective: str \| None` | `blueprint: LessonBlueprintOut \| None` |
| 10 | `LessonBlueprint` 形状 | `schemas/free_course.py:71-76` | `objective: str`（必填） | + `prerequisites` / `sequence` |
| 11 | 前端类型 | `types.ts:47-48` | ✅ | ✅ |
| 12 | **前端画布** | `FreeCourseBlueprintView.tsx:39/50` | ✅ 传入 | ❌ **节点类型里没有** |

---

## 3 · 结论：`blueprint` 为 null 是设计

**证据链**：

1. `blueprint_json` 在大纲落库那段代码里**一个字都没出现**（`free_course_service.py:186-197`）。
2. 它只在 `:300` 被赋值，而那行属于**单节课的 blueprint 生成**流程 —— 对应 UI 上的「生成第一课 →」。
3. `design_blueprint()`（`ai/free_course/blueprint.py:33`）的入参是 `step`（一节课）而不是整门课。
4. `schemas/free_course.py:74` 的 `LessonBlueprint` 有 `prerequisites` / `sequence`
   —— **这两者是「这一节课的内部结构」，一门课的蓝图不可能有 prerequisites**。

⇒ **一个课程级的蓝图在概念上就不存在。** 页面上 9 张课节卡的 `blueprint` 全为 null，
   在「用户还没点生成任何一课」的状态下是**正确**的。

⚠️ **我上一轮的判断是错的**：我说「那张蓝图其实没有蓝图内容，只有标题」，
把一个**尚未发生**的生成当成了缺失。已纠正。

---

## 4 · 真正的缺陷（两处，都不在模型输出）

### D-1 · 前端画布不消费 blueprint 🔴

`services/free_course_service.py:300` 已经把单课 blueprint 写进库，
`schemas/free_course.py:130` 已经把它序列化出去，`types.ts:48` 已经声明了它。

**但 `layoutBlueprint()`（`FreeCourseBlueprintView.tsx:33-56`）构造节点时只传 `title` 和 `objective`。**
节点的 TS 类型里压根没有 blueprint 这个字段。

⇒ **用户生成完第一课、回到这张「蓝图」页，仍然看不到他刚生成的那份 blueprint。**
⇒ 而这张页面按名字就是用来展示它的。

### D-2 · 大纲阶段的 objective 无兜底 🟡

- 单课阶段：`blueprint.objective.strip() or step.objective`（`blueprint.py:92`）← 模型没给出就退回课程图里的
- 大纲阶段：`objective=lesson.get("objective")`（`free_course_service.py:193`）← **`.get()` 缺键返回 None，直接落库**

⇒ 大纲阶段模型若漏掉某节课的 objective，**没有任何一层会补，也没有任何一层会报**。

⚠️ 这与我在 Free Course 审计里记过的另一处同型：`planner.py` 里的未识别取值
「不产生 note 也不报错」。**静默降级是这个 pipeline 的一贯风险面。**

---

## 5 · 下游消费者

| 消费者 | 用 `objective` | 用 `blueprint` |
|---|---|---|
| 单课 session 生成 | ✅ `blueprint.py:92` 作 fallback | ✅ |
| 白板课 `freecourse_service.py:333-335` | — | ✅ **有真的读取**（`chapter.blueprint_json` → `LessonBlueprint.model_validate`） |
| 蓝图页画布 | ✅ | ❌ |
| 课程详情页 | 待查（未在本次范围内核） | 待查 |

⇒ **白板课那条链是真的在用 blueprint 的**，所以字段不是死字段。

---

## 6 · 复现步骤（本审计用到的 + 还需要你补的）

**已能跑的**
```bash
# 1 · 起库
bash .workbuddy/localdb/pg.sh start          # 必须 run_in_background=true

# 2 · 看库里真实生成的课程有没有 objective（表名已核实：course_chapters）
cd backend && ./.venv/Scripts/python.exe -c "
import asyncio,sys; sys.path.insert(0,'.')
from sqlalchemy import text
from core.database import engine
async def go():
    async with engine.connect() as c:
        t=(await c.execute(text('select count(*) from course_chapters'))).scalar()
        n=(await c.execute(text('select count(*) from course_chapters where objective is not null'))).scalar()
        b=(await c.execute(text('select count(*) from course_chapters where blueprint_json is not null'))).scalar()
        print(f'lessons={t}  有objective={n}  有blueprint={b}')
asyncio.run(go())"
```

⚠️ **一条 SQL 就能回答 U-2**（历史课程的实际填充率）。如果 `有objective` 接近 0，
那 U-1 也就有了答案；如果接近总数，那「objective 是空的」这个前提本身就不成立
—— 我在上一轮正是把它当成了既定事实。

**还需要你补的（我做不到的两步）**
```bash
# 3 · 真跑一次完整生成 —— 需要模型凭证，且必须先 init_ai_runtime()
#    否则报 AIConfigError: AI runtime not initialised（看着像网络不通，其实不是）
#    入口：POST /api/v1/free-courses  → FreeCoursePipeline.run()
#    期望：生成后 course_lessons.objective 非空、blueprint_json 为 null

# 4 · 跑通后看 frontend 那一屏：
#    /preview/free-course-blueprint/preview
#    ⚠️ id 必须是 preview —— mock 的 query key 写死了 'preview'（FreeCourseBlueprintPreviewPage.tsx:30），
#      换成别的 id 就是「加载课程失败」且不提示原因
#    ⚠️ vite preview 只绑 [::1]，用 localhost 会 connection refused
```

---

## 7 · 最小修复建议（**待你评审，本轮未实施**）

| | 改哪 | 改什么 | 为什么这么小 |
|---|---|---|---|
| **D-1** | `FreeCourseBlueprintCanvas` 的节点类型 + `layoutBlueprint` | 节点加可选 `blueprint`；有值时在课节卡下方显示 `prerequisites` / `sequence` 两行 | 字段已经全链路通了，只差前端没读 |
| **D-2** | `free_course_service.py:193` | `objective=lesson.get("objective") or unit_objective(unit)` | 与单课阶段 `blueprint.py:92` 的兜底同型，一行 |

⚠️ **我没有提「新增字段」** —— 因为不需要。`objective` 和 `blueprint` 已经存在、
已经落库、已经序列化。**缺的只是前端没读，以及大纲阶段少一层兜底。**

---

## 8 · 未验证的部分（诚实边界）

| | 什么没验 | 为什么 | 影响 |
|---|---|---|---|
| **U-1** | **真实模型在 map 阶段是否产出 objective** | 需要真跑生成，而本机库半死 + 生成要模型凭证 | 🔴 **这是本审计最大的缺口** —— 我证明了「若模型不产出则静默为 None」，但**没证明模型实际产出与否** |
| **U-2** | 库里历史课程的实际 objective 填充率 | 同上（库起不来） | 🔴 一条 SQL 就能出结论，见 §6 |
| **U-3** | 课程详情页是否消费 blueprint | 不在本次范围内核 | 🟡 |
| **U-4** | 真实生成下 blueprint 页的视觉表现 | 需要真跑 + 登录 | 🟡 我只看了 mock 数据下的那一屏 |

⚠️ **在 U-1 / U-2 出结论之前，不应把「objective 是空的」当成既定事实去改 prompt。**
