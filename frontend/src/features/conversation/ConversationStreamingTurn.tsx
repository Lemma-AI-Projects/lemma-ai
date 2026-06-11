import { useMemo } from 'react'
import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssistantMarkdown } from './markdown'
import type { ConversationChatStatus } from './useConversationChat'

/**
 * 进行中的 AI 回答区域：等首字时显示"思考中"，流式输出时渲染增量
 * markdown，出错时保留已生成文字并在下方给出错误提示 + 重试。
 * 回答定稿后由 ConversationMessageList 接管展示，本组件返回 null。
 */
export function ConversationStreamingTurn({
  status,
  text,
  errorMessage,
  onRetry,
}: {
  status: ConversationChatStatus
  text: string
  errorMessage: string | null
  onRetry: () => void
}) {
  const content = useMemo(() => {
    if (text.length === 0) {
      return null
    }
    return (
      <div data-slot="conversation-turn-content" data-role="assistant" className="w-full min-w-0">
        <AssistantMarkdown isStreaming={status !== 'error'} className="text-foreground">
          {text}
        </AssistantMarkdown>
      </div>
    )
  }, [status, text])

  if (status === 'idle') {
    return null
  }

  return (
    <section data-slot="conversation-streaming-turn" className="flex w-full flex-col gap-3 pb-6">
      {status === 'submitted' && (
        <p className="animate-pulse text-sm text-zinc-400">思考中…</p>
      )}

      {content}

      {status === 'error' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">{errorMessage ?? '出错了，请重试'}</p>
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
        </div>
      )}
    </section>
  )
}
