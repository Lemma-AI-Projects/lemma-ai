import { useMemo, useState } from 'react'

/**
 * 「试一试」—— 拖一个方向，看矩阵把它变成什么。
 *
 * ## 为什么是这一个交互
 *
 * 特征向量最常见的误解是"它是一个特殊向量"，而它其实是**一个特殊方向**。
 * 让人自己拖着转一圈，会**两次撞上**"Av 和 v 对齐"（λ=2 的 x 轴、λ=1 的 (1,−1)），
 * 中间全是"被转走了"。那两次撞上就是这一屏要发生的学习 —— 不用文字去解释。
 *
 * ## 数学（全部在这里，没有隐藏的库）
 *
 * ```
 * A = [[2, 1], [0, 1]]          v = (cos φ, sin φ)
 * Av = (2cosφ + sinφ, sinφ)
 * 对齐 ⟺ |sin∠(v, Av)| < 0.03    （叉积 / |Av|，因为 |v| = 1）
 * ```
 *
 * A 的两个特征方向：φ = 0°（λ=2）、φ = 315°（λ=1，(1,−1)/√2）。
 *
 * ## 刻意不做
 *
 * 不做可调矩阵、不做动画过渡、不做"答对了给你加分"。三段话 + 一条滑杆 + 两条箭头，
 * 已经足够回答"这个概念的交互形态能不能被摸到"；再往上加就会变成在做数学工具。
 */

const SCALE = 56 // 1 个单位 = 56px
const CX = 240
const CY = 180
const VIEW_W = 480
const VIEW_H = 360

/** 判定"同向"的正弦阈值：约 1.7°，够宽到滑杆 1° 步长不会漏掉，够窄到不会误报。 */
const ALIGN_EPS = 0.03

interface Vec {
  x: number
  y: number
}

function applyA(v: Vec): Vec {
  return { x: 2 * v.x + v.y, y: v.y }
}

/** 数学坐标（y 向上）→ SVG 坐标（y 向下）。 */
function toSvg(v: Vec): { x: number; y: number } {
  return { x: CX + v.x * SCALE, y: CY - v.y * SCALE }
}

export function EigenExplorer() {
  /* 初始 30°：故意不落在任何一个特征方向上，否则一打开就是"对上了"，
     那一下最值钱的发现就被提前送掉了。 */
  const [phi, setPhi] = useState(30)

  const { v, av, aligned, sameWay, lengthRatio } = useMemo(() => {
    const rad = (phi * Math.PI) / 180
    const vec: Vec = { x: Math.cos(rad), y: Math.sin(rad) }
    const out = applyA(vec)
    const len = Math.hypot(out.x, out.y)
    const cross = vec.x * out.y - vec.y * out.x
    const sinTheta = len < 1e-9 ? 1 : cross / len
    const dot = vec.x * out.x + vec.y * out.y
    return {
      v: vec,
      av: out,
      aligned: Math.abs(sinTheta) < ALIGN_EPS,
      sameWay: dot >= 0,
      lengthRatio: len,
    }
  }, [phi])

  const vEnd = toSvg(v)
  const avEnd = toSvg(av)

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium text-zinc-900">试一试</h2>
        <span className="text-[11px] text-zinc-400">
          拖动方向，让灰色箭头和赭色箭头对齐
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200/80 p-3">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full"
          role="img"
          aria-label={`向量 v 与 Av 的对比，方向 ${phi} 度${aligned ? '，已对齐' : '，未对齐'}`}
        >
          <defs>
            <marker
              id="eigen-arrow-v"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M1 1L9 5L1 9"
                fill="none"
                stroke={aligned ? '#8A5A2B' : '#BA7517'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
            <marker
              id="eigen-arrow-av"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M1 1L9 5L1 9"
                fill="none"
                stroke="#5F5E5A"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>

          {/* 网格：±4 / ±3 单位，淡到只提供"有刻度"的感觉 */}
          {[-4, -3, -2, -1, 1, 2, 3, 4].map((i) => (
            <line
              key={`gx${i}`}
              x1={CX + i * SCALE}
              y1={0}
              x2={CX + i * SCALE}
              y2={VIEW_H}
              stroke="#EFEDE8"
              strokeWidth="1"
            />
          ))}
          {[-3, -2, -1, 1, 2, 3].map((i) => (
            <line
              key={`gy${i}`}
              x1={0}
              y1={CY + i * SCALE}
              x2={VIEW_W}
              y2={CY + i * SCALE}
              stroke="#EFEDE8"
              strokeWidth="1"
            />
          ))}
          <line x1={0} y1={CY} x2={VIEW_W} y2={CY} stroke="#D3D1C7" strokeWidth="1" />
          <line x1={CX} y1={0} x2={CX} y2={VIEW_H} stroke="#D3D1C7" strokeWidth="1" />

          {/* Av 先画（在下层），v 后画 —— v 是"我在哪"，永远该看得见 */}
          <line
            x1={CX}
            y1={CY}
            x2={avEnd.x}
            y2={avEnd.y}
            stroke="#5F5E5A"
            strokeWidth="2"
            markerEnd="url(#eigen-arrow-av)"
          />
          <line
            x1={CX}
            y1={CY}
            x2={vEnd.x}
            y2={vEnd.y}
            stroke={aligned ? '#8A5A2B' : '#BA7517'}
            strokeWidth={aligned ? 3 : 2}
            markerEnd="url(#eigen-arrow-v)"
          />
          <circle cx={CX} cy={CY} r="2.5" fill="#5F5E5A" />
        </svg>

        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={phi}
            onChange={(event) => setPhi(Number(event.target.value))}
            aria-label="向量方向（度）"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[#8A5A2B]"
          />
          <span className="w-12 shrink-0 text-right font-mono text-[12px] text-zinc-500">
            {phi}°
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4 text-[11px] text-zinc-500">
          <Legend color="#BA7517" label="v（你选的方向）" />
          <Legend color="#5F5E5A" label="Av（被 A 作用之后）" />
          <span className="ml-auto font-mono text-zinc-400">
            |Av| = {lengthRatio.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 一句话反馈。对齐时不说"答对了"—— 对齐是数学事实，不是用户答对了一道题。 */}
      <p
        className="mt-3 text-[13px] leading-6"
        style={{ color: aligned ? '#8A5A2B' : '#989285' }}
      >
        {aligned
          ? sameWay
            ? '对上了：Av 和 v 同向，只是长度变了 —— 这个方向就是特征方向。'
            : '对上了（反着）：Av 指向 v 的反面，方向仍在同一条直线上。'
          : '还没对上：A 把 v 转走了。继续转，有两个方向会停住。'}
      </p>
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
