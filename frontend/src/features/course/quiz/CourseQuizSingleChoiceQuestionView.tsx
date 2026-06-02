import { useEffect, useMemo, useRef, useState } from 'react'

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { BottomRightActionButton } from '@/components/BottomRightActionButton'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'
import { cn } from '@/lib/utils'

// 题目标题的大小、字重和位置由这里控制。
const questionTitleClassName =
  'text-[22px] font-semibold leading-7 tracking-tight text-zinc-950'

// 题面文字的字重单独由这里控制。
const questionStemWeightClassName = 'font-normal'
const questionStemClassName = cn(
  'mt-6 text-[17px] leading-8 text-zinc-900',
  questionStemWeightClassName
)

const answerOptionsWrapperClassName = 'mt-7'
const answerOptionsClassName = 'grid gap-2.5'
// 两列选项之间的横向和纵向间距由这里控制。
const answerOptionsTwoColumnClassName = 'grid-cols-2 gap-x-4 gap-y-4'
// 两列布局的自动判断参数：卡片内部固定占位、列间距和最小列宽由这里控制。
const answerOptionsColumnGapPx = 16
const answerOptionReservedWidthPx = 70
const answerOptionMinimumColumnWidthPx = 160
// 选项卡高度、内边距、圆角和 hover 高亮由这里控制。
const answerOptionCardClassName =
  'flex min-h-[48px] w-full cursor-pointer items-center gap-3.5 rounded-[12px] border border-zinc-200 bg-transparent px-3.5 py-2.5 text-left shadow-none transition-colors hover:border-zinc-300 hover:bg-zinc-100/60'
// 选中选项卡的边框和背景高亮由这里控制。
const answerOptionCardSelectedClassName =
  'border-zinc-500 bg-zinc-100 hover:border-zinc-500 hover:bg-zinc-100'
// 左侧选中圆圈的大小、描边和内点样式由这里控制。
const answerOptionRadioClassName =
  'size-4 border-zinc-300 bg-transparent text-white !shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300/70 data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 [&_svg]:size-2 [&_svg]:fill-white'
const answerOptionTextClassName =
  'flex min-w-0 items-baseline gap-2 text-[16px] leading-7 text-zinc-900'
// 右下角“下一题”按钮在本页的上移距离和内容对齐由这里控制。
const nextQuestionFooterOffsetClassName = 'bottom-4'
const nextQuestionContentAlignClassName = 'pl-5'

function measureOptionTextWidth(text: string, font: string): number {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    return 0
  }

  context.font = font
  return context.measureText(text).width
}

export function CourseQuizSingleChoiceQuestionView({
  question,
  questionIndex,
}: CourseQuizQuestionViewProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>()
  const [useTwoColumnOptions, setUseTwoColumnOptions] = useState(false)
  const answerOptionsWrapperRef = useRef<HTMLDivElement>(null)
  const options = useMemo(() => question?.options ?? [], [question?.options])
  const questionId = question?.id ?? 'question'

  useEffect(() => {
    const wrapperElement = answerOptionsWrapperRef.current

    const getNextColumnMode = () => {
      if (!wrapperElement || options.length < 2) {
        return false
      }

      const wrapperWidth = wrapperElement.clientWidth
      const columnWidth = (wrapperWidth - answerOptionsColumnGapPx) / 2
      const textElement = wrapperElement.querySelector('[data-answer-option-text]')
      const textStyle = getComputedStyle(textElement ?? wrapperElement)
      const textFont = `${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`

      return (
        columnWidth >= answerOptionMinimumColumnWidthPx &&
        options.every((option) => {
          const optionTextWidth = measureOptionTextWidth(
            `${option.label}. ${option.text}`,
            textFont
          )

          return optionTextWidth + answerOptionReservedWidthPx <= columnWidth
        })
      )
    }

    let animationFrameId = window.requestAnimationFrame(() => {
      const nextColumnMode = getNextColumnMode()

      setUseTwoColumnOptions((current) =>
        current === nextColumnMode ? current : nextColumnMode
      )
    })

    if (!wrapperElement || typeof ResizeObserver === 'undefined') {
      return () => {
        window.cancelAnimationFrame(animationFrameId)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(() => {
        const nextColumnMode = getNextColumnMode()

        setUseTwoColumnOptions((current) =>
          current === nextColumnMode ? current : nextColumnMode
        )
      })
    })
    resizeObserver.observe(wrapperElement)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
    }
  }, [options])

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-zinc-50">
      <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-10 pb-24 pt-28">
        <article className="mx-auto w-full max-w-[650px] pl-5">
          <h1 className={questionTitleClassName}>{questionIndex + 1}.单选题</h1>
          {question?.stem ? (
            <p className={questionStemClassName}>{question.stem}</p>
          ) : null}
          {options.length ? (
            <div
              ref={answerOptionsWrapperRef}
              className={answerOptionsWrapperClassName}
            >
              <RadioGroup
                value={selectedOptionId}
                onValueChange={setSelectedOptionId}
                className={cn(
                  answerOptionsClassName,
                  useTwoColumnOptions && answerOptionsTwoColumnClassName
                )}
                aria-label="选择答案"
              >
                {options.map((option) => {
                  const optionElementId = `${questionId}-${option.id}`
                  const isSelected = selectedOptionId === option.id

                  return (
                    <label
                      key={option.id}
                      htmlFor={optionElementId}
                      className={cn(
                        answerOptionCardClassName,
                        isSelected && answerOptionCardSelectedClassName
                      )}
                    >
                      <RadioGroupItem
                        id={optionElementId}
                        value={option.id}
                        className={answerOptionRadioClassName}
                      />
                      <span
                        className={answerOptionTextClassName}
                        data-answer-option-text
                      >
                        <span className="shrink-0 text-zinc-500">
                          {option.label}.
                        </span>
                        <span className="min-w-0">{option.text}</span>
                      </span>
                    </label>
                  )
                })}
              </RadioGroup>
            </div>
          ) : null}
        </article>
      </div>
      <BottomRightActionButton
        type="button"
        disabled={!selectedOptionId}
        footerClassName={nextQuestionFooterOffsetClassName}
        contentClassName={nextQuestionContentAlignClassName}
      >
        下一题
      </BottomRightActionButton>
    </div>
  )
}
