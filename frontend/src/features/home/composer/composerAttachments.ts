import {
  BookOpen,
  CalendarDays,
  LibraryBig,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'

// 输入框左下角的加号只做一件事：给这次对话附上参考资料。
// 「是否带上下文、是否联网、用哪个工具」是功能开关，归下巴那一排，不在这里。
//
// 参考资料从哪来：
// - file：从电脑上传的文件；
// - course：用户已经排好的课程；
// - question-set：最近做过的练习和试卷；
// - schedule：日程排期；
// - knowledge：知识库里的资料。
export type ComposerAttachmentKind =
  | 'file'
  | 'course'
  | 'question-set'
  | 'schedule'
  | 'knowledge'

// 平台里已有的资料：除了本地文件以外的几种。
export type ComposerLibraryKind = Exclude<ComposerAttachmentKind, 'file'>

// 已经附到这次对话上的一份参考资料。
export interface ComposerAttachment {
  id: string
  kind: ComposerAttachmentKind
  title: string
}

export interface ComposerLibraryItem {
  id: string
  title: string
}

// 用户在平台里可以附上的全部资料，按来源分开。
export type ComposerAttachmentLibrary = Record<ComposerLibraryKind, ComposerLibraryItem[]>

// 几种平台资料各自的图标。
export const COMPOSER_LIBRARY_KIND_ICONS: Record<ComposerLibraryKind, LucideIcon> = {
  course: BookOpen,
  'question-set': ListChecks,
  schedule: CalendarDays,
  knowledge: LibraryBig,
}

// 几种平台资料的名字和图标；数组顺序就是各个菜单里的排列顺序。
// `short` 是空间紧张时用的短名字。
export const COMPOSER_LIBRARY_KINDS: {
  kind: ComposerLibraryKind
  label: string
  short: string
  Icon: LucideIcon
}[] = [
  { kind: 'course', label: '课程', short: '课程', Icon: COMPOSER_LIBRARY_KIND_ICONS.course },
  {
    kind: 'question-set',
    label: '练习与试卷',
    short: '练习',
    Icon: COMPOSER_LIBRARY_KIND_ICONS['question-set'],
  },
  { kind: 'schedule', label: '日程', short: '日程', Icon: COMPOSER_LIBRARY_KIND_ICONS.schedule },
  {
    kind: 'knowledge',
    label: '知识库',
    short: '知识库',
    Icon: COMPOSER_LIBRARY_KIND_ICONS.knowledge,
  },
]

// 某一种来源下可以附上的资料。id 带上来源前缀，不同来源之间不会撞。
export function listLibraryAttachments(
  library: ComposerAttachmentLibrary,
  kind: ComposerLibraryKind
): ComposerAttachment[] {
  return library[kind].map((item) => ({
    id: `${kind}:${item.id}`,
    kind,
    title: item.title,
  }))
}

// 分栏面板里，搜索框和下面两栏怎么分开（候选样式，说明见 ComposerAttachPanesPanel）。
export type ComposerAttachSearchLayout =
  | 'plain'
  | 'field'
  | 'column'
  | 'column-field'
  | 'band'

// 每一种加号菜单都拿到同样的东西。
export interface ComposerAttachMenuProps {
  attachments: ComposerAttachment[]
  library: ComposerAttachmentLibrary
  // 直接交来一批文件（比如拖进来的）。
  onAddFiles: (files: File[]) => void
  // 打开系统的选文件窗口。
  onPickFiles: () => void
  // 附上一份平台资料；已经附上的再点一次就是取消。
  onToggle: (attachment: ComposerAttachment) => void
  // 只有分栏面板用。
  searchLayout?: ComposerAttachSearchLayout
}
