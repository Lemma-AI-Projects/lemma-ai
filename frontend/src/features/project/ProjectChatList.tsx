import { useNavigate } from 'react-router-dom'
import { getProjectChatItems } from './getProjectChatItems'
import { ProjectChatItemMenu } from './ProjectChatItemMenu'

export function ProjectChatList({ projectId, projectName }: { projectId: string; projectName: string }) {
  const navigate = useNavigate()
  const chats = getProjectChatItems(projectId)

  if (chats.length === 0) return null

  return (
    <ol className="divide-y divide-border">
      {chats.map((chat) => (
        <li
          key={chat.chatId}
          className="group/chat-item flex min-h-16 cursor-pointer items-center p-3 hover:bg-muted/50"
          onClick={() => navigate(`/chat/${chat.chatId}`)}
        >
          <div className="min-w-0 grow">
            <p className="truncate text-sm font-medium">{chat.title}</p>
            <p className="truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
          </div>
          <div className="relative flex min-w-10 shrink-0 items-center justify-end">
            <span className="whitespace-nowrap text-sm text-muted-foreground transition-opacity group-hover/chat-item:opacity-0">
              {chat.date}
            </span>
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center opacity-0 transition-opacity group-hover/chat-item:pointer-events-auto group-hover/chat-item:opacity-100">
              <ProjectChatItemMenu chatId={chat.chatId} projectName={projectName} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
