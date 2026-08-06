import { useState } from 'react'
import { Bot, FolderOpen, GraduationCap, LayoutGrid, MessageCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectChatList } from '@/features/project/ProjectChatList'
import { ProjectComponentPlaceholder } from '@/features/project/ProjectComponentPlaceholder'
import { ProjectInput } from '@/features/project/ProjectInput'
import { ProjectPageActions } from '@/features/project/ProjectPageActions'
import { ProjectSourceList } from '@/features/project/ProjectSourceList'
import { ProjectTabs, type ProjectTab } from '@/features/project/ProjectTabs'
import { useProjectQuery } from '@/features/project/projectApi'
import { isNotFoundError } from '@/lib/apiUtils'

/**
 * Learn space 内部页（/project/:id）
 * 布局：头部（空间名 + agent 在场）→ 组件栏（Board/对话/课程/来源）→ 主内容
 * - 默认进 Board（知识长的地方）
 * - agent 是"在这空间里陪你的人"：头像 + 在线点 + 名字 + 一键开聊
 * - Board / Courses 为诚实占位（E1 接入画布、课程绑定后填充）
 */
export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ProjectTab>('Board')
  const projectQuery = useProjectQuery(id)

  // 项目内发起新对话：复用首页接力模式，带 projectId 进入 chat 页，
  // 新会话直接诞生在该项目里；Course Planning 开关一并带入。
  const handleSend = (text: string, options?: { tool?: 'course_planning' }) => {
    navigate('/chat', {
      state: {
        initialMessage: text,
        messageKey: crypto.randomUUID(),
        projectId: id,
        tool: options?.tool,
      },
    })
  }

  // 和空间绑定的 agent 开聊：进入空间内对话（人格经 C1 注入后 TA 就在对话里）
  const handleChatWithAgent = () => {
    navigate('/chat', {
      state: { messageKey: crypto.randomUUID(), projectId: id },
    })
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
    <div className="relative h-full rounded-md border border-zinc-200/80 bg-zinc-50">
      <ProjectPageActions projectId={id} projectName={projectName} />
      <div className="flex h-full flex-col items-center justify-start overflow-y-auto px-6 pt-[8%]">
        <div className="flex w-full max-w-[48rem] flex-col">
          {/* 头部：空间名 + agent 在场 */}
          <div className="mb-7 flex items-start justify-between gap-4">
            <div className="flex translate-x-2 items-start gap-3">
              <FolderOpen
                className="size-9 shrink-0 text-foreground"
                strokeWidth={1.75}
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                {projectQuery.isPending ? (
                  <Skeleton className="h-8 w-56" />
                ) : (
                  <h1 className="text-2xl font-medium text-foreground">
                    {projectName}
                  </h1>
                )}
                {agentName && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-200">
                      <Bot className="size-3 text-zinc-500" />
                      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-zinc-50" />
                    </span>
                    <span className="truncate font-medium text-zinc-600">
                      {agentName}
                    </span>
                    {agentPersonality && (
                      <span className="hidden truncate sm:inline">· {agentPersonality}</span>
                    )}
                    <span className="shrink-0 text-zinc-400">
                      {t('learnSpace.agentOnline')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {agentName && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full bg-transparent"
                onClick={handleChatWithAgent}
              >
                <MessageCircle className="size-3.5" />
                {t('learnSpace.chatWithAgent')}
              </Button>
            )}
          </div>

          <ProjectInput onSend={handleSend} />
          <div className="mt-7 translate-x-3">
            <ProjectTabs value={activeTab} onChange={setActiveTab} />
          </div>

          {activeTab === 'Board' && (
            <ProjectComponentPlaceholder
              icon={LayoutGrid}
              titleKey="learnSpace.boardPlaceholderTitle"
              descKey="learnSpace.boardPlaceholderDesc"
            />
          )}
          {activeTab === 'Chats' && (
            <div className="mt-4">
              <ProjectChatList projectId={id!} projectName={projectName} />
            </div>
          )}
          {activeTab === 'Courses' && (
            <ProjectComponentPlaceholder
              icon={GraduationCap}
              titleKey="nav.courses"
              descKey="learnSpace.coursesPlaceholderDesc"
            />
          )}
          {activeTab === 'Sources' && (
            <div className="mt-4">
              <ProjectSourceList projectId={id!} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
