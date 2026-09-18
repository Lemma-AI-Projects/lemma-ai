import { useRef, type MouseEvent } from 'react'
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default'
import { Clock3, Loader2, NotebookPen } from 'lucide-react'
import '@vidstack/react/player/styles/base.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { usePointVideoQuery } from '@/features/course/courseApi'
import { usePointProgressReporter } from './usePointProgressReporter'

function PlatformIcon({ platform }: { platform: string }) {
  const normalizedPlatform = platform.trim().toLowerCase()

  if (normalizedPlatform === 'bilibili') {
    return (
      <img src="/icons/bilibili.svg" alt="bilibili" className="size-6 shrink-0" />
    )
  }
  if (normalizedPlatform === 'youtube') {
    return <img src="/icons/youtube.svg" alt="youtube" className="size-6 shrink-0" />
  }
  return null
}

export function CoursePointVideo({
  courseId,
  pointId,
  title,
  lastPositionSeconds,
}: {
  courseId: string
  pointId: string
  title: string
  /** 断点续播位置；0 表示没看过，从头播。 */
  lastPositionSeconds: number
}) {
  const videoQuery = usePointVideoQuery(courseId, pointId)
  const video = videoQuery.data
  const playerRef = useRef<MediaPlayerInstance>(null)
  const progress = usePointProgressReporter({
    playerRef,
    courseId,
    pointId,
    lastPositionSeconds,
  })

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
    <>
      {/*
        播放器外框在所有状态下都由同一个 MediaPlayer 渲染：vidstack 的
        aspect-ratio 容器比裸 aspect-video div 实际高约 6px，而下巴(.course-
        video-chin)的负 margin/overlap 正是按这个真实高度调过的。若未就绪时换成
        普通 div，外框会矮 ~6px，下巴上移、"时间戳/记笔记"上间距变小。故始终挂
        MediaPlayer，仅在内部切换布局(就绪)与遮罩(准备中/失败)。
      */}
      <MediaPlayer
        ref={playerRef}
        data-slot="course-video-player"
        title={title}
        src={isReady ? (video?.playbackUrl ?? undefined) : undefined}
        viewType="video"
        streamType="on-demand"
        hideControlsOnMouseLeave
        onMouseEnter={handlePlayerMouseEnter}
        onMouseLeave={handlePlayerMouseLeave}
        onCanPlay={progress.handleCanPlay}
        onTimeUpdate={progress.handleTimeUpdate}
        onEnded={progress.handleEnded}
        playsInline
        className="relative z-10 mt-5 aspect-video w-full overflow-hidden rounded-xl bg-black text-white"
      >
        <MediaProvider />
        {isReady ? (
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
        ) : (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black text-center text-white/90">
            {isFailed ? (
              <>
                <p className="text-sm">视频准备失败</p>
                {video?.source.url ? (
                  <a
                    href={video.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="pointer-events-auto text-sm text-white/70 underline underline-offset-4 hover:text-white"
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
      </MediaPlayer>

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
    </>
  )
}
