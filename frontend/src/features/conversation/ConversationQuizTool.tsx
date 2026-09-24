import { ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QuestionPlayer, useQuestionSetQuery } from '@/features/question'

// 正式的测验路由尚未开放，入口暂时指向题库调试页。
function quizEntryHref(questionSetId: string) {
  return `/sandbox/quiz?set=${encodeURIComponent(questionSetId)}&view=flow`
}

/** 会话里的测验卡片：题组概要 + 首题静态预览 + 进入测验。 */
export function ConversationQuizTool({ questionSetId }: { questionSetId: string }) {
  const setQuery = useQuestionSetQuery(questionSetId)

  return (
    <section className="w-full max-w-[36rem] rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <ListChecks className="size-3.5" />
        测验
      </div>

      {setQuery.isPending ? (
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : setQuery.isError ? (
        <p className="mt-2 text-sm text-zinc-400">测验加载失败</p>
      ) : (
        <>
          <h3 className="mt-1.5 text-[15px] font-medium text-zinc-900">{setQuery.data.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">共 {setQuery.data.questions.length} 题</p>
          {setQuery.data.questions[0] ? (
            <div className="relative mt-3 max-h-48 overflow-hidden rounded-xl bg-zinc-50 px-3 py-2.5 text-[15px]">
              <QuestionPlayer question={setQuery.data.questions[0]} mode="preview" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-50" />
            </div>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button asChild size="sm" className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800">
              <Link to={quizEntryHref(questionSetId)}>进入测验</Link>
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
