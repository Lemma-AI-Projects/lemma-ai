import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { Streamdown, type Components } from 'streamdown'
import 'katex/dist/katex.min.css'
import { createCalloutRenderers } from '@/components/calloutRenderers'
import { cn } from '@/lib/utils'

interface CourseOverviewMarkdownProps {
  children: string
  className?: string
  /** Live generation: parse incomplete Markdown so partial deltas render cleanly. */
  isStreaming?: boolean
}

// Callout 卡片（```concept 等 fence）：正文用本组件递归渲染一层，保持
// 章节笔记自己的排版；卡片内部沿用与会话域一致的 15px 内文尺寸。
const calloutRenderers = createCalloutRenderers(({ code, isIncomplete }) => (
  <CourseOverviewMarkdown
    isStreaming={isIncomplete}
    className="text-[15px] leading-7 text-zinc-800"
  >
    {code}
  </CourseOverviewMarkdown>
))

const courseOverviewMarkdownComponents: Components = {
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        'mt-7 text-[21px] font-semibold leading-7 tracking-tight text-zinc-950 first:mt-0',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        'mt-5 text-[17px] font-semibold leading-6 tracking-tight text-zinc-900',
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={cn('mt-3 leading-[26px] first:mt-0', className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        'mt-3 list-disc space-y-1 pl-6 marker:text-zinc-400 first:mt-0',
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        'mt-3 list-decimal space-y-1 pl-6 marker:text-zinc-400 first:mt-0',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn('leading-[25px]', className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn('font-semibold text-zinc-950', className)} {...props} />
  ),
}

export function CourseOverviewMarkdown({
  children,
  className,
  isStreaming = false,
}: CourseOverviewMarkdownProps) {
  return (
    <Streamdown
      mode={isStreaming ? 'streaming' : 'static'}
      dir="auto"
      shikiTheme={['github-light', 'github-dark']}
      mermaid={{ config: { theme: 'neutral', fontFamily: 'inherit' } }}
      controls={{
        table: { copy: true, download: true, fullscreen: true },
        code: { copy: true, download: true },
        mermaid: { copy: true, download: true, fullscreen: true, panZoom: true },
      }}
      plugins={{ code, math, mermaid, cjk, renderers: calloutRenderers }}
      components={courseOverviewMarkdownComponents}
      className={cn('min-w-0 text-[16px] text-zinc-700', className)}
    >
      {children}
    </Streamdown>
  )
}
