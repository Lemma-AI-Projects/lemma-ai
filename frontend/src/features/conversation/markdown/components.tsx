import type { Components } from 'streamdown'
import { cn } from '@/lib/utils'

/**
 * Element overrides only for tags Streamdown leaves un-styled (`<p>`, `<ul>`,
 * `<ol>`, `<li>`). Tailwind's preflight strips browser-default margins and
 * list markers, so without these the body text would collapse and lists would
 * lose their bullets.
 *
 * Headings, blockquote, hr, anchors, inline code, code blocks, tables, etc.
 * intentionally fall through to Streamdown's well-tuned defaults so the chat
 * gets the same visual hierarchy as the streamdown.ai showcase.
 */
export const assistantMarkdownComponents: Components = {
  p: ({ className, ...props }) => (
    <p className={cn('mt-4 leading-7 first:mt-0', className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        'mt-4 list-disc space-y-1 pl-6 marker:text-muted-foreground first:mt-0',
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        'mt-4 list-decimal space-y-1 pl-6 marker:text-muted-foreground first:mt-0',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn('leading-7', className)} {...props} />
  ),
}
