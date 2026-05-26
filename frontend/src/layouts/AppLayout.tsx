import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Ellipsis,
  FolderPlus,
  Home,
  LibraryBig,
  PanelLeftClose,
  Puzzle,
  SquarePen,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SidebarItem } from '@/components/SidebarItem'
import { SidebarSection } from '@/components/SidebarSection'
import { CreateProjectDialog } from '@/features/project/CreateProjectDialog'
import { chatItems } from '@/mock/chatItems'
import { courseItems } from '@/mock/courseItems'
import { projectItems } from '@/mock/projectItems'

export function AppLayout() {
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const isCoursePage = location.pathname.startsWith('/course/')

  const handleScroll = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setIsScrolledFromTop(el.scrollTop > 0)
  }, [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    handleScroll()
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="flex h-screen gap-2 overflow-hidden bg-zinc-100 p-2 text-zinc-950 [--sidebar-collapsed-width:56px] [--sidebar-width:240px]">
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isCoursePage
            ? 'w-[var(--sidebar-collapsed-width)]'
            : 'w-[var(--sidebar-width)]'
        )}
      >
        <nav ref={navRef} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <header className="sticky top-0 flex h-14 shrink-0 items-center justify-between bg-zinc-100 px-3">
            <Button variant="ghost" size="icon-sm" aria-label="Home" asChild>
              <Link to="/">
                <Home className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse sidebar"
              className={cn(isCoursePage && 'invisible pointer-events-none')}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </header>

          <div className="sticky top-14 z-10 flex flex-col gap-0.5 bg-zinc-100">
            <SidebarItem icon={SquarePen} label="New chat" to="/" end collapsed={isCoursePage} />
            <SidebarItem
              icon={CalendarDays}
              label="Schedule"
              to="/schedule"
              collapsed={isCoursePage}
            />
            <SidebarItem
              icon={LibraryBig}
              label="Knowledge Base"
              to="/knowledge"
              collapsed={isCoursePage}
            />
            <SidebarItem icon={Puzzle} label="Plugins" to="/plugins" collapsed={isCoursePage} />
            <div
              className={cn(
                'pointer-events-none h-px w-full shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-opacity duration-150',
                isScrolledFromTop ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>

          <div
            aria-hidden={isCoursePage}
            className={cn(
              'mt-2 flex flex-col gap-1 transition-[opacity,transform] duration-200 ease-out',
              isCoursePage && 'pointer-events-none -translate-x-2 opacity-0'
            )}
          >
            <SidebarSection title="Projects">
              <SidebarItem
                icon={FolderPlus}
                label="New Project"
                onClick={() => setCreateProjectOpen(true)}
              />
              {projectItems.slice(0, 3).map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  to={`/project/${item.id}`}
                />
              ))}
              <SidebarItem icon={Ellipsis} label="More" />
            </SidebarSection>

            <SidebarSection title="Courses">
              {courseItems.slice(0, 4).map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  to={`/course/${item.id}`}
                />
              ))}
              <SidebarItem icon={Ellipsis} label="More" />
            </SidebarSection>

            <SidebarSection title="Chats" showLine={false}>
              {chatItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  label={item.label}
                  to={`/chat/${item.id}`}
                />
              ))}
            </SidebarSection>
          </div>

        </nav>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onCreate={(name) => console.log('TODO: create project', name)}
      />
    </div>
  )
}
