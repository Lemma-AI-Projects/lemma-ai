import type { LinkSafetyConfig } from 'streamdown'

/**
 * Treat same-origin links as safe; everything else triggers Streamdown's
 * external-link confirmation modal. SSR / non-browser contexts default to safe
 * since there's no `window.location` to compare against.
 */
function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    const target = new URL(url, window.location.href)
    return target.origin === window.location.origin
  } catch {
    return false
  }
}

export const assistantMarkdownLinkSafety: LinkSafetyConfig = {
  enabled: true,
  onLinkCheck: (url) => isSameOrigin(url),
}
