import { Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="flex h-screen gap-2 overflow-hidden bg-zinc-100 p-2 text-zinc-950">
      <aside className="flex h-full w-54 shrink-0 flex-col">
        <div className="h-14 shrink-0">{/* Logo placeholder */}</div>
        <nav className="min-h-0 flex-1">{/* Navigation placeholder */}</nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-white">
          {/* Main content placeholder */}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
