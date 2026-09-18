import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  MediaPlayerInstance,
  MediaTimeUpdateEventDetail,
} from '@vidstack/react'

import {
  coursesListQueryKey,
  useReportPointProgressMutation,
} from '@/features/course/courseApi'
import { courseDetailQueryKey, progressQueryRootKey } from '@/lib/queryKeys'

// 心跳间隔。上报是幂等的「我现在在第几秒」，丢一两次无所谓，所以宁可稀疏。
const REPORT_INTERVAL_MS = 10_000
// 断点距片尾这么近就当作看完了：重新打开从头播，而不是把人丢在结尾。
const RESTART_TAIL_SECONDS = 5

/**
 * 把播放器的播放位置喂给后端，并在打开时跳回上次的断点。
 *
 * 完成判定完全在后端（看过阈值即完成，且完成后不会被取消），这里只负责陈述
 * 位置。返回的处理器直接挂到 MediaPlayer 上。
 */
export function usePointProgressReporter({
  playerRef,
  courseId,
  pointId,
  lastPositionSeconds,
}: {
  playerRef: RefObject<MediaPlayerInstance | null>
  courseId: string
  pointId: string
  lastPositionSeconds: number
}) {
  const queryClient = useQueryClient()
  const reportMutation = useReportPointProgressMutation()

  // 处理器挂在播放器上且要在卸载时还能用，所以可变状态一律走 ref。经 ref 取
  // mutate 而不是进依赖数组：flush 必须保持稳定，否则它的清理函数（切点/卸载
  // 时补报一次）会每次渲染都触发。
  const reportRef = useRef(reportMutation.mutate)
  useEffect(() => {
    reportRef.current = reportMutation.mutate
  })

  const positionRef = useRef(0)
  const durationRef = useRef<number | null>(null)
  const lastSentAtRef = useRef(0)
  const hasResumedRef = useRef(false)
  const hasReportedCompletionRef = useRef(false)

  // 换学习点时组件未必重新挂载，必须手动清掉上一个点的残留位置。
  useEffect(() => {
    positionRef.current = 0
    durationRef.current = null
    lastSentAtRef.current = 0
    hasResumedRef.current = false
    hasReportedCompletionRef.current = false
  }, [pointId])

  const flush = useCallback(() => {
    const position = positionRef.current
    // 位置为 0 只可能是还没起播，上报它会把已有的断点抹成 0。
    if (position <= 0) return
    lastSentAtRef.current = Date.now()
    reportRef.current(
      {
        courseId,
        pointId,
        positionSeconds: Math.floor(position),
        durationSeconds: durationRef.current,
      },
      {
        onSuccess: (data) => {
          // 只在「刚刚学完」这一下刷新缓存；心跳本身不该反复失效查询。
          if (!data.completed || hasReportedCompletionRef.current) return
          hasReportedCompletionRef.current = true
          void queryClient.invalidateQueries({
            queryKey: courseDetailQueryKey(courseId),
          })
          void queryClient.invalidateQueries({ queryKey: coursesListQueryKey })
          void queryClient.invalidateQueries({ queryKey: progressQueryRootKey })
        },
      }
    )
  }, [courseId, pointId, queryClient])

  // 切走或卸载时补一次，否则最后不足一个心跳周期的观看会丢。
  useEffect(() => () => flush(), [flush])

  const handleCanPlay = useCallback(() => {
    const player = playerRef.current
    if (!player || hasResumedRef.current) return
    hasResumedRef.current = true

    const duration = player.state.duration
    durationRef.current =
      Number.isFinite(duration) && duration > 0 ? duration : null

    if (lastPositionSeconds <= 0) return
    const knownDuration = durationRef.current
    if (
      knownDuration !== null &&
      lastPositionSeconds >= knownDuration - RESTART_TAIL_SECONDS
    ) {
      return
    }
    player.currentTime = lastPositionSeconds
  }, [lastPositionSeconds, playerRef])

  const handleTimeUpdate = useCallback(
    (detail: MediaTimeUpdateEventDetail) => {
      positionRef.current = detail.currentTime
      const duration = playerRef.current?.state.duration
      if (duration !== undefined && Number.isFinite(duration) && duration > 0) {
        durationRef.current = duration
      }
      if (Date.now() - lastSentAtRef.current >= REPORT_INTERVAL_MS) flush()
    },
    [flush, playerRef]
  )

  const handleEnded = useCallback(() => {
    // 片尾那一下必须落库，否则最后一个心跳之后的观看不算数。
    flush()
  }, [flush])

  return { handleCanPlay, handleTimeUpdate, handleEnded }
}
