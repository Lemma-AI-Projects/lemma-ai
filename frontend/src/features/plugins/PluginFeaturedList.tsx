import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pluginItems } from '@/mock/pluginItems'
import type { PluginSubjectTab } from './PluginSubjectTabs'

function PluginInstallButton({
  installed,
  title,
  onAdd,
}: {
  installed: boolean
  title: string
  onAdd: () => void
}) {
  if (installed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${title} 已添加`}
        className="size-8 rounded-full text-zinc-500 hover:bg-transparent hover:text-zinc-700"
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
      onClick={onAdd}
    >
      <Plus className="size-5" />
    </Button>
  )
}

export function PluginFeaturedList({
  searchTerm,
  activeTab,
}: {
  searchTerm: string
  activeTab: PluginSubjectTab
}) {
  const [addedPluginIds, setAddedPluginIds] = useState<Set<string>>(
    () =>
      new Set(
        pluginItems
          .filter((item) => item.installed)
          .map((item) => item.id)
      )
  )

  const visiblePlugins = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return pluginItems.filter((item) => {
      const matchesTab = activeTab === 'all' || item.subject === activeTab
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch)

      return matchesTab && matchesSearch
    })
  }, [activeTab, searchTerm])

  const handleAdd = (pluginId: string) => {
    setAddedPluginIds((current) => new Set(current).add(pluginId))
  }

  return (
    <section className="mt-6 pb-12" aria-label="插件列表">
      {visiblePlugins.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2">
          {visiblePlugins.map((item) => {
            const { Icon } = item
            const isAdded = addedPluginIds.has(item.id)

            return (
              <article
                key={item.id}
                className="group/plugin-row flex min-w-0 items-center gap-4 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-100/70"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent">
                  <Icon className="size-6 text-zinc-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold leading-5 text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 truncate text-sm leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <PluginInstallButton
                  installed={isAdded}
                  title={item.title}
                  onAdd={() => handleAdd(item.id)}
                />
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-muted-foreground">
          未找到插件
        </div>
      )}
    </section>
  )
}
