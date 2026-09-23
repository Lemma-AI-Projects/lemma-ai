import { useState } from 'react'
import { isAxiosError } from 'axios'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { useEditFreeCourseTree } from './freeCourseApi'
import type { FreeCourseDetail, FreeCourseTreeEdit } from './types'

/** 草稿节点带一个与后端 id 无关的 `key`：新增节点还没有 id，但 React 需要稳定 key。 */
interface DraftLesson {
  key: string
  id: string | null
  title: string
  /** 编辑界面不展示 objective，但全量语义下必须原样带回，否则会被清空。 */
  objective: string | null
}

interface DraftUnit {
  key: string
  id: string | null
  title: string
  lessons: DraftLesson[]
}

let keyCounter = 0
function nextKey(prefix: string): string {
  keyCounter += 1
  return `${prefix}-${keyCounter}`
}

/** 空标题不算重名（那是另一条校验），否则会同时报两种错。 */
function hasDuplicate(titles: string[]): boolean {
  const present = titles.filter((title) => title.length > 0)
  return new Set(present).size !== present.length
}

function toDraft(course: FreeCourseDetail): DraftUnit[] {
  return course.units.map((unit) => ({
    key: nextKey('u'),
    id: unit.id,
    title: unit.title,
    lessons: unit.lessons.map((lesson) => ({
      key: nextKey('l'),
      id: lesson.id,
      title: lesson.title,
      objective: lesson.objective,
    })),
  }))
}

export interface FreeCourseBlueprintEditorProps {
  courseId: string
  course: FreeCourseDetail
  /** 保存成功或用户取消后回到只读态。 */
  onDone: () => void
  className?: string
}

/**
 * 蓝图编辑：改名 / 加课 / 删课 / 上下移动。
 *
 * **为什么排序用上下按钮而不是拖拽**：仓库里没有任何 DnD 依赖，自己写指针拖拽
 * 等于把一个纯数据操作绑上一堆边界情况（触摸、滚动冲突、自动滚动、重排指示），
 * 而上下按钮**既能用鼠标也能用键盘**，功能上等价。拖拽是锦上添花，后置。
 *
 * **为什么删除要就地二次确认**：这是整个功能里唯一会丢东西的操作（后端还会在
 * 课节已有内容时直接 409 兜底）。就地确认比弹窗快，也比"点错就没了"稳。
 */
