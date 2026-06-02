import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { Streamdown, type Components } from 'streamdown'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'

interface CourseQuizInstructionsMarkdownProps {
  children: string
}

const courseQuizInstructionsMarkdownComponents: Components = {
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        'mt-8 text-[22px] font-semibold leading-7 tracking-tight text-zinc-950 first:mt-0',
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
        'mt-4 list-disc space-y-1.5 pl-6 marker:text-zinc-400 first:mt-0',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn('leading-[25px]', className)} {...props} />
  ),
}

export function CourseQuizInstructionsMarkdown({
  children,
}: CourseQuizInstructionsMarkdownProps) {
  return (
    <Streamdown
      mode="static"
      dir="auto"
      shikiTheme={['github-light', 'github-dark']}
      mermaid={{ config: { theme: 'neutral', fontFamily: 'inherit' } }}
      controls={{
        table: { copy: true, download: true, fullscreen: true },
        code: { copy: true, download: true },
        mermaid: { copy: true, download: true, fullscreen: true, panZoom: true },
      }}
      plugins={{ code, math, mermaid, cjk }}
      components={courseQuizInstructionsMarkdownComponents}
      className="min-w-0 text-[16px] text-zinc-700"
    >
      {children}
    </Streamdown>
  )
}
