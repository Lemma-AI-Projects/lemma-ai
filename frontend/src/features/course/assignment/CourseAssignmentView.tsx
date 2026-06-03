import type { CourseAssignmentContent } from '@/features/course/CourseMainContent'
import { CourseQuizView } from '@/features/course/quiz/CourseQuizView'

interface CourseAssignmentViewProps {
  content: CourseAssignmentContent
}

export function CourseAssignmentView({ content }: CourseAssignmentViewProps) {
  return <CourseQuizView content={content} />
}
