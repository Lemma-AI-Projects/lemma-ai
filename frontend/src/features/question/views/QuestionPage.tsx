import { useEffect, useRef, type ReactNode } from 'react'

import { BottomActionBar } from '@/components/BottomActionBar'
import type { AttemptResult, QuestionView } from '@/types/question'
import type { QuestionPlayerMode } from '../content/renderModel'
import { QuestionPlayer } from './QuestionPlayer'

/** 一页一大题：标题、进度、题面，底部固定操作栏。切题后焦点落到题干容器。 */
export function QuestionPage({
  question,
  index,
  total,
  mode,
  result,
  progress,
  notice,
  left,
  right,
}: {
  question: QuestionView
  index: number
  total: number
  mode: QuestionPlayerMode
  result?: AttemptResult | null
  progress?: string | null
  /** 底栏上方的提示（提交失败等） */
  notice?: ReactNode
  left?: ReactNode
  right?: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [question.id])

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-zinc-50">
      <div ref={scrollRef} className="scrollbar-fade h-full min-h-0 overflow-y-auto px-10 pb-36 pt-20">
        <article className="mx-auto w-full max-w-[650px] pl-5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-[22px] font-semibold leading-7 tracking-tight text-zinc-950 outline-none"
          >
            {index + 1}.{question.meta.typeName ?? '题目'}
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            第 {index + 1} / {total} 题
            {progress ? ` · ${progress}` : null}
          </p>
          <QuestionPlayer question={question} mode={mode} result={result} className="mt-6" />
        </article>
      </div>
      {notice ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 px-10">
          <div className="pointer-events-auto relative left-1/2 w-full max-w-[650px] -translate-x-1/2 pl-5">
            {notice}
          </div>
        </div>
      ) : null}
      <BottomActionBar
        footerClassName="pb-9"
        contentClassName="pl-5"
        left={left}
        right={right}
      />
    </div>
  )
}
