import { useState } from 'react'
import { Search } from 'lucide-react'
import { PluginPoster } from '@/features/plugins/PluginPoster'
import {
  PluginSubjectTabs,
  type PluginSubjectTab,
} from '@/features/plugins/PluginSubjectTabs'

export function PluginsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<PluginSubjectTab>('all')

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <main className="min-h-full">
        <div className="mx-auto flex w-full max-w-[810px] flex-col px-4 pt-10 pb-0">
          <div className="mt-9 mb-0 flex min-h-19 flex-wrap items-end gap-4">
            <h1 className="min-w-0 flex-1 text-[28px] leading-[34px] font-medium text-foreground">
              插件
            </h1>

            <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 md:ms-auto md:w-auto">
              <div className="min-w-0 flex-1 md:w-60 md:flex-none">
                <div className="relative w-full">
                  <Search
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2}
                  />
                  <input
                    id="plugins-search-input"
                    type="text"
                    autoComplete="off"
                    aria-label="搜索插件"
                    placeholder="搜索插件"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-9 w-full rounded-full border border-zinc-200 bg-background ps-9 pe-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/80 focus:border-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <PluginPoster />
          <PluginSubjectTabs value={activeTab} onChange={setActiveTab} />
        </div>
      </main>
    </div>
  )
}
