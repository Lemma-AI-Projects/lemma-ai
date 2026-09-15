import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { FreeCourseBlueprintEditor } from './FreeCourseBlueprintEditor'
import { FreeCourseBlueprintTree } from './FreeCourseBlueprintTree'
import type {
  CourseTuningQuestion,
  CourseTuningStart,
  CourseTuningSubmit,
  FreeCourseDetail,
} from './types'

type TranslationT = ReturnType<typeof useAppTranslation>['t']

const optionGridClassName = 'mt-2.5 grid gap-2'
const optionCardClassName =
  'flex min-h-[48px] w-full cursor-pointer items-center gap-3.5 rounded-[12px] border border-zinc-200 bg-transparent px-3.5 py-2.5 text-left shadow-none transition-[border-color,background-color] duration-150 ease-out hover:border-zinc-300 hover:bg-zinc-100/60 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
const optionCardSelectedClassName =
  'border-zinc-500 bg-zinc-100 hover:border-zinc-500 hover:bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-900'
const optionRadioClassName =
  'size-4 border-zinc-300 bg-transparent text-white !shadow-none transition-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 [&_svg]:size-2 [&_svg]:fill-white dark:border-zinc-600 dark:data-[state=checked]:border-zinc-100 dark:data-[state=checked]:bg-zinc-100'

// Maps each question key to the matching `defaults` key at show time (prefill)
// and the matching CourseTuningSubmit field at submit time.
const questionDefaultsKeys: Record<string, keyof CourseTuningStart['defaults']> = {
  course_volume: 'courseVolume',
  depth: 'depth',
  focus: 'focus',
  pace: 'pace',
}

const questionSubmitFields: Record<string, 'volume' | 'depth' | 'focus' | 'pace'> = {
  course_volume: 'volume',
  depth: 'depth',
  focus: 'focus',
  pace: 'pace',
}

export interface FreeCourseTuningCardProps {
  offer: CourseTuningStart
  /**
   * 暂停点落库的课程树。放在问卷**上面**是刻意的：
   * 这几个问题问的是"多大多深多聚焦多快"，而用户此前**根本看不到要调的是什么** ——
   * 先给结构，再让参数有意义。
   */
  course: FreeCourseDetail
  isCourseLoading?: boolean
  onSubmit: (answers: CourseTuningSubmit) => Promise<void> | void
  onSkip: () => Promise<void> | void
}

export function FreeCourseTuningCard({
  offer,
  course,
  isCourseLoading = false,
  onSubmit,
  onSkip,
}: FreeCourseTuningCardProps) {
  const { t } = useAppTranslation()
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const question of offer.questions) {
      const defaultsKey = questionDefaultsKeys[question.key]
      if (!defaultsKey) continue
      const value = offer.defaults[defaultsKey]
      if (typeof value === 'string') {
        initial[question.key] = value
      }
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  function setAnswer(questionKey: string, value: string) {
    setAnswers((current) => ({ ...current, [questionKey]: value }))
  }

  async function handleSubmit() {
    const payload: CourseTuningSubmit = {}
    for (const question of offer.questions) {
      const value = answers[question.key]
      const field = questionSubmitFields[question.key]
      if (field && value) {
        payload[field] = value
      }
    }
    setSubmitting(true)
    try {
      await onSubmit(payload)
    } finally {
      // The parent normally unmounts this card once its stage moves off
      // `tuning`; resetting here also guards a parent that keeps it mounted.
      setSubmitting(false)
    }
  }

  return (
    <div
      data-slot="free-course-tool"
      data-stage="tuning"
      className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5 dark:border-zinc-800"
    >
      <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900 dark:text-zinc-100">
        {t('freeCourse.tuning.title')}
      </h3>
      <p className="mt-1.5 text-[14.5px] leading-6 text-zinc-500 dark:text-zinc-400">
        {t('freeCourse.tuning.subtitle')}
      </p>

      {/* 先给结构，再问参数 —— 否则用户是在不知道调什么的情况下调参。
          编辑是「想改再点进去」：不强制过一遍确认，别挡住想直接开始的人。 */}
      {isEditing ? (
        <FreeCourseBlueprintEditor
          courseId={course.id}
          course={course}
          onDone={() => setIsEditing(false)}
          className="mt-4"
        />
      ) : (
        <FreeCourseBlueprintTree
          course={course}
          isLoading={isCourseLoading}
          onEdit={() => setIsEditing(true)}
          className="mt-4"
        />
      )}

      {offer.questions.length === 0 ? null : (
        <div className="mt-5 flex flex-col gap-5">
          {offer.questions.map((question) => (
            <TuningQuestion
              key={question.key}
              question={question}
              value={answers[question.key] ?? ''}
              onValueChange={(value) => setAnswer(question.key, value)}
              t={t}
            />
          ))}
        </div>
      )}

      <div className="-mx-1 -mb-1 mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          disabled={submitting}
          className="h-[33px] rounded-full px-[12.5px] text-[14px] font-normal border border-dashed border-zinc-300 bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          onClick={() => onSkip()}
        >
          {t('freeCourse.tuning.skip')}
        </Button>
        <Button
          type="button"
          disabled={submitting}
          className="h-[33px] rounded-full px-[12.5px] text-[14px] font-normal bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-60"
          onClick={() => void handleSubmit()}
        >
          {submitting
            ? t('freeCourse.tuning.answerActive')
            : t('freeCourse.tuning.confirm')}
        </Button>
      </div>
    </div>
  )
}

function TuningQuestion({
  question,
  value,
  onValueChange,
  t,
}: {
  question: CourseTuningQuestion
  value: string
  onValueChange: (value: string) => void
  t: TranslationT
}) {
  const questionTitle = t(
    `freeCourse.tuning.questionTitle.${question.key}` as Parameters<TranslationT>[0],
    { defaultValue: question.title }
  )

  return (
    <section>
      <h4 className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100">
        {questionTitle}
      </h4>
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        className={optionGridClassName}
        aria-label={questionTitle}
      >
        {question.options.map((option) => {
          const optionLabel = t(
            `freeCourse.tuning.optionLabel.${question.key}.${option.value}` as Parameters<TranslationT>[0],
            { defaultValue: option.label }
          )
          const optionElementId = `tuning-${question.key}-${option.value}`
          const isSelected = value === option.value

          return (
            <label
              key={option.value}
              htmlFor={optionElementId}
              className={cn(
                optionCardClassName,
                isSelected && optionCardSelectedClassName
              )}
            >
              <RadioGroupItem
                id={optionElementId}
                value={option.value}
                className={optionRadioClassName}
              />
              <span className="min-w-0 flex-1 text-[15px] leading-6 text-zinc-800 dark:text-zinc-100">
                {optionLabel}
              </span>
            </label>
          )
        })}
      </RadioGroup>
    </section>
  )
}