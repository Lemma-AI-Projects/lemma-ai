import { useId, useState } from 'react'

import { type ComposerTodayButtonAppearance } from '@/features/home/composer/ComposerTodayButton'
import { type CourseScheduleMenuVariant } from '@/features/home/composer/CourseScheduleMenu'
import {
  HomeComposer,
  type HomeComposerVolumeControl,
} from '@/features/home/composer/HomeComposer'
import { cn } from '@/lib/utils'
import { composerSpaces, composerTodayTasks } from '@/mock/homeComposer'

// 待选的输入框样式；要比较新样式时在这里加一项。
const COMPOSER_CANDIDATES: {
  id: string
  label: string
  volumeControl: HomeComposerVolumeControl
}[] = [
  { id: 'tray-list-v2', label: '包裹式列表菜单 v2', volumeControl: 'list' },
  { id: 'tray-slider-v2', label: '包裹式滑杆菜单 v2', volumeControl: 'slider' },
]

// 待选的「今日」入口样式；在顶栏切换后，下面每个输入框左上角的入口都会换成所选样式。
const TODAY_BUTTON_OPTIONS: { value: ComposerTodayButtonAppearance; label: string }[] = [
  { value: 'plain', label: '现状' },
  { value: 'chip', label: '描边胶囊' },
  { value: 'outline', label: '边框进度' },
  { value: 'ring', label: '大圆环' },
  { value: 'segments', label: '任务格' },
  { value: 'next-task', label: '下一件事' },
  { value: 'date', label: '日期' },
  { value: 'sentence', label: '一句话' },
]

// 待选的排期菜单样式；在顶栏切换后，下面每个输入框的排期菜单都会换成所选样式。
const SCHEDULE_MENU_OPTIONS: { value: CourseScheduleMenuVariant; label: string }[] = [
  { value: 'dots', label: '圆点周历' },
  { value: 'bar', label: '周格条' },
  { value: 'switch', label: '开关展开' },
  { value: 'checklist', label: '勾选清单' },
  { value: 'presets', label: '常用预设' },
]

// 顶栏里的一组候选样式切换：一句说明加一排单选。
function SandboxVariantSwitch<Value extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string
  onValueChange: (value: Value) => void
  options: { value: Value; label: string }[]
  value: Value
}) {
  const labelId = useId()

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-xs text-zinc-500">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex rounded-full bg-zinc-200/60 p-0.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs transition-colors',
              value === option.value
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// [sandbox] 输入框调试页：把待选的首页输入框样式上下排开，各自独立可操作，不发任何请求。
// 每个样式上下都留出一段空白，让「今日」向上、设置菜单向下弹出时不遮挡输入框。
export function ComposerSandboxPage() {
  // 默认停在已经选定的样式上：「今日」入口用一句话，排期菜单用开关展开。
  const [todayButton, setTodayButton] = useState<ComposerTodayButtonAppearance>('sentence')
  const [scheduleMenu, setScheduleMenu] = useState<CourseScheduleMenuVariant>('switch')

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200/80 px-3 py-2">
        <span className="text-xs font-medium text-zinc-400">输入框调试</span>
        <SandboxVariantSwitch
          label="今日入口"
          options={TODAY_BUTTON_OPTIONS}
          value={todayButton}
          onValueChange={setTodayButton}
        />
        <SandboxVariantSwitch
          label="排期菜单"
          options={SCHEDULE_MENU_OPTIONS}
          value={scheduleMenu}
          onValueChange={setScheduleMenu}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-44 px-6 pt-44 pb-80">
          {COMPOSER_CANDIDATES.map((candidate) => (
            <section key={candidate.id} aria-labelledby={`composer-${candidate.id}`}>
              <h2
                id={`composer-${candidate.id}`}
                className="mb-4 px-1 text-xs font-medium text-zinc-400"
              >
                {candidate.label}
              </h2>
              <HomeComposer
                volumeControl={candidate.volumeControl}
                scheduleMenu={scheduleMenu}
                todayButton={todayButton}
                todayTasks={composerTodayTasks}
                spaces={composerSpaces}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
