import { useState, type KeyboardEvent } from 'react'
import { ArrowUp, BookOpenCheck, GraduationCap } from 'lucide-react'
import { InputAddMenu } from '@/components/InputAddMenu'
import { InputMenu } from '@/components/InputMenu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Home input plus button left offset. Negative margin moves it further left.
const HOME_PLUS_LEFT_OFFSET_CLASS = 'ml-[-3px]'

// Home input plus button bottom offset. Negative margin moves it further down.
const HOME_PLUS_BOTTOM_OFFSET_CLASS = 'mb-[-5px]'

// Home add menu horizontal offset. Aligns the menu left edge with the input border.
const HOME_ADD_MENU_ALIGN_OFFSET = -14

// Action chin below the input. Its negative overlap mirrors the course video's
// layered underlay while reserving a compact row for mode buttons.
const HOME_INPUT_CHIN_CLASS_NAME =
  'relative z-0 -mt-[22px] flex h-[62px] items-center gap-1.5 rounded-b-[22px] bg-zinc-100 px-3.5 pt-[22px]'

export function ChatInput({
  className,
  onSend,
}: {
  className?: string
  onSend: (text: string, options?: { tool?: 'course_planning' }) => void
}) {
  const [value, setValue] = useState('')
  // One-shot Course Planning toggle for the message this input sends.
  const [coursePlanningEnabled, setCoursePlanningEnabled] = useState(false)
  const hasContent = value.trim().length > 0

  const submit = () => {
    const text = value.trim()
    if (!text) {
      return
    }
    onSend(text, coursePlanningEnabled ? { tool: 'course_planning' } : undefined)
    setValue('')
    setCoursePlanningEnabled(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行；输入法候选确认（composing）不触发发送
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative z-10 flex flex-col rounded-[22px] border border-zinc-200 bg-white">
        <textarea
          placeholder="Ask anything about this lesson..."
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="scrollbar-hidden max-h-[calc(6*1.625em+1.5rem)] min-h-[68px] w-full resize-none overflow-y-auto border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />

        <div className="flex items-center gap-2 px-4 pt-1 pb-4">
          <div
            className={cn(
              HOME_PLUS_BOTTOM_OFFSET_CLASS,
              HOME_PLUS_LEFT_OFFSET_CLASS,
              'flex items-center gap-2'
            )}
          >
            <InputAddMenu
              contextLabel="Include page context"
              menuAlignOffset={HOME_ADD_MENU_ALIGN_OFFSET}
              planningIcon={BookOpenCheck}
              planningLabel="Course Planning"
              referenceLabel="Reference materials"
              planningEnabled={coursePlanningEnabled}
              onPlanningEnabledChange={setCoursePlanningEnabled}
            />
          </div>

          <div className="mb-[-4px] ml-auto mr-[-4px]">
            <Button
              type="button"
              variant="default"
              size="icon"
              disabled={!hasContent}
              onClick={submit}
              className={cn(
                'rounded-full transition-colors',
                hasContent
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                  : 'bg-zinc-200 text-zinc-400 cursor-default'
              )}
              aria-label="Send message"
            >
              <ArrowUp className="size-[18px]" />
            </Button>
          </div>
        </div>
      </div>

      <div className={HOME_INPUT_CHIN_CLASS_NAME}>
        <InputMenu
          align="start"
          side="bottom"
          sideOffset={7}
          contentClassName="h-24 w-40 min-w-0 rounded-lg p-0 shadow-none"
          trigger={
            <Button
              type="button"
              variant="ghost"
              className="h-7 gap-1.5 -translate-y-[1px] rounded-full bg-transparent px-2.5 text-[14.5px] font-normal leading-5 text-zinc-700 hover:bg-black/[0.05] hover:text-zinc-950 data-[state=open]:bg-black/[0.08] data-[state=open]:text-zinc-950 data-[state=open]:hover:bg-black/[0.08] has-[>svg]:px-2.5"
            >
              <GraduationCap className="size-[17px]" />
              <span>创造课程</span>
            </Button>
          }
        >
          <div aria-hidden className="h-full w-full" />
        </InputMenu>
      </div>
    </div>
  )
}
