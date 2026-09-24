import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { ImageOff } from 'lucide-react'

import { parseRichHtml } from '@/lib/richHtml/parse'
import { cn } from '@/lib/utils'

export interface RichHtmlAnchor {
  /** 锚点属性名，如 data-slot-id */
  attribute: string
  id: string
}

/** 返回 undefined 表示不接管，按普通 span 渲染。 */
export type RichHtmlAnchorRenderer = (anchor: RichHtmlAnchor) => ReactNode | undefined

const AnchorRendererContext = createContext<RichHtmlAnchorRenderer | null>(null)

function findAnchor(props: Record<string, unknown>): RichHtmlAnchor | null {
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('data-') && key.endsWith('-id') && typeof value === 'string') {
      return { attribute: key, id: value }
    }
  }
  return null
}

function AnchorSpan(props: ComponentProps<'span'>) {
  const renderAnchor = useContext(AnchorRendererContext)
  const anchor = findAnchor(props as Record<string, unknown>)
  if (anchor && renderAnchor) {
    const rendered = renderAnchor(anchor)
    if (rendered !== undefined) return <>{rendered}</>
  }
  return <span {...props} />
}

function RichImage({ alt, className, ...props }: ComponentProps<'img'>) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt || '图片加载失败'}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-2 py-1 align-middle text-xs text-zinc-400"
      >
        <ImageOff className="size-3.5" />
        图片加载失败
      </span>
    )
  }
  return (
    <img
      {...props}
      alt={alt ?? ''}
      loading="lazy"
      className={cn('rich-html-image', className)}
      onError={() => setFailed(true)}
    />
  )
}

function RichTable(props: ComponentProps<'table'>) {
  return (
    <div className="rich-html-table-scroll">
      <table {...props} />
    </div>
  )
}

function RichAudio({ className, ...props }: ComponentProps<'audio'>) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="rich-html-audio">
      <audio
        {...props}
        controls
        preload="metadata"
        className={cn('max-w-full', className)}
        onError={() => setFailed(true)}
      />
      {failed ? <span className="text-xs text-zinc-400">音频加载失败</span> : null}
    </span>
  )
}

function RichVideo({ className, ...props }: ComponentProps<'video'>) {
  return (
    <video
      {...props}
      controls
      preload="metadata"
      className={cn('rich-html-video', className)}
    />
  )
}

const richHtmlComponents: Components = {
  span: AnchorSpan,
  img: RichImage,
  table: RichTable,
  audio: RichAudio,
  video: RichVideo,
}

interface RichHtmlProps {
  html: string
  /** 把 data-*-id 锚点替换为调用方的组件；同一引用可避免锚点重渲染。 */
  renderAnchor?: RichHtmlAnchorRenderer
  /** 含有这些 class 的元素整块移除。 */
  dropClassNames?: readonly string[]
  as?: 'div' | 'span'
  className?: string
}

/**
 * 受限词汇 HTML → React。同一 html 只解析一次、只转换一次，锚点处的交互组件
 * 通过 context 取渲染函数，答案变化不会重建整段内容（焦点、输入法、音频状态保留）。
 */
export function RichHtml({
  html,
  renderAnchor,
  dropClassNames,
  as: Wrapper = 'div',
  className,
}: RichHtmlProps) {
  const dropKey = dropClassNames?.join(' ') ?? ''
  const parsed = useMemo(
    () => parseRichHtml(html, { dropClassNames: dropKey ? dropKey.split(' ') : [] }),
    [html, dropKey]
  )
  const content = useMemo(
    () =>
      toJsxRuntime(parsed.tree, {
        Fragment,
        jsx,
        jsxs,
        components: richHtmlComponents,
        elementAttributeNameCase: 'react',
        stylePropertyNameCase: 'dom',
        ignoreInvalidStyle: true,
      }),
    [parsed]
  )

  useEffect(() => {
    if (import.meta.env.DEV && parsed.warnings.length > 0) {
      console.warn('[RichHtml] 白名单外的内容已被过滤：', parsed.warnings)
    }
  }, [parsed])

  return (
    <AnchorRendererContext.Provider value={renderAnchor ?? null}>
      <Wrapper className={cn('rich-html', className)}>{content}</Wrapper>
    </AnchorRendererContext.Provider>
  )
}
