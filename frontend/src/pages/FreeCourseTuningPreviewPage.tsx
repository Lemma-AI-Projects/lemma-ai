import { useState } from 'react'

import { FreeCourseBlueprintEditor } from '@/features/free-course/FreeCourseBlueprintEditor'
import { FreeCourseTuningCard } from '@/features/free-course/FreeCourseTuningCard'
import { tuningCourseMock, tuningOfferMock } from '@/mock/freeCourseTuning'

/**
 * 布局评审入口：**暂停点**（phase 1 跑完、phase 2 还没跑）那一张卡片。
 *
 * 公开、免登录、纯 mock。参数：
 *   ?empty=1            树为空（看空态）
 *   ?loading=1&empty=1  树在取（看骨架，而不是错报「结构还没生成」）
 *   ?edit=1             直接进编辑态
 *   （卡片里的「编辑」是内部状态，从外面点不出来，所以这里单独渲染编辑器）
 *
 * 这里评审的是**顺序**：先给结构、再问参数。以前这张卡只问参数，
 * 用户是在不知道要调什么的情况下调参。
 */
export function FreeCourseTuningPreviewPage() {
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [leftEditing, setLeftEditing] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('edit') === '1'
  })
  const params = new URLSearchParams(window.location.search)
  const isEmpty = params.get('empty') === '1'
  const isLoading = params.get('loading') === '1'

  const course = isEmpty ? { ...tuningCourseMock, units: [] } : tuningCourseMock

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
      <div className="flex w-full max-w-[36rem] flex-col gap-3">
        {submitted && (
          <p className="rounded-lg bg-zinc-900/85 px-3 py-2 text-[12px] text-white">
            预览 · 提交的答案是 {submitted}（这里不会真的生成）
          </p>
        )}
        {leftEditing ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-950">
            <FreeCourseBlueprintEditor
              // 预览里没有真课程，保存会打到不存在的 id —— 这里评审的是**交互与布局**。
              courseId="preview"
              course={course}
              onDone={() => setLeftEditing(false)}
            />
          </div>
        ) : (
          <FreeCourseTuningCard
            offer={tuningOfferMock}
            course={course}
            isCourseLoading={isLoading}
            onSubmit={(answers) => setSubmitted(JSON.stringify(answers))}
            onSkip={() => setSubmitted('skip')}
          />
        )}
        <p className="px-1 text-[12px] leading-5 text-zinc-500">
          预览 · 数据是 mock。真实链路：phase 1 跑完 intent→map→path 后停下，
          这张卡出现；树此刻已经在库里，所以能先看结构再决定怎么生成。
        </p>
      </div>
    </div>
  )
}
