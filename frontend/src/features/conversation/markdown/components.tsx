import type { Components } from 'streamdown'
import { cn } from '@/lib/utils'

/**
 * Typography overrides for the main assistant answer. Keep structural widgets
 * such as code blocks, tables, math, and Mermaid on Streamdown defaults; this
 * layer only aligns prose rhythm, heading scale, lists, and quote text.
 */
export const assistantMarkdownComponents: Components = {
  p: ({ className, ...props }) => (
    <p
      className={cn(
        'mt-4 mb-4 text-base font-normal leading-[26px] tracking-normal not-italic first:mt-0 first:mb-1 [li>&]:!m-0 [blockquote_&]:!m-0 [ol+&]:!mt-2 [ul+&]:!mt-2 last:!mb-1',
        className
      )}
      {...props}
    />
  ),
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        '!mt-0 !mb-2 text-2xl font-semibold leading-8 tracking-normal last:!mb-0',
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        '!mt-4 !mb-1 text-xl font-semibold leading-7 tracking-normal first:!mt-0 last:!mb-0',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        '!mt-4 !mb-1 text-lg font-semibold leading-7 tracking-normal first:!mt-0 last:!mb-0',
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        '!mt-4 !mb-0 text-base font-semibold leading-6 tracking-normal first:!mt-0',
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        '!mt-0 !mb-0 text-base font-semibold leading-[26px] tracking-normal',
        className
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        '!mt-0 !mb-0 text-base font-normal leading-[26px] tracking-normal',
        className
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        '!mt-0 !mb-0 list-disc space-y-0 pl-[26px] text-base font-normal leading-[26px] tracking-normal marker:text-muted-foreground',
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        '!mt-0 !mb-0 list-decimal space-y-0 pl-[26px] text-base font-normal leading-[26px] tracking-normal marker:text-muted-foreground',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li
      className={cn(
        '!mt-0 !mb-0 pl-[6px] text-base font-normal leading-[26px] tracking-normal',
        className
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        '!mt-0 !mb-2 border-muted-foreground/30 border-l-4 py-2 pl-6 text-muted-foreground font-medium not-italic leading-6 tracking-normal last:!mb-0',
        className
      )}
      {...props}
    />
  ),
}
