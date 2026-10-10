import { useState } from 'react'
import { MessageSquare, Sparkles } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { UserHomeItem } from './types'

/**
 * Suggestions Inbox —— 待确认的画像建议，单独一个侧边面板。
 *
 * ## 为什么它不是「各区里内联几行」
 *
 * 原来的做法是在每个分区里内联几条虚线 chip。功能上没错，但**它把审核
 * 摊在了整个页面上**：三区分散、每处两三个动作、而用户真正想问的是
 * 「AI 到底认为我是什么样的人」。那是一个**跨分区**的问题。
 *
 * ⚠️ **代价要说清**：收进面板之后，审核时看不到「它出现在哪个分区的语境里」。
 * 所以每一条**都必须自带分区标签**（下面 `KIND_LABEL`）—— 那是它唯一的定位线索。
 * 顶部的数量提示仍留在各区分区标题上，那是「这一区还有待办」的信号。
 *
 * ## 三条硬规则在 UI 上的落实
 *
 * 1. **未确认的绝不能看起来像事实** ⇒ 面板标题写「待确认」，每条画虚线边框，
 *    且**不与已确认的条目用同一种排版**。
 * 2. **接受之前可以改** ⇒ 「改一下再存」是并列的第三个动作，不是「先接受再编辑」
 *    （后者会让一条错的话先变成事实）。
 * 3. **没有依据就说没有** ⇒ 任务书要求「如果没有真实依据，必须明确显示相关能力
 *    尚未实现，而不是伪造来源或证据」。今天系统**确实不记录**「为什么提出这条」
 *    （`propose_home_preference` 只写 `source_conversation_id`）⇒ 所以下面写的是
 *    「未记录提出依据」，**不是**编一段理由。
 */

const KIND_LABEL: Record<UserHomeItem['kind'], string> = {
  about: '关于我',
  interest: '长期关注',
  preference: '如何工作',
}

function sourceLine(item: UserHomeItem): string {
  if (item.sourceSpaceId) {
    // ⚠️ 我们只有空间 id，没有空间名 —— 而这个页面不该为了显示一句来源去拉一次
    // 空间列表。所以这里说得出「来自哪个空间的对话」，说不出是哪个空间。
    return '来自某个学习空间的对话'
  }
  return '来自你与 Lemma 的某次对话'
}

function SuggestionCard({
  item,
  onAccept,
  onAcceptEdited,
  onDismiss,
}: {
  item: UserHomeItem
  onAccept: () => void
  onAcceptEdited: (text: string) => void
  onDismiss: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)

  return (
    <li className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500">
          {KIND_LABEL[item.kind]}
        </span>
        <span className="shrink-0 text-[11px] text-zinc-400">待确认</span>
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            aria-label="修改建议内容"
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-[14px] leading-6 text-zinc-800 outline-none focus:border-zinc-400"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-full px-3 text-[12px]"
              disabled={!draft.trim()}
              onClick={() => {
                onAcceptEdited(draft.trim())
                setEditing(false)
              }}
            >
              改好了，保存
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2.5 text-[12px] text-zinc-500"
              onClick={() => {
                setDraft(item.text)
                setEditing(false)
              }}
            >
              取消
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[14.5px] leading-6 text-zinc-800">{item.text}</p>

          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-zinc-400">
            <MessageSquare className="size-3" aria-hidden />
            {sourceLine(item)}
          </p>
          {/* 诚实的那一句：系统今天不记录「为什么提出这条」。 */}
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-zinc-400">
            <Sparkles className="size-3" aria-hidden />
            系统未记录提出这条的依据
          </p>

          <div className="mt-2.5 flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-full px-3 text-[12px]"
              onClick={onAccept}
            >
              确认
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2.5 text-[12px] text-zinc-600"
              onClick={() => setEditing(true)}
            >
              改一下再存
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2.5 text-[12px] text-zinc-500"
              onClick={onDismiss}
            >
              忽略
            </Button>
          </div>
        </>
      )}
    </li>
  )
}

export function SuggestionsInbox({
  open,
  onOpenChange,
  candidates,
  onAccept,
  onAcceptEdited,
  onDismiss,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  candidates: UserHomeItem[]
  onAccept: (item: UserHomeItem) => void
  onAcceptEdited: (item: UserHomeItem, text: string) => void
  onDismiss: (item: UserHomeItem) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/*
        xl, not md: each card carries a section tag, a state, the sentence, two
        provenance lines and three actions. At md the provenance lines wrapped
        mid-phrase and the actions crowded the text.
      */}
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-zinc-200 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-[17px] font-medium">
            待确认的建议
            {candidates.length > 0 ? `（${candidates.length}）` : ''}
          </SheetTitle>
          <SheetDescription className="mt-2 text-[13px] leading-6 text-zinc-500">
            Lemma 观察你的使用后，可能提出关于你的判断。
            <strong className="text-zinc-700">在你确认之前，它只是提议</strong>
            —— 不会进入你的画像，也不会影响任何空间里的对话。
          </SheetDescription>
        </SheetHeader>

        {candidates.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center">
            <p className="text-[14px] text-zinc-500">现在没有待确认的建议</p>
            <p className="mx-auto mt-2 max-w-[30ch] text-[12.5px] leading-5 text-zinc-400">
              建议会在 Lemma 与你的长期交互中产生。出现时它们会先停在这里，
              等你决定，而不是直接变成「关于你的事实」。
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-2.5">
            {candidates.map((item) => (
              <SuggestionCard
                key={item.id}
                item={item}
                onAccept={() => onAccept(item)}
                onAcceptEdited={(text) => onAcceptEdited(item, text)}
                onDismiss={() => onDismiss(item)}
              />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
