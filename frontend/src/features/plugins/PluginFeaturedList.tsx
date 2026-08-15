import { useState } from 'react'
import { Check, FileText, Plus } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  usePlugins,
  useInstallPlugin,
  useUninstallPlugin,
  type KbPlugin,
} from './pluginsApi'
import type { PluginSubjectTab } from './PluginSubjectTabs'

/** icon_name → lucide 组件（P2 真实化：后端存字符串，前端映射；未知回退 FileText） */
function PluginIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon =
    (LucideIcons as unknown as Record<string, typeof FileText>)[iconName] ??
    FileText
  return <Icon className={className} />
}

function PluginInstallButton({
  installed,
  title,
  onAdd,
  onRemove,
  busy,
}: {
  installed: boolean
  title: string
  onAdd: () => void
  onRemove: () => void
  busy: boolean
}) {
  if (installed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${title} 已安装（点击卸载）`}
        title="点击卸载"
        disabled={busy}
        className="size-8 rounded-full text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
        onClick={onRemove}
      >
        <Check className="size-5" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`添加 ${title}`}
      className="size-8 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950"
      disabled={busy}
      onClick={onAdd}
    >
      <Plus className="size-5" />
    </Button>
  )
}

/**
 * 插件精选列表（P4 真实化：数据来自 /api/v1/plugins，安装/卸载持久化）。
 * - 安装/卸载 mutation + invalidate；loading 中禁用对应按钮
 * - fail-open：后端不可达 → 降级提示不崩
 */
export function PluginFeaturedList({
  searchTerm,
  activeTab,
}: {
  searchTerm: string
  activeTab: PluginSubjectTab
}) {
  const { data: plugins, isLoading, isError } = usePlugins()
  const install = useInstallPlugin()
  const uninstall = useUninstallPlugin()
  const [busyId, setBusyId] = useState<string | null>(null)

  const visiblePlugins = (plugins ?? []).filter((item) => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const matchesTab = activeTab === 'all' || item.subject === activeTab
    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.description.toLowerCase().includes(normalizedSearch)
    return matchesTab && matchesSearch
  })

  const runAction = async (
    action: (id: string) => Promise<unknown>,
    pluginId: string,
  ) => {
    setBusyId(pluginId)
    try {
      await action(pluginId)
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <section className="mt-6 pb-12" aria-label="插件列表">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="mt-6 pb-12" aria-label="插件列表">
        <div className="mt-6 flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-muted-foreground">
          插件市场暂不可用（引擎未连接）
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6 pb-12" aria-label="插件列表">
      {visiblePlugins.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2">
          {visiblePlugins.map((item: KbPlugin) => (
            <article
              key={item.id}
              className="group/plugin-row flex min-w-0 items-center gap-4 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-100/70"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent">
                <PluginIcon
                  iconName={item.iconName}
                  className="size-6 text-zinc-500"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold leading-5 text-foreground">
                  {item.name}
                </h3>
                <p className="mt-1 truncate text-sm leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>

              <PluginInstallButton
                installed={item.installed}
                title={item.name}
                busy={busyId === item.id}
                onAdd={() =>
                  runAction((id) => install.mutateAsync(id), item.id)
                }
                onRemove={() =>
                  runAction((id) => uninstall.mutateAsync(id), item.id)
                }
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-muted-foreground">
          未找到插件
        </div>
      )}
    </section>
  )
}
