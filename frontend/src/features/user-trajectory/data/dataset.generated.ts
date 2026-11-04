// ⚠️ 生成文件，不要手改。来源：docs/research/user-trajectory-lab/synthetic-trajectory-data.json（v0.2）
// 重新生成：node docs/research/user-trajectory-lab/tools/build-prototype-data.mjs
// 文字与数据集一字不改；这里只做了按 id 取子集 + 字段改名。
import type { DevEvent, DevObject, EvidenceRec, InterpretationRec } from '../types'

export const OBJECTS: DevObject[] = [
  {
    "id": "mat-01",
    "kind": "material",
    "title": "哥德尔、艾舍尔、巴赫：集异璧之大成",
    "sub": "Douglas Hofstadter",
    "meta": "book",
    "from": "2026-07-20",
    "to": "2026-08-20",
    "status": "in_progress_stalled"
  },
  {
    "id": "mat-05",
    "kind": "material",
    "title": "为什么：关于因果关系的新科学",
    "sub": "Judea Pearl, Dana Mackenzie",
    "meta": "book",
    "from": "2026-08-12",
    "to": "2026-09-08",
    "status": "completed"
  },
  {
    "id": "mat-07",
    "kind": "material",
    "title": "The Conscious Mind",
    "sub": "David Chalmers",
    "meta": "book",
    "from": "2026-04-09",
    "to": "2026-05-30",
    "status": "in_progress_stalled"
  },
  {
    "id": "mat-12",
    "kind": "material",
    "title": "NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis",
    "sub": "Ben Mildenhall et al.",
    "meta": "paper",
    "from": "2026-01-09",
    "to": "2026-01-26",
    "status": "completed"
  },
  {
    "id": "mat-13",
    "kind": "material",
    "title": "3D Gaussian Splatting for Real-Time Radiance Field Rendering",
    "sub": "Bernhard Kerbl et al.",
    "meta": "paper",
    "from": "2026-01-28",
    "to": "2026-02-10",
    "status": "completed"
  },
  {
    "id": "mat-16",
    "kind": "material",
    "title": "What Is It Like to Be a Bat?",
    "sub": "Thomas Nagel",
    "meta": "paper",
    "from": "2026-03-27",
    "to": "2026-04-02",
    "status": "completed"
  },
  {
    "id": "mat-19",
    "kind": "material",
    "title": "The Consciousness Prior",
    "sub": "Yoshua Bengio",
    "meta": "paper",
    "from": "2026-03-17",
    "to": "2026-09-25",
    "status": "completed"
  },
  {
    "id": "mat-28",
    "kind": "material",
    "title": "Causal Inference in Statistics: An Overview",
    "sub": "Judea Pearl",
    "meta": "paper",
    "from": "2026-09-10",
    "to": "2026-09-14",
    "status": "partial"
  },
  {
    "id": "lx-03",
    "kind": "experience",
    "title": "把 GEB 读完",
    "sub": "读完。就这么简单，没有别的目的",
    "meta": "material_based",
    "from": "2026-07-20",
    "to": null,
    "status": "in_progress_stalled"
  },
  {
    "id": "lx-04",
    "kind": "experience",
    "title": "理解人的意识",
    "sub": "（从未正式写下过）弄清楚'主观体验'这件事能不能被第三人称的描述吃掉",
    "meta": "inquiry_based",
    "from": "2026-03-27",
    "to": null,
    "status": "absorbed_into_output"
  },
  {
    "id": "prj-01",
    "kind": "project",
    "title": "recon-lab · 3D 重建实验台",
    "sub": "从 COLMAP 到神经渲染的一条自建管线。目标是对任意一段手机视频出可看的结果。私人项目，不打算发。",
    "meta": "archived",
    "from": "2026-01-05",
    "to": "2026-05-26",
    "status": "archived"
  },
  {
    "id": "prj-02",
    "kind": "project",
    "title": "毕业设计 · 桌面机械臂抓取",
    "sub": "六自由度桌面臂 + 单目相机的抓取系统。原计划纯视觉方案，因光照不稳改为视觉 + 红外辅助。",
    "meta": "completed",
    "from": "2026-01-05",
    "to": "2026-06-11",
    "status": "completed"
  },
  {
    "id": "prj-03",
    "kind": "project",
    "title": "rename-tool · Rust CLI",
    "sub": "一个批量重命名工具的练习作。只做到 dry-run 分支能打印计划，实际执行没写。",
    "meta": "abandoned",
    "from": "2026-02-05",
    "to": "2026-03-19",
    "status": "abandoned"
  },
  {
    "id": "prj-06",
    "kind": "project",
    "title": "《表征的两种用法》",
    "sub": "一篇想写 6000 字的长文，试图区分'机器学习里的表征'和'认知科学里的表征'，并说清他自己用哪一个。",
    "meta": "ongoing",
    "from": "2026-09-22",
    "to": null,
    "status": "ongoing"
  },
  {
    "id": "prj-07",
    "kind": "project",
    "title": "repr-view · 表征变化可视化",
    "sub": "412 行的 Python 小工具，把训练过程中特征向量的方向变化画成一张图。不追求通用，只对他的数据有用。",
    "meta": "completed_v1",
    "from": "2026-10-08",
    "to": "2026-10-29",
    "status": "completed_v1"
  },
  {
    "id": "out-04",
    "kind": "artifact",
    "title": "毕业设计论文",
    "sub": "38 页。查重 6.2%",
    "meta": "thesis",
    "from": "2026-06-08",
    "to": null,
    "status": "completed"
  },
  {
    "id": "out-09",
    "kind": "artifact",
    "title": "《表征的两种用法》草稿",
    "sub": "v1 3500 字 → 目前 4100 字，第 3 节反复重写",
    "meta": "essay_draft",
    "from": "2026-09-28",
    "to": "2026-11-01",
    "status": "in_progress"
  },
  {
    "id": "out-10",
    "kind": "artifact",
    "title": "repr-view v1",
    "sub": "412 行 + 一页说明。没有发布，放在私有仓",
    "meta": "software_tool",
    "from": "2026-10-29",
    "to": null,
    "status": "released_v1"
  },
  {
    "id": "out-12",
    "kind": "artifact",
    "title": "给某位老师的邮件（未发送）",
    "sub": "问能不能去组里做 RA。写了 600 字，删了又写，最后关掉了",
    "meta": "message_draft",
    "from": "2026-06-14",
    "to": null,
    "status": "never_sent"
  },
  {
    "id": "foc-01",
    "kind": "focus",
    "title": "把一条神经渲染管线自己搭出来",
    "sub": "一段技术建设的视角：不是\"对三维视觉感兴趣\"，而是\"这四个月我在把一条管线从跑不通推到能用\"。它随项目开始，随项目冻结结束。",
    "meta": "closed",
    "from": "2026-01-05",
    "to": "2026-05-26",
    "status": "closed"
  },
  {
    "id": "foc-02",
    "kind": "focus",
    "title": "「表征」这个词在两个领域是不是同一件事",
    "sub": "跨学科提问的视角：不绑任何单个项目，横跨读文献、写笔记、一篇长文和一个小工具。从 2 月第一次注意到这个词开始，到现在还没结束。",
    "meta": "active",
    "from": "2026-02-13",
    "to": null,
    "status": "active"
  },
  {
    "id": "foc-03",
    "kind": "focus",
    "title": "把意识问题的一手文献读完一轮",
    "sub": "一段时间内集中读一类文献的视角：起点是 3-27 的 Nagel，终点是 5-24 读完 Dennett。此后没有新活动，但问题没消失——它被 foc-02 接走了。",
    "meta": "absorbed",
    "from": "2026-03-27",
    "to": "2026-05-24",
    "status": "absorbed"
  },
  {
    "id": "foc-04",
    "kind": "focus",
    "title": "补到能看懂协方差传播的数学",
    "sub": "纯工具性的视角：它对应不到任何一条兴趣。若把 Focus 当成 Interest 的子类，这条就不该存在——这正是它存在的理由。",
    "meta": "closed",
    "from": "2026-01-05",
    "to": "2026-03-21",
    "status": "closed"
  },
  {
    "id": "foc-05",
    "kind": "focus",
    "title": "因果推断：从一本书到能用在案例上",
    "sub": "一次自发的、没有课程外壳的阅读期。9 月短暂独立成线，10 月被写进长文之后就不再单独成立。",
    "meta": "absorbed",
    "from": "2026-08-12",
    "to": "2026-10-05",
    "status": "absorbed"
  },
  {
    "id": "foc-06",
    "kind": "focus",
    "title": "学 Rust 这件事本身",
    "sub": "以\"我要学会 X\"命名的视角，与\"我在做 Y\"相对。它有明确终点（4-20 承认失败），终点之后兴趣 int-07 还活了 135 天才被撤。",
    "meta": "closed",
    "from": "2026-02-03",
    "to": "2026-04-20",
    "status": "closed"
  },
  {
    "id": "foc-07",
    "kind": "focus",
    "title": "把毕设做成能过的东西",
    "sub": "任务型的视角：不来自好奇心，来自一个截止日期和一次答辩。它是全库唯一一条\"不是你选的\"线索。",
    "meta": "closed",
    "from": "2026-01-05",
    "to": "2026-06-11",
    "status": "closed"
  },
  {
    "id": "int-01",
    "kind": "interest",
    "title": "神经渲染与三维重建",
    "sub": "explicit",
    "meta": "weak",
    "from": "2026-01-09",
    "to": null,
    "status": "weak"
  },
  {
    "id": "int-02",
    "kind": "interest",
    "title": "表征（representation）——它在这两个领域指的是同一件事吗",
    "sub": "inferred_then_confirmed",
    "meta": "core",
    "from": "2026-02-13",
    "to": null,
    "status": "core"
  },
  {
    "id": "int-03",
    "kind": "interest",
    "title": "意识研究",
    "sub": "explicit",
    "meta": "active",
    "from": "2026-03-27",
    "to": null,
    "status": "active"
  },
  {
    "id": "int-04",
    "kind": "interest",
    "title": "因果推断",
    "sub": "inferred",
    "meta": "emerging",
    "from": "2026-08-12",
    "to": null,
    "status": "emerging · 未确认"
  },
  {
    "id": "int-06",
    "kind": "interest",
    "title": "数学基础与形式化",
    "sub": "implicit",
    "meta": "dormant",
    "from": "2026-01-05",
    "to": null,
    "status": "dormant · 未确认"
  },
  {
    "id": "int-07",
    "kind": "interest",
    "title": "系统编程（Rust 方向）",
    "sub": "explicit",
    "meta": "retired",
    "from": "2026-02-03",
    "to": null,
    "status": "retired"
  },
  {
    "id": "goal-02",
    "kind": "goal",
    "title": "三月前用 Rust 写一个能用的命令行工具",
    "sub": "short_term",
    "meta": "abandoned",
    "from": "2026-02-03",
    "to": "2026-03-31",
    "status": "abandoned"
  },
  {
    "id": "goal-05",
    "kind": "goal",
    "title": "把 recon-lab 的多视角一致性做出来，投一篇 workshop",
    "sub": "short_term",
    "meta": "abandoned",
    "from": "2026-03-20",
    "to": "2026-08-31",
    "status": "abandoned"
  },
  {
    "id": "goal-07",
    "kind": "goal",
    "title": "写完《表征的两种用法》，6000 字",
    "sub": "short_term",
    "meta": "active",
    "from": "2026-09-22",
    "to": "2026-10-15",
    "status": "active"
  }
]

