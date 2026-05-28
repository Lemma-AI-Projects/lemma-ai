import { Clock, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'

export function CoursePage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex h-full gap-2">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50" />
      <aside className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
        <div className="-mt-1 flex h-7 shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <CourseConversationPills courseId={id} />
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
        <CourseAssistantInput className="mt-auto" />
      </aside>
    </div>
  )
}
