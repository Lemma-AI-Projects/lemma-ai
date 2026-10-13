import { useSearchParams } from 'react-router-dom'

import { FocusView } from '@/features/learn-space/focus/FocusView'
import {
  FOCUS_PREVIEW,
  FOCUS_PREVIEW_IMAGE,
  FOCUS_PREVIEW_PDF,
} from '@/features/learn-space/focus/previewFixture'

/**
 * 聚焦模式的**布局评审入口**（`/preview/focus`，免登录）。
 *
 * 它渲染的就是真的 `FocusView` —— 不是另画一张图。区别只在数据来源：这里给一份
 * mock 资料（与离屏断言脚本共用同一份，见 `previewFixture.ts`），真实路由那份从
 * `/api/v1/pages` 来。这样评审看到的东西和用户看到的是同一段代码，不会出现
 * "预览很好看、进去全不是"。
 *
 * `?material=pdf|image` 换到非文本资料那一支（M1）：上传件没有 `blocks`，正文区
 * 该给什么，是这轮要评审的一处。
 */
export function FocusPreviewPage() {
  const [params] = useSearchParams()
  const variant = params.get('material')
  const fixture =
    variant === 'pdf'
      ? FOCUS_PREVIEW_PDF
      : variant === 'image'
        ? FOCUS_PREVIEW_IMAGE
        : FOCUS_PREVIEW

  return <FocusView preview={fixture} />
}