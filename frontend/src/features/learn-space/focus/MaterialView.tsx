import { useEffect, useState } from 'react'
import { ExternalLink, ImageOff, Loader2 } from 'lucide-react'

import { fetchMaterialObjectUrl } from '@/features/docs/docApi'
import { PdfViewer } from '@/features/docs/pdf/PdfViewer'
import {
  categoryToIconBgMap,
  categoryToIconMap,
  categoryToLabelMap,
  getFileCategory,
  type FileCategory,
} from '@/lib/fileType'
import { cn } from '@/lib/utils'

/**
 * 聚焦模式里的**非文本资料** —— 上传的 PDF／图片在正文区该看到什么。
 *
 * 来由：上传件**没有 `blocks` 行**（`create_material_page` 只写页面那一行，见
 * `services/doc_service.py:126-158`），所以原来翻到一份 PDF／图片，正文区是**一片
 * 空白** —— 漫游到它就是断的。这一版按类型分三支：**PDF 真渲染**（`PdfViewer`）、
 * 图片内联预览、其它文件给一张文件卡 —— 三支都说同一句实话。
 *
 * 这一轮上传件是**只读**的（设计 §10 的"可以记笔记"留到 v1，需要后端配合），
 * 所以这里不出现编辑区，也不出现"开始写"这种点了会写出半份东西的入口。
 */
export interface MaterialViewProps {
  pageId: string
  /** 上传时的原始文件名（含扩展名）—— 类型从它和 `mime` 一起算。 */
  originalName: string
  mime?: string | null
  /**
   * 评审模式（`/preview/focus`）：**不连后端**。
   *
   * 这条不只是"省一次请求"：读接口在 token 后面，免登录的预览里去取会 401，
   * 而 401 的处理是登出跳转 —— 预览页会当场坏掉。所以预览里既不取图也不开新
   * 标签，按钮明确禁用并写清原因（判据 5：不做点了没反应的入口）。
   */
  isPreview?: boolean
}

const HONEST_LINE = '这份只有文件本身，没有可改的正文。'

export function MaterialView({
  pageId,
  originalName,
  mime,
  isPreview = false,
}: MaterialViewProps) {
  const category = getFileCategory(originalName)
  const isImage = (mime ?? '').startsWith('image/') || category === 'image'
  const isPdf = (mime ?? '').includes('application/pdf') || category === 'pdf'
  const kind = isImage ? 'image' : isPdf ? 'pdf' : 'file'

  return (
    <div className="space-y-3" data-focus-material={kind}>
      {isImage ? (
        <ImagePreview
          pageId={pageId}
          originalName={originalName}
          isPreview={isPreview}
        />
      ) : isPdf ? (
        <PdfViewer
          pageId={pageId}
          fileName={originalName}
          isPreview={isPreview}
        />
      ) : (
        <FileCard
          pageId={pageId}
          originalName={originalName}
          category={category}
          isPreview={isPreview}
        />
      )}
      <p className="text-[12px] leading-5 text-zinc-400">{HONEST_LINE}</p>
    </div>
  )
}

/**
 * 图片 → 内联预览。
 *
 * 读接口在 token 后面，所以不能直接 `<img src="/api/...">`：取回 blob 再换成
 * object URL 交给浏览器显示；离开这一份（或换页）时立刻回收，不留给下一次。
 */
function ImagePreview({
  pageId,
  originalName,
  isPreview,
}: {
  pageId: string
  originalName: string
  isPreview: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (isPreview) return
    // 换一份资料时这个组件会跟着 `FocusDocument` 一起重挂（key 是 pageId），
    // 所以这里不需要"先把 url 清空"——新实例本来就是空的。
    let disposed = false
    let created: string | null = null
    fetchMaterialObjectUrl(pageId)
      .then((next) => {
        if (disposed) {
          URL.revokeObjectURL(next)
          return
        }
        created = next
        setUrl(next)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [isPreview, pageId])

  if (isPreview) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
        <span className="text-[12px] text-zinc-400">
          图片会在聚焦里内联显示（评审入口不取图）
        </span>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-[13px] text-zinc-500 dark:border-zinc-800">
        <ImageOff className="size-4 shrink-0 text-zinc-400" />
        这张图片读不出来。
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
        <Loader2 className="size-4 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={originalName}
      className="max-h-[70vh] max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
    />
  )
}

/** 其它文件（Word／表格／演示／音视频等）→ 一张文件卡：类型图标 + 文件名 + 类型标签 + 打开出口。 */
function FileCard({
  pageId,
  originalName,
  category,
  isPreview,
}: {
  pageId: string
  originalName: string
  category: FileCategory
  isPreview: boolean
}) {
  const Icon = categoryToIconMap[category]
  const [note, setNote] = useState<string | null>(null)

  const open = async () => {
    setNote(null)
    try {
      const url = await fetchMaterialObjectUrl(pageId)
      window.open(url, '_blank', 'noopener')
      // 新标签页已经拿到这份 blob，给它一分钟再回收（与网格里同一套收尾）。
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setNote('打不开这份文件，稍后再试。')
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg text-white',
            categoryToIconBgMap[category]
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{originalName}</p>
          <p className="text-[12px] text-zinc-400">{categoryToLabelMap[category]}</p>
        </div>
        <button
          type="button"
          onClick={() => void open()}
          disabled={isPreview}
          title={isPreview ? '评审入口不连后端，登录后可用' : undefined}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ExternalLink className="size-3.5" />
          在新标签打开
        </button>
      </div>
      {note && <p className="mt-2 text-[12px] text-amber-600">{note}</p>}
    </div>
  )
}