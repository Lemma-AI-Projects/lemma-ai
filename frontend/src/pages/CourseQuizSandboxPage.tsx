import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'
import { CourseQuizQuestionsView } from '@/features/course/quiz/CourseQuizQuestionsView'
import { CourseQuizResultView } from '@/features/course/quiz/CourseQuizResultView'
import { CourseQuizView } from '@/features/course/quiz/CourseQuizView'
import { courseQuizPreview } from '@/mock/courseQuizPreview'

// 沿用学习点页的双栏尺寸；只有题目数据是本地样例，伴学栏不发请求。
export function CourseQuizSandboxPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [previewKey, setPreviewKey] = useState(0)
  const previewPage = new URLSearchParams(location.search).get('page')

  const resetPreview = () => {
    navigate('/sandbox/quiz', { replace: true })
    setPreviewKey((current) => current + 1)
  }

  return (
    <div className="flex h-full gap-2">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        {previewPage === 'result' ? (
          <CourseQuizResultView
            content={courseQuizPreview}
            nextHref="/sandbox/quiz"
          />
        ) : previewPage === 'questions' ? (
          <CourseQuizQuestionsView
            key={previewKey}
            content={courseQuizPreview}
            currentContentId={courseQuizPreview.id}
            onSubmit={() => navigate('/sandbox/quiz?page=result')}
          />
        ) : (
          <CourseQuizView
            key={previewKey}
            content={courseQuizPreview}
            nextHref="/sandbox/quiz"
            onSkip={() => navigate('/sandbox')}
          />
        )}
      </main>

      <aside className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
        <div className="-mt-1 flex h-7 shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <CourseConversationPills conversations={[]} />
          </div>
          <div className="-mr-1 ml-auto flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              aria-label="重新开始测验预览"
              title="重新开始测验预览"
              className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
              onClick={resetPreview}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="scrollbar-fade -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
            <p className="text-sm text-zinc-400">No conversation yet.</p>
          </div>
        </div>
        <CourseAssistantInput
          className="pointer-events-none mt-3 shrink-0"
          disabled
          isStreaming={false}
          onSend={() => undefined}
          onStop={() => undefined}
          onValueChange={() => undefined}
          placeholder="问问关于本节的任何问题…"
          value=""
        />
      </aside>
    </div>
  )
}
