import {
  CalendarDays,
  Ellipsis,
  FileText,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  Home,
  LibraryBig,
  PanelLeftClose,
  PlayCircle,
  Puzzle,
  SquarePen,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarItem } from '@/components/SidebarItem'
import { SidebarSection } from '@/components/SidebarSection'

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
  return (
    <div className="flex h-screen gap-2 overflow-hidden bg-zinc-100 p-2 text-zinc-950 [--sidebar-width:240px]">
      <aside className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col">
        <nav className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 flex h-14 shrink-0 items-center justify-between bg-zinc-100 px-3">
            <Button variant="ghost" size="icon-sm" aria-label="Home">
              <Home className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </Button>
          </header>

          <div className="sticky top-14 flex flex-col bg-zinc-100">
            <SidebarItem icon={SquarePen} label="New chat" />
            <SidebarItem icon={CalendarDays} label="Schedule" />
          </div>

          <div className="flex flex-col">
            <SidebarItem icon={LibraryBig} label="Knowledge Base" />
            <SidebarItem icon={Puzzle} label="Plugins" />
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

      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
          {/* Main content placeholder */}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
