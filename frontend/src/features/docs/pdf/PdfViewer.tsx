import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileType,
  Loader2,
  Minus,
  Plus,
} from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

import { fetchMaterialObjectUrl } from '@/features/docs/docApi'
import { categoryToIconBgMap } from '@/lib/fileType'
import { cn } from '@/lib/utils'
import { loadPdfDocument } from './loadPdf'
import { clampPage, clampScale, fitScale, pageLabel, stepZoom } from './pdfView'

type PdfStatus = 'loading' | 'ready' | 'error'

export interface PdfViewerProps {
  /** 页面 id —— 走和图片预览同一条鉴权链路取字节。 */
  pageId: string
  /** 原始文件名（含扩展名），工具栏上显示的就是它。 */
  fileName: string
  /**
   * 评审模式（`/preview/focus`）：**不连后端**。
   *
   * 免登录去取字节会 401，而 401 的处理是登出跳转 —— 预览页会当场坏掉。所以预览里
   * 既不取字节也不解析，只画**外壳**（工具栏 + 占位），并把出口明确禁用、写清原因
   * （判据 5：不做点了没反应的入口）。
   */
  isPreview?: boolean
  className?: string
}

/**
 * PDF 阅读器 —— 聚焦模式里翻到一份上传的 PDF 时正文区该看到的东西。
 *
 * 三件难事在这里一次交代清楚：
 *
 * 1. **鉴权取字节。** 读接口在 Bearer 后面，不能直接 `<iframe src="/api/...">`。先
 *    `fetchMaterialObjectUrl` 拿回 blob URL，再交给 pdf.js —— 和图片内联预览同路。
 * 2. **懒加载。** `pdfjs-dist` 只在真的解析一份 PDF 时才 `import()`（见 `loadPdf.ts`），
 *    没打开 PDF 时首屏不会去下那个几百 KB 的 chunk。
 * 3. **渲染到 canvas。** 首页按容器宽度适配（`fitScale`），可缩放、可翻页；翻页/缩放
 *    会取消上一帧（`task.cancel()`），所以取消当成常态，不弹给用户。
 *
 * 渲染之外的所有算术（夹紧、适配、步进）都在 `pdfView.ts` 里，单独可单测 —— 没有
 * jsdom 的环境里，"画得对不对"只能靠浏览器真跑，但"算得对不对"必须在那之前钉住。
 */
export function PdfViewer({
  pageId,
  fileName,
  isPreview = false,
  className,
}: PdfViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [status, setStatus] = useState<PdfStatus>('loading')
  const [pageIndex, setPageIndex] = useState(0)
  // `null` = 适应宽度（跟着容器走）；用户按过缩放后才有具体值。
  const [zoom, setZoom] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [baseWidth, setBaseWidth] = useState(0)
  const [note, setNote] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 取字节 → 解析。预览里不取（401 会让预览页登出跳转）。
  useEffect(() => {
    if (isPreview) return
    let disposed = false
    let objectUrl: string | null = null
    fetchMaterialObjectUrl(pageId)
      .then(async (url) => {
        objectUrl = url
        if (disposed) {
          URL.revokeObjectURL(url)
          return
        }
        const next = await loadPdfDocument(url)
        if (disposed) {
          // pdf.js v6 的 `PDFDocumentProxy` 没有 `destroy()`，收尾走它的 loadingTask。
          void next.loadingTask.destroy()
          return
        }
        setDoc(next)
        setStatus('ready')
      })
      .catch(() => {
        if (!disposed) setStatus('error')
      })
    return () => {
      disposed = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isPreview, pageId])

  // 换一份（重挂）或卸载时，把 pdf.js 这一份文档放掉；只发生一次（null → doc）。
  useEffect(() => {
    return () => {
      void doc?.loadingTask.destroy()
    }
  }, [doc])

  // 容器宽度：缩放适配用它。靠 ResizeObserver 的**首次回调**拿到首帧宽度，
  // 而不是在 effect 同步体里量一次（那是 setState-in-effect）。
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 渲染当前页。翻页/缩放会取消上一帧 —— 取消是常态，不当作错误。
  useEffect(() => {
    if (!doc) return
    const canvas = canvasRef.current
    if (!canvas) return
    const index = clampPage(pageIndex, doc.numPages)
    let cancelled = false
    let task: RenderTask | null = null
    void (async () => {
      const page = await doc.getPage(index + 1)
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      setBaseWidth(base.width)
      const viewport = page.getViewport({
        scale: clampScale(zoom ?? fitScale(containerWidth, base.width)),
      })
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      task = page.render({ canvas, viewport })
      await task.promise
    })().catch(() => undefined)
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, pageIndex, zoom, containerWidth])

  const total = doc?.numPages ?? 0
  const ready = status === 'ready'
  const currentScale = zoom ?? fitScale(containerWidth, baseWidth)

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

  const toolbarButton =
    'flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
  const iconButton =
    'rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800'

  return (
    <div
      data-pdf-viewer={isPreview ? 'preview' : status}
      className={cn(
        'overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md text-white',
            categoryToIconBgMap.pdf
          )}
        >
          <FileType className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {fileName}
        </span>
        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
          PDF
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="上一页"
            title="上一页"
            disabled={!ready || pageIndex <= 0}
            onClick={() => setPageIndex((index) => clampPage(index - 1, total))}
            className={iconButton}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-12 text-center text-[12px] tabular-nums text-zinc-500">
            {ready ? pageLabel(pageIndex, total) : '—'}
          </span>
          <button
            type="button"
            aria-label="下一页"
            title="下一页"
            disabled={!ready || pageIndex >= total - 1}
            onClick={() => setPageIndex((index) => clampPage(index + 1, total))}
            className={iconButton}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="缩小"
            title="缩小"
            disabled={!ready}
            onClick={() => setZoom(stepZoom(currentScale, -1))}
            className={iconButton}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            title="适应宽度"
            disabled={!ready}
            onClick={() => setZoom(null)}
            className={iconButton}
          >
            <span className="px-0.5 text-[11px]">适应宽度</span>
          </button>
          <button
            type="button"
            aria-label="放大"
            title="放大"
            disabled={!ready}
            onClick={() => setZoom(stepZoom(currentScale, 1))}
            className={iconButton}
          >
            <Plus className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void open()}
          disabled={isPreview}
          title={isPreview ? '评审入口不连后端，登录后可用' : undefined}
          className={cn(toolbarButton, 'shrink-0')}
        >
          <ExternalLink className="size-3.5" />
          在新标签打开
        </button>
      </div>

      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-auto bg-zinc-50 px-3 py-3 dark:bg-zinc-900"
      >
        {isPreview ? (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
            <span className="text-[12px] text-zinc-400">
              PDF 会在聚焦里直接翻页阅读（评审入口不取文件）
            </span>
          </div>
        ) : status === 'error' ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            <span className="text-[12px] text-zinc-400">这份 PDF 读不出来。</span>
          </div>
        ) : status === 'loading' ? (
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="size-4 animate-spin text-zinc-300" />
          </div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto block" />
        )}
      </div>

      {note && (
        <p className="border-t border-zinc-200 px-3 py-1.5 text-[12px] text-amber-600 dark:border-zinc-800">
          {note}
        </p>
      )}
    </div>
  )
}
