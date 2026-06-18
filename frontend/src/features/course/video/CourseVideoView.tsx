import { useRef, useState, type MouseEvent } from 'react'
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default'
import {
  CircleFadingArrowUp,
  Clock3,
  Loader2,
  NotebookPen,
  Youtube,
} from 'lucide-react'
import '@vidstack/react/player/styles/base.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getNextCourseDirectoryHref } from '@/features/course/getNextCourseDirectoryHref'
import { useChapterVideoQuery } from '@/features/course/courseLearningApi'
import type { CourseVideoContent } from '@/features/course/CourseMainContent'
import { CourseOverviewMarkdown } from '@/features/course/overview/CourseOverviewMarkdown'
import { cn } from '@/lib/utils'

interface CourseVideoViewProps {
  content: CourseVideoContent
}

const courseVideoTabValues = ['课程信息', '章节速览'] as const
type CourseVideoTab = (typeof courseVideoTabValues)[number]

function getDisplayVideoTitle(title: string) {
  return title.replace(/^video\s*:\s*/i, '').trim()
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'bilibili') {
    return (
      <img src="/icons/bilibili.svg" alt="bilibili" className="size-6 shrink-0" />
    )
  }
  return <Youtube className="size-5 shrink-0 text-[#ff0000]" />
}

export function CourseVideoView({ content }: CourseVideoViewProps) {
  const title = getDisplayVideoTitle(content.title)
  const courseId = content.course.id
  const chapterId = content.chapter.id
  const videoQuery = useChapterVideoQuery(courseId, chapterId)
  const video = videoQuery.data

  const [activeTab, setActiveTab] = useState<CourseVideoTab>('课程信息')
  const playerRef = useRef<MediaPlayerInstance>(null)
  const nextContentHref = getNextCourseDirectoryHref(
    content.course,
    `${chapterId}-video`
  )

  const isReady = video?.status === 'ready' && Boolean(video.playbackUrl)
  const isFailed = video?.status === 'failed' || videoQuery.isError

  function handlePlayerMouseEnter(event: MouseEvent) {
    playerRef.current?.controls.pause(event.nativeEvent)
  }

  function handlePlayerMouseLeave(event: MouseEvent) {
    const controls = playerRef.current?.controls

    controls?.resume(event.nativeEvent)
    controls?.hide(0, event.nativeEvent)
  }

  const author = video?.author
  const showAuthor = Boolean(author && (author.name || author.homepageUrl))
  const authorLabel = author?.name ?? '作者'
  const authorInitial = author?.name?.trim().charAt(0) || '?'

  return (
    <div className="h-full min-h-0 overflow-hidden bg-zinc-50">
      <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-4 pb-14 pt-8">
        <article className="mx-auto w-full max-w-[1040px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="min-w-0 flex-1 text-[32px] font-semibold leading-10 tracking-tight text-zinc-950">
              {title}
            </h1>
            <Button
              type="button"
              className="h-[33px] shrink-0 translate-y-[4px] gap-[4px] rounded-full bg-[#f66a0a] px-[10px] text-[16px] text-white hover:bg-[#e36209] has-[>svg]:px-[10px]"
            >
              <CircleFadingArrowUp className="size-[20px]" />
              <span>让Anaxa带你速通</span>
            </Button>
          </div>

          {isReady ? (
            <MediaPlayer
              ref={playerRef}
              data-slot="course-video-player"
              title={title}
              src={video?.playbackUrl ?? ''}
              viewType="video"
              streamType="on-demand"
              hideControlsOnMouseLeave
              onMouseEnter={handlePlayerMouseEnter}
              onMouseLeave={handlePlayerMouseLeave}
              playsInline
              className="relative z-10 mt-5 aspect-video w-full overflow-hidden rounded-xl bg-black text-white"
            >
              <MediaProvider />
              <DefaultVideoLayout
                sliderChaptersMinWidth={0}
                icons={defaultLayoutIcons}
                slots={{
                  beforeCaptionButton: (
                    <>
                      <Button
                        type="button"
                        aria-label="显示时间戳"
                        title="显示时间戳"
                        onClick={(event) => event.stopPropagation()}
                        className="h-6 gap-[3px] rounded-full bg-[#238636] px-[7px] py-0 text-white hover:bg-[#238636]/90 has-[>svg]:px-[7px]"
                      >
                        <Clock3 className="size-[14px]" strokeWidth={2.5} />
                        <span>显示时间戳</span>
                      </Button>
                      <Button
                        type="button"
                        aria-label="显示笔记"
                        title="显示笔记"
                        onClick={(event) => event.stopPropagation()}
                        className="ml-[8.5px] mr-[2.5px] h-6 gap-[3px] rounded-full bg-[#0969da] px-[7px] py-0 text-white hover:bg-[#0969da]/90 has-[>svg]:px-[7px]"
                      >
                        <NotebookPen className="size-[14px]" strokeWidth={2.5} />
                        <span>显示笔记</span>
                      </Button>
                    </>
                  ),
                  googleCastButton: null,
                  pipButton: null,
                }}
              />
            </MediaPlayer>
          ) : (
            <div className="relative z-10 mt-5 flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-black text-center text-white/90">
              {isFailed ? (
                <>
                  <p className="text-sm">视频准备失败</p>
                  {video?.source.url ? (
                    <a
                      href={video.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
                    >
                      前往原视频观看
                    </a>
                  ) : null}
                </>
              ) : (
                <>
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-sm">视频准备中，请稍候…</p>
                </>
              )}
            </div>
          )}

          <div className="course-video-chin bg-zinc-200">
            {showAuthor && author?.homepageUrl ? (
              <Button
                asChild
                aria-label={authorLabel}
                title={authorLabel}
                className="h-7 gap-1.5 rounded-full bg-[#717A7A2E] py-0 pl-0.5 pr-3 text-foreground hover:bg-zinc-300/80 has-[>svg]:pl-0.5"
              >
                <a href={author.homepageUrl} target="_blank" rel="noreferrer">
                  <Avatar size="sm">
                    <AvatarImage alt={authorLabel} />
                    <AvatarFallback>{authorInitial}</AvatarFallback>
                  </Avatar>
                  <span>{authorLabel}</span>
                </a>
              </Button>
            ) : showAuthor ? (
              <span
                title={authorLabel}
                className="flex h-7 items-center gap-1.5 rounded-full bg-[#717A7A2E] py-0 pl-0.5 pr-3 text-sm text-foreground"
              >
                <Avatar size="sm">
                  <AvatarImage alt={authorLabel} />
                  <AvatarFallback>{authorInitial}</AvatarFallback>
                </Avatar>
                <span>{authorLabel}</span>
              </span>
            ) : null}

            {video?.source ? (
              <Button
                asChild
                aria-label="视频来源"
                title={video.source.title}
                className="mr-auto h-7 max-w-[400px] gap-1.5 rounded-full bg-[#717A7A2E] py-0 pl-0.5 pr-3 text-foreground hover:bg-zinc-300/80 has-[>svg]:pl-0.5"
              >
                <a href={video.source.url} target="_blank" rel="noreferrer">
                  <PlatformIcon platform={video.source.platform} />
                  <span className="truncate">{video.source.title}</span>
                </a>
              </Button>
            ) : (
              <span className="mr-auto" />
            )}

            <Button
              type="button"
              aria-label="时间戳"
              title="时间戳"
              className="h-7 gap-1 rounded-full bg-[#238636] px-2.5 py-0 text-white hover:bg-[#238636]/90 has-[>svg]:px-2.5"
            >
              <Clock3 className="size-[15px]" strokeWidth={2.5} />
              <span>时间戳</span>
            </Button>
            <Button
              type="button"
              aria-label="记笔记"
              title="记笔记"
              className="h-7 gap-1 rounded-full bg-[#0969da] px-2.5 py-0 text-white hover:bg-[#0969da]/90 has-[>svg]:px-2.5"
            >
              <NotebookPen className="size-[15px]" strokeWidth={2.5} />
              <span>记笔记</span>
            </Button>
          </div>

          <div className="ml-3 mt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {courseVideoTabValues.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'rounded-full px-[14px] py-[5px] text-base transition-colors',
                      activeTab === tab
                        ? 'bg-zinc-200 text-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {nextContentHref ? (
                <Button
                  asChild
                  className="h-auto rounded-full bg-zinc-950 px-[16px] py-[6px] text-[15px] font-normal text-white hover:bg-zinc-800"
                >
                  <a href={nextContentHref}>下一章</a>
                </Button>
              ) : null}
            </div>

            {activeTab === '课程信息' && content.data.copy?.courseInfoMarkdown ? (
              <CourseOverviewMarkdown className="mt-6 w-full">
                {content.data.copy.courseInfoMarkdown}
              </CourseOverviewMarkdown>
            ) : null}

            {activeTab === '章节速览' ? <div className="mt-4" /> : null}
          </div>
        </article>
      </div>
    </div>
  )
}
