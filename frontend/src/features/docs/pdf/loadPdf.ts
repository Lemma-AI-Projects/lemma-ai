import type { PDFDocumentProxy } from 'pdfjs-dist'

/**
 * 懒加载 pdf.js。两件事都在这里定：
 *
 * 1. **动态 `import`** —— pdf.js 打包后是几百 KB，只在真的打开一份 PDF 时才进来，
 *    不拖累首屏。
 * 2. **worker** —— 解析放 worker 里做，主线程不会卡；`?url` 让 Vite 把 worker 当
 *    静态资源产出，`workerSrc` 指过去。
 */
export async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs.getDocument({ url }).promise
}
