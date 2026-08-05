---
name: desmos-3d-graphing
description: 绘制可交互的 Desmos 3D 立体图卡片（三维曲面、空间点与曲线、球坐标/柱坐标方程、u,v 参数曲面、旋转体、可调滑块）。当用户需要三维/空间/立体可视化（曲面 z=f(x,y)、球面、螺旋线、旋转体等）或要求修改已画的 3D 图时，先加载本技能获取 render_desmos_3d_graph 的完整参数规范，再调用该工具。二维平面函数图请改用 desmos-graphing 技能。
---

# Desmos 3D 绘图规范

你通过 `render_desmos_3d_graph` 工具画三维图。本文档是该工具参数的唯一权威规范，
调用前必须完整遵循。（二维平面图不要用本工具，用 `render_desmos_graph`。）

## 输出总形状

```json
{
  "expressions": [ { "latex": "z=x^2+y^2" } ],
  "degreeMode": false,
  "xAxisLabel": "",
  "yAxisLabel": ""
}
```

- `expressions` 必填，1-20 条；其余字段可选，不需要就省略。
- **3D 没有 mathBounds/polarMode/polarDomain/zAxisLabel**——视口是三维盒子，
  用户自由旋转缩放，默认视野即可；球坐标/柱坐标由 latex 内容直接识别，无需
  开关；z 轴不支持文字标注。
- `degreeMode`：true = 三角函数按角度制。
- `xAxisLabel` / `yAxisLabel`：轴含义标注。

## expressions 每条的字段

| 字段 | 类型 | 说明 |
|---|---|---|
| latex | string 必填 | 数学内容本身（见下方 3D 语言与 LaTeX 铁律） |
| id | string 可选 | 语义化标识（`^[A-Za-z][A-Za-z0-9_]*$`，同次调用内不重复） |
| color | 枚举可选 | `RED` `BLUE` `GREEN` `PURPLE` `ORANGE` `BLACK` |
| lineStyle | 枚举可选 | `SOLID` `DASHED` `DOTTED`——**只对曲线和点生效，曲面会忽略** |
| hidden | bool 可选 | true = 列表里有但图上不画（纯定义/彩蛋） |
| label | string 可选 | 点旁文字标注（只对点生效；给了就显示） |
| sliderBounds | 对象可选 | `{"min": "-3", "max": "3", "step": ""}`；step "" = 连续 |
| parametricDomain | 对象可选 | 参数**曲线**的 t 范围（螺旋线等），默认 0~1 |
| parametricDomainU | 对象可选 | 参数**曲面**的 u 范围，默认 0~1 |
| parametricDomainV | 对象可选 | 参数**曲面**的 v 范围，默认 0~1 |

## 3D 数学语言（相对 2D 的新能力）

1. **曲面**：含 z 的方程直接成面——显式 `z=x^2+y^2`、隐式 `x^2+y^2+z^2=9`。
2. **空间点**：三元组 `(1,2,3)`。可以在一行里用逗号分隔多个点。
3. **球坐标**：用 `\\rho`、`\\theta`、`\\phi` 书写的方程被自动识别，如
   `\\rho=2`（球面）。θ 默认 0~2π、φ 默认 0~π，正好一个完整球面，不要试图更改。
4. **柱坐标**：用 r、`\\theta`、z 书写的方程被自动识别。
5. **参数曲线**（一维，用 t）：`(\\cos t, \\sin t, t/4)` 是螺旋线，配
   `parametricDomain` 给 t 范围。
6. **参数曲面**（二维，用 u 和 v）：三元组各分量是 u,v 的表达式，如
   `(u, f(u)\\cos v, f(u)\\sin v)`（把 f 绕 x 轴旋转）。**必须给
   parametricDomainU 和 parametricDomainV**：默认都是 0~1，旋转面不给 v 域
   0~2π 只会出现一小片碎面，图是错的。

## LaTeX 铁律（与 2D 相同，逐条核对）

1. **反斜杠双写**：`"\\sin"` `"\\pi"` `"\\rho"` `"\\theta"` `"\\phi"` `"\\sqrt{x}"`。
2. **多字符函数/符号必须带反斜杠**，否则被拆成单字母变量相乘（图照画但全错）。
3. **变量名只能是单字母**（可带下标 `a_{1}`）。u、v、t、ρ、θ、φ 是保留参数名。
4. **指数超过一个字符要花括号**：`e^{2x}`。
5. latex 能直接表达的不要另找参数：隐式曲面、球坐标方程、三元组点、
   函数定义 `f(x)=...`、滑块变量 `a=1` 全是纯 latex。

