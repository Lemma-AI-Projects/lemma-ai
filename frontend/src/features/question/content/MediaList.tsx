import type { MediaAsset } from '@/types/question'

/** 结构化下发的媒体（小题音频、解题视频）；题干内联的 <audio> 由 RichHtml 渲染。 */
export function MediaList({ media }: { media: readonly MediaAsset[] }) {
  if (media.length === 0) return null
  return (
    <div className="mt-4 flex flex-col gap-3">
      {media.map((asset, index) => {
        const key = `${asset.src}-${index}`
        if (asset.kind === 'audio') {
          return (
            <audio
              key={key}
              src={asset.src}
              controls
              preload="metadata"
              aria-label={asset.title ?? '题目音频'}
              className="w-full max-w-md"
            />
          )
        }
        if (asset.kind === 'video') {
          return (
            <video
              key={key}
              src={asset.src}
              poster={asset.poster ?? undefined}
              controls
              preload="metadata"
              aria-label={asset.title ?? '解题视频'}
              className="w-full max-w-xl rounded-xl bg-black"
            />
          )
        }
        return (
          <img
            key={key}
            src={asset.src}
            alt={asset.title ?? ''}
            loading="lazy"
            className="max-w-full rounded-lg"
          />
        )
      })}
    </div>
  )
}
