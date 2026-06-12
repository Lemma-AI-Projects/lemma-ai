import { useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
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
import { CircleFadingArrowUp, Clock3, NotebookPen } from 'lucide-react'
import '@vidstack/react/player/styles/base.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getNextCourseDirectoryHref } from '@/features/course/getNextCourseDirectoryHref'
import type { CourseVideoContent } from '@/features/course/CourseMainContent'
import { CourseOverviewMarkdown } from '@/features/course/overview/CourseOverviewMarkdown'
import { CourseVideoChapterList } from '@/features/course/video/CourseVideoChapterList'
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
  const [chapterListContainer, setChapterListContainer] =
    useState<HTMLDivElement | null>(null)
  const playerRef = useRef<MediaPlayerInstance>(null)
  const nextContentHref = getNextCourseDirectoryHref(
    content.course,
    `${content.chapter.id}-video`
  )

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
          {/*
            标题与按钮的位置布局：
            flex：标题和按钮放在同一横向 Flex 行内
            flex-wrap：横向空间不足时，按钮允许换到下一行
            items-start：按钮顶部与标题行容器顶部对齐
            justify-between：标题靠左，按钮靠右
            gap-4：标题与按钮之间，以及换行后的行间距均为 16px
            外层 article 的 max-w-[1040px] 决定这一行最大宽度；
            mx-auto 让整行居中，因此按钮右边缘默认对齐 1040px 内容区的右边缘。
            按钮通过 translate-y-[2px] 相对默认顶部对齐位置向下移动 2px。
          */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/*
              min-w-0：允许长标题在 Flex 布局中正确收缩
              flex-1：标题占满按钮之外的剩余宽度，将按钮推到最右侧
            */}
            <h1 className="min-w-0 flex-1 text-[32px] font-semibold leading-10 tracking-tight text-zinc-950">
              {title}
            </h1>
            {/*
              AI 速讲按钮样式：
              translate-y-[2px]：按钮整体向下移动 2px
              h-[33px]：按钮高度 33px
              shrink-0：空间不足时禁止按钮被压缩
              gap-[4px]：图标与文字之间的水平间距 4px
              rounded-full：胶囊圆角
              bg-[#f66a0a]：默认背景色
              hover:bg-[#e36209]：悬停背景色
              px-[10px] / has-[>svg]:px-[10px]：左右内边距 10px；存在图标时仍保持 10px
              text-[16px]：文字字号 16px
              text-white：文字和图标颜色为白色
              Button 基础样式中的 inline-flex、items-center、justify-center：
              让图标和文字横向排列，并在按钮内水平、垂直居中。
              Button 基础样式还提供 font-medium（500 字重）、whitespace-nowrap
              （文字不换行）、过渡动画、键盘焦点环和 disabled 状态。
            */}
            <Button
              type="button"
              className="h-[33px] shrink-0 translate-y-[4px] gap-[4px] rounded-full bg-[#f66a0a] px-[10px] text-[16px] text-white hover:bg-[#e36209] has-[>svg]:px-[10px]"
            >
              {/*
                图标尺寸 20px；Lucide 默认描边宽度 2。
                图标颜色继承按钮的白色，没有额外的上下或左右偏移。
              */}
              <CircleFadingArrowUp className="size-[20px]" />
              {/*
                文案未单独设置位置或样式，继承按钮的 16px、500 字重和白色；
                与图标之间的 4px 间隔由按钮上的 gap-[4px] 控制。
              */}
              <span>让Anaxa带你速通</span>
            </Button>
          </div>

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
            {/*
              章节列表需要处在 MediaPlayer 上下文中，Vidstack Thumbnail 才能复用播放器的
              媒体状态和缩略图解析能力。createPortal 保留这层 React 上下文，同时把列表 DOM
              渲染到播放器下方的 chapterListContainer，而不是播放器画面内部。
              thumbnailsSrc 与 DefaultVideoLayout 使用同一个 demoVideoThumbnailsSrc。
            */}
            {chapterListContainer && content.data.copy?.chapterSummaries
              ? createPortal(
                  <CourseVideoChapterList
                    chapters={content.data.copy.chapterSummaries}
                    thumbnailsSrc={demoVideoThumbnailsSrc}
                  />,
                  chapterListContainer
                )
              : null}
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

          {/*
            Tab 与“下一章”按钮区域的位置：
            ml-3：整个区域向右偏移 12px
            mt-6：与上方播放器信息栏间隔 24px
          */}
          <div className="ml-3 mt-6">
            {/*
              同一行的布局参数：
              flex：让 Tab 组和“下一章”按钮横向排列
              items-center：三项在垂直方向居中对齐
              justify-between：Tab 组靠左，“下一章”按钮靠右
              gap-4：空间不足时，Tab 组与按钮之间至少保留 16px
            */}
            <div className="flex items-center justify-between gap-4">
              {/*
                两个 Tab 之间的间隔：
                gap-2： “课程信息”与“章节速览”之间间隔 8px
              */}
              <div className="flex items-center gap-2">
                {courseVideoTabValues.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      /*
                        Tab 的主要样式参数：
                        px-4：左右内边距 16px
                        py-1.5：上下内边距 6px
                        text-base：字体大小 16px，默认行高 24px
                        rounded-full：胶囊圆角
                        修改 Tab 留白时，主要调整 px-4 和 py-1.5。
                      */
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
                /*
                  “下一章”按钮的主要样式参数：
                  h-auto：取消 Button 默认的 36px 固定高度，让按钮高度由内容和 py 决定
                  px-[16px]：左右内边距 16px
                  py-[7px]：上下内边距 7px；修改此值会直接改变按钮总高度
                  text-[14px]：文字大小 14px
                  font-normal：字重 400
                  rounded-full：胶囊圆角
                  bg-zinc-950 / text-white：黑底白字
                  hover:bg-zinc-800：悬停时背景稍微变亮
                  修改按钮时，调整 px-[16px]、py-[7px] 和 text-[14px]。
                */
                <Button
                  asChild
                  className="h-auto rounded-full bg-zinc-950 px-[16px] py-[6px] text-[15px] font-normal text-white hover:bg-zinc-800"
                >
                  <a href={nextContentHref}>下一章</a>
                </Button>
              ) : null}
            </div>

            {activeTab === '课程信息' &&
            content.data.copy?.courseInfoMarkdown ? (
              <CourseOverviewMarkdown className="mt-6 w-full">
                {content.data.copy.courseInfoMarkdown}
              </CourseOverviewMarkdown>
            ) : null}

            {activeTab === '章节速览' ? (
              /*
                mt-4：章节列表与上方 Tab 行间隔 16px。
                此空容器是 createPortal 的实际 DOM 挂载位置。
              */
              <div ref={setChapterListContainer} className="mt-4" />
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}
