import { formatTime, Thumbnail, useChapterOptions } from '@vidstack/react'

interface CourseVideoChapterListProps {
  chapters: Array<{
    id: string
    title: string
    summary: string
  }>
  thumbnailsSrc: string
}

export function CourseVideoChapterList({
  chapters,
  thumbnailsSrc,
}: CourseVideoChapterListProps) {
  /*
    从当前 MediaPlayer 的 chapters track 读取播放器已经解析好的 VTT cue。
    章节起止时间只维护在 VTT 中，mock 数据仅负责补充标题和摘要。
  */
  const chapterOptions = useChapterOptions()

  if (chapters.length === 0) {
    return null
  }

  return (
    /*
      列表容器样式：
      divide-y：在相邻章节行之间添加水平分割线
      divide-border：分割线使用项目 border 主题色
    */
    <ol className="divide-y divide-border">
      {chapters.map((chapter, index) => {
        /*
          mock 章节与 VTT cue 按相同顺序对应。
          VTT 尚未加载或缺少对应 cue 时，不渲染没有可靠时间信息的列表行。
        */
        const chapterOption = chapterOptions[index]

        if (!chapterOption) {
          return null
        }

        return (
          /*
            单个章节行样式：
            flex：缩略图和文字区域横向排列
            items-center：缩略图与右侧文字整体垂直居中
            gap-3：缩略图和文字区域之间间隔 12px
            px-3：左右内边距 12px
            py-2：上下内边距 8px，也是调整列表行高的主要参数
            hover:bg-muted/50：鼠标悬停时使用 50% 透明度的 muted 背景色
            当前没有固定高度，实际行高由缩略图、文字内容和 py-2 共同决定。
          */
          <li
            key={chapter.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
          >
            {/*
              精灵图复用逻辑：
              src：接收 CourseVideoView 传入的播放器同款 thumbnails.vtt 地址
              time：直接使用播放器章节 cue 的开始秒数选择对应精灵图区域
              Thumbnail.Root / Thumbnail.Img：由 Vidstack 负责加载 storyboard 并裁剪，
              这里不执行视频截图，也不手动计算精灵图坐标。

              缩略图样式：
              vds-thumbnail：启用 Vidstack 的缩略图裁剪样式
              shrink-0：列表横向空间不足时不压缩缩略图
              overflow-hidden：隐藏 storyboard 中当前帧之外的区域
              rounded-sm：2px 小圆角
              --media-thumbnail-min/max-width: 112px：固定显示宽度 112px
              --media-thumbnail-min/max-height: 63px：固定显示高度 63px
            */}
            <Thumbnail.Root
              src={thumbnailsSrc}
              time={chapterOption.cue.startTime}
              className="vds-thumbnail shrink-0 overflow-hidden rounded-sm [--media-thumbnail-max-height:63px] [--media-thumbnail-max-width:112px] [--media-thumbnail-min-height:63px] [--media-thumbnail-min-width:112px]"
            >
              <Thumbnail.Img alt="" />
            </Thumbnail.Root>

            {/*
              文字区域：
              min-w-0：允许文字区域在 Flex 布局中正确收缩，避免撑破列表宽度
            */}
            <div className="min-w-0">
              {/*
                标题：
                text-[15px]：字号 15px
                font-medium：字重 500
                leading-5：行高 20px
                text-foreground：使用主要文字颜色
              */}
              <p className="text-[15px] font-medium leading-5 text-foreground">
                {chapter.title}
              </p>
              {/*
                起止时间：
                mt-[3px]：与标题间隔 3px
                text-[14px]：字号 14px
                leading-4：行高 16px
                text-muted-foreground：使用次要文字颜色
              */}
              <p className="mt-[3px] text-[14px] leading-4 text-muted-foreground">
                {chapterOption.startTimeText} -{' '}
                {formatTime(chapterOption.cue.endTime)}
              </p>
              {/*
                章节摘要：
                mt-[1px]：与起止时间间隔 1px
                text-sm：字号 14px
                leading-5：行高 20px
                text-muted-foreground：使用次要文字颜色
              */}
              <p className="mt-[1px] text-sm leading-5 text-muted-foreground">
                {chapter.summary}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
