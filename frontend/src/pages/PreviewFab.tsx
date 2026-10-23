import { useEffect, useRef, useState } from 'react'
import { Compass, X } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { PREVIEW_GROUPS, PREVIEW_ROUTES } from './previewRegistry'

/**
 * Preview 专属的**壳 + 快速跳转球**。
 *
 * 为什么要它：`/preview` 的 16 条入口彼此并不相邻 —— 在聚焦原型里想看一眼画布原型，
 * 得手动改地址栏。评审的常态是"对照着看"，所以给所有 preview 页面挂一个悬浮球：
 * 点开是全部入口的清单（从 `previewRegistry` 渲染，与索引页同一份数据），
 * 点条目直接跳。
 *
 * ## 挂载方式（路由层，不是每个页面手加）
 *
 * AppRouter 里这些路由包在一个 **pathless layout** 下，`PreviewShell` 只渲染
 * `<Outlet />` + 这颗球 —— 新增 preview 页面自动带上它，不用记得手动加。
 * 它**只在 `/preview/*` 挂载**（layout 的 children 全在那里），产品路由碰不到。
 *
 * ## 三个交互决定
 *
 * 1. **当前页在清单里置灰并标"当前"**，不可点 —— 跳到自己是无意义的操作，
 *    置灰比跳回去更省一次回退。
 * 2. **Esc 和点空白都能关**。浮层的关闭方式只有一种的话，一旦鼠标在别处就关不掉了。
 * 3. **不用 backdrop 遮罩**：画布上的拖动、便签的编辑都还活着，收起菜单就继续。
 */
export function PreviewShell() {
  return (
    <>
      <Outlet />
      <PreviewFab />
    </>
  )
}

function PreviewFab() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  /* 切页自动收起（否则从画布跳到聚焦，菜单还开着挡在原地）。
     用渲染期比较而不是 effect —— 和 TitleField 同一课：React 19 的
     set-state-in-effect 规则会拦 effect 里同步 setState。 */
  const [lastKey, setLastKey] = useState(location.key)
  if (location.key !== lastKey) {
    setLastKey(location.key)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <>
          {/* 点空白关闭：透明全屏层，不遮内容（无背景色），只负责收菜单。 */}
          <div
            className="fixed inset-0 -z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            ref={panelRef}
            data-slot="preview-fab-panel"
            className="absolute bottom-12 right-0 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl"
          >
            <p className="px-3 pb-1 pt-1.5 text-[10px] text-zinc-400">
              快速跳转 · 全部评审入口
            </p>
            {PREVIEW_GROUPS.map((group) => (
              <div key={group}>
                <p className="px-3 pb-0.5 pt-2 text-[10px] tracking-[0.08em] text-zinc-400">
                  {group}
                </p>
                {PREVIEW_ROUTES.filter((route) => route.group === group).map((route) => {
                  const current = location.pathname === route.path
                  return (
                    <button
                      key={route.path}
                      type="button"
                      disabled={current}
                      onClick={() => navigate(route.path)}
                      title={current ? '当前页' : route.path}
                      className={cn(
                        'flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-[12px] transition-colors',
                        current
                          ? 'cursor-default bg-zinc-50 text-zinc-400'
                          : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                      )}
                    >
                      <span className="truncate">{route.label}</span>
                      {current ? (
                        <span className="shrink-0 text-[10px] text-zinc-400">当前</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? '收起快速跳转' : '快速跳转到其它评审入口'}
        title={open ? '收起' : '快速跳转'}
        className={cn(
          'ml-auto flex size-10 items-center justify-center rounded-full border shadow-md transition-colors',
          open
            ? 'border-zinc-300 bg-white text-zinc-600'
            : 'border-zinc-200 bg-white text-[#8A5A2B] hover:bg-zinc-50'
        )}
      >
        {open ? <X className="size-4" /> : <Compass className="size-4" />}
      </button>
    </div>
  )
}
