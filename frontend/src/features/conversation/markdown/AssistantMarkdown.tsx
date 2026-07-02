import { Streamdown } from 'streamdown'
import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'
import { assistantMarkdownComponents } from './components'
import { assistantMarkdownIcons } from './icons'
import { assistantMarkdownLinkSafety } from './linkSafety'
import { assistantMarkdownTranslations } from './translations'
import { toolCodeRenderers, toolHtmlTags } from './toolRegistry'

type AssistantMarkdownProps = {
  children: string
  /**
   * When true, render in Streamdown's streaming mode: blocks are split &
   * memoized individually, incomplete markdown is auto-completed, and the
   * caret/animation pipeline is enabled. Historical (completed) messages
   * should leave this off so they render as a single static unit.
   */
  isStreaming?: boolean
  className?: string
}

export function AssistantMarkdown({
  children,
  isStreaming = false,
  className,
}: AssistantMarkdownProps) {
  return (
    <Streamdown
      mode={isStreaming ? 'streaming' : 'static'}
      isAnimating={isStreaming}
      parseIncompleteMarkdown={isStreaming}
      dir="auto"
      shikiTheme={['github-light', 'github-dark']}
      mermaid={{ config: { theme: 'neutral', fontFamily: 'inherit' } }}
      controls={{
        table: { copy: true, download: true, fullscreen: true },
        code: { copy: true, download: true },
        mermaid: { copy: true, download: true, fullscreen: true, panZoom: true },
      }}
      linkSafety={assistantMarkdownLinkSafety}
      translations={assistantMarkdownTranslations}
      icons={assistantMarkdownIcons}
      plugins={{
        code,
        math,
        mermaid,
        cjk,
        renderers: toolCodeRenderers,
      }}
      components={{
        ...assistantMarkdownComponents,
        ...toolHtmlTags.components,
      }}
      allowedTags={toolHtmlTags.allowedTags}
      literalTagContent={toolHtmlTags.literalTagContent}
      className={cn(
        'min-w-0 w-full max-w-3xl font-[-apple-system-body,ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe_UI,Helvetica,Arial,sans-serif] leading-[26px] tracking-normal',
        "[&_[data-streamdown='inline-code']]:font-medium",
        "[&_[data-streamdown='inline-code']]:leading-[26px]",
        "[&_[data-streamdown='link']]:font-normal",
        className
      )}
    >
      {children}
    </Streamdown>
  )
}