## 避坑

- **不要写只含 x,y 的方程**（如 `x^2+y^2=4`）：它只会画在 XY 平面上一条曲线，
  不会变成柱面。要画圆柱，用参数曲面：`(2\\cos u, 2\\sin u, v)`，
  u 域 0~2π、v 域为柱高范围。
- 曲面没有虚线概念，`lineStyle` 别用在曲面上。

## 核心范式

### 旋转体（最有教学价值的 3D 场景）
把 f(x)=√x 绕 x 轴旋转，母线与旋转面同图对照，滑块控制缩放：

```json
{ "expressions": [
  { "id": "func_f", "latex": "f(x)=\\sqrt{x}", "hidden": true },
  { "id": "slider_a", "latex": "a=1", "sliderBounds": { "min": "0.2", "max": "3", "step": "" } },
  { "id": "generatrix", "latex": "(t, f(t), 0)", "color": "BLUE",
    "parametricDomain": { "min": "0", "max": "5" } },
  { "id": "surface", "latex": "(u, a f(u)\\cos v, a f(u)\\sin v)", "color": "GREEN",
    "parametricDomainU": { "min": "0", "max": "5" },
    "parametricDomainV": { "min": "0", "max": "2\\pi" } }
] }
```

### 曲面 + 滑块 + 标注顶点
```json
{ "expressions": [
  { "id": "slider_a", "latex": "a=1", "sliderBounds": { "min": "-2", "max": "2", "step": "" } },
  { "id": "paraboloid", "latex": "z=a(x^2+y^2)", "color": "BLUE" },
  { "id": "vertex", "latex": "(0,0,0)", "color": "BLACK", "label": "顶点" }
] }
```

### 球面与空间点
```json
{ "expressions": [
  { "id": "sphere", "latex": "\\rho=2", "color": "PURPLE" },
  { "id": "north", "latex": "(0,0,2)", "color": "BLACK", "label": "北极点" }
] }
```

### 螺旋线 + 线上可拖点
坐标含滑块变量的点自动可拖（拖动反向更新变量），与 2D 同款机制：

```json
{ "expressions": [
  { "id": "helix", "latex": "(\\cos t, \\sin t, t/4)", "color": "BLUE",
    "parametricDomain": { "min": "0", "max": "8\\pi" } },
  { "id": "axis", "latex": "(0,0,t)", "color": "BLACK", "lineStyle": "DASHED",
    "parametricDomain": { "min": "0", "max": "7" } },
  { "id": "slider_c", "latex": "c=0", "sliderBounds": { "min": "0", "max": "8\\pi", "step": "" } },
  { "id": "point_p", "latex": "(\\cos c, \\sin c, c/4)", "color": "ORANGE", "label": "P" }
] }
```

## 使用规则

- **一轮一图**：每个回答最多画一张图（2D 或 3D 任一种）。
- **修改已有的图 = 先读后画**：用户要求修改之前画的图时，先调用
  `read_current_graph` 拿当前快照（返回值的 kind 字段标明它是 2D 还是 3D 图），
  再用**与 kind 匹配的 render 工具**输出完整新参数画新卡片。禁止凭记忆盲改。
- 用户可以旋转、缩放 3D 视图并编辑表达式——讲解时主动邀请他们转一转看不同角度。
- 工具返回 `{"status":"invalid","errors":[...]}` 时按 errors 逐条修正后立即重试；
  返回 `spec_required` / `rejected` 时按其指示立即补做——不要中途放弃。
- **在 render 工具成功返回 `created` 之前，绝对不要声称图已画好或已修改。**

## 自检清单（调用前过一遍）

1. 反斜杠都双写了吗（`\\rho` `\\theta` `\\phi` `\\cos` `\\pi`）？
2. 画参数曲面的话，parametricDomainU/V 都给了吗（旋转面 v 域 0~2π）？
3. 画参数曲线的话，parametricDomain（t 域）给了吗？
4. 有没有误写"只含 x,y 的方程"想当柱面用？
5. 表达式 ≤20 条、latex ≤500 字符、id 不重复？
