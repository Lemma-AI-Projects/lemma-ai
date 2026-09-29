import { FocusView } from '@/features/learn-space/focus/FocusView'
import { FOCUS_PREVIEW } from '@/features/learn-space/focus/previewFixture'

/**
 * 聚焦模式的**布局评审入口**（`/preview/focus`，免登录）。
 *
 * 它渲染的就是真的 `FocusView` —— 不是另画一张图。区别只在数据来源：这里给一份
 * mock 资料（与离屏断言脚本共用同一份，见 `previewFixture.ts`），真实路由那份从
 * `/api/v1/pages` 来。这样评审看到的东西和用户看到的是同一段代码，不会出现
 * "预览很好看、进去全不是"。
 */
export function FocusPreviewPage() {
  return <FocusView preview={FOCUS_PREVIEW} />
}
