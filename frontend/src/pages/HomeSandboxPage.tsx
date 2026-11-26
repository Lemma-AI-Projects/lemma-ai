import { ActionChip } from '@/components/ActionChip'
import { HomeComposer } from '@/features/home/composer/HomeComposer'
import { HomeUserMenu } from '@/features/home/HomeUserMenu'
import {
  composerAttachmentLibrary,
  composerSpaces,
  composerTodayTasks,
} from '@/mock/homeComposer'
import { suggestions } from '@/mock/homeSuggestions'

// [sandbox] 首页预览：和首页（HomePage）同一套布局，只把输入框换成新版 HomeComposer，
// 用来看新输入框放进真实页面后的效果。
// 选定的样式：「今日」入口用一句话，排期菜单用开关展开；课程体量还没定，先用列表菜单。
// 今日卡片（无标题、任务可点）和排期面板的配色（白片）已经定成唯一实现，不需要在这里选。
//
// 与首页的两处不同：
// - 右上角没有「今日任务进度」圆环按钮：新输入框左上角已经有「今日」入口，留着就重复了；
// - 发送不发任何请求，也不跳转：自由课程的后端契约还没落地，今日任务和学习空间也是示例数据。
export function HomeSandboxPage() {
  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <HomeUserMenu />
      </div>
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              What do you want to learn?
            </h1>
            <p className="text-sm text-zinc-500">
              Describe a topic, paste a link, or ask a question to get started.
            </p>
          </div>
          <HomeComposer
            volumeControl="list"
            scheduleMenu="switch"
            todayButton="sentence"
            todayTasks={composerTodayTasks}
            spaces={composerSpaces}
            attachmentLibrary={composerAttachmentLibrary}
          />
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <ActionChip
                key={s.label}
                icon={s.icon}
                iconColor={s.iconColor}
                label={s.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
