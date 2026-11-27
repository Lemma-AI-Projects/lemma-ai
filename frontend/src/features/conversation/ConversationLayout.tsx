import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react'
import { Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConversationInput } from './ConversationInput'

export function ConversationLayout({
  children,
  input,
  inputDock,
  moreMenu,
  scrollRef,
}: {
  children: ReactNode
  input: Omit<ComponentProps<typeof ConversationInput>, 'className'>
  // 贴在输入框上方的一块内容（比如问卷）。有内容时，一块浅灰托盘把它和输入框包在一起。
  inputDock?: ReactNode
  moreMenu: ReactNode
  scrollRef?: Ref<HTMLDivElement>
}) {
  const dockRef = useRef<HTMLDivElement>(null)
  // 输入框上方那块内容现在有多高。它盖在消息列表上面，所以消息列表底部要多留出这么多，
  // 不然最后几条消息滚不到它上面来。没有内容时是 0。
  const [dockHeight, setDockHeight] = useState(0)
  const hasDock = inputDock != null && inputDock !== false

  useLayoutEffect(() => {
    const dock = dockRef.current
    if (!dock) return undefined
    const observer = new ResizeObserver(() => setDockHeight(dock.offsetHeight))
    observer.observe(dock)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative flex h-full flex-col rounded-md border border-zinc-200/80 bg-zinc-50 [--conversation-width:44rem]">
      <div className="absolute right-3.75 top-3.75 z-10 flex items-center gap-2.75">
        <Button
          variant="outline"
          aria-label="Share conversation"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Share2 className="size-4" />
        </Button>
        {moreMenu}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div ref={scrollRef} className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-6">
          <div
            className="mx-auto flex min-h-full w-full max-w-(--conversation-width) flex-col pb-40"
            style={
              dockHeight > 0
                ? { paddingBottom: `calc(10rem + ${dockHeight}px)` }
                : undefined
            }
          >
            {children}
          </div>
        </div>

        {/* Reserve the same gutters as the message scroller on classic scrollbars. */}
        <div className="scrollbar-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden px-6">
          <div className="pointer-events-auto relative z-10">
            <div className="relative mx-auto w-full max-w-(--conversation-width)">
              {/* 托盘比输入框左右和下方各宽出 6px，而不是把输入框往里挤：
                  上方的内容出现或消失时，输入框本身一动不动。
                  圆角 = 输入框圆角（24px）+ 这 6px。 */}
              {hasDock && (
                <div
                  aria-hidden
                  className="absolute -inset-x-1.5 top-0 -bottom-1.5 animate-in rounded-[30px] bg-zinc-100 duration-200 fade-in-0"
                />
              )}
              <div ref={dockRef} className="relative">
                {inputDock}
              </div>
              <ConversationInput {...input} className="relative w-full" />
            </div>
          </div>
          {/* The mask fills the transparent corners at the bottom of the input. */}
          <div aria-hidden className="relative z-0 -mt-6">
            <div className="mx-auto h-12 w-full max-w-(--conversation-width) bg-zinc-50" />
          </div>
        </div>
      </div>
    </div>
  )
}
