import { Fragment, useCallback, useMemo, useState } from 'react'
import {
  ChevronLeft,
  Film,
  LogOut,
  RotateCcw,
  Settings,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { BoardCanvas } from '@/features/board/BoardCanvas'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'
import { CourseDashboardProgressMarker } from '@/features/course/dashboard/CourseDashboardProgressMarker'
import { useCoursesListQuery } from '@/features/course/courseApi'
import { useFreeCourseDetail } from '@/features/free-course/freeCourseApi'
import {
  getTeachingSession,
  startTeachingSession,
} from '@/features/free-course/session/sessionApi'
import { useTeachingPlayback } from '@/features/free-course/session/useTeachingPlayback'
import { Whiteboard } from '@/features/free-course/session/Whiteboard'
import type { TeachingSession } from '@/features/free-course/session/types'

const CHAT_SLIDE_CLASS_NAME =
  'transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform motion-reduce:transition-none'

/** The board's own box inside the canvas: fixed, so scrolling beats panning. */
const BOARD_WIDTH = 760
const BOARD_HEIGHT = 560

/**
 * [sandbox] Where the teaching board is examined, one beat at a time.
 *
 * Two jobs, and the second is why it exists:
 *
 * 1. Put the *real* board on the *real* canvas surface. The board arrives as
 *    `children` of `BoardCanvas`, so it shares the pan/zoom viewport — which is
 *    the arrangement the board has to survive if it is ever placed on a larger
 *    surface. The board therefore owns a fixed box and stops pointer events from
 *    bubbling, or the canvas would pan while the learner scrolls the board.
 * 2. Make every step inspectable without waiting for speech. 「下一拍」 plays one
 *    beat, 「重放这一拍」 rebuilds the board from the plan and replays it, and the
 *    rail lists what each revealed block actually carries (including its marks)
 *    — so emphasis can be checked by eye instead of by trusting the renderer.
 *
 * Emphasis is verified HERE and not on the product session page: the annotation
 * layer is still under review, and a sandbox is the right place for something
 * being reviewed. Those from the plan: 圈注/强调 lands on this page first.
 */
export function BoardSandboxPage() {
  const [params, setParams] = useSearchParams()
  const courseId = params.get('courseId') ?? ''
  const chapterId = params.get('chapterId') ?? ''

  const [draft, setDraft] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const chatSlideStyle = {
    transform: isCollapsed
      ? 'translate3d(calc(var(--board-chat-width) - 16px), 0, 0)'
      : 'translate3d(0, 0, 0)',
  }

  const coursesQuery = useCoursesListQuery()
  const freeCourses = useMemo(
    () => (coursesQuery.data ?? []).filter((course) => course.mode === 'free'),
    [coursesQuery.data]
  )
  const detailQuery = useFreeCourseDetail(courseId || undefined)
  const lessons = useMemo(
    () =>
      (detailQuery.data?.units ?? []).flatMap((unit) =>
        unit.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title }))
      ),
    [detailQuery.data]
  )

  const [session, setSession] = useState<TeachingSession | null>(null)
  const [cursor, setCursor] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const playback = useTeachingPlayback()

  const steps = useMemo(() => session?.steps ?? [], [session])

  const select = useCallback(
    (next: { courseId?: string; chapterId?: string }) => {
      const merged = new URLSearchParams(params)
      if (next.courseId !== undefined) {
        merged.set('courseId', next.courseId)
        merged.delete('chapterId')
      }
      if (next.chapterId !== undefined) merged.set('chapterId', next.chapterId)
      setParams(merged, { replace: true })
      setSession(null)
      setCursor(0)
      setNote(null)
      playback.clearBoard()
    },
    [params, setParams, playback]
  )

  const loadExisting = useCallback(async () => {
    if (!courseId || !chapterId) return
    setBusy(true)
    setNote(null)
    try {
      const existing = await getTeachingSession(courseId, chapterId)
      setSession(existing)
      setCursor(0)
      playback.clearBoard()
      setNote(
        existing
          ? `读到会话：${existing.steps.length} 拍，已播到第 ${existing.cursor} 拍`
          : '这一节还没有会话，点「新建会话」让它现场备课（会调用模型）'
      )
    } catch (error) {
      setNote(error instanceof Error ? error.message : '读会话失败')
    } finally {
      setBusy(false)
    }
  }, [courseId, chapterId, playback])

  const createSession = useCallback(async () => {
    if (!courseId || !chapterId) return
    setBusy(true)
    setNote(null)
    try {
      const opened = await startTeachingSession(courseId, chapterId)
      setSession(opened)
      setCursor(0)
      playback.clearBoard()
      setNote(`新会话：${opened.steps.length} 拍`)
    } catch (error) {
      setNote(error instanceof Error ? error.message : '建会话失败')
    } finally {
      setBusy(false)
    }
  }, [courseId, chapterId, playback])

  /** One beat forward: play it, then stop. The board accumulates. */
  const playNext = useCallback(() => {
    if (cursor >= steps.length) return
    playback.start([steps[cursor]])
    setCursor((current) => current + 1)
  }, [cursor, steps, playback])

  /** Replay the current beat from a board rebuilt out of the plan. */
  const replayBeat = useCallback(() => {
    if (cursor === 0) return
    playback.clearBoard()
    playback.seedBoard(steps.slice(0, cursor - 1))
    playback.start([steps[cursor - 1]])
  }, [cursor, steps, playback])

  const clearBoard = useCallback(() => {
    playback.clearBoard()
    setCursor(0)
  }, [playback])

  const revealed = playback.blocks
  const marksSeen = revealed.flatMap((view) =>
    (view.marks ?? []).map((mark) => ({ block: view.block.kind, ...mark }))
  )

  return (
    <div className="relative isolate flex h-svh overflow-hidden bg-zinc-100 p-2 [--board-chat-width:360px]">
      <BoardCanvas>
        {/* Fixed box + no bubbling: the board is a document that scrolls, the
            canvas is a viewport that pans, and only one of them may answer a
            drag. */}
        <div
          className="absolute left-6 top-24"
          style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          data-sandbox-board
        >
          <Whiteboard
            elements={playback.board}
            blocks={revealed}
            className="size-full"
            clickTarget={playback.clickTarget}
            onElementClick={playback.resolveClick}
          />
        </div>
      </BoardCanvas>

      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col items-start self-stretch pt-6">
        <div className="pointer-events-auto flex w-full items-center gap-3 px-6">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="退出"
            className="size-11 rounded-full border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
            asChild
          >
            <Link to="/">
              <LogOut className="size-5 -scale-x-100" />
            </Link>
          </Button>
          <div className="flex h-11 w-fit items-center gap-3 rounded-full border border-zinc-200/80 bg-zinc-50 px-5">
            <label className="flex items-center gap-1.5 text-[12px] text-zinc-500">
              课程
              <select
                aria-label="选择课程"
                className="max-w-[14rem] bg-transparent text-[13px] text-zinc-900 outline-none"
                value={courseId}
                onChange={(event) => select({ courseId: event.target.value })}
              >
                <option value="">—</option>
                {freeCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <span className="h-5 w-px bg-zinc-200" aria-hidden />
            <label className="flex items-center gap-1.5 text-[12px] text-zinc-500">
              课节
              <select
                aria-label="选择课节"
                disabled={lessons.length === 0}
                className="max-w-[14rem] bg-transparent text-[13px] text-zinc-900 outline-none"
                value={chapterId}
                onChange={(event) => select({ chapterId: event.target.value })}
              >
                <option value="">—</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className={`ml-auto flex shrink-0 items-center gap-2 ${CHAT_SLIDE_CLASS_NAME}`}
            style={chatSlideStyle}
          >
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-zinc-200/80 bg-zinc-50 px-4 text-[13px] hover:bg-zinc-100"
              disabled={busy || !chapterId}
              onClick={() => void loadExisting()}
            >
              读会话
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-zinc-200/80 bg-zinc-50 px-4 text-[13px] hover:bg-zinc-100"
              disabled={busy || !chapterId}
              onClick={() => void createSession()}
            >
              新建会话
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-full border-zinc-200/80 bg-zinc-50 px-4 text-[13px] hover:bg-zinc-100"
              disabled={cursor >= steps.length}
              onClick={playNext}
            >
              <SkipForward className="size-4" />
              下一拍
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-full border-zinc-200/80 bg-zinc-50 px-4 text-[13px] hover:bg-zinc-100"
              disabled={cursor === 0}
              onClick={replayBeat}
            >
              <Film className="size-4" />
              重放这一拍
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-full border-zinc-200/80 bg-zinc-50 px-4 text-[13px] hover:bg-zinc-100"
              disabled={cursor === 0}
              onClick={clearBoard}
            >
              <RotateCcw className="size-4" />
              清板
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label={playback.muted ? '取消静音' : '静音'}
              className="size-10 rounded-full border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
              onClick={() => playback.setMuted(!playback.muted)}
            >
              {playback.muted ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="设置"
              className="size-10 rounded-full border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
            >
              <Settings className="size-5" />
            </Button>
          </div>
        </div>

        <div className="pointer-events-auto mt-6 ml-6 flex w-11 flex-col items-center" aria-label="拍次">
          {steps.slice(0, 8).map((step, index) => (
            <Fragment key={step.id}>
              {index > 0 && (
                <div aria-hidden="true" className="h-6 w-px bg-zinc-300" />
              )}
              <CourseDashboardProgressMarker
                label={String(index + 1)}
                progress={index < cursor ? 100 : 0}
              />
            </Fragment>
          ))}
        </div>
      </div>

      <aside
        className={`relative z-20 ml-auto flex w-[var(--board-chat-width)] shrink-0 flex-col rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 ${CHAT_SLIDE_CLASS_NAME}`}
        style={chatSlideStyle}
      >
        {isCollapsed && (
          <button
            type="button"
            aria-label="展开对话框"
            aria-controls="board-chat-content"
            aria-expanded={false}
            onClick={() => setIsCollapsed(false)}
            className="absolute left-0 top-1/2 flex h-16 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <ChevronLeft className="size-4 shrink-0 text-zinc-500" strokeWidth={2.25} />
          </button>
        )}
        <div
          id="board-chat-content"
          inert={isCollapsed}
          aria-hidden={isCollapsed}
          className={`flex min-h-0 flex-1 flex-col transition-opacity duration-[120ms] motion-reduce:transition-none ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="-mt-1 flex h-7 shrink-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <CourseConversationPills
                conversations={[]}
                emptyLabel={session?.title || '板面调试'}
              />
            </div>
            <div className="-mr-1 ml-auto flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                aria-label="Close course chat"
                className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                onClick={() => setIsCollapsed(true)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          <div
            className="scrollbar-fade -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1"
            data-sandbox-inspector
          >
            {note ? (
              <p className="px-1 pb-2 text-[12px] leading-5 text-zinc-500">{note}</p>
            ) : null}
            {revealed.length === 0 ? (
              <div className="flex min-h-[12rem] items-center justify-center px-4 text-center">
                <p className="text-sm text-zinc-400">
                  选一门课和一节课，然后「读会话」或「新建会话」，再按「下一拍」。
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2 px-1" data-sandbox-blocks>
                {revealed.map((view) => (
                  <li
                    key={view.key}
                    className="rounded-lg border border-zinc-200/80 bg-white px-3 py-2"
                  >
                    <p className="text-[12px] font-medium text-zinc-700">
                      {view.block.kind}
                    </p>
                    {(view.marks ?? []).length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {(view.marks ?? []).map((mark, index) => (
                          <li
                            key={index}
                            className="text-[11.5px] text-zinc-500"
                            data-sandbox-mark={mark.style}
                          >
                            {mark.style} · {mark.match}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {marksSeen.length > 0 ? (
              <p className="mt-2 px-1 text-[11px] text-zinc-400">
                共 {marksSeen.length} 处强调
              </p>
            ) : null}
          </div>

          <CourseAssistantInput
            className="mt-3 shrink-0"
            isStreaming={false}
            onSend={() => undefined}
            onStop={() => undefined}
            onValueChange={setDraft}
            placeholder="问问关于本节的任何问题…"
            value={draft}
          />
        </div>
      </aside>
    </div>
  )
}
