/** 把课程快照状态翻成整屏提示文案；null 表示课程可进入。 */
export function getCourseNoticeMessage({
  isPending,
  isNotFound,
  isError,
  status,
}: {
  isPending: boolean
  isNotFound: boolean
  isError: boolean
  status: string | undefined
}): string | null {
  if (isPending) return '正在加载课程…'
  if (isNotFound) return '课程不存在或已删除'
  if (isError) return '加载课程失败，请稍后重试'
  // 物料化门禁: a course is only enterable once fully materialized. Non-ready
  // courses are hidden from the course list, so this guards direct-URL access.
  if (status === 'failed') return '课程准备失败，请重新生成'
  if (status !== undefined && status !== 'ready') return '课程正在准备中，请稍候…'
  return null
}
