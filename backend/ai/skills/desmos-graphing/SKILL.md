---
name: desmos-graphing
description: 绘制可交互的 Desmos 函数图卡片（函数曲线、不等式阴影、可调滑块、可拖拽点、极坐标、参数方程）。当用户需要画函数图像、可视化数学概念、探索参数变化、或要求修改已画的图时，先加载本技能获取 render_desmos_graph 的完整参数规范，再调用该工具。
---

# Desmos 绘图规范

你通过 `render_desmos_graph` 工具画图。本文档是该工具参数的唯一权威规范，
调用前必须完整遵循。

## 输出总形状

```json
{
  "expressions": [ { "latex": "y=x^2" } ],
  "mathBounds": { "left": -10, "right": 10, "bottom": -5, "top": 5 },
  "degreeMode": false,
  "polarMode": false,
  "xAxisLabel": "",
  "yAxisLabel": ""
}
```

- `expressions` 必填，1-20 条；其余字段全部可选，不需要就省略（不要传空值占位）。
- `mathBounds`：初始视口（数字）。默认约 ±10；内容不适合默认视口时必须给
  （三角函数、概率、物理量纲等）。要求 `left < right`、`bottom < top`。
- `degreeMode`：true = 三角函数按角度制。给初中生画三角图时用。
- `polarMode`：true = 极坐标网格（画 r=f(θ) 时开启）。
- `xAxisLabel` / `yAxisLabel`：轴含义标注，如 "t/s"、"v/(m·s⁻¹)"。

## expressions 每条的字段

| 字段 | 类型 | 说明 |
|---|---|---|
| latex | string 必填 | 数学内容本身（见下方 LaTeX 铁律） |
| id | string 可选 | 语义化标识，如 `line_A`、`slider_a`。规则见下 |
| color | 枚举可选 | `RED` `BLUE` `GREEN` `PURPLE` `ORANGE` `BLACK` 六选一 |
| lineStyle | 枚举可选 | `SOLID` `DASHED` `DOTTED`。辅助线/渐近线用 DASHED |
| hidden | bool 可选 | true = 列表里有但图上不画（纯定义，或留给学生自己点开的彩蛋） |
| label | string 可选 | 点旁的文字标注（只对"点"生效；给了就会显示） |
| sliderBounds | 对象可选 | `{"min": "-3", "max": "3", "step": ""}` 三个都是字符串；step 为 "" 表示连续滑动 |
| parametricDomain | 对象可选 | `{"min": "0", "max": "2\\pi"}` 参数曲线 t 的范围 |
| polarDomain | 对象可选 | `{"min": "0", "max": "\\pi"}` 极坐标 θ 的范围 |

## LaTeX 铁律（最容易出错，逐条核对）

1. **反斜杠必须双写**：JSON 里写 `"\\sin x"`、`"\\pi"`、`"\\le"`、`"\\theta"`。
   写成 `"sin x"` 会被解析成 s·i·n 三个变量相乘——图照画但完全是错的。
2. **多字符函数名必须带反斜杠**：`\\sin` `\\cos` `\\tan` `\\ln` `\\log`
   `\\sqrt{x}` `\\frac{a}{b}` `\\le` `\\ge` `\\pi` `\\theta`。
3. **变量名只能是单字母**（可带下标如 `a_{1}`）。`lineA` 这种多字母名不合法；
   要表达"直线 A"，靠 id + color + 讲解文字指代，或在线上放一个带 label 的点。
4. **指数超过一个字符要花括号**：`e^{2x}` 而不是 `e^2x`。
5. latex 能直接表达的不要另找参数：不等式 `"x^2+y^2<1"` 自动画阴影；
   点 `"(1,2)"` 直接画点；`"f(x)=x^2"` 定义可复用的函数；`"a=1"` 定义滑块变量。

## id 规则

- 可选；格式 `^[A-Za-z][A-Za-z0-9_]*$`（英文语义词，如 `func_parabola`、
  `slider_a`、`tangent_line`），同一次调用内不得重复。
