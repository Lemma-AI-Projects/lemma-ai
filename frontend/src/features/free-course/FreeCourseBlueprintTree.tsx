import { useEffect, useMemo, useRef, useState } from 'react'

import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import type { FreeCourseDetail } from './types'

export interface FreeCourseBlueprintTreeProps {
  course: FreeCourseDetail
  /**
   * `course` 还在重新取（暂停态刚出现时 detail 可能还是 phase 1 之前的旧值）。
   * 此时若树是空的，要出**骨架**而不是「结构还没生成」—— 那是在撒谎。
   */
  isLoading?: boolean
  /** 给了才渲染「编辑」入口 —— 不给就是纯只读（蓝图页那边不需要编辑）。 */
  onEdit?: () => void
  /** 限高滚动区的高度类（暂停点内嵌在对话卡片里，不能无限长）。 */
  className?: string
}

/**
 * 蓝图的**清单式**渲染：单元 → 课节的缩进树 + 规模摘要。
 *
 * 为什么不是复用 `FreeCourseBlueprintCanvas`：那是个可平移缩放的**空间总览**，
 * 塞进对话卡片里要靠拖拽才能看全，而且指针独占、键盘不可达。
 * 而在"决定要不要生成"这个时刻，用户要读的是**清单**（几单元、几节课、都叫什么），
 * 不是一个需要探索的画布。所以这里用垂直缩进树 —— 顺带它也是将来做行内编辑的宿主。
 */
export function FreeCourseBlueprintTree({
  course,
  isLoading = false,
  onEdit,
  className,
}: FreeCourseBlueprintTreeProps) {
  const { t } = useAppTranslation()

  const lessonCount = useMemo(
    () => course.units.reduce((sum, unit) => sum + unit.lessons.length, 0),
    [course.units]
  )

  const boxRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [canScroll, setCanScroll] = useState(false)

  // 只在**收起**状态量溢出：展开后 scrollHeight === clientHeight，量出来永远是「不溢出」，
  // 按钮会消失、再也收不回去。
  useEffect(() => {
    if (isExpanded) return undefined
    const element = boxRef.current
    if (!element) return undefined
    const measure = () =>
      setCanScroll(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [isExpanded, course.units])

  const showToggle = isExpanded || canScroll

  if (isLoading && course.units.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="h-[13px] w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 space-y-1.5 rounded-xl border border-zinc-200/80 p-3 dark:border-zinc-800">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-muted"
              style={{ opacity: 1 - i * 0.25 }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (course.units.length === 0) {
    return (
      <p className={cn('text-[13px] text-zinc-400', className)}>
        {t('freeCourse.structure.empty')}
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[13px] font-medium text-zinc-500">
          {t('freeCourse.structure.title')}
        </h4>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-[12px] tabular-nums text-zinc-400">
            {t('freeCourse.structure.summary', {
              units: course.units.length,
              lessons: lessonCount,
            })}
          </span>
          {/* 只在真被截断时才出现 —— 短树多一个「展开全部」是噪声。
              这也解决「用户以为结构被截断了」：有溢出就必须有解释。 */}
          {showToggle && (
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="rounded text-[12px] text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
            >
              {isExpanded
                ? t('freeCourse.structure.collapse')
                : t('freeCourse.structure.expand')}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded text-[12px] text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
            >
              {t('freeCourse.structure.edit')}
            </button>
          )}
        </div>
      </div>

      <div
        ref={boxRef}
        className={cn(
          'mt-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800',
          isExpanded
            ? 'overflow-visible'
            : 'scrollbar-fade max-h-[13.5rem] overflow-y-auto'
        )}
      >
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {course.units.map((unit, unitIndex) => (
            <li key={unit.id} className="px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                  {unitIndex + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-zinc-800 dark:text-zinc-100">
                  {unit.title}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                  {t('freeCourse.structure.lessonCount', {
                    count: unit.lessons.length,
                  })}
                </span>
              </div>

              {unit.lessons.length > 0 && (
                <ol className="mt-1 space-y-0.5 pl-[1.4rem]">
                  {unit.lessons.map((lesson, lessonIndex) => (
                    <li
                      key={lesson.id}
                      className="flex items-baseline gap-2 text-[13px] text-zinc-600 dark:text-zinc-400"
                    >
                      <span className="shrink-0 tabular-nums text-[11px] text-zinc-300 dark:text-zinc-600">
                        {lessonIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {lesson.title}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