export function FreeCourseBlueprintEditor({
  courseId,
  course,
  onDone,
  className,
}: FreeCourseBlueprintEditorProps) {
  const { t } = useAppTranslation()
  const [units, setUnits] = useState<DraftUnit[]>(() => toDraft(course))
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const mutation = useEditFreeCourseTree(courseId)

  const lessonTotal = units.reduce((sum, unit) => sum + unit.lessons.length, 0)
  const hasBlankTitle =
    units.some((unit) => unit.title.trim().length === 0) ||
    units.some((unit) => unit.lessons.some((l) => l.title.trim().length === 0))
  // 重名在**前端就挡住**。原因是后端的节点定位仍按标题（AI 层的 map/path 只有标题），
  // 重名会让「从哪一节开始」变得无法确定 —— 后端会明确报错，但那已经是生成阶段的事了，
  // 用户还得回头找是哪两节撞了。在这里拦住，用户当场就知道。
  const duplicateUnitTitle = hasDuplicate(units.map((u) => u.title.trim()))
  const duplicateLessonTitle = units.some((unit) =>
    hasDuplicate(unit.lessons.map((l) => l.title.trim()))
  )
  const canSave =
    !hasBlankTitle &&
    !duplicateUnitTitle &&
    !duplicateLessonTitle &&
    lessonTotal > 0 &&
    !mutation.isPending

  function patchUnit(unitKey: string, patch: Partial<DraftUnit>) {
    setUnits((current) =>
      current.map((unit) => (unit.key === unitKey ? { ...unit, ...patch } : unit))
    )
  }

  function patchLesson(unitKey: string, lessonKey: string, title: string) {
    setUnits((current) =>
      current.map((unit) =>
        unit.key === unitKey
          ? {
              ...unit,
              lessons: unit.lessons.map((lesson) =>
                lesson.key === lessonKey ? { ...lesson, title } : lesson
              ),
            }
          : unit
      )
    )
  }

  function moveUnit(index: number, delta: number) {
    setUnits((current) => {
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function moveLesson(unitKey: string, index: number, delta: number) {
    setUnits((current) =>
      current.map((unit) => {
        if (unit.key !== unitKey) return unit
        const target = index + delta
        if (target < 0 || target >= unit.lessons.length) return unit
        const lessons = [...unit.lessons]
        ;[lessons[index], lessons[target]] = [lessons[target], lessons[index]]
        return { ...unit, lessons }
      })
    )
  }

  function addUnit() {
    setUnits((current) => [
      ...current,
      {
        key: nextKey('u'),
        id: null,
        title: '',
        // 新单元默认带一节：空单元对用户没有意义，后端也不禁止。
        lessons: [{ key: nextKey('l'), id: null, title: '', objective: null }],
      },
    ])
  }

  function addLesson(unitKey: string) {
    setUnits((current) =>
      current.map((unit) =>
        unit.key === unitKey
          ? {
              ...unit,
              lessons: [
                ...unit.lessons,
                { key: nextKey('l'), id: null, title: '', objective: null },
              ],
            }
          : unit
      )
    )
  }

  function handleSave() {
    const payload: FreeCourseTreeEdit = {
      units: units.map((unit) => ({
        id: unit.id,
        title: unit.title.trim(),
        lessons: unit.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title.trim(),
          objective: lesson.objective,
        })),
      })),
    }
    mutation.mutate(payload, { onSuccess: () => onDone() })
  }

  // 409：后端拒绝删掉已有正文/作答的课节。把它的名单原样端出来，
  // 而不是笼统说"保存失败" —— 用户得知道是哪几节。
  const blockedLessons = (() => {
    const error = mutation.error
    if (!isAxiosError(error) || error.response?.status !== 409) return null
    const detail = error.response.data as { detail?: { lessons?: string[] } }
    return detail?.detail?.lessons ?? []
  })()

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[13px] font-medium text-zinc-500">
          {t('freeCourse.structure.editingTitle')}
        </h4>
        <span className="shrink-0 text-[12px] tabular-nums text-zinc-400">
          {t('freeCourse.structure.summary', {
            units: units.length,
            lessons: lessonTotal,
          })}
        </span>
      </div>

      <div className="mt-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {units.map((unit, unitIndex) => (
            <li key={unit.key} className="px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="w-4 shrink-0 text-[11px] tabular-nums text-zinc-400">
                  {unitIndex + 1}
                </span>
                <input
                  value={unit.title}
                  onChange={(event) => patchUnit(unit.key, { title: event.target.value })}
                  placeholder={t('freeCourse.structure.unitTitlePlaceholder')}
                  aria-label={t('freeCourse.structure.unitTitleLabel', {
                    index: unitIndex + 1,
                  })}
                  className={inputClassName('text-[13.5px] font-medium')}
                />
                <RowActions
                  canUp={unitIndex > 0}
                  canDown={unitIndex < units.length - 1}
                  onUp={() => moveUnit(unitIndex, -1)}
                  onDown={() => moveUnit(unitIndex, 1)}
                  removeLabel={t('freeCourse.structure.removeUnit')}
                  pendingDelete={pendingDelete === unit.key}
                  onAskRemove={() => setPendingDelete(unit.key)}
                  onCancelRemove={() => setPendingDelete(null)}
                  onConfirmRemove={() => {
                    setUnits((current) => current.filter((u) => u.key !== unit.key))
                    setPendingDelete(null)
                  }}
                  t={t}
                />
              </div>

              <ol className="mt-1 space-y-0.5 pl-[1.4rem]">
                {unit.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.key} className="flex items-center gap-1.5">
                    <span className="w-3 shrink-0 text-[11px] tabular-nums text-zinc-300 dark:text-zinc-600">
                      {lessonIndex + 1}
                    </span>
                    <input
                      value={lesson.title}
                      onChange={(event) =>
                        patchLesson(unit.key, lesson.key, event.target.value)
                      }
                      placeholder={t('freeCourse.structure.lessonTitlePlaceholder')}
                      aria-label={t('freeCourse.structure.lessonTitleLabel', {
                        unit: unitIndex + 1,
                        index: lessonIndex + 1,
                      })}
                      className={inputClassName('text-[13px]')}
                    />
                    <RowActions
                      canUp={lessonIndex > 0}
                      canDown={lessonIndex < unit.lessons.length - 1}
                      onUp={() => moveLesson(unit.key, lessonIndex, -1)}
                      onDown={() => moveLesson(unit.key, lessonIndex, 1)}
                      removeLabel={t('freeCourse.structure.removeLesson')}
                      pendingDelete={pendingDelete === lesson.key}
                      onAskRemove={() => setPendingDelete(lesson.key)}
                      onCancelRemove={() => setPendingDelete(null)}
                      onConfirmRemove={() => {
                        setUnits((current) =>
                          current.map((u) =>
                            u.key === unit.key
                              ? {
                                  ...u,
                                  lessons: u.lessons.filter(
                                    (l) => l.key !== lesson.key
                                  ),
                                }
                              : u
                          )
                        )
                        setPendingDelete(null)
                      }}
                      t={t}
                    />
                  </li>
                ))}
              </ol>

              <button
                type="button"
                onClick={() => addLesson(unit.key)}
                className="mt-1 ml-[1.4rem] flex items-center gap-1 rounded px-1 py-0.5 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <Plus className="size-3" aria-hidden />
                {t('freeCourse.structure.addLesson')}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addUnit}
          className="flex w-full items-center gap-1 rounded-b-xl border-t border-zinc-100 px-3 py-2 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/70 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Plus className="size-3" aria-hidden />
          {t('freeCourse.structure.addUnit')}
        </button>
      </div>

      {hasBlankTitle && (
        <p className="mt-2 text-[12px] text-zinc-500">
          {t('freeCourse.structure.needTitle')}
        </p>
      )}
      {lessonTotal === 0 && (
        <p className="mt-2 text-[12px] text-zinc-500">
          {t('freeCourse.structure.needLesson')}
        </p>
      )}
      {duplicateUnitTitle && (
        <p className="mt-2 text-[12px] text-zinc-500">
          {t('freeCourse.structure.duplicateUnitTitle')}
        </p>
      )}
      {duplicateLessonTitle && (
        <p className="mt-2 text-[12px] text-zinc-500">
          {t('freeCourse.structure.duplicateLessonTitle')}
        </p>
      )}
      {blockedLessons && (
        <p className="mt-2 text-[12px] text-destructive">
          {blockedLessons.length > 0
            ? t('freeCourse.structure.deleteBlocked', {
                lessons: blockedLessons.join('、'),
              })
            : t('freeCourse.structure.saveFailed')}
        </p>
      )}
      {mutation.isError && !blockedLessons && (
        <p className="mt-2 text-[12px] text-destructive">
          {t('freeCourse.structure.saveFailed')}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={mutation.isPending}
          onClick={onDone}
        >
          {t('freeCourse.structure.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={handleSave}
        >
          {mutation.isPending
            ? t('freeCourse.structure.saving')
            : t('freeCourse.structure.save')}
        </Button>
      </div>
    </div>
  )
}

function inputClassName(extra: string) {
  return cn(
    'min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-zinc-800 outline-none transition-colors',
    'hover:border-zinc-200 focus:border-zinc-300 focus:bg-white dark:text-zinc-100 dark:hover:border-zinc-700 dark:focus:bg-zinc-900',
    'placeholder:text-zinc-300 dark:placeholder:text-zinc-600',
    extra
  )
}

const iconButtonClassName =
  'flex size-5 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

interface RowActionsProps {
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
  removeLabel: string
  pendingDelete: boolean
  onAskRemove: () => void
  onCancelRemove: () => void
  onConfirmRemove: () => void
  t: ReturnType<typeof useAppTranslation>['t']
}

function RowActions({
  canUp,
  canDown,
  onUp,
  onDown,
  removeLabel,
  pendingDelete,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
  t,
}: RowActionsProps) {
  if (pendingDelete) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onConfirmRemove}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          {t('freeCourse.structure.confirmRemove')}
        </button>
        <button
          type="button"
          onClick={onCancelRemove}
          className="rounded px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {t('freeCourse.structure.cancel')}
        </button>
      </span>
    )
  }

  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label={t('freeCourse.structure.moveUp')}
        disabled={!canUp}
        onClick={onUp}
        className={iconButtonClassName}
      >
        <ArrowUp className="size-3" />
      </button>
      <button
        type="button"
        aria-label={t('freeCourse.structure.moveDown')}
        disabled={!canDown}
        onClick={onDown}
        className={iconButtonClassName}
      >
        <ArrowDown className="size-3" />
      </button>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onAskRemove}
        className={iconButtonClassName}
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