export const EVENTS: DevEvent[] = [
  {
    "id": "act-004",
    "parentId": "pe-01",
    "kind": "learning",
    "type": "reading",
    "date": "2026-01-09",
    "time": "22:00",
    "title": "第一次精读 NeRF，边读边查体渲染",
    "detail": "读到第 4 节时放弃当天继续",
    "objectIds": [
      "mat-12"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-011",
    "parentId": "pe-01",
    "kind": "research",
    "type": "experiment",
    "date": "2026-01-22",
    "time": "02:15",
    "title": "第一次训练，输出全黑，loss 卡在 0.6",
    "detail": "怀疑是坐标系问题，但不确定",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-013",
    "parentId": "pe-01",
    "kind": "creation",
    "type": "coding",
    "date": "2026-01-26",
    "time": "18:40",
    "title": "找到坐标变换的一个转置错误，图像正常了",
    "detail": "只改了一行",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-015",
    "parentId": "pe-01",
    "kind": "research",
    "type": "experiment",
    "date": "2026-01-30",
    "time": "01:50",
    "title": "跑到 30k iter，出了第一张能看的图",
    "detail": "截图发给室友，说'成了'",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [
      "ev-04"
    ],
    "origin": "observed"
  },
  {
    "id": "act-016",
    "parentId": "pe-01",
    "kind": "creation",
    "type": "creating",
    "date": "2026-01-31",
    "time": "14:00",
    "title": "写第一篇实验报告，8 页，含失败记录",
    "detail": "报告里把三次失败都写进去了",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-062",
    "parentId": "pe-01",
    "kind": "research",
    "type": "experiment",
    "date": "2026-05-09",
    "time": "01:30",
    "title": "多视角一致性失败，换个角度就崩",
    "detail": "这是它死掉的地方",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-067",
    "parentId": "pe-01",
    "kind": "creation",
    "type": "coding",
    "date": "2026-05-22",
    "time": "23:00",
    "title": "recon-lab v0.3，最后一次改动",
    "detail": "没有解决任何核心问题，只是整理代码",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-069",
    "parentId": "pe-01",
    "kind": "reflection",
    "type": "reflecting",
    "date": "2026-05-26",
    "time": "18:00",
    "title": "给 recon-lab 写 README，注明'暂停，不是放弃'",
    "detail": "6-22 系统据此判为 stalled，后被用户纠正",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-042",
    "parentId": "pe-02",
    "kind": "learning",
    "type": "reading",
    "date": "2026-03-27",
    "time": "20:00",
    "title": "读 Nagel《成为一只蝙蝠是什么感觉》",
    "detail": "读完坐在那儿没动",
    "objectIds": [
      "mat-16",
      "lx-04"
    ],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-046",
    "parentId": "pe-02",
    "kind": "learning",
    "type": "discussion",
    "date": "2026-04-04",
    "time": "22:30",
    "title": "和朋友吵了两个小时：现在的模型有没有主观体验",
    "detail": "谁也没说服谁。他把这段争论记下来了",
    "objectIds": [
      "lx-04"
    ],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-049",
    "parentId": "pe-02",
    "kind": "learning",
    "type": "reading",
    "date": "2026-04-09",
    "time": "20:00",
    "title": "读 Chalmers《直面意识问题》",
    "detail": "",
    "objectIds": [
      "lx-04"
    ],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-051",
    "parentId": "pe-02",
    "kind": "reflection",
    "type": "note",
    "date": "2026-04-12",
    "time": "23:00",
    "title": "笔记：困难问题可以拆成三层——为什么有体验、为什么是这个体验、为什么有统一性",
    "detail": "ins-02 的证据之一",
    "objectIds": [],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-059",
    "parentId": "pe-02",
    "kind": "creation",
    "type": "creating",
    "date": "2026-05-02",
    "time": "21:00",
    "title": "不看原文，用自己的话复述困难问题与容易问题的区别",
    "detail": "写了两页，逻辑是完整的",
    "objectIds": [
      "mat-16"
    ],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [
      "ev-08"
    ],
    "origin": "observed"
  },
  {
    "id": "act-066",
    "parentId": "pe-02",
    "kind": "learning",
    "type": "reading",
    "date": "2026-05-20",
    "time": "21:00",
    "title": "Dennett 回应 Chalmers 的那篇，读一半",
    "detail": "第 4 节看不懂",
    "objectIds": [],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-106",
    "parentId": "pe-03",
    "kind": "learning",
    "type": "reading",
    "date": "2026-06-04",
    "time": "08:40",
    "title": "翻三篇同方向的学位论文，只看第四章怎么组织",
    "detail": "两篇是师兄的，一篇从网上找的",
    "objectIds": [
      "out-04"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-107",
    "parentId": "pe-03",
    "kind": "creation",
    "type": "coding",
    "date": "2026-06-04",
    "time": "10:20",
    "title": "重跑结果表，发现 62% 那组用的是旧脚本",
    "detail": "重跑出来是 58%，两个数都要改",
    "objectIds": [
      "prj-02"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-109",
    "parentId": "pe-03",
    "kind": "creation",
    "type": "creating",
    "date": "2026-06-04",
    "time": "15:10",
    "title": "写第 3 章系统设计，1800 字",
    "detail": "",
    "objectIds": [
      "out-04"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-112",
    "parentId": "pe-03",
    "kind": "research",
    "type": "experiment",
    "date": "2026-06-04",
    "time": "23:50",
    "title": "消融跑完，51%，但只有 12 次试验",
    "detail": "主实验是 60 次，这一组只跑了 12 次就停了",
    "objectIds": [
      "prj-02"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [
      "ev-22"
    ],
    "origin": "observed"
  },
  {
    "id": "act-119",
    "parentId": "pe-03",
    "kind": "reflection",
    "type": "reflecting",
    "date": "2026-06-05",
    "time": "21:30",
    "title": "决定不报消融，改写成 limitations 里的一句话",
    "detail": "这是他这次唯一一次主动砍掉自己做的实验",
    "objectIds": [
      "out-04"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [
      "ev-22"
    ],
    "origin": "observed"
  },
  {
    "id": "act-121",
    "parentId": "pe-03",
    "kind": "learning",
    "type": "reading",
    "date": "2026-06-06",
    "time": "08:30",
    "title": "翻 NeRF 的 evaluation 一节，想抄它的指标写法",
    "detail": "",
    "objectIds": [
      "mat-12"
    ],
    "focusIds": [
      "foc-07",
      "foc-02"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-122",
    "parentId": "pe-03",
    "kind": "reflection",
    "type": "note",
    "date": "2026-06-06",
    "time": "10:40",
    "title": "笔记：我的任务和 NeRF 不是一类问题，指标不能照搬",
    "detail": "一页纸，写了两条理由",
    "objectIds": [
      "mat-12"
    ],
    "focusIds": [
      "foc-07",
      "foc-02"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-126",
    "parentId": "pe-03",
    "kind": "learning",
    "type": "discussion",
    "date": "2026-06-06",
    "time": "20:40",
    "title": "让 AI 改摘要，改了七版",
    "detail": "七版里最后用的还是第二版。这条不属于任何线索——它只是个工具动作",
    "objectIds": [],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-128",
    "parentId": "pe-03",
    "kind": "creation",
    "type": "creating",
    "date": "2026-06-07",
    "time": "09:00",
    "title": "写第 5 章结论，卡住，只写了 300 字",
    "detail": "",
    "objectIds": [
      "out-04"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-132",
    "parentId": "pe-03",
    "kind": "learning",
    "type": "discussion",
    "date": "2026-06-07",
    "time": "19:00",
    "title": "和室友吃饭，两小时没干活",
    "detail": "这段时间他没有任何记录",
    "objectIds": [],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-133",
    "parentId": "pe-03",
    "kind": "creation",
    "type": "creating",
    "date": "2026-06-07",
    "time": "21:30",
    "title": "通宵改格式，改到凌晨两点四十",
    "detail": "",
    "objectIds": [
      "out-04"
    ],
    "focusIds": [
      "foc-07"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-134",
    "parentId": "pe-03",
    "kind": "reflection",
    "type": "reflecting",
    "date": "2026-06-08",
    "time": "02:40",
    "title": "合完初稿第一遍，觉得这篇东西跟我想做的没关系",
    "detail": "三天后答辩，他没跟任何人说这句话",
    "objectIds": [
      "out-04"
    ],
    "focusIds": [
      "foc-07",
      "foc-02"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-075",
    "parentId": "pe-04",
    "kind": "learning",
    "type": "reading",
    "date": "2026-07-20",
    "time": "20:00",
    "title": "从书架上拿起 GEB，读了前两章",
    "detail": "没有任何目标",
    "objectIds": [
      "mat-01",
      "lx-03"
    ],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-076",
    "parentId": "pe-04",
    "kind": "learning",
    "type": "reading",
    "date": "2026-07-26",
    "time": "21:30",
    "title": "GEB 第 6 章，关于形式系统与意义",
    "detail": "",
    "objectIds": [
      "mat-01"
    ],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-080",
    "parentId": "pe-04",
    "kind": "learning",
    "type": "reading",
    "date": "2026-08-20",
    "time": "22:00",
    "title": "GEB 第 11 章，卡在命题演算，停了",
    "detail": "到今天还是 38%",
    "objectIds": [
      "mat-01",
      "lx-03"
    ],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-078",
    "parentId": "pe-05",
    "kind": "learning",
    "type": "reading",
    "date": "2026-08-12",
    "time": "20:00",
    "title": "翻开《为什么》，读了前三章",
    "detail": "后面隔了三周才继续",
    "objectIds": [
      "mat-05"
    ],
    "focusIds": [
      "foc-05"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-085",
    "parentId": "pe-05",
    "kind": "learning",
    "type": "reading",
    "date": "2026-09-08",
    "time": "21:00",
    "title": "把《为什么》读完",
    "detail": "读完但做不出题",
    "objectIds": [
      "mat-05"
    ],
    "focusIds": [
      "foc-05"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-086",
    "parentId": "pe-05",
    "kind": "learning",
    "type": "reading",
    "date": "2026-09-10",
    "time": "20:00",
    "title": "Pearl 那篇综述，backdoor 一节反复看",
    "detail": "",
    "objectIds": [
      "mat-28"
    ],
    "focusIds": [
      "foc-05"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-088",
    "parentId": "pe-05",
    "kind": "reflection",
    "type": "note",
    "date": "2026-09-15",
    "time": "23:00",
    "title": "因果笔记：把一个相关性结论写成了因果结论",
    "detail": "10-02 自己回头重写",
    "objectIds": [
      "mat-05"
    ],
    "focusIds": [
      "foc-05"
    ],
    "evidenceIds": [
      "ev-12"
    ],
    "origin": "observed"
  },
  {
    "id": "act-093",
    "parentId": "pe-05",
    "kind": "creation",
    "type": "creating",
    "date": "2026-10-02",
    "time": "22:00",
    "title": "重写 9-15 那份因果笔记，把结论降级成相关",
    "detail": "自己发现的，没人提醒",
    "objectIds": [],
    "focusIds": [
      "foc-05"
    ],
    "evidenceIds": [
      "ev-12"
    ],
    "origin": "observed"
  },
  {
    "id": "act-094",
    "parentId": "pe-05",
    "kind": "research",
    "type": "problem",
    "date": "2026-10-05",
    "time": "20:00",
    "title": "用 backdoor 判据分析一个推荐系统的偏差案例",
    "detail": "新情境，自己找的案例",
    "objectIds": [
      "mat-28"
    ],
    "focusIds": [
      "foc-02",
      "foc-05"
    ],
    "evidenceIds": [
      "ev-13"
    ],
    "origin": "observed"
  },
  {
    "id": "act-001",
    "parentId": null,
    "kind": "learning",
    "type": "reading",
    "date": "2026-01-05",
    "time": "21:10",
    "title": "开始读 Axler 第 1 章，只看了向量空间的定义",
    "detail": "无产出",
    "objectIds": [],
    "focusIds": [
      "foc-04"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-037",
    "parentId": null,
    "kind": "learning",
    "type": "reading",
    "date": "2026-03-17",
    "time": "20:30",
    "title": "读 Bengio 的 Consciousness Prior",
    "detail": "第一次看到有人把'意识'和'表征学习'写在同一篇里",
    "objectIds": [
      "mat-19"
    ],
    "focusIds": [
      "foc-02"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-040",
    "parentId": null,
    "kind": "research",
    "type": "problem",
    "date": "2026-03-21",
    "time": "14:00",
    "title": "回头重做 Axler 第 5 章，把相似与合同的分野弄清了",
    "detail": "相隔两个月，是同一错误的第二次测试",
    "objectIds": [],
    "focusIds": [
      "foc-04"
    ],
    "evidenceIds": [
      "ev-02"
    ],
    "origin": "observed"
  },
  {
    "id": "act-055",
    "parentId": null,
    "kind": "reflection",
    "type": "reflecting",
    "date": "2026-04-20",
    "time": "22:40",
    "title": "承认 Rust 那个目标失败了，写'我其实不需要它'",
    "detail": "归因可疑：真实原因是毕设占了全部时间",
    "objectIds": [
      "goal-02"
    ],
    "focusIds": [
      "foc-06"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-091",
    "parentId": null,
    "kind": "learning",
    "type": "reading",
    "date": "2026-09-25",
    "time": "21:00",
    "title": "第二次读 Consciousness Prior，这次做笔记",
    "detail": "第二次读出来的东西和第一次不一样",
    "objectIds": [
      "mat-19"
    ],
    "focusIds": [
      "foc-02"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-092",
    "parentId": null,
    "kind": "creation",
    "type": "creating",
    "date": "2026-09-28",
    "time": "23:30",
    "title": "长文第一版，3500 字，比自定日期晚三天",
    "detail": "朋友指出第二处把两种用法又混了",
    "objectIds": [
      "out-09",
      "prj-06"
    ],
    "focusIds": [
      "foc-02"
    ],
    "evidenceIds": [
      "ev-10"
    ],
    "origin": "observed"
  },
  {
    "id": "act-095",
    "parentId": null,
    "kind": "creation",
    "type": "coding",
    "date": "2026-10-08",
    "time": "21:00",
    "title": "开始写 repr-view，目标是把特征向量的变化画出来",
    "detail": "",
    "objectIds": [
      "prj-07"
    ],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-096",
    "parentId": null,
    "kind": "creation",
    "type": "coding",
    "date": "2026-10-10",
    "time": "23:00",
    "title": "repr-view 第一版可视化能跑了，很丑",
    "detail": "",
    "objectIds": [
      "prj-07"
    ],
    "focusIds": [],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "act-102",
    "parentId": null,
    "kind": "creation",
    "type": "coding",
    "date": "2026-10-29",
    "time": "18:00",
    "title": "repr-view v1 完成，412 行，写了说明文档",
    "detail": "十个月里第一个'说做完就做完'的东西",
    "objectIds": [
      "prj-07",
      "out-10"
    ],
    "focusIds": [],
    "evidenceIds": [
      "ev-17"
    ],
    "origin": "observed"
  },
  {
    "id": "act-135",
    "parentId": null,
    "kind": "research",
    "type": "problem",
    "date": "2026-10-24",
    "time": "21:20",
    "title": "关掉论文，试着把 3DGS 的光栅化讲一遍",
    "detail": "自己给自己出的题，没有人听",
    "objectIds": [
      "mat-13"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [
      "ev-21"
    ],
    "origin": "observed"
  },
  {
    "id": "tr-goal-02",
    "parentId": null,
    "kind": "direction",
    "type": "abandon",
    "date": "2026-04-20",
    "time": "",
    "title": "放弃「三月前用 Rust 写一个能用的命令行工具」",
    "detail": "截止日过了 20 天才承认。他写的理由是「我其实不需要它」。",
    "objectIds": [
      "goal-02",
      "prj-03"
    ],
    "focusIds": [
      "foc-06"
    ],
    "evidenceIds": [
      "ev-16"
    ],
    "origin": "observed"
  },
  {
    "id": "tr-int-07",
    "parentId": null,
    "kind": "direction",
    "type": "retire",
    "date": "2026-09-02",
    "time": "",
    "title": "不再把自己当作「Rust 工程师」",
    "detail": "被否的是那个身份框，不是「他学过 Rust」。",
    "objectIds": [
      "int-07"
    ],
    "focusIds": [
      "foc-06"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "tr-prj-01",
    "parentId": null,
    "kind": "direction",
    "type": "archive",
    "date": "2026-05-26",
    "time": "",
    "title": "recon-lab 冻结，README 写「暂停，不是放弃」",
    "detail": "6-22 系统据此判为已停止，6-24 用户更正。",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "tr-goal-05",
    "parentId": null,
    "kind": "direction",
    "type": "abandon",
    "date": "2026-09-01",
    "time": "",
    "title": "关掉「投一篇 workshop」这个目标",
    "detail": "项目 5 月就死了，目标拖了 97 天才关。",
    "objectIds": [
      "goal-05"
    ],
    "focusIds": [
      "foc-01"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "tr-foc-03",
    "parentId": null,
    "kind": "direction",
    "type": "absorb",
    "date": "2026-05-24",
    "time": "",
    "title": "「意识一手文献」并入「表征」这条线",
    "detail": "被吸收不等于失败；名下 10 条活动一条也没有迁移。",
    "objectIds": [
      "foc-03",
      "foc-02"
    ],
    "focusIds": [
      "foc-03"
    ],
    "evidenceIds": [],
    "origin": "observed"
  },
  {
    "id": "ms-01",
    "parentId": null,
    "kind": "milestone",
    "type": "milestone",
    "date": "2026-01-30",
    "time": "",
    "title": "第一次出可看的重建结果",
    "detail": "",
    "objectIds": [
      "prj-01"
    ],
    "focusIds": [],
    "evidenceIds": [
      "ev-04"
    ],
    "origin": "observed"
  },
  {
    "id": "ms-05",
    "parentId": null,
    "kind": "milestone",
    "type": "milestone",
    "date": "2026-06-11",
    "time": "",
    "title": "毕设答辩通过",
    "detail": "",
    "objectIds": [
      "prj-02"
    ],
    "focusIds": [],
    "evidenceIds": [
      "ev-09"
    ],
    "origin": "observed"
  },
  {
    "id": "ms-08",
    "parentId": null,
    "kind": "milestone",
    "type": "milestone",
    "date": "2026-10-29",
    "time": "",
    "title": "repr-view v1 定版",
    "detail": "",
    "objectIds": [
      "prj-07"
    ],
    "focusIds": [],
    "evidenceIds": [
      "ev-17"
    ],
    "origin": "observed"
  },
  {
    "id": "ms-09",
    "parentId": null,
    "kind": "milestone",
    "type": "milestone",
    "date": "2026-09-28",
    "time": "",
    "title": "长文第一版 3500 字",
    "detail": "",
    "objectIds": [
      "prj-06"
    ],
    "focusIds": [],
    "evidenceIds": [
      "ev-10"
    ],
    "origin": "observed"
  }
]

export const EVIDENCE: EvidenceRec[] = [
  {
    "id": "ev-03",
    "kind": "reasoning",
    "rawKind": "independent_reasoning",
    "date": "2026-01-24",
    "observed": "未查资料，独立把体渲染的离散化求和式推出来，包括透射率的连乘形式",
    "verdict": "supported",
    "supports": "能把连续积分转成可实现的离散形式；愿意先自己想",
    "notSupport": "漏了按深度排序这一近似，说明对'为什么求和顺序重要'还没意识",
    "limitation": "论文里已有答案，独立性与'首次提出'不是一回事",
    "confidence": "moderate",
    "by": "user",
    "activityId": "act-012"
  },
  {
    "id": "ev-06",
    "kind": "behavioral",
    "rawKind": "problem_solving",
    "date": "2026-02-08",
    "observed": "定位到 loss 不降的原因是高斯尺度初始化过大，改初始化与学习率后收敛",
    "verdict": "supported",
    "supports": "能在失败中定位参数层面的原因",
    "notSupport": "不完全是独立推理——他先读了 issue #214（act-020）才知道看初始化",
    "limitation": "⚠️ 他后来对别人描述成'我自己定位的'。这条证据的独立性被记录本身修正了",
    "confidence": "moderate",
    "by": "agent",
    "activityId": "act-021"
  },
  {
    "id": "ev-08",
    "kind": "reasoning",
    "rawKind": "explanation",
    "date": "2026-05-02",
    "observed": "不看原文，用两页纸复述困难问题与容易问题的区别，并给出自己的反驳（'如果功能主义对，那我也可以说蝙蝠的体验是它的功能状态'）",
    "verdict": "supported",
    "supports": "理解了这个区分，并且能在其上做推理",
    "notSupport": "不支持'读懂了 Chalmers 的论证链'——他跳过了第 4 章的模态论证",
    "limitation": "没有第三方评判；'理解'与'复述得漂亮'难分",
    "confidence": "moderate",
    "by": "user",
    "activityId": "act-059"
  },
  {
    "id": "ev-10",
    "kind": "reasoning",
    "rawKind": "explanation",
    "date": "2026-09-28",
    "observed": "长文里把'表征'分成'作为内部状态的表征'与'作为可操作对象的表征'两种用法，并给了三个例子",
    "verdict": "partially_supported",
    "supports": "能自己造一个有用的区分，并用例子撑住",
    "notSupport": "第二处用法又混了；朋友指出后他自己也承认",
    "limitation": "区分是他自己造的，没有跟文献里的既有区分对齐——这既可能是原创，也可能是没读够",
    "confidence": "moderate",
    "by": "user",
    "activityId": "act-092"
  },
  {
    "id": "ev-14",
    "kind": "behavioral",
    "rawKind": "conversation",
    "date": "2026-04-13",
    "observed": "四轮问答后答'我不知道'，没有可挂载的知识点",
    "verdict": "ungradable",
    "supports": "无",
    "notSupport": "无。不可评分不等于不会",
    "limitation": "⚠️ 样本：这类记录在轨迹里既不该显示为进步，也不该显示为退步。它应该显示为'这次没测出来'",
    "confidence": "unknown",
    "by": "agent",
    "activityId": "act-052"
  },
  {
    "id": "ev-17",
    "kind": "artifact",
    "rawKind": "project_based",
    "date": "2026-10-29",
    "observed": "repr-view v1：412 行，把 30 个 token 的特征向量方向变化画成一张图；写了说明文档",
    "verdict": "supported",
    "supports": "能把一个抽象概念转成可看的实现；这次是完整交付",
    "notSupport": "不支持'理解了表征'——工具画的是向量，不是表征本身",
    "limitation": "只对他的数据有效，没有测试，没有用户",
    "confidence": "moderate",
    "by": "user",
    "activityId": "act-102"
  },
  {
    "id": "ev-18",
    "kind": "self-report",
    "rawKind": "self_report",
    "date": "2026-10-31",
    "observed": "用户说：'我现在能读懂 NeRF 那类论文了，基本不用查'",
    "verdict": "not_evidence",
    "supports": "这是他对自己的一句陈述（A 类），不是能力证据",
    "notSupport": "⚠️ 不能据此改状态。要证明它，需要一篇他没读过的同类论文的独立理解测试，全库没有",
    "limitation": "样本：这条记录存在的意义就是演示'用户声明 ≠ 证据'。UI 里它应该长得和 ev-03 完全不一样",
    "confidence": "unknown",
    "by": "user",
    "activityId": null
  },
  {
    "id": "ev-19",
    "kind": "artifact",
    "rawKind": "project_based",
    "date": "2026-06-06",
    "observed": "换第二组光照复测，成功率 78% 保持；只换了灯，物体仍是原来那 6 个",
    "verdict": "partially_supported",
    "supports": "该成功率在光照变化下稳定",
    "notSupport": "对没见过的物体成立；对更小的物体成立",
    "limitation": "只变了一个因素。样本 6 个物体 × 60 次",
    "confidence": "moderate",
    "by": "agent",
    "activityId": "act-124"
  },
  {
    "id": "ev-21",
    "kind": "performance",
    "rawKind": "self_test",
    "date": "2026-10-24",
    "observed": "关掉论文口述 3DGS 光栅化：说出两步，第三步把\"按深度排序\"说成\"按重要性排序\"",
    "verdict": "inconclusive",
    "supports": "记住了流程的大致形状",
    "notSupport": "不能判定是理解还是记忆——他三周前刚重读过一次",
    "limitation": "⚠️ 这是对 ev-18 那句\"我能读懂 NeRF 类论文了\"唯一一次可查的检验，结果不确定。它既不能证明也不能推翻那句话",
    "confidence": "unknown",
    "by": "agent",
    "activityId": "act-135"
  },
  {
    "id": "ev-22",
    "kind": "behavioral",
    "rawKind": "process",
    "date": "2026-06-05",
    "observed": "计划三组消融，只跑了一组；那一组 12 次试验，主实验是 60 次",
    "verdict": "unsupported",
    "supports": "截止压力下会削减验证性工作",
    "notSupport": "不能说明他不知道该做——他当天问过 AI 要几组",
    "limitation": "只有一次；也可能是时间真的不够",
    "confidence": "moderate",
    "by": "agent",
    "activityId": "act-112"
  },
  {
    "id": "ev-23",
    "kind": "artifact",
    "rawKind": "output_attempt",
    "date": "2026-10-31",
    "observed": "长文第 3 节写了 800 字，全删，改成重写开头",
    "verdict": "inconclusive",
    "supports": "他在反复改写同一段，而不是往下扩张",
    "notSupport": "不能说明产出增加或减少",
    "limitation": "一次删除不能构成\"写作受阻\"的证据",
    "confidence": "low",
    "by": "agent",
    "activityId": "act-103"
  },
  {
    "id": "ev-24",
    "kind": "artifact",
    "rawKind": "project_based",
    "date": "2026-10-29",
    "observed": "repr-view v1 附了 3 个自测用例，其中一个是故意会失败的",
    "verdict": "supported",
    "supports": "这次交付包含了验证",
    "notSupport": "不能说明他改变了习惯——只有一个项目这样做过",
    "limitation": "没有 CI，没有第二个使用者",
    "confidence": "moderate",
    "by": "agent",
    "activityId": "act-102"
  },
  {
    "id": "ev-25",
    "kind": "behavioral",
    "rawKind": "conversation",
    "date": "2026-06-04",
    "observed": "在 Lemma 里问\"消融最少要几组\"，AI 给了三条标准，他一条也没用，也没说为什么",
    "verdict": "inconclusive",
    "supports": "无",
    "notSupport": "无",
    "limitation": "⚠️ 这条证据不服务任何解释，故意不挂任何 insight。它存在的意义是证明\"证据可以独立存在\"",
    "confidence": "unknown",
    "by": "agent",
    "activityId": "act-110"
  }
]

export const INTERPRETATIONS: InterpretationRec[] = [
  {
    "id": "ins-01",
    "epistemic": "confirmed",
    "assertedBy": "user",
    "date": "2026-03-08",
    "statement": "'表征'这个词，我在做 3D 的时候指的是网络的中间输出，在读认知科学的时候指的是心智里的东西。这两个不是一回事，但我一直在当成一回事用。",
    "confidence": null,
    "status": "authored_by_user",
    "supports": [],
    "contradicts": [],
    "qualifies": [],
    "weakens": [],
    "objectIds": [
      "mat-12",
      "int-02"
    ],
    "eventIds": [],
    "basis": "",
    "note": "全库最重要的一条。它是后面 prj-06 那篇长文的种子，也是 int-02 从'系统推断'变成'用户确认'的那一刻",
    "effectiveFrom": "2026-03-08",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ins-02",
    "epistemic": "interpretation",
    "assertedBy": "system",
    "date": "2026-04-12",
    "statement": "你在 3 个月里的 7 次讨论中反复回到同一个问题：智能是不是必须先有某种内部表征。跨机器学习和认知科学两边。",
    "confidence": "moderate",
    "status": "unreviewed",
    "supports": [
      "ev-03",
      "ev-08"
    ],
    "contradicts": [],
    "qualifies": [],
    "weakens": [],
    "objectIds": [
      "mat-12",
      "mat-19",
      "int-02"
    ],
    "eventIds": [
      "act-051"
    ],
    "basis": "5 条记录跨 3 个月，且有用户自己写下的同名笔记",
    "note": "系统生成的。措辞里'7 次'其实是 5 条记录——这个数字写错了，保留它是为了演示系统观察也可能不准",
    "effectiveFrom": "2026-04-12",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ins-04",
    "epistemic": "interpretation",
    "assertedBy": "system",
    "date": "2026-05-20",
    "statement": "系统观察到：你的课程型学习完成率明显低于项目型投入。认知科学导论 9/24 停，李宏毅 4/14 停，Rust 停在第 11 章；而两个项目都推进到了可交付状态。",
    "confidence": "moderate",
    "status": "rejected",
    "supports": [
      "ev-16",
      "ev-04"
    ],
    "contradicts": [],
    "qualifies": [],
    "weakens": [],
    "objectIds": [],
    "eventIds": [
      "act-062"
    ],
    "basis": "三门课 vs 两个项目的完成情况",
    "note": "⚠️ 用户的反驳是对的。系统把'时间冲突'当成了'偏好'。这条保留下来，作为一次被正确否决的推断",
    "effectiveFrom": "2026-05-20",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ins-07",
    "epistemic": "interpretation",
    "assertedBy": "system",
    "date": "2026-10-18",
    "statement": "9 月以后，你的阅读量与写作量之比从大约 12:1 变成了 3:1。你开始花时间改写自己写的东西，而不只是读新的。",
    "confidence": "moderate",
    "status": "unreviewed",
    "supports": [
      "ev-10",
      "ev-17"
    ],
    "contradicts": [],
    "qualifies": [
      "ev-23"
    ],
    "weakens": [
      "ev-20"
    ],
    "objectIds": [
      "prj-06",
      "prj-07"
    ],
    "eventIds": [
      "act-092",
      "act-093"
    ],
    "basis": "活动类型分布的变化，跨 6 周",
    "note": "系统唯一一条正面观察。但它说的'改写'只有两处，样本很薄",
    "effectiveFrom": "2026-10-18",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ins-08",
    "epistemic": "confirmed",
    "assertedBy": "user",
    "date": "2026-10-25",
    "statement": "我写的这篇其实不是在综述，我是在给'表征'找一个我自己的定义。所以我每次都写不下去——因为我在造东西，不是在总结。",
    "confidence": null,
    "status": "authored_by_user",
    "supports": [
      "ev-20",
      "ev-10"
    ],
    "contradicts": [],
    "qualifies": [],
    "weakens": [],
    "objectIds": [
      "prj-06",
      "out-09",
      "int-02"
    ],
    "eventIds": [
      "act-091"
    ],
    "basis": "",
    "note": "这条之后他的写作方式变了：10-31 那 800 字是重写的，不是续写的",
    "effectiveFrom": "2026-10-25",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ins-11",
    "epistemic": "confirmed",
    "assertedBy": "user",
    "date": "2026-08-28",
    "statement": "这半年我什么都没做成。",
    "confidence": null,
    "status": "authored_by_user",
    "supports": [
      "ev-09",
      "ev-16"
    ],
    "contradicts": [],
    "qualifies": [],
    "weakens": [],
    "objectIds": [],
    "eventIds": [],
    "basis": "",
    "note": "⭐ 用户自评与记录直接冲突。系统不该纠正他，也不该附和他。两个版本都摆在时间轴上，让冲突可见",
    "effectiveFrom": "2026-08-28",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ins-12",
    "epistemic": "interpretation",
    "assertedBy": "system",
    "date": "2026-06-08",
    "statement": "在截止日期压力下，你会先砍验证性的工作，留下展示性的工作：三组消融只跑了一组，评估脚本重构到一半，但摘要改了七版。",
    "confidence": "moderate",
    "status": "unreviewed",
    "supports": [
      "ev-22"
    ],
    "contradicts": [],
    "qualifies": [],
    "weakens": [
      "ev-19",
      "ev-24"
    ],
    "objectIds": [
      "prj-02",
      "out-04"
    ],
    "eventIds": [
      "act-106",
      "act-112",
      "act-119"
    ],
    "basis": "同一周四条活动呈现同一模式",
    "note": "⭐ 这是\"解释随新证据变化\"的样本。旧版本没有被删掉：effective_to 停在 10-29，新范围写在 reinterpretation 里",
    "effectiveFrom": "2026-06-08",
    "effectiveTo": "2026-10-29",
    "reinterpretedAt": "2026-10-29",
    "reinterpretation": "10-29 出现新证据（ev-24：repr-view 附了自测用例，含一个故意会失败的）。句子本身没错，但适用范围从\"截止压力下\"收窄到\"外部截止压力下\"——他自己定的截止日（长文）没有出现同样的削减，反而是反复改写。"
  },
  {
    "id": "ins-13",
    "epistemic": "interpretation",
    "assertedBy": "system",
    "date": "2026-10-30",
    "statement": "5 月 22 日之后，你在神经渲染这条线上没有任何投入：87 次提交停在 5-22，此后四个月零提交、零相关活动。",
    "confidence": "high",
    "status": "unreviewed",
    "supports": [],
    "contradicts": [
      "ev-17",
      "ev-24"
    ],
    "qualifies": [],
    "weakens": [],
    "objectIds": [
      "prj-07"
    ],
    "eventIds": [
      "act-095",
      "act-102",
      "act-135"
    ],
    "basis": "提交历史与活动计数一致",
    "note": "⭐ 高置信，且部分错误。repr-view 用的正是 3D 数据与特征向量（ev-17、ev-24），10-24 还有一次自测（ev-21）。系统把\"没有提交到那个仓库\"当成了\"没有投入\"。用户从未审阅，矛盾保留在原处。",
    "effectiveFrom": "2026-10-30",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  },
  {
    "id": "ev-18",
    "epistemic": "hypothesis",
    "assertedBy": "user",
    "date": "2026-10-31",
    "statement": "'我现在能读懂 NeRF 那类论文了，基本不用查'",
    "confidence": null,
    "status": "unreviewed",
    "supports": [],
    "contradicts": [],
    "qualifies": [],
    "weakens": [],
    "objectIds": [
      "mat-12",
      "mat-13"
    ],
    "eventIds": [],
    "basis": "",
    "note": "他自己说的，没有任何检验。唯一一次可查的检验是 ev-21，结果不确定。",
    "effectiveFrom": "2026-10-31",
    "effectiveTo": null,
    "reinterpretedAt": null,
    "reinterpretation": ""
  }
]
