import { Link } from 'react-router-dom'

import { PREVIEW_GROUPS, PREVIEW_ROUTES } from './previewRegistry'

/** `/preview` 索引页：这三条路由唯一的目录。 */
export function PreviewIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-[17px] font-medium text-zinc-900">Preview 索引</h1>
        <p className="mt-1 text-[13px] leading-6 text-zinc-500">
          全部评审入口都在这里，免登录、mock 数据。
          新增 preview 只改 <code className="rounded bg-zinc-100 px-1">pages/previewRegistry.tsx</code>
          —— 路由和这份清单会一起更新。
        </p>

        {PREVIEW_GROUPS.map((group) => (
          <section key={group} className="mt-8">
            <h2 className="text-[11px] tracking-[0.08em] text-zinc-400">{group}</h2>
            <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200/80">
              {PREVIEW_ROUTES.filter((route) => route.group === group).map((route) => (
                <li key={route.path}>
                  <Link
                    to={route.path}
                    className="block px-4 py-2.5 transition-colors hover:bg-zinc-50"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium text-zinc-800">
                        {route.label}
                      </span>
                      <code className="shrink-0 text-[11px] text-zinc-400">{route.path}</code>
                    </div>
                    {route.note ? (
                      <p className="mt-0.5 text-[12px] leading-5 text-zinc-500">{route.note}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-8 text-[12px] leading-6 text-zinc-400">
          这里的每一页都是评审入口，不是产品路由 —— 产品功能在登录后的 AppLayout 里。
          状态词（Accepted / Provisional / Open）见 docs/decisions/。
        </p>
      </div>
    </div>
  )
}
