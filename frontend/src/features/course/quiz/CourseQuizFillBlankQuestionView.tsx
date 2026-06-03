import { useMemo } from 'react'
import { measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext'

import { Input } from '@/components/ui/input'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'
import { CourseQuizQuestionLayout } from '@/features/course/quiz/CourseQuizQuestionLayout'
import { cn } from '@/lib/utils'

// 引导文字、镜像文字、输入文字共用同一套字号/行高（不含颜色），保证三者宽度、基线完全一致。
const fillBlankAnswerTextClassName = 'text-[17px] leading-7 font-normal'

// 默认横线长度（px）：文字未超出时固定不动，超出后才随文字增长。
const FILL_BLANK_DEFAULT_LINE_WIDTH = 60
// 横线增长动画时长：调大更舒缓，调小更跟手。
const FILL_BLANK_GROW_DURATION_CLASS = 'duration-150'
// 供 pretext 测量的字体串，必须与镜像/输入文字的实际渲染字体一致：字重 400 + 17px + index.css 的字体栈。
const FILL_BLANK_MEASURE_FONT =
  '400 17px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const fillBlankAnswerWrapperClassName = 'relative mt-12 flex items-baseline gap-1'
const fillBlankAnswerLabelClassName = cn(
  'shrink-0 text-zinc-900',
  fillBlankAnswerTextClassName
)
// 横线容器：宽度用显式 px 控制并做缓动；overflow-hidden 让文字随线条“扫”出来；border-b 即横线，聚焦时变深。
const fillBlankAnswerFrameClassName = cn(
  'relative inline-block h-7 max-w-full overflow-hidden border-b border-zinc-300 align-baseline transition-[width,border-color] ease-out [&:has(input:focus-visible)]:border-zinc-900',
  FILL_BLANK_GROW_DURATION_CLASS
)
// 镜像层：用户实际看到的文字，左对齐且不滚动，因此已输入字符绝不位移；被容器裁剪以配合线条扫出。
const fillBlankAnswerMirrorClassName = cn(
  'block whitespace-pre text-zinc-900',
  fillBlankAnswerTextClassName
)
// 真输入框：透明文字 + 可见光标，叠在镜像层之上，负责输入与让光标跟随线条末端。
const fillBlankAnswerInputClassName = cn(
  'absolute inset-x-0 bottom-0 block h-7 w-full rounded-none border-0 bg-transparent px-0 py-0 text-transparent caret-zinc-900 shadow-none focus-visible:ring-0 md:text-[17px]',
  fillBlankAnswerTextClassName
)

export function CourseQuizFillBlankQuestionView(
  props: CourseQuizQuestionViewProps
) {
  const answer =
    typeof props.answerValue === 'string' ? props.answerValue : ''
  const inputId = `${props.question?.id ?? 'fill-blank-question'}-answer`

  // pretext 用 canvas 字体引擎纯算文字像素宽度，不触发 DOM 回流；未超过默认长度则保持固定，超出后让横线精确贴合文字（容器再做缓动过渡）。
  const lineWidth = useMemo(() => {
    const measuredWidth = measureNaturalWidth(
      prepareWithSegments(answer, FILL_BLANK_MEASURE_FONT, {
        whiteSpace: 'pre-wrap',
      })
    )

    return Math.max(FILL_BLANK_DEFAULT_LINE_WIDTH, Math.ceil(measuredWidth))
  }, [answer])

  return (
    <CourseQuizQuestionLayout
      {...props}
      canContinue={answer.trim().length > 0}
      title="填空题"
    >
      <div className={fillBlankAnswerWrapperClassName}>
        <label className={fillBlankAnswerLabelClassName} htmlFor={inputId}>
          请输入答案：
        </label>
        <span
          className={fillBlankAnswerFrameClassName}
          style={{ width: lineWidth }}
        >
          <span className={fillBlankAnswerMirrorClassName} aria-hidden="true">
            {answer || '\u00A0'}
          </span>
          <Input
            id={inputId}
            value={answer}
            onChange={(event) => props.onAnswerValueChange(event.target.value)}
            autoComplete="off"
            aria-label="请输入答案"
            className={fillBlankAnswerInputClassName}
          />
        </span>
      </div>
    </CourseQuizQuestionLayout>
  )
}
