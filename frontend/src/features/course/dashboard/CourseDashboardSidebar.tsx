import { Fragment, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CourseDashboardProgressMarker } from './CourseDashboardProgressMarker'
import type { CourseDashboardData, DashboardModule } from './types'

// 当前 240px 宽、15px 字号下约四行，末尾保留省略号和展开按钮。
const COLLAPSED_DESCRIPTION_LENGTH = 61

interface CourseDashboardSidebarProps {
  course: CourseDashboardData
  activeModule: DashboardModule | undefined
  onModuleChange: (moduleId: string) => void
}

export function CourseDashboardSidebar({
  course,
  activeModule,
  onModuleChange,
}: CourseDashboardSidebarProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const description = course.description ?? ''
  const isDescriptionLong = description.length > COLLAPSED_DESCRIPTION_LENGTH

  return (
    <div className="absolute top-20 right-26 w-60">
      {/* 封面：后端 coverUrl 暂无生产者，恒为占位块。 */}
      {course.coverUrl ? (
        <img
          src={course.coverUrl}
          alt=""
          className="size-60 rounded-2xl object-cover"
        />
      ) : (
        <div className="size-60 rounded-2xl bg-zinc-200" />
      )}
      <h1 className="mt-5 text-center text-xl font-bold text-zinc-900">
        {course.title}
      </h1>
      {description ? (
        <p className="mt-3 text-left text-[15px] leading-[21px] font-normal text-zinc-600">
          {descriptionExpanded || !isDescriptionLong
            ? description
            : `${description.slice(0, COLLAPSED_DESCRIPTION_LENGTH)}…`}
          {isDescriptionLong ? (
            <button
              type="button"
              aria-label={descriptionExpanded ? '折叠课程介绍' : '展开课程介绍'}
              onClick={() => setDescriptionExpanded((current) => !current)}
              // 跟随正文浮动到行尾，并在 21px 行高内垂直居中。
              className="float-right mt-[1.5px] ml-1 flex h-[18px] w-[26px] items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:text-zinc-800"
            >
              {descriptionExpanded ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          ) : null}
        </p>
      ) : null}
      {/* 「测试」Tab 要等测验能力落地才出现，这里只列章。 */}
      <div className="mt-6 flex flex-col">
        {course.modules.map((module, index) => (
          <Fragment key={module.id}>
            {/* 竖线对齐 32px 圆环的圆心。 */}
            {index > 0 && (
              <div className="ml-4 h-6 w-px -translate-x-1/2 bg-zinc-300" />
            )}
            <div className="flex items-center gap-3">
              <CourseDashboardProgressMarker
                label={module.label}
                progress={module.progress}
              />
              <button
                type="button"
                onClick={() => onModuleChange(module.id)}
                className={cn(
                  // truncate: 章标题单行，过长省略——换行会把行高撑离左侧 32px 圆环。
                  'min-w-0 flex-1 -translate-y-px truncate rounded-full px-3 text-left text-[15px] leading-8 font-normal transition-colors',
                  activeModule?.id === module.id
                    ? 'bg-zinc-200/55 text-zinc-900'
                    : 'text-zinc-800 hover:bg-zinc-200/30'
                )}
              >
                {module.title}
              </button>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
