import { useCallback, useEffect, useState } from 'react'
import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { CircularProgress } from '@/components/CircularProgress'
import {
  ProgressStatusIcon,
  type ProgressStatus,
} from '@/components/ProgressStatusIcon'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ConversationToolUnit } from './types'

const countdownDurationMs = 60_000
type ToolStage = 'pending' | 'in-progress' | 'ready'

// 工具卡片底部按钮尺寸：h-[33px] 控制 33px 高度，px-[12.5px] 控制横向内边距，
// text-[14px] 控制字号，rounded-full 控制胶囊圆角，font-normal 控制字重。
const actionButtonClassName =
  'h-[33px] rounded-full px-[12.5px] text-[14px] font-normal'

// 次要按钮颜色：variant="outline" 提供基础描边样式；以下类控制边框、背景、
// 默认文字颜色，以及 hover 时的背景和文字颜色。
const secondaryActionButtonClassName = `${actionButtonClassName} border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950`

// 主按钮颜色与计时器间距：gap-1.5 控制文字和圆环间距，左侧沿用普通按钮内边距，
// pr-[3px] 让圆环贴近按钮右侧；其余类控制黑色背景、白色文字和 hover 背景。
const primaryActionButtonClassName = `${actionButtonClassName} gap-1.5 bg-zinc-950 pl-[12.5px] pr-[3px] text-white hover:bg-zinc-800`

function StartCountdown({ onComplete }: { onComplete: () => void }) {
  const [remainingMs, setRemainingMs] = useState(countdownDurationMs)

  useEffect(() => {
    const endsAt = Date.now() + countdownDurationMs
    const intervalId = window.setInterval(() => {
      const nextRemainingMs = Math.max(0, endsAt - Date.now())
      setRemainingMs(nextRemainingMs)

      if (nextRemainingMs === 0) {
        window.clearInterval(intervalId)
        onComplete()
      }
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [onComplete])

  const seconds = Math.ceil(remainingMs / 1000)
  const progress = (remainingMs / countdownDurationMs) * 100

  return (
    <span
      className="relative flex size-[26px] shrink-0 items-center justify-center"
      aria-label={`剩余 ${seconds} 秒`}
    >
      {/* size / strokeWidth 控制圆环直径和 1.75px 线宽；trackColor 是已流逝轨道，
          progressColor 是随时间缩短的白色进度弧。 */}
      <CircularProgress
        value={progress}
        size={26}
        strokeWidth={1.75}
        trackColor="rgb(255 255 255 / 0.28)"
        progressColor="#ffffff"
        className="absolute inset-0 size-[26px]"
      />
      <span
        aria-hidden
        className="relative text-[10.5px] font-medium tabular-nums leading-none text-white"
      >
        {seconds}
      </span>
    </span>
  )
}

function StatusIcon({
  stage,
  status,
  progress,
}: {
  stage: ToolStage
  status?: ProgressStatus
  progress: number
}) {
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
      {stage === 'in-progress' ? (
        <CircularProgress
          value={progress}
          size={15}
          strokeWidth={2.25}
          progressColor="#18181b"
        />
      ) : stage === 'ready' ? (
        <ProgressStatusIcon status={status ?? 'not-started'} value={progress} />
      ) : (
        <BacklogStatusIcon />
      )}
    </span>
  )
}

export function ConversationToolShell({
  title,
  units,
  progress = 0,
}: {
  title: string
  units: ConversationToolUnit[]
  progress?: number
}) {
  const [stage, setStage] = useState<ToolStage>('pending')
  const normalizedProgress = Math.min(Math.max(Math.round(progress), 0), 100)
  const handleStart = useCallback(() => setStage('in-progress'), [])
  const handleReady = useCallback(() => setStage('ready'), [])

  return (
    <div
      data-slot="conversation-tool-shell"
      className="flex min-h-[420px] w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5"
    >
      <h3 className="flex items-center gap-2 text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
        {stage === 'ready' && (
          <span className="flex size-5 translate-y-[1px] shrink-0 items-center justify-center [&_svg]:size-5">
            <ProgressStatusIcon status="completed" />
          </span>
        )}
        <span>
          {stage === 'ready' && '您的课程已就绪：'}
          {title}
        </span>
      </h3>

      <div className="mt-4 flex flex-col gap-1">
        {units.map((unit) => (
          <section key={unit.id}>
            <div className="flex min-h-9 items-start gap-2 py-2 text-[16.5px] font-medium text-zinc-800">
              <StatusIcon
                stage={stage}
                status={unit.status}
                progress={
                  stage === 'ready'
                    ? Math.min(Math.max(unit.progress ?? 0, 0), 100)
                    : normalizedProgress
                }
              />
              <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                {unit.title}
              </span>
            </div>

            <div className="relative ml-1 flex flex-col gap-0.5 pl-7">
              <div
                aria-hidden
                className="absolute bottom-1 left-[7px] top-1 w-px bg-zinc-200"
              />
              {unit.chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex min-h-9 items-start gap-2 py-2 text-[15.5px] text-zinc-600"
                >
                  <StatusIcon
                    stage={stage}
                    status={chapter.status}
                    progress={
                      stage === 'ready'
                        ? Math.min(Math.max(chapter.progress ?? 0, 0), 100)
                        : normalizedProgress
                    }
                  />
                  <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                    {chapter.title}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 操作栏间距：-mx-1 / -mb-1 将按钮距左右、底部边界从 20px 减至 16px；
          pt-4 控制目录与操作栏间距。 */}
      {stage === 'in-progress' ? (
        <div className="-mx-1 -mb-1 mt-auto flex items-center gap-4 pt-4">
          {/* h-1 来自通用 Progress 默认高度；flex-1 让进度条占满暂停按钮左侧空间，
              bg-zinc-200 控制轨道颜色，data-slot 选择器将进度部分改为黑色。 */}
          <Progress
            value={normalizedProgress}
            aria-label={`课程总进度 ${normalizedProgress}%`}
            className="min-w-0 flex-1 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-black"
          />
          {/* size-9 控制圆形按钮直径；rounded-full / bg-zinc-100 控制圆形浅灰底；
              内层 size-2.5 / bg-zinc-950 控制居中的黑色正方形。 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="暂停"
            className="size-9 rounded-full bg-zinc-100 p-0 hover:bg-zinc-200"
            onClick={handleReady}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-[1px] bg-zinc-950"
            />
          </Button>
        </div>
      ) : stage === 'ready' ? (
        <div className="-mx-1 -mb-1 mt-auto flex justify-end pt-4">
          <Button
            type="button"
            className={`${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`}
          >
            进入课程
          </Button>
        </div>
      ) : (
        <div className="-mx-1 -mb-1 mt-auto flex items-center justify-between gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className={secondaryActionButtonClassName}
          >
            编辑
          </Button>
          {/* gap-2 控制“取消”和“开始”之间的 8px 间距。 */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={secondaryActionButtonClassName}
            >
              取消
            </Button>
            <Button
              type="button"
              className={primaryActionButtonClassName}
              onClick={handleStart}
            >
              开始
              <StartCountdown onComplete={handleStart} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
