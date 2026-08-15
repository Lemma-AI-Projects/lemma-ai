import { Coins, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DesmosGraphCard } from '@/features/desmos/DesmosGraphCard'
import { ConversationReasoning } from './ConversationReasoning'
import { AssistantMarkdown } from './markdown'
import type { ConversationToolRef } from './types'

export type ConversationStreamingTurnStatus =
  | 'idle'
  | 'submitted'
  | 'preparing'
  | 'streaming'
  | 'error'

/**
 * 进行中的 AI 回答区域：等首字时显示"思考中"，流式输出时渲染增量
 * markdown。出错时半截内容已由状态机定稿进消息列表（后端已落库），
 * 这里只渲染错误横幅；canRetry（首字后出错）时附重试按钮，首字前
 * 失败则草稿已还原到输入框，用户重新发送即重试。
 * insufficient_credits 时展示「去充值」引导，跳转充值页。
 */
export function ConversationStreamingTurn({
  status,
  text,
  reasoningText,
  tool = null,
  errorMessage,
  errorCode = null,
  canRetry,
  waitingMessage = 'Thinking...',
  onRetry,
  onTopUp,
}: {
  status: ConversationStreamingTurnStatus
  text: string
  reasoningText: string
  /** Tool card already attached mid-stream (e.g. desmos_graph): rendered live
   *  so the closing explanation can point at a visible graph. course_planning
   *  keeps its existing finalize-time rendering. */
  tool?: ConversationToolRef | null
  errorMessage: string | null
  /** 错误码（如 insufficient_credits），决定是否展示充值引导。 */
  errorCode?: string | null
  canRetry: boolean
  waitingMessage?: string
  onRetry: () => void
  /** 积分不足时展示「去充值」按钮的跳转回调。 */
  onTopUp?: () => void
}) {
  if (status === 'idle') {
    return null
  }

  return (
    <section data-slot="conversation-streaming-turn" className="flex w-full flex-col gap-3 pb-6">
      {status === 'submitted' && (
        <ConversationReasoning content="" isStreaming />
      )}

      {status === 'preparing' && (
        <p className="animate-pulse text-sm text-zinc-400">{waitingMessage}</p>
      )}

      {status === 'streaming' && reasoningText.length > 0 && (
        <ConversationReasoning content={reasoningText} isStreaming />
      )}

      {status === 'streaming' && text.length > 0 && (
        <div data-slot="conversation-turn-content" data-role="assistant" className="w-full min-w-0">
          <AssistantMarkdown isStreaming className="text-foreground">
            {text}
          </AssistantMarkdown>
        </div>
      )}

      {status === 'streaming' &&
        (tool?.type === 'desmos_graph' || tool?.type === 'desmos_3d_graph') && (
          <DesmosGraphCard graphId={tool.graphId} />
        )}

      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-destructive">{errorMessage ?? '出错了，请重试'}</p>
          {errorCode === 'insufficient_credits' && onTopUp && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-full bg-transparent"
              onClick={onTopUp}
            >
              <Coins className="size-3" />
              去充值
            </Button>
          )}
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