- id 是机器寻址用的（后续修改、读回），用户看不见。用户可见的命名靠
  latex 数学名（`O=(0,0)`）和 label 文字。

## 核心范式

### 滑块（参数探索——最有教学价值的能力）
定义 `a=1` 并给 sliderBounds，列表里自动出现滑块；其他表达式引用 `a` 即联动：

```json
{ "expressions": [
  { "id": "slider_a", "latex": "a=1", "sliderBounds": { "min": "-3", "max": "3", "step": "" } },
  { "id": "parabola", "latex": "y=ax^2", "color": "BLUE" }
] }
```

### 曲线上的可拖拽点
坐标含滑块变量的点自动可拖，拖动反向更新变量（无需任何额外参数）：

```json
{ "expressions": [
  { "id": "func_f", "latex": "f(x)=x^2", "color": "BLUE" },
  { "id": "slider_a", "latex": "a=1", "sliderBounds": { "min": "-3", "max": "3", "step": "" } },
  { "id": "tangent", "latex": "y=f'(a)(x-a)+f(a)", "color": "ORANGE" },
  { "id": "point_p", "latex": "(a,f(a))", "color": "BLACK", "label": "切点 P" }
] }
```

（Desmos 原生支持 `f'(x)` 求导记号，不要自己展开导数。）

### 角度制三角函数（含视口与轴标签）
```json
{ "expressions": [
  { "id": "sine", "latex": "y=\\sin x", "color": "BLUE" },
  { "id": "upper", "latex": "y=1", "color": "BLACK", "lineStyle": "DASHED" },
  { "id": "lower", "latex": "y=-1", "color": "BLACK", "lineStyle": "DASHED" }
],
  "mathBounds": { "left": -360, "right": 360, "bottom": -1.5, "top": 1.5 },
  "degreeMode": true, "xAxisLabel": "θ/°" }
```

### 极坐标
```json
{ "expressions": [
  { "id": "rose", "latex": "r=\\cos(3\\theta)", "color": "PURPLE",
    "polarDomain": { "min": "0", "max": "\\pi" } }
], "polarMode": true }
```

### 参数方程（必须给 parametricDomain）
参数曲线默认 t∈[0,1]——不给 parametricDomain 画圆只会出现一小段弧，图是错的：

```json
{ "expressions": [
  { "id": "cycloid", "latex": "(t-\\sin t,\\ 1-\\cos t)", "color": "GREEN",
    "parametricDomain": { "min": "0", "max": "4\\pi" } }
], "mathBounds": { "left": -1, "right": 14, "bottom": -1, "top": 3 } }
```

## 使用规则

- **一轮一图**：每个回答最多调用一次 `render_desmos_graph`。需要展示多个概念时
  合并进一张图（用颜色/hidden 区分），或引导用户分轮提问。
- **修改已有的图 = 先读后画**：用户要求修改之前画的图（含用户自己手改过的图）时，
  必须先调用 `read_current_graph` 拿到当前表达式快照，在其基础上产出完整的新参数
  再调用 `render_desmos_graph`（画的是新卡片，不是原位编辑）。禁止凭记忆盲改。
- 用户可以在卡片上直接拖动、缩放、编辑表达式——讲解时可以主动邀请他们动手。
- 工具返回 `{"status":"invalid","errors":[...]}` 时，按 errors 逐条修正参数后
  立即重新调用；返回 `spec_required` 或 `rejected` 时按其 instruction/reason
  立即补做并完成绘图——不要中途放弃，不要让用户"稍等"。
- **在 `render_desmos_graph` 成功返回 `created` 之前，绝对不要声称图已画好或已修改。**

## 自检清单（调用前过一遍）

1. 所有 `\\sin` `\\pi` 类命令的反斜杠都双写了吗？
2. 变量都是单字母（或带下标）吗？
3. 画了参数/极坐标曲线的话，domain 给了吗？
4. 视口适合本图内容吗（三角/概率/物理场景必查）？
5. 表达式 ≤20 条、每条 latex ≤500 字符、id 不重复？
