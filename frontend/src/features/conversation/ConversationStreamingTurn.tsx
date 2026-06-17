import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConversationThinkingIndicator } from './ConversationThinkingIndicator'
import { AssistantMarkdown } from './markdown'
import type { ConversationChatStatus } from './useConversationChat'

/**
 * 进行中的 AI 回答区域：等首字时显示"思考中"，流式输出时渲染增量
 * markdown。出错时半截内容已由状态机定稿进消息列表（后端已落库），
 * 这里只渲染错误横幅；canRetry（首字后出错）时附重试按钮，首字前
 * 失败则草稿已还原到输入框，用户重新发送即重试。
 */
export function ConversationStreamingTurn({
  status,
  text,
  errorMessage,
  canRetry,
  onRetry,
}: {
  status: ConversationChatStatus
  text: string
  errorMessage: string | null
  canRetry: boolean
  onRetry: () => void
}) {
  if (status === 'idle') {
    return null
  }

  return (
    <section data-slot="conversation-streaming-turn" className="flex w-full flex-col gap-3 pb-6">
      {status === 'submitted' && (
        <ConversationThinkingIndicator />
      )}

      {status === 'streaming' && text.length > 0 && (
        <div data-slot="conversation-turn-content" data-role="assistant" className="w-full min-w-0">
          <AssistantMarkdown isStreaming className="text-foreground">
            {text}
          </AssistantMarkdown>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">{errorMessage ?? '出错了，请重试'}</p>
          {canRetry && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-full bg-transparent"
              onClick={onRetry}
            >
              <RotateCw className="size-3" />
              重试
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
