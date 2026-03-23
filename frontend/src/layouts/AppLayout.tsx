import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Ellipsis,
  FileText,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  Home,
  Languages,
  LibraryBig,
  PanelLeftClose,
  PlayCircle,
  Puzzle,
  SquarePen,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SidebarItem } from '@/components/SidebarItem'
import { SidebarSection } from '@/components/SidebarSection'
import { UserAvatar } from '@/components/UserAvatar'

const projectItems = [
  { icon: FolderOpen, label: 'CS229 Study Plan' },
  { icon: FolderOpen, label: 'Frontend Roadmap 2026' },
  { icon: FolderOpen, label: 'IELTS Prep' },
  { icon: FolderOpen, label: 'Calculus Review' },
  { icon: FolderOpen, label: 'Algorithm Practice' },
]

const courseItems = [
  { icon: PlayCircle, label: 'Linear Algebra — Lecture 12' },
  { icon: FileText, label: 'Python Data Structures Notes' },
  { icon: GraduationCap, label: 'Machine Learning Fundamentals' },
  { icon: PlayCircle, label: 'Calculus II — Integration' },
  { icon: FileText, label: 'React Performance Patterns' },
]

const chatItems = [
  { label: 'Explain backpropagation' },
  { label: 'React useEffect cleanup' },
  { label: 'SQL JOIN types' },
  { label: 'Big-O notation basics' },
  { label: 'Transformer architecture' },
]

export function AppLayout() {
  const location = useLocation()
  const hideToolbar = location.pathname === '/schedule'
  const navRef = useRef<HTMLElement>(null)
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false)

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
    <div className="flex h-screen gap-2 overflow-hidden bg-zinc-100 p-2 text-zinc-950 [--sidebar-width:240px]">
      <aside className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col">
        <nav ref={navRef} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 flex h-14 shrink-0 items-center justify-between bg-zinc-100 px-3">
            <Button variant="ghost" size="icon-sm" aria-label="Home" asChild>
              <Link to="/">
                <Home className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </Button>
          </header>

          <div className="sticky top-14 z-10 flex flex-col gap-0.5 bg-zinc-100">
            <SidebarItem icon={SquarePen} label="New chat" to="/" end />
            <SidebarItem icon={CalendarDays} label="Schedule" to="/schedule" />
            <SidebarItem icon={LibraryBig} label="Knowledge Base" />
            <SidebarItem icon={Puzzle} label="Plugins" />
            <div
              className={cn(
                'pointer-events-none h-px w-full shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-opacity duration-150',
                isScrolledFromTop ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <SidebarSection title="Projects">
              <SidebarItem icon={FolderPlus} label="New Project" />
              {projectItems.slice(0, 3).map((item) => (
                <SidebarItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
              <SidebarItem icon={Ellipsis} label="More" />
            </SidebarSection>

            <SidebarSection title="Courses">
              {courseItems.slice(0, 4).map((item) => (
                <SidebarItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
              <SidebarItem icon={Ellipsis} label="More" />
            </SidebarSection>

            <SidebarSection title="Chats" showLine={false}>
              {chatItems.map((item) => (
                <SidebarItem
                  key={item.label}
                  label={item.label}
                />
              ))}
            </SidebarSection>
          </div>

        </nav>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        <Outlet />
        {!hideToolbar && (
          <div className="pointer-events-none absolute right-0 top-0 flex items-center gap-2 p-4 [&>*]:pointer-events-auto">
            <Button
              variant="ghost"
              aria-label="Switch language"
              className="size-8 rounded-full p-0"
            >
              <Languages className="size-[18px]" />
            </Button>
            <UserAvatar
              name="Alex"
              showBadge
              onClick={() => console.log('avatar clicked')}
            />
          </div>
        )}
      </main>
    </div>
  )
}
