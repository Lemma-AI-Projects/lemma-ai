// 课程体量：决定自由课程生成多少章节、单元和课时。
export type CourseVolume = 'light' | 'medium' | 'deep'

// 用户不做选择时使用的体量。
export const DEFAULT_COURSE_VOLUME: CourseVolume = 'medium'

export const COURSE_VOLUME_OPTIONS: { value: CourseVolume; label: string }[] = [
  { value: 'light', label: '轻度' },
  { value: 'medium', label: '中度' },
  { value: 'deep', label: '深度' },
]

// 下巴胶囊上的一句话状态：未改动时显示「默认体量」，改动后显示所选档位。
export function courseVolumeSummary(volume: CourseVolume): string {
  if (volume === DEFAULT_COURSE_VOLUME) {
    return '默认体量'
  }
  const option = COURSE_VOLUME_OPTIONS.find((item) => item.value === volume)
  return `${option?.label ?? ''}体量`
}
