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
                    <button
                      type="button"
                      className="vds-button course-video-pill-button course-video-pill-button-green"
                      aria-label="显示时间戳"
                      title="显示时间戳"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Clock3
                        className="vds-icon"
                        strokeWidth={2.5}
                        style={{ height: 14, width: 14 }}
                      />
                      <span>显示时间戳</span>
                    </button>
                    <button
                      type="button"
                      className="vds-button course-video-pill-button course-video-pill-button-blue"
                      aria-label="显示笔记"
                      title="显示笔记"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <NotebookPen
                        className="vds-icon"
                        strokeWidth={2.5}
                        style={{ height: 14, width: 14 }}
                      />
                      <span>显示笔记</span>
                    </button>
                  </>
                ),
                googleCastButton: null,
                pipButton: null,
              }}
            />
          </MediaPlayer>
          <div className="course-video-chin bg-zinc-200">
            <button
              type="button"
              className="course-video-chin-pill-button course-video-chin-pill-button-green"
              aria-label="时间戳"
              title="时间戳"
            >
              <Clock3 strokeWidth={2.5} style={{ height: 15, width: 15 }} />
              <span>时间戳</span>
            </button>
            <button
              type="button"
              className="course-video-chin-pill-button course-video-chin-pill-button-blue"
              aria-label="记笔记"
              title="记笔记"
            >
              <NotebookPen strokeWidth={2.5} style={{ height: 15, width: 15 }} />
              <span>记笔记</span>
            </button>
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
