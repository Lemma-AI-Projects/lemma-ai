import { CourseCenterView } from '@/features/course/CourseCenterView'
import { courseCenterItems } from '@/mock/course/courseCenterItems'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，
// 不起后端、不登录即可查看课程中心的布局。
export function CourseCenterPreviewPage() {
  const firstInProgress = courseCenterItems.find(
    (course) => course.status === 'in-progress'
  )

  return (
    <div className="h-screen bg-zinc-100 p-2">
      <CourseCenterView
        courses={courseCenterItems}
        continueCourse={
          firstInProgress
            ? {
                id: firstInProgress.id,
                title: firstInProgress.title,
                nextLectureTitle: firstInProgress.upNext?.title,
              }
            : null
        }
      />
    </div>
  )
}
