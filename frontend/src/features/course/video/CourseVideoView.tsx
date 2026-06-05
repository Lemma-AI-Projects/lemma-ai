import { useRef, useState, type MouseEvent } from 'react'
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default'
import { Clock3, NotebookPen } from 'lucide-react'
import '@vidstack/react/player/styles/base.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { CourseVideoContent } from '@/features/course/CourseMainContent'
import { cn } from '@/lib/utils'

interface CourseVideoViewProps {
  content: CourseVideoContent
}

const demoVideoSrc = 'https://files.vidstack.io/sprite-fight/720p.mp4'
const demoVideoChaptersSrc = 'https://files.vidstack.io/sprite-fight/chapters.vtt'
const demoVideoThumbnailsSrc =
  'https://files.vidstack.io/sprite-fight/thumbnails.vtt'
const courseVideoTabValues = ['课程信息', '章节速览'] as const
type CourseVideoTab = (typeof courseVideoTabValues)[number]

function getDisplayVideoTitle(title: string) {
  return title.replace(/^video\s*:\s*/i, '').trim()
}

export function CourseVideoView({ content }: CourseVideoViewProps) {
  const title = getDisplayVideoTitle(content.title)
  const [activeTab, setActiveTab] = useState<CourseVideoTab>('课程信息')
  const playerRef = useRef<MediaPlayerInstance>(null)

  function handlePlayerMouseEnter(event: MouseEvent) {
    playerRef.current?.controls.pause(event.nativeEvent)
  }

  function handlePlayerMouseLeave(event: MouseEvent) {
    const controls = playerRef.current?.controls

    controls?.resume(event.nativeEvent)
    controls?.hide(0, event.nativeEvent)
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-zinc-50">
      <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-4 pb-14 pt-8">
        <article className="mx-auto w-full max-w-[1040px]">
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-zinc-950">
            {title}
          </h1>

          <MediaPlayer
            ref={playerRef}
            data-slot="course-video-player"
            title={title}
            src={demoVideoSrc}
            viewType="video"
            streamType="on-demand"
            hideControlsOnMouseLeave
            onMouseEnter={handlePlayerMouseEnter}
            onMouseLeave={handlePlayerMouseLeave}
            crossOrigin
            playsInline
            className="relative z-10 mt-5 aspect-video w-full overflow-hidden rounded-xl bg-black text-white"
          >
            <MediaProvider>
              <Track
                src={demoVideoChaptersSrc}
                kind="chapters"
                label="Chapters"
                language="en-US"
                default
              />
            </MediaProvider>
            <DefaultVideoLayout
              thumbnails={demoVideoThumbnailsSrc}
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
          <div className="course-video-chin bg-zinc-200">
            <Button
              type="button"
              aria-label="作者"
              title="一数"
              className="h-7 gap-1.5 rounded-full bg-[#717A7A2E] py-0 pl-0.5 pr-3 text-foreground hover:bg-zinc-300/80 has-[>svg]:pl-0.5"
            >
              <Avatar size="sm">
                <AvatarImage alt="一数" />
                <AvatarFallback>一</AvatarFallback>
              </Avatar>
              <span>一数</span>
            </Button>
            <Button
              type="button"
              aria-label="视频来源"
              title="【统计】线性回归与非线性回归！最小二乘法！保姆级讲解！"
              className="mr-auto h-7 max-w-[400px] gap-1.5 rounded-full bg-[#717A7A2E] py-0 pl-0.5 pr-3 text-foreground hover:bg-zinc-300/80 has-[>svg]:pl-0.5"
            >
              <img
                src="/icons/bilibili.svg"
                alt="bilibili"
                className="size-6 shrink-0"
              />
              <span className="truncate">
                【统计】线性回归与非线性回归！最小二乘法！保姆级讲解！
              </span>
            </Button>
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
            <div className="flex items-center gap-2">
              {courseVideoTabValues.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-base transition-colors',
                    activeTab === tab
                      ? 'bg-zinc-200 text-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
