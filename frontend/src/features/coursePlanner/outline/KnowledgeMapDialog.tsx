import { useState } from 'react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { KnowledgeMapCanvas } from './KnowledgeMapCanvas'
import type { KnowledgeMapLayout } from './layoutKnowledgeMap'
import type { OutlineIndex } from './outlineIndex'
import type { CourseOutline } from './types'

/**
 * 宽画布弹层：左侧按课列出，右侧是整张知识地图。
 * 悬停某节课高亮这节课的知识点和它们的前置；悬停地图上的知识点，左侧对应的课
 * 也会点亮。弹层是模态的，所以普通滚轮直接平移画布。
 */
export function KnowledgeMapDialog({
  open,
  onOpenChange,
  title,
  outline,
  index,
  layout,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  outline: CourseOutline
  index: OutlineIndex
  layout: KnowledgeMapLayout
}) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(null)
  const focusIds = focusedLessonId
    ? index.lessonById.get(focusedLessonId)?.lesson.knowledgePointIds
    : undefined
  const activeLessonId = activeNodeId
    ? index.lessonByPointId.get(activeNodeId)?.lesson.id
    : undefined

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveNodeId(null)
      setFocusedLessonId(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-gray-200/50 backdrop-blur-[0.5px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex h-[min(46rem,calc(100vh-4rem))] w-[calc(100vw-2.5rem)] max-w-[66rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-100 pl-5 pr-2.5">
            <DialogPrimitive.Title className="shrink-0 text-[16.5px] font-medium text-zinc-900">
              知识地图
            </DialogPrimitive.Title>
            <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-400">
              {title}
            </span>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="关闭"
                className="rounded-full text-zinc-600"
              >
                <X className="size-[18px]" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="按课查看"
              className="scrollbar-fade w-60 shrink-0 overflow-y-auto border-r border-zinc-100 px-2 py-2 max-md:hidden"
            >
              {outline.chapters.map((chapter) => {
                const lessons = chapter.units.flatMap((unit) => unit.lessons)
                if (lessons.length === 0) return null
                return (
                  <div key={chapter.id} className="pb-1">
                    <p className="truncate px-2 pb-1 pt-2 text-[12px] leading-4 text-zinc-400">
                      {chapter.title}
                    </p>
                    {lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onPointerEnter={() => setFocusedLessonId(lesson.id)}
                        onPointerLeave={() => setFocusedLessonId(null)}
                        onFocus={() => setFocusedLessonId(lesson.id)}
                        onBlur={() => setFocusedLessonId(null)}
                        className={cn(
                          'flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100',
                          activeLessonId === lesson.id && 'bg-zinc-100'
                        )}
                      >
                        <span className="shrink-0 text-[12px] tabular-nums text-zinc-400">
                          第 {lesson.number} 课
                        </span>
                        <span className="min-w-0 truncate text-[13.5px] text-zinc-700">
                          {lesson.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </nav>

            <div className="flex min-w-0 flex-1 flex-col p-3">
              <KnowledgeMapCanvas
                layout={layout}
                focusIds={focusIds}
                wheelPans
                maxFitScale={1.3}
                className="min-h-0 flex-1"
                onActiveNodeChange={setActiveNodeId}
              />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
