import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  ArrowUp,
  BrainCircuit,
  Globe2,
  Puzzle,
  type LucideIcon,
} from 'lucide-react'

import { InputAddMenu } from '@/components/InputAddMenu'
import { InputMenu } from '@/components/InputMenu'
import { Button } from '@/components/ui/button'
import { ComposerChinButton } from '@/features/home/composer/ComposerChinButton'
import {
  ComposerModeSwitch,
  type ComposerMode,
} from '@/features/home/composer/ComposerModeSwitch'
import {
  ComposerTodayButton,
  type ComposerTodayButtonAppearance,
  type ComposerTodayTask,
} from '@/features/home/composer/ComposerTodayButton'
import {
  CourseScheduleMenu,
  type CourseScheduleMenuVariant,
} from '@/features/home/composer/CourseScheduleMenu'
import {
  CourseSpaceMenu,
  type ComposerSpace,
} from '@/features/home/composer/CourseSpaceMenu'
import { CourseVolumeListMenu } from '@/features/home/composer/CourseVolumeListMenu'
import { CourseVolumeSliderMenu } from '@/features/home/composer/CourseVolumeSliderMenu'
import {
  DEFAULT_COURSE_SCHEDULE,
  type CourseSchedule,
} from '@/features/home/composer/courseSchedule'
import {
  DEFAULT_COURSE_VOLUME,
  type CourseVolume,
} from '@/features/home/composer/courseVolume'
import { cn } from '@/lib/utils'

// 课程体量入口的候选样式。
export type HomeComposerVolumeControl = 'list' | 'slider'

// 聊天模式的设置行与现有首页输入框保持一致：三个入口的菜单内容都还没有设计，先留空面板。
const CHAT_SETTING_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: '未使用插件', icon: Puzzle },
  { label: '联网搜索未启用', icon: Globe2 },
  { label: '未连接记忆', icon: BrainCircuit },
]

const MODE_COPY: Record<ComposerMode, { placeholder: string; inputLabel: string }> = {
  course: {
    placeholder: '想学什么？写下一个目标、一场考试，或一个想弄懂的主题',
    inputLabel: '输入学习目标',
  },
  chat: {
    placeholder: '随便问，或贴一段看不懂的内容',
    inputLabel: '输入问题',
  },
}

// 新版首页输入框：上方一条肩线（今日 + 模式）；下面一整块浅灰托盘从四周包住输入卡，
// 课程设置胶囊排在托盘底部。
// 目前只在输入框 Sandbox 里陈列；自由课程的后端契约落地前，课程设置只保存在本地状态。
// `volumeControl`、`scheduleMenu` 和 `todayButton` 是供 Sandbox 对比的候选样式开关。
export function HomeComposer({
  className,
  onSend,
  scheduleMenu,
  spaces,
  todayButton,
  todayTasks,
  volumeControl,
}: {
  className?: string
  onSend?: (text: string) => void
  scheduleMenu: CourseScheduleMenuVariant
  spaces: ComposerSpace[]
  todayButton: ComposerTodayButtonAppearance
  todayTasks: ComposerTodayTask[]
  volumeControl: HomeComposerVolumeControl
}) {
  const [mode, setMode] = useState<ComposerMode>('course')
  const [text, setText] = useState('')
  const [volume, setVolume] = useState<CourseVolume>(DEFAULT_COURSE_VOLUME)
  const [schedule, setSchedule] = useState<CourseSchedule>(DEFAULT_COURSE_SCHEDULE)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const hasContent = text.trim().length > 0
  const VolumeMenu =
    volumeControl === 'slider' ? CourseVolumeSliderMenu : CourseVolumeListMenu

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    onSend?.(trimmed)
    setText('')
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-2.5">
        <ComposerTodayButton appearance={todayButton} tasks={todayTasks} />
        <ComposerModeSwitch value={mode} onValueChange={setMode} className="ml-auto" />
      </div>

      {/* 托盘圆角 = 输入卡圆角（22px）+ 托盘内边距（6px）。 */}
      <div className="rounded-[28px] bg-zinc-100 p-1.5">
        <div className="flex flex-col rounded-[22px] border border-zinc-200 bg-white">
          <textarea
            aria-label={MODE_COPY[mode].inputLabel}
            placeholder={MODE_COPY[mode].placeholder}
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            className="scrollbar-hidden max-h-[calc(6*1.625em+1.5rem)] min-h-[68px] w-full resize-none overflow-y-auto border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
            style={{ fieldSizing: 'content' } as CSSProperties}
          />

          <div className="flex items-center gap-2 px-4 pt-1 pb-4">
            <div className="mb-[-5px] ml-[-3px] flex items-center">
              <InputAddMenu menuAlignOffset={-14} />
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
                    : 'cursor-default bg-zinc-200 text-zinc-400'
                )}
                aria-label="发送"
              >
                <ArrowUp className="size-[18px]" />
              </Button>
            </div>
          </div>
        </div>

        {/* 设置行上留 9px、下留 1px：抵消胶囊自带的 1px 上移后，上下到托盘边缘都是 8px。 */}
        <div className="flex flex-wrap items-center gap-1.5 px-2 pt-[9px] pb-px">
          {mode === 'course' ? (
            <>
              <VolumeMenu value={volume} onValueChange={setVolume} />
              <CourseScheduleMenu
                variant={scheduleMenu}
                value={schedule}
                onValueChange={setSchedule}
              />
              <CourseSpaceMenu
                spaces={spaces}
                value={spaceId}
                onValueChange={setSpaceId}
              />
            </>
          ) : (
            CHAT_SETTING_ITEMS.map((item) => (
              <InputMenu
                key={item.label}
                align="start"
                side="bottom"
                sideOffset={7}
                contentClassName="h-24 w-40 min-w-0 rounded-lg p-0 shadow-none"
                trigger={
                  <ComposerChinButton icon={item.icon}>{item.label}</ComposerChinButton>
                }
              >
                <div aria-hidden className="h-full w-full" />
              </InputMenu>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
