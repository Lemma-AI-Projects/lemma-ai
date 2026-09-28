import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  FileText,
  Folder,
  FolderOpen,
  Lightbulb,
  ListChecks,
  SquarePen,
  Upload,
} from 'lucide-react'

import { LemmaMark } from '@/components/LemmaMark'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import { useConversationMessagesQuery } from '@/features/conversation/conversationApi'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import { useConversationChat } from '@/features/conversation/useConversationChat'
import { useImportPageMutation } from '@/features/docs/docApi'
import {
  IMPORT_MAX_BYTES,
  describeImportError,
  isImportableName,
} from '@/features/docs/importFile'
import { cn } from '@/lib/utils'

/** 顶栏图标按钮：与工作台其它圆形按钮同一套形状，只是尺寸收到 32。 */
const HEADER_ICON_BUTTON =
  'flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 disabled:cursor-default disabled:text-zinc-300 disabled:hover:bg-transparent'

/**
 * 输入框上方的快捷胶囊。
 *
 * 参考稿那一排（Expert Pack / 演示 / 文档）是「换个姿势问」的入口，不是装饰：
 * 点了就把整句话发出去，所以每颗胶囊都自带完整提示词。
 */
const QUICK_PROMPTS = [
  {
    icon: ListChecks,
    label: '出套练习',
    prompt: '根据这个空间里的资料，给我出一套练习题。',
  },
  {
    icon: FileText,
    label: '总结重点',
    prompt: '把这个空间里的资料重点总结一下。',
  },
  {
    icon: Lightbulb,
    label: '解释概念',
    prompt: '帮我讲清楚这个空间里最核心的概念。',
  },
]

/** 空态欢迎区：标 + 衬线斜体问候 + 能力要点。 */
function ConversationWelcome({ spaceName }: { spaceName: string }) {
  return (
    <div className="pt-7">
      <div className="flex items-center gap-3">
        <LemmaMark className="size-9 shrink-0" />
        <p className="truncate font-serif text-[28px] italic leading-none text-zinc-900">
          您好
        </p>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-zinc-500">
        {`选择资料或输入提示词，我来帮你读懂「${spaceName}」`}
      </p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[13px] leading-5 text-zinc-600 marker:text-zinc-300">
        <li>读懂这个空间里的资料，随时问我</li>
        <li>把资料整理成一门能上的课</li>
        <li>生成测验和复习卡片</li>
      </ul>
    </div>
  )
}

export interface ConversationPanelProps {
  /**
   * 当前 learn space（新会话诞生在它里面）。
   * 可选：`/preview/` 下的纯 mock 预览页没有真实空间，那里聊天与上传都不可用 ——
   * 输入框保持禁用并写明原因，而不是给一个发不出去的框。
   */
  projectId?: string
  /** 用于欢迎语与底部归属行里的空间名。 */
  spaceName: string
  /**
   * 面板当前对话的 id；`null` = 新对话。由调用方持有，因为文档系统
   * 面板（同一屏的左侧）也要知道「现在这轮在哪段对话里」。
   */
  conversationId: string | null
  /** 当前对话的名字（画布节点标题）；新对话或还没起名时为空，标题退回兜底文案。 */
  conversationTitle?: string
  onConversationChange: (conversationId: string | null) => void
  /**
   * 顶栏「空间资料」入口：打开左侧文档系统。
   * 不给（mock 预览页）时图标仍占位但置灰 —— 顶栏是一整条功能栏，
   * 预览页缺一个图标就看不出它长什么样。
   */
  onOpenDocuments?: () => void
  className?: string
}

/**
 * 右侧对话面板 —— **真的在跑对话**（参考稿里那一版只是把输入接力到 /chat）。
 *
 * 它和 /chat 页面共用同一条链路：`useConversationChat` + `streamChat` + 同一组
 * Conversation* 组件。没有第二套实现，所以「工作台里看到的」和「对话页看到的」
 * 不可能是两回事 —— 包括每条回答下面那条 Agent Context。
 *
 * 顶栏是参考稿那条功能栏：新对话 · 上传文件 · 空间资料。三个都有真去处 ——
 * 「上传文件」走的就是文档系统的 /pages/import，落到本空间资料里（Agent 因此读得到），
 * 不是只把文件名贴在气泡上的假附件。
 *
 * 空间归属靠 `projectId`：新会话诞生在当前空间里，于是服务端算 Space Context
 * 时不需要任何人额外传话。
 */
