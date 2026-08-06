import { useState } from 'react'
import { Bot, FolderOpen } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectChatList } from '@/features/project/ProjectChatList'
import { ProjectInput } from '@/features/project/ProjectInput'
import { ProjectPageActions } from '@/features/project/ProjectPageActions'
import { ProjectSourceList } from '@/features/project/ProjectSourceList'
import { ProjectTabs, type ProjectTab } from '@/features/project/ProjectTabs'
import { useProjectQuery } from '@/features/project/projectApi'
import { isNotFoundError } from '@/lib/apiUtils'

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ProjectTab>('Chats')
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

  if (projectQuery.isError && isNotFoundError(projectQuery.error)) {
    return (
      <div className="relative flex h-full items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50">
        <p className="text-sm text-zinc-400">项目不存在或已删除</p>
      </div>
    )
  }

  if (projectQuery.isError) {
    return (
      <div className="relative flex h-full items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50">
        <p className="text-sm text-zinc-400">项目加载失败，请刷新重试</p>
      </div>
    )
  }

  const projectName = projectQuery.data?.name ?? ''

  return (
    <div className="relative h-full rounded-md border border-zinc-200/80 bg-zinc-50">
      <ProjectPageActions projectId={id} projectName={projectName} />
      <div className="flex h-full flex-col items-center justify-start overflow-y-auto px-6 pt-[8%]">
        <div className="flex w-full max-w-[48rem] flex-col">
          <div className="mb-7 flex translate-x-2 items-center gap-3">
            <FolderOpen className="size-9 text-foreground" strokeWidth={1.75} />
            <div className="flex flex-col gap-1">
              {projectQuery.isPending ? (
                <Skeleton className="h-8 w-56" />
              ) : (
                <h1 className="text-2xl font-medium text-foreground">{projectName}</h1>
              )}
              {projectQuery.data?.agentName && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bot className="size-3.5" />
                  伴学：{projectQuery.data.agentName}
                  {projectQuery.data.agentPersonality
                    ? ` · ${projectQuery.data.agentPersonality}`
                    : ''}
                </span>
              )}
            </div>
          </div>
          <ProjectInput onSend={handleSend} />
          <div className="mt-7 translate-x-3">
            <ProjectTabs value={activeTab} onChange={setActiveTab} />
          </div>
          {activeTab === 'Chats' && (
            <div className="mt-4">
              <ProjectChatList projectId={id!} projectName={projectName} />
            </div>
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
