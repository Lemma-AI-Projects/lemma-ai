import { X } from 'lucide-react'

import { type ComposerAttachment } from '@/features/home/composer/composerAttachments'
import { ComposerAttachmentIcon } from '@/features/home/composer/ComposerAttachParts'

// 已经附到这次对话上的参考资料：输入卡顶部的一排小胶囊，每个都可以单独移除。
export function ComposerAttachmentChips({
  attachments,
  onRemove,
}: {
  attachments: ComposerAttachment[]
  onRemove: (attachment: ComposerAttachment) => void
}) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <ul aria-label="已附上的参考资料" className="flex flex-wrap gap-1.5 px-3 pt-3">
      {attachments.map((attachment) => (
        <li
          key={attachment.id}
          className="flex h-7 max-w-56 items-center gap-1.5 rounded-full bg-zinc-100 pr-1 pl-2.5 text-[13px] leading-5 text-zinc-900"
        >
          <ComposerAttachmentIcon
            attachment={attachment}
            className="size-3.5 shrink-0 text-zinc-500"
          />
          <span className="min-w-0 truncate">{attachment.title}</span>
          <button
            type="button"
            aria-label={`移除 ${attachment.title}`}
            onClick={() => onRemove(attachment)}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:bg-zinc-200 hover:text-zinc-700 focus-visible:bg-zinc-200 focus-visible:text-zinc-700"
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}