export function ConversationPanel({
  projectId,
  spaceName,
  conversationId,
  conversationTitle,
  onConversationChange,
  onOpenDocuments,
  className,
}: ConversationPanelProps) {
  const [draft, setDraft] = useState('')
  const [uploadNotice, setUploadNotice] = useState<{
    text: string
    isError: boolean
  } | null>(null)

  const chat = useConversationChat({
    conversationId: conversationId ?? undefined,
    onConversationAdopted: (id) => onConversationChange(id),
    onRestoreDraft: setDraft,
  })

  const importPage = useImportPageMutation(projectId ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 本轮自建的会话内存态即完整历史，不启用回填；带 id 进来时才拉历史快照。
  const isPersistedConversation =
    Boolean(conversationId) && conversationId !== chat.selfCreatedId
  const messagesQuery = useConversationMessagesQuery(conversationId ?? undefined, {
    enabled: isPersistedConversation,
  })

  const turns = useMemo(() => {
    const historyTurns = createConversationTurns(
      `${conversationId ?? 'new'}-history`,
      (messagesQuery.data ?? []).map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
        agentContext: message.agentContext,
      }))
    )
    const liveTurns = createConversationTurns(
      `${conversationId ?? 'new'}-live`,
      chat.liveMessages.map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
        agentContext: message.agentContext,
      }))
    )
    return [...historyTurns, ...liveTurns]
  }, [conversationId, messagesQuery.data, chat.liveMessages])

  const isBusy = chat.status === 'submitted' || chat.status === 'streaming'
  const isWelcome = turns.length === 0 && !isBusy
  const title = conversationTitle?.trim() || (conversationId ? '对话' : '新对话')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chat.status === 'submitted') {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [chat.status])

  const handleSend = (text: string) => {
    chat.send(text, { projectId })
  }

  const handleNewConversation = () => {
    chat.stop()
    setDraft('')
    onConversationChange(null)
  }

  const handleUploadClick = () => {
    setUploadNotice(null)
    fileInputRef.current?.click()
  }

  const handleFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // 先清 value：选同一个文件两次也要能再次触发 change。
    event.target.value = ''
    if (!file) return
    if (file.size > IMPORT_MAX_BYTES) {
      setUploadNotice({
        text: '文件超过 1 MB —— V1 只收 1 MB 以内的文本。',
        isError: true,
      })
      return
    }
    if (!isImportableName(file.name)) {
      setUploadNotice({
        text: 'V1 只收文本（.md / .txt）。PDF、Word 这类还不能进来。',
        isError: true,
      })
      return
    }
    setUploadNotice(null)
    importPage.mutate(
      { file },
      {
        onSuccess: () =>
          setUploadNotice({
            text: `已把「${file.name}」放进空间资料，我这就读得到它了。`,
            isError: false,
          }),
        onError: (error) =>
          setUploadNotice({ text: describeImportError(error), isError: true }),
      }
    )
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white',
        className
      )}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 pl-5 pr-3">
        <h2 className="truncate text-[15px] font-medium text-zinc-900">{title}</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleNewConversation}
            aria-label="新对话"
            title="新对话"
            className={HEADER_ICON_BUTTON}
          >
            <SquarePen className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={!projectId || importPage.isPending}
            aria-label="上传文件"
            title={
              projectId
                ? '上传文件：.md / .txt，放进这个空间的资料'
                : '预览页没有真实空间，上传不可用'
            }
            className={HEADER_ICON_BUTTON}
          >
            <Upload className="size-4" />
          </button>
          {/* 渲染但禁用，而不是不渲染：顶栏是一整条功能栏，预览页（布局评审面）
              缺一个图标就看不出它长什么样。没有真实空间时按不下去，但不缺席。 */}
          <button
            type="button"
            onClick={onOpenDocuments}
            disabled={!onOpenDocuments}
            aria-label="空间资料"
            title={
              onOpenDocuments
                ? '空间资料：这个空间里的文件与笔记'
                : '预览页没有真实空间，资料不可用'
            }
            className={HEADER_ICON_BUTTON}
          >
            <FolderOpen className="size-4" />
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={handleFilePicked}
      />

      <div ref={scrollRef} className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-5 pb-2">
        {isWelcome ? (
          <ConversationWelcome spaceName={spaceName} />
        ) : (
          <ConversationMessageList turns={turns} />
        )}

        <ConversationStreamingTurn
          status={chat.status}
          text={chat.streamingText}
          reasoningText={chat.streamingReasoningText}
          tool={chat.streamingTool}
          errorMessage={chat.errorMessage}
          canRetry={chat.canRetry}
          onRetry={chat.retry}
        />
      </div>

      <div className="shrink-0 px-3 pb-3">
        {uploadNotice && (
          <p
            className={cn(
              'mb-2 px-1 text-xs leading-5',
              uploadNotice.isError ? 'text-amber-700' : 'text-zinc-500'
            )}
          >
            {uploadNotice.text}
          </p>
        )}

        {/* 快捷胶囊只在空态出现：它替代的是「第一句话」，聊起来之后就没有位置了。
            没有真实空间时渲染但禁用 —— 预览页是布局评审面，缺一行就看不出这块长什么样。 */}
        {isWelcome && (
          <div className="scrollbar-hidden mb-2 flex items-center gap-1.5 overflow-x-auto px-1">
            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                type="button"
                disabled={!projectId}
                onClick={() => handleSend(prompt)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-default disabled:text-zinc-400 disabled:hover:bg-white"
              >
                <Icon className="size-3.5 text-zinc-400" />
                {label}
              </button>
            ))}
          </div>
        )}

        {projectId ? (
          <ConversationInput
            value={draft}
            onValueChange={setDraft}
            isStreaming={isBusy}
            onSend={handleSend}
            onStop={chat.stop}
            placeholder="输入你的问题，或直接粘贴资料…"
          />
        ) : (
          <div className="flex h-11 items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500">
            预览页没有真实空间，聊天不可用。
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5 px-1 text-xs text-zinc-500">
          <Folder className="size-3.5 shrink-0" />
          <span className="truncate">{spaceName}</span>
        </div>
      </div>
    </aside>
  )
}