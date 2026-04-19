import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Maximize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { IconMap } from 'streamdown'

/**
 * Streamdown's built-in controls (copy, download, fullscreen, …) ship with their
 * own SVGs. We override them with `lucide-react` so the chat surface uses a
 * single icon family across native UI and Streamdown-rendered controls.
 */
export const assistantMarkdownIcons: IconMap = {
  CheckIcon: Check,
  CopyIcon: Copy,
  DownloadIcon: Download,
  ExternalLinkIcon: ExternalLink,
  Loader2Icon: Loader2,
  Maximize2Icon: Maximize2,
  RotateCcwIcon: RotateCcw,
  XIcon: X,
  ZoomInIcon: ZoomIn,
  ZoomOutIcon: ZoomOut,
}
