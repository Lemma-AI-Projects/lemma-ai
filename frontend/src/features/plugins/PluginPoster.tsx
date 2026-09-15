import { useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { pluginItems } from '@/mock/pluginItems'

// 精选推荐插件（按推荐顺序排列；以后接真实「精选/推广」接口时只改这里）
const FEATURED = pluginItems.slice(0, 5)

// 每张海报的渐变底色，按索引循环取用
const GRADIENTS = [
  'from-indigo-500 via-purple-500 to-fuchsia-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-orange-500 via-rose-500 to-pink-500',
  'from-sky-500 via-blue-500 to-indigo-500',
  'from-violet-500 via-purple-500 to-rose-500',
]

const ROTATE_MS = 5000

export function PluginPoster() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = FEATURED.length

  const go = (next: number) => setIndex(((next % count) + count) % count)
  const prev = () => go(index - 1)
  const next = () => go(index + 1)

  useEffect(() => {
    if (paused || count <= 1) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [paused, count])

  // 没有任何精选数据时退回原来的空占位，避免渲染出空轮播
  if (count === 0) {
    return (
      <div
        aria-label="插件海报展示区"
        className="mt-8 h-[280px] w-full rounded-3xl bg-zinc-200/70"
      />
    )
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="精选插件推荐"
      className="group/poster relative mt-8 h-[280px] w-full overflow-hidden rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 滑动轨道 */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {FEATURED.map((item, i) => {
          const { Icon } = item
          const gradient = GRADIENTS[i % GRADIENTS.length]
          return (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={i !== index}
              className={`flex min-w-full flex-col justify-between bg-gradient-to-br ${gradient} p-8`}
            >
              <div className="flex items-start gap-5">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <Icon className="size-8 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                    精选推荐
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/85">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/30">
                  查看插件
                  <ArrowRight className="size-4" />
                </span>
                <span className="text-xs text-white/60">
                  {item.subject === 'math' ? '数学' : '通用'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 左右翻动箭头（hover 或键盘聚焦时出现） */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="上一个推荐插件"
            className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2 text-zinc-700 opacity-0 shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 group-hover/poster:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="下一个推荐插件"
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2 text-zinc-700 opacity-0 shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 group-hover/poster:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* 指示点 */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {FEATURED.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`跳转到第 ${i + 1} 个推荐插件`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
