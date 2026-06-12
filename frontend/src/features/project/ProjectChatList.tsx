import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectConversationsQuery } from './projectApi'
import { ProjectChatItemMenu } from './ProjectChatItemMenu'

export function ProjectChatList({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const navigate = useNavigate()
  const conversationsQuery = useProjectConversationsQuery(projectId)

  if (conversationsQuery.isPending) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-4/5" />
      </div>
    )
  }

  if (conversationsQuery.isError) {
    return (
      <p className="p-3 text-sm text-muted-foreground">会话列表加载失败</p>
    )
  }

  const chats = conversationsQuery.data

  if (chats.length === 0) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        还没有对话，从上面的输入框开始
      </p>
    )
  }

  return (
    <ol className="divide-y divide-border">
      {chats.map((chat) => (
        <li
          key={chat.id}
          className="group/chat-item flex min-h-16 cursor-pointer items-center p-3 hover:bg-muted/50"
          onClick={() => navigate(`/chat/${chat.id}`)}
        >
          <div className="min-w-0 grow">
            <p className="truncate text-sm font-medium">{chat.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {chat.lastMessage ?? ''}
            </p>
          </div>
          <div className="relative flex min-w-10 shrink-0 items-center justify-end">
            <span className="whitespace-nowrap text-sm text-muted-foreground transition-opacity group-hover/chat-item:opacity-0">
              {chat.updatedAt.slice(0, 10)}
            </span>
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center opacity-0 transition-opacity group-hover/chat-item:pointer-events-auto group-hover/chat-item:opacity-100">
              <ProjectChatItemMenu
                chatId={chat.id}
                projectId={projectId}
                projectName={projectName}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
