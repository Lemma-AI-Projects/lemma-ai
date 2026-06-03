import { useEffect, useMemo, useRef, useState } from 'react'
import { measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext'

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { CourseQuizQuestionLayout } from '@/features/course/quiz/CourseQuizQuestionLayout'
import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'
import { cn } from '@/lib/utils'

type CourseQuizChoiceMode = 'single' | 'multiple'

interface CourseQuizChoiceQuestionViewProps
  extends CourseQuizQuestionViewProps {
  mode: CourseQuizChoiceMode
  title: string
}

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
  'flex min-h-[48px] w-full cursor-pointer appearance-none items-center gap-3.5 rounded-[12px] border border-zinc-200 bg-transparent px-3.5 py-2.5 text-left shadow-none transition-[border-color,background-color] duration-150 ease-out hover:border-zinc-300 hover:bg-zinc-100/60'
// 选中选项卡的边框和背景高亮由这里控制。
const answerOptionCardSelectedClassName =
  'border-zinc-500 bg-zinc-100 hover:border-zinc-500 hover:bg-zinc-100'
// 左侧选中圆圈的大小、描边和内点样式由这里控制。
const answerOptionRadioClassName =
  'size-4 border-zinc-300 bg-transparent text-white !shadow-none transition-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 [&_svg]:size-2 [&_svg]:fill-white'
const answerOptionCheckboxClassName =
  'flex size-4 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-transparent transition-none'
const answerOptionCheckboxSelectedClassName = 'border-zinc-900 bg-zinc-900'
const answerOptionTextClassName =
  'flex min-w-0 items-baseline gap-2 text-[16px] leading-7 text-zinc-900'

function CourseQuizChoiceOptionText({
  label,
  text,
}: {
  label: string
  text: string
}) {
  return (
    <span className={answerOptionTextClassName} data-answer-option-text>
      <span className="shrink-0 text-zinc-500">{label}.</span>
      <span className="min-w-0">{text}</span>
    </span>
  )
}

export function CourseQuizChoiceQuestionView({
  answerValue,
  canSubmit,
  content,
  currentContentId,
  mode,
  onAnswerValueChange,
  onNextQuestion,
  onPreviousQuestion,
  question,
  questionIndex,
  title,
}: CourseQuizChoiceQuestionViewProps) {
  const [useTwoColumnOptions, setUseTwoColumnOptions] = useState(false)
  const answerOptionsWrapperRef = useRef<HTMLDivElement>(null)
  const options = useMemo(() => question?.options ?? [], [question?.options])
  const questionId = question?.id ?? 'question'
  const selectedOptionIds = useMemo(
    () => (Array.isArray(answerValue) ? answerValue : []),
    [answerValue]
  )
  const selectedOptionIdSet = useMemo(
    () => new Set(selectedOptionIds),
    [selectedOptionIds]
  )

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
          // pretext 用浏览器字体引擎测量整段选项的自然单行宽度，对中英数字/符号/emoji/长词比裸 measureText 更准。
          const optionTextWidth = measureNaturalWidth(
            prepareWithSegments(`${option.label}. ${option.text}`, textFont)
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

  function toggleMultipleOption(optionId: string) {
    onAnswerValueChange(
      selectedOptionIds.includes(optionId)
        ? selectedOptionIds.filter(
            (selectedOptionId) => selectedOptionId !== optionId
          )
        : [...selectedOptionIds, optionId]
    )
  }

  const optionListClassName = cn(
    answerOptionsClassName,
    useTwoColumnOptions && answerOptionsTwoColumnClassName
  )
  const hasSelectedOption = selectedOptionIds.length > 0

  return (
    <CourseQuizQuestionLayout
      canContinue={hasSelectedOption}
      canSubmit={canSubmit}
      content={content}
      currentContentId={currentContentId}
      onNextQuestion={onNextQuestion}
      onPreviousQuestion={onPreviousQuestion}
      question={question}
      questionIndex={questionIndex}
      title={title}
    >
      {options.length ? (
        <div
          ref={answerOptionsWrapperRef}
          className={answerOptionsWrapperClassName}
        >
          {mode === 'single' ? (
            <RadioGroup
              value={selectedOptionIds[0] ?? ''}
              onValueChange={(optionId) => onAnswerValueChange([optionId])}
              className={optionListClassName}
              aria-label="选择答案"
            >
              {options.map((option) => {
                const optionElementId = `${questionId}-${option.id}`
                const isSelected = selectedOptionIdSet.has(option.id)

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
                    <CourseQuizChoiceOptionText
                      label={option.label}
                      text={option.text}
                    />
                  </label>
                )
              })}
            </RadioGroup>
          ) : (
            <div
              role="group"
              className={optionListClassName}
              aria-label="选择答案"
            >
              {options.map((option) => {
                const isSelected = selectedOptionIdSet.has(option.id)

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleMultipleOption(option.id)}
                    className={cn(
                      answerOptionCardClassName,
                      isSelected && answerOptionCardSelectedClassName
                    )}
                  >
                    <span
                      className={cn(
                        answerOptionCheckboxClassName,
                        isSelected && answerOptionCheckboxSelectedClassName
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? (
                        <span className="size-2 rounded-full bg-white" />
                      ) : null}
                    </span>
                    <CourseQuizChoiceOptionText
                      label={option.label}
                      text={option.text}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </CourseQuizQuestionLayout>
  )
}
