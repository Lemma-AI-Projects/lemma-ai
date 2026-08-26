import { useState } from 'react'
import { Bot, FolderOpen, GraduationCap } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { BoardCanvas } from '@/features/board/BoardCanvas'
import { ProjectChatList } from '@/features/project/ProjectChatList'
import { ProjectComponentPlaceholder } from '@/features/project/ProjectComponentPlaceholder'
import { ProjectInput } from '@/features/project/ProjectInput'
import { ProjectPageActions } from '@/features/project/ProjectPageActions'
import { ProjectSourceList } from '@/features/project/ProjectSourceList'
import { ProjectTabs, type ProjectTab } from '@/features/project/ProjectTabs'
import { useProjectQuery } from '@/features/project/projectApi'
import { isNotFoundError } from '@/lib/apiUtils'

/**
 * Learn space 内部页（/project/:id）—— 画板优先的工作台
 * 布局：底层是整区全铺的 Board 画布；空间名 / agent 在场 / 组件 tab 悬浮于顶部，
 * 对话 & 课程规划入口悬浮于底部；其余组件 tab (Chats/Courses/Sources) 切换到
 * 整区可滚动面板（仍在底层，chrome 不变）。
 * - 画板是 Learn Space 的「长知识」主面，必须铺满可视区（不再被 48rem 卡片 + 定高
 *   框死），chrome 悬浮其上，滚动只属于画布平移而非整页。
 * - agent 是「在这空间里陪你的人」：在线点 + 名字 + 人设，点底部输入即开聊。
 */
export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ProjectTab>('Board')
  const projectQuery = useProjectQuery(id)

  // 项目内发起新对话：复用首页接力模式，带 projectId 进入 chat 页，
  // 新会话直接诞生在该项目里；Course Planning 开关一并带入。
  const handleSend = (text: string, options?: { tool?: 'course_planning' }) => {
    window.history.pushState(
      {},
      '',
      `/chat?prefill=${encodeURIComponent(text)}${
        id ? `&projectId=${encodeURIComponent(id)}` : ''
      }${options?.tool === 'course_planning' ? '&tool=course_planning' : ''}`
    )
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  if (projectQuery.isError && isNotFoundError(projectQuery.error)) {
    return (
      <div className="relative flex h-full items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50">
        <p className="text-sm text-zinc-400">{t('learnSpace.loadFailed')}</p>
      </div>
    )
  }

  if (projectQuery.isError) {
    return (
      <div className="relative flex h-full items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50">
        <p className="text-sm text-zinc-400">{t('learnSpace.loadFailed')}</p>
      </div>
    )
  }

  const projectName = projectQuery.data?.name ?? ''
  const agentName = projectQuery.data?.agentName
  const agentPersonality = projectQuery.data?.agentPersonality

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-zinc-50">
      {/* 顶部悬浮 chrome：空间名 + agent 在场 + 组件 tab（画布之上，紧凑） */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-6 pt-4">
        <div className="pointer-events-auto flex w-full max-w-4xl flex-col gap-1.5 bg-gradient-to-b from-zinc-50/95 to-transparent py-2">
          <div className="flex min-w-0 items-center gap-3">
            <FolderOpen
              className="size-6 shrink-0 text-foreground"
              strokeWidth={1.75}
            />
            {projectQuery.isPending ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <h1 className="truncate text-lg font-medium text-foreground">
                {projectName}
              </h1>
            )}
            {agentName && (
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-200">
                  <Bot className="size-3 text-zinc-500" />
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-zinc-50" />
                </span>
                <span className="truncate font-medium text-zinc-600">
                  {agentName}
                </span>
                {agentPersonality && (
                  <span className="hidden truncate sm:inline">
                    · {agentPersonality}
                  </span>
                )}
                <span className="shrink-0 text-zinc-400">
                  {t('learnSpace.agentOnline')}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <ProjectTabs value={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </div>

      {/* 底部悬浮：对话 / 课程规划入口（画布之上，居中） */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4">
        <div className="pointer-events-auto w-full max-w-2xl">
          <ProjectInput onSend={handleSend} className="shadow-xl ring-1 ring-zinc-100" />
        </div>
      </div>

      {/* 底层 surface：Board 全铺 / 其余组件 tab 为整区可滚动面板 */}
      <div className="relative z-10 min-h-0 flex-1">
        {activeTab === 'Board' ? (
          <BoardCanvas key={id} learnSpaceId={id!} fullBleed />
        ) : (
          <div className="h-full overflow-y-auto px-6 pt-20 pb-28">
            <div className="mx-auto w-full max-w-[48rem]">
              {activeTab === 'Chats' && (
                <ProjectChatList projectId={id!} projectName={projectName} />
              )}
              {activeTab === 'Courses' && (
                <ProjectComponentPlaceholder
                  icon={GraduationCap}
                  titleKey="nav.courses"
                  descKey="learnSpace.coursesPlaceholderDesc"
                />
              )}
              {activeTab === 'Sources' && <ProjectSourceList projectId={id!} />}
            </div>
          </div>
        )}
      </div>

      {/* 空间操作（重命名/分享/…）悬浮右上，永远在 chrome 之上 */}
      <ProjectPageActions projectId={id} projectName={projectName} />
    </div>
  )
}