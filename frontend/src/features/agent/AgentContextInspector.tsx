import { useState, type ReactNode } from 'react'
import {
  ChevronRight,
  CircleAlert,
  FolderOpen,
  MessageSquare,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAgentContextQuery } from './agentContextApi'

interface AgentContextInspectorProps {
  projectId: string
  /** Active conversation: makes the history count in the preview real. */
  conversationId?: string
  onClose: () => void
  className?: string
}

/**
 * Context Inspector — 「Agent 到底看到了什么」。
 *
 * 这不是示意图，是**同一份装配**的另一面：后端把拼给模型的上下文一次算出来，
 * 一份进 prompt、一份原样返回给这里。所以这个面板不会与 Agent 实际拿到的东西
 * 漂移 —— 这是它存在的唯一理由，全部 UI 都服务于「肉眼可核对」：
 *
 *   来源清单（每份多大、有没有被摘录）· 这个空间里的对话 · 以及最关键的一项：
 *   **真正交给模型的 prompt 原文**（默认收起，点开就能逐字对照）。
 *
 * 刻意不做的事：不做可视化、不做评分、不解释模型为什么这么答。
 */
export function AgentContextInspector({
  projectId,
  conversationId,
  onClose,
  className,
}: AgentContextInspectorProps) {
  const query = useAgentContextQuery(projectId, conversationId)
  const context = query.data
  const [showPrompt, setShowPrompt] = useState(false)
  const [openExcerpt, setOpenExcerpt] = useState<string | null>(null)

  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-background',
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between pl-5 pr-2">
        <h2 className="text-sm font-medium text-foreground">Space Context</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void query.refetch()}
            aria-label="重新读取"
            title="重新读取"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭 Space Context"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 scrollbar-fade overflow-y-auto px-4 pb-4">
        {query.isPending ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-7 animate-pulse rounded bg-muted"
                style={{ opacity: 1 - index * 0.2 }}
              />
            ))}
          </div>
        ) : query.isError ? (
          <div className="mx-1 mt-1 flex flex-col items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3 py-6 text-center dark:bg-amber-950/20">
            <CircleAlert className="size-5 text-amber-500" strokeWidth={1.5} />
            <p className="text-[13px] text-foreground">读不到上下文</p>
            <p className="text-xs text-muted-foreground">
              后端没有回应，或这个空间不属于你。这不等于「空间是空的」。
            </p>
          </div>
        ) : context ? (
          <div className="space-y-4 py-1">
            <Section
              icon={FolderOpen}
              title="Space"
              subtitle={context.space.name}
            />

            <Section
              icon={FolderOpen}
              title="Sources"
              subtitle={`${context.sources.length} 份`}
            >
              {context.sources.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  这个空间还没有资料。
                </p>
              ) : (
                <ul className="space-y-1">
                  {context.sources.map((source) => (
                    <li key={source.id} className="text-xs leading-5">
                      <span className="text-foreground">{source.title}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {source.kind} · {source.chars} 字
                      </span>
                      {source.excerpted ? (
                        <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          已摘录
                        </span>
                      ) : (
                        <span className="ml-1 rounded bg-zinc-100 px-1 text-[10px] text-zinc-500 dark:bg-zinc-800">
                          只列了标题
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              icon={MessageSquare}
              title="Conversations"
              subtitle={`${context.conversations.length} 段`}
            >
              {context.conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground">还没有对话。</p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {context.conversations.map((conversation) => (
                      <li
                        key={conversation.id}
                        className={cn(
                          'truncate text-xs leading-5',
                          conversation.id === conversationId
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {conversation.title}
                        {conversation.id === conversationId && '（当前）'}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground/80">
                    只有标题会进 prompt；本轮的对话内容以聊天历史的形式进入。
                  </p>
                </>
              )}
            </Section>

            <Section
              icon={Sparkles}
              title="Space Memory"
              subtitle={`${context.memoriesTotal} 条`}
            >
              {context.memories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  这个空间还没有记忆 —— 当你们做出一个以后仍然成立的决定时，Agent
                  会把它记在这里（对话内说「记住…」也一样）。
                </p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {context.memories.map((memory) => (
                      <li key={memory.id} className="text-xs leading-5">
                        <span className="text-foreground">{memory.text}</span>
                        {memory.fromConversation && (
                          <span className="text-muted-foreground">
                            {' '}
                            · 来自「{memory.fromConversation}」
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {context.memoriesTotal > context.memories.length && (
                    <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground/80">
                      只列出最近 {context.memories.length} 条；更早的{' '}
                      {context.memoriesTotal - context.memories.length} 条不进 prompt。
                    </p>
                  )}
                </>
              )}
            </Section>

            <Section
              icon={Sparkles}
              title="Current Context"
              subtitle={`prompt ${context.promptChars} 字`}
            >
              <p className="text-xs text-muted-foreground">
                摘录 {context.excerptChars} 字 · 历史 {context.historyMessages} 条 ·
                预算 {context.budget.excerptTotalChars} 字（每份上限{' '}
                {context.budget.excerptPerSourceChars}）
              </p>

              {context.excerpts.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {context.excerpts.map((excerpt) => (
                    <li key={excerpt.sourceId}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenExcerpt(
                            openExcerpt === excerpt.sourceId
                              ? null
                              : excerpt.sourceId
                          )
                        }
                        className="flex w-full items-center gap-1 text-left text-xs text-foreground hover:underline"
                      >
                        <ChevronRight
                          className={cn(
                            'size-3 shrink-0 transition-transform',
                            openExcerpt === excerpt.sourceId && 'rotate-90'
                          )}
                        />
                        <span className="truncate">{excerpt.title}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {excerpt.chars} 字{excerpt.truncated ? '（截断）' : ''}
                        </span>
                      </button>
                      {openExcerpt === excerpt.sourceId && (
                        <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 text-[11px] leading-4 text-foreground dark:bg-zinc-900">
                          {excerpt.text}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setShowPrompt((current) => !current)}
                className="mt-2 flex items-center gap-1 text-xs text-foreground hover:underline"
              >
                <ChevronRight
                  className={cn(
                    'size-3 shrink-0 transition-transform',
                    showPrompt && 'rotate-90'
                  )}
                />
                交给模型的 prompt 原文
              </button>
              {showPrompt && (
                <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 text-[11px] leading-4 text-foreground dark:bg-zinc-900">
                  {context.promptBlock}
                </pre>
              )}
            </Section>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof FolderOpen
  title: string
  subtitle: string
  children?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-zinc-200/70 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className="ml-auto truncate text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </section>
  )
}
