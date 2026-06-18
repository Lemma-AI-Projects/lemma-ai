import { useMemo, useState } from 'react'
import { Clock, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'
import { CourseMainContent } from '@/features/course/CourseMainContent'
import {
  mapLearningCourseToCourseItem,
  useLearningCourseQuery,
} from '@/features/course/courseLearningApi'
import { courseConversationMessages } from '@/mock/course/courseConversationMessages'

const courseConversationListClassName = [
  'gap-5 py-4',
  "[&_[data-role='user']]:max-w-[86%]",
  "[&_[data-slot='conversation-text-block']]:rounded-[18px]",
  "[&_[data-slot='conversation-text-block']]:px-3.5",
  "[&_[data-slot='conversation-text-block']]:py-2.5",
  "[&_[data-slot='conversation-text-block']]:text-[14.5px]",
  "[&_[data-slot='conversation-text-block']]:font-normal",
  "[&_[data-slot='conversation-text-block']]:leading-[23px]",
  "[&_[data-role='assistant']]:text-sm",
  "[&_[data-role='assistant']_p]:mt-[2px]",
  "[&_[data-role='assistant']_p]:leading-[18px]",
  "[&_[data-role='assistant']_ul]:mt-[2px]",
  "[&_[data-role='assistant']_ol]:mt-[2px]",
  "[&_[data-role='assistant']_li]:leading-[22px]",
  "[&_[data-streamdown='heading-2']]:text-xl",
  "[&_[data-streamdown='heading-3']]:text-base",
].join(' ')

function getCourseConversationTurns(conversationId?: string) {
  if (!conversationId) {
    return []
  }

  const messages = courseConversationMessages[conversationId]

  if (!messages) {
    return []
  }

  return createConversationTurns(conversationId, messages)
}

export function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const courseQuery = useLearningCourseQuery(id)
  // Bridge the real course tree onto the existing course-page contract; only the
  // chapter video is backend-backed this step (see courseLearningApi adapter).
  const course = useMemo(
    () =>
      courseQuery.data
        ? mapLearningCourseToCourseItem(courseQuery.data)
        : undefined,
    [courseQuery.data]
  )
  // The in-course AI assistant (right rail) is out of scope this step; it stays
  // mounted but starts with no conversation until it's wired to the backend.
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined)
  // Reset the (out-of-scope) assistant selection when navigating to another
  // course — render-time adjustment, no effect (avoids cascading renders).
  const [seenCourseId, setSeenCourseId] = useState(id)
  if (id !== seenCourseId) {
    setSeenCourseId(id)
    setActiveConversationId(undefined)
  }
  const turns = useMemo(
    () => getCourseConversationTurns(activeConversationId),
    [activeConversationId]
  )

  return (
    <div className="flex h-full gap-2">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        {courseQuery.isPending ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            正在加载课程…
          </div>
        ) : courseQuery.isError ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            加载课程失败，请稍后重试
          </div>
        ) : (
          <CourseMainContent course={course} />
        )}
      </main>
      <aside className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
        <div className="-mt-1 flex h-7 shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <CourseConversationPills
              activeConversationId={activeConversationId}
              courseId={id}
              onSelectConversation={setActiveConversationId}
            />
          </div>
          <div className="-mr-1 ml-auto flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              aria-label="New course chat"
              className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label="Course chat history"
              className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
            >
              <Clock className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="scrollbar-fade -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
          {turns.length > 0 ? (
            <ConversationMessageList
              turns={turns}
              className={courseConversationListClassName}
            />
          ) : (
            <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">
                {activeConversationId ? 'No messages yet.' : 'No conversation yet.'}
              </p>
            </div>
          )}
        </div>
        <CourseAssistantInput className="mt-3 shrink-0" />
      </aside>
    </div>
  )
}
