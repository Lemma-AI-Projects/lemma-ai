import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Streamdown } from 'streamdown'
import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'

import { Spinner } from '@/components/ui/spinner'
import type {
  CourseSearchItem,
  CourseSearchProgress,
} from '@/features/coursePlanner/streamCourseOrganize'

// The organizing window (决策⑤ 两段式): 搜索中 → 已找到 + 编排中. Visual style is
// the sandbox "searching · 搜索中" design (per-source spinner headers, real video
// results as capsule chips, a 编排 section streaming the model's reasoning,
// connector line, smooth height growth) — driven by REAL /organize/stream data
// (no mock). Following the sandbox, each section only appears once it has content.

const streamdownPlugins = { cjk, code, math, mermaid }

function SearchPlatformIcon({ platform }: { platform: string }) {
  if (platform === 'bilibili') {
    return (
      <img src="/icons/bilibili.svg" alt="bilibili" className="size-[18px] shrink-0" />
    )
  }
  return (
    <img src="/icons/youtube.svg" alt="youtube" className="size-[18px] shrink-0" />
  )
}

function SearchResultCapsule({ item }: { item: CourseSearchItem }) {
  return (
    <div
      title={item.title}
      className="flex h-[22px] w-fit max-w-full items-center gap-1 rounded-full bg-zinc-100 py-0 pl-0.5 pr-2 text-[12px] font-medium text-zinc-700"
    >
      <SearchPlatformIcon platform={item.platform} />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
    </div>
  )
}

// Smoothly animate a block's height as its content grows (capsules arriving /
// reasoning streaming in). Copied from the sandbox design.
function SmoothHeight({
  children,
  contentClassName = 'flex min-h-7 flex-row flex-wrap content-center items-center gap-x-1.5 gap-y-2 pb-1.5 pt-1',
}: {
  children: ReactNode
  contentClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) {
      return undefined
    }
    const updateHeight = () => {
      container.style.height = `${content.getBoundingClientRect().height}px`
    }
    updateHeight()
    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(content)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-0 overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
    >
      <div ref={contentRef} className={contentClassName}>
        {children}
      </div>
    </div>
  )
}

function SearchSourceBlock({
  title,
  visible,
  contentClassName,
  children,
}: {
  title: string
  visible: boolean
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <section
      aria-hidden={!visible}
      className="grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{
        gridTemplateRows: visible ? '1fr' : '0fr',
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : -6}px)`,
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex min-h-8 items-start gap-2 pb-0.5 pt-2 text-[16.5px] font-medium text-zinc-800">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
            <Spinner aria-label={title} className="size-[17px] text-zinc-900" />
          </span>
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
            {title}
          </span>
        </div>

        <div className="relative ml-1 flex flex-col gap-0.5 pl-7">
          <div
            aria-hidden
            className="absolute bottom-1 left-[7px] top-1 w-px bg-zinc-200 transition-opacity duration-500"
          />
          <SmoothHeight contentClassName={contentClassName}>{children}</SmoothHeight>
        </div>
      </div>
    </section>
  )
}

const SEARCH_PLATFORMS = ['youtube', 'bilibili'] as const
const PLATFORM_LABELS: Record<(typeof SEARCH_PLATFORMS)[number], string> = {
  youtube: '正在搜索Youtube内容',
  bilibili: '正在搜索Bilibili内容',
}

export function ConversationToolSearching({
  title,
  search,
  reasoningText,
  errorMessage,
}: {
  title: string
  search: CourseSearchProgress | null
  reasoningText: string
  errorMessage?: string | null
}) {
  const hasReasoning = reasoningText.trim().length > 0

  return (
    <div data-stage="searching" className="flex flex-col">
      <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
        {title}
      </h3>

      <div className="mt-4 flex flex-col">
        {SEARCH_PLATFORMS.map((platform) => {
          const items = (search?.items ?? []).filter(
            (item) => item.platform === platform
          )
          return (
            // Sandbox 写法: a source only appears once it actually has results.
            <SearchSourceBlock
              key={platform}
              title={PLATFORM_LABELS[platform]}
              visible={items.length > 0}
            >
              {items.map((item, index) => (
                <SearchResultCapsule
                  key={`${platform}-${index}-${item.title}`}
                  item={item}
                />
              ))}
            </SearchSourceBlock>
          )
        })}

        {/* 编排 section reveals only once the model starts thinking. */}
        <SearchSourceBlock
          title="正在思考并编排课程"
          visible={hasReasoning}
          contentClassName="flex min-h-7 flex-col pb-2 pt-1"
        >
          <Streamdown
            mode="streaming"
            isAnimating
            parseIncompleteMarkdown
            dir="auto"
            plugins={streamdownPlugins}
            className="min-w-0 text-[13px] leading-5 text-zinc-600"
          >
            {reasoningText}
          </Streamdown>
        </SearchSourceBlock>
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  )
}
