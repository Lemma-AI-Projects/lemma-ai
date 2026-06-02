import { CourseContentLayout } from '@/features/course/CourseContentLayout'
import type { CourseOverviewContent } from '@/features/course/CourseMainContent'
import { CourseOverviewMarkdown } from './CourseOverviewMarkdown'

interface CourseOverviewViewProps {
  content: CourseOverviewContent
}

function getCurrentOverviewId(content: CourseOverviewContent): string {
  if (content.scope === 'unit') {
    return `${content.unit.id}-overview`
  }

  return content.chapter ? `${content.chapter.id}-overview` : ''
}

export function CourseOverviewView({ content }: CourseOverviewViewProps) {
  return (
    <CourseContentLayout
      course={content.course}
      currentContentId={getCurrentOverviewId(content)}
      title="概述"
    >
      <CourseOverviewMarkdown>{content.data.markdown}</CourseOverviewMarkdown>
    </CourseContentLayout>
  )
}
