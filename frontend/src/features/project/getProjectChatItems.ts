import { chatItems } from '@/mock/chatItems'
import { chatMessages } from '@/mock/chatMessages'
import { projectChats } from '@/mock/projectChats'

export interface ProjectChatItem {
  chatId: string
  title: string
  lastMessage: string
  date: string
}

export function getProjectChatItems(projectId: string): ProjectChatItem[] {
  const chatIds = projectChats[projectId] ?? []

  return chatIds.map((chatId) => {
    const title = chatItems.find((c) => c.id === chatId)?.label ?? ''
    const messages = chatMessages[chatId] ?? []
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')

    return {
      chatId,
      title,
      lastMessage: lastUserMsg?.message ?? '',
      date: lastUserMsg?.date.slice(0, 10) ?? '',
    }
  })
}
