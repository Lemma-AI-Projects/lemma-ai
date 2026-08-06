import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  Coins,
  FlaskConical,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  Home,
  LibraryBig,
  ListTree,
  Menu,
  Puzzle,
  SquarePen,
} from 'lucide-react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarItem } from '@/components/SidebarItem'
import { SidebarMoreMenu } from '@/components/SidebarMoreMenu'
import { SidebarSection } from '@/components/SidebarSection'
import { useConversationsQuery } from '@/features/conversation/conversationApi'
import { CourseSidebarDirectory } from '@/features/course/CourseSidebarDirectory'
import { useCoursesListQuery } from '@/features/course/courseLearningApi'
import { LearnSpaceOnboardingDialog } from '@/features/learn-space/LearnSpaceOnboardingDialog'
import { useProjectsQuery } from '@/features/project/projectApi'

function SidebarHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-zinc-100 px-3">
      <Button variant="ghost" size="icon-sm" aria-label="Home" asChild>
        <Link to="/home">
          <Home className="size-4" />
        </Link>
      </Button>
      {children}
    </header>
  )
}

function CourseSidebarSwitcher({
  activeCourseId,
  navigationSidebarContent,
}: {
  activeCourseId: string
  navigationSidebarContent: ReactNode
}) {
  const [showCourseDirectory, setShowCourseDirectory] = useState(true)

  return (
    <>
      <SidebarHeader>
        <Button
          variant="ghost"
          aria-label={
            showCourseDirectory
              ? 'Show navigation sidebar'
              : 'Show course directory'
          }
          className="size-7 rounded-full border border-zinc-200 p-0 hover:bg-zinc-200/70 hover:text-zinc-900"
          onClick={() => setShowCourseDirectory((current) => !current)}
        >
          {showCourseDirectory ? (
            <Menu className="size-3.5" />
          ) : (
            <ListTree className="size-3.5" />
          )}
        </Button>
      </SidebarHeader>

      {showCourseDirectory ? (
        <CourseSidebarDirectory key={activeCourseId} courseId={activeCourseId} />
      ) : (
        navigationSidebarContent
      )}
    </>
  )
}

export function AppLayout() {
  const { t } = useTranslation()
  const navRef = useRef<HTMLElement>(null)
  const courseMatch = useMatch('/course/:id')
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false)
  const [learnSpaceOnboardingOpen, setLearnSpaceOnboardingOpen] = useState(false)
  const activeCourseId = courseMatch?.params.id
  const conversationsQuery = useConversationsQuery()
  const projectsQuery = useProjectsQuery()
  const coursesQuery = useCoursesListQuery()
  const projects = projectsQuery.data ?? []
  // 图标统一 FolderOpen（后端不下发图标）
  const visibleProjects = projects.slice(0, 3)
  const moreProjects = projects.slice(3)
  // 仅 ready 课程，图标统一 GraduationCap（后端不下发图标）
  const courses = coursesQuery.data ?? []
  const visibleCourses = courses.slice(0, 4)
  const moreCourses = courses.slice(4)

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

  const navigationSidebarContent = (
    <>
      <div className="sticky top-14 z-10 flex flex-col gap-0.5 bg-zinc-100">
        <SidebarItem icon={SquarePen} label={t('nav.newChat')} to="/home" end />
        <SidebarItem icon={CalendarDays} label={t('nav.schedule')} to="/schedule" />
        <SidebarItem
          icon={LibraryBig}
          label={t('nav.knowledgeBase')}
          to="/knowledge"
        />
        <SidebarItem
          icon={FolderOpen}
          label={t('nav.learnSpaces')}
          to="/learn-spaces"
        />
        <SidebarItem icon={Puzzle} label={t('nav.plugins')} to="/plugins" />
        <SidebarItem icon={Coins} label={t('nav.credits')} to="/gotopay" />
        <div
          className={cn(
            'pointer-events-none h-px w-full shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-opacity duration-150',
            isScrolledFromTop ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <SidebarSection title={t('nav.learnSpaces')} forceClosed={projectsQuery.isPending}>
          <SidebarItem
            icon={FolderPlus}
            label={t('nav.newLearnSpace')}
            onClick={() => setLearnSpaceOnboardingOpen(true)}
          />
          {projectsQuery.isPending ? (
            <div className="flex flex-col gap-2 px-3 py-1.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : projectsQuery.isError ? (
            <p className="px-3 py-1.5 text-sm text-zinc-400">{t('nav.loadFailed')}</p>
          ) : (
            <>
              {visibleProjects.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={FolderOpen}
                  label={item.name}
                  to={`/project/${item.id}`}
                />
              ))}
              <SidebarMoreMenu
                items={moreProjects.map((item) => ({
                  id: item.id,
                  icon: FolderOpen,
                  label: item.name,
                }))}
                getHref={(item) => `/project/${item.id}`}
              />
            </>
          )}
        </SidebarSection>

        <SidebarSection title={t('nav.courses')} forceClosed={coursesQuery.isPending}>
          {coursesQuery.isPending ? (
            <div className="flex flex-col gap-2 px-3 py-1.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : coursesQuery.isError ? (
            <p className="px-3 py-1.5 text-sm text-zinc-400">{t('nav.loadFailed')}</p>
          ) : (
            <>
              {visibleCourses.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={GraduationCap}
                  label={item.title}
                  to={`/course/${item.id}`}
                />
              ))}
              <SidebarMoreMenu
                items={moreCourses.map((item) => ({
                  id: item.id,
                  icon: GraduationCap,
                  label: item.title,
                }))}
                getHref={(item) => `/course/${item.id}`}
              />
            </>
          )}
        </SidebarSection>

        <SidebarSection
          title={t('nav.chats')}
          forceClosed={conversationsQuery.isPending}
          showLine={false}
        >
          {/* [sandbox] 临时调试入口，开发完成后可连同路由和沙盒页面整体移除。 */}
          <SidebarItem
            icon={FlaskConical}
            label={t('nav.sandbox')}
            to="/sandbox"
          />
          {conversationsQuery.isPending ? (
            <div className="flex flex-col gap-2 px-3 py-1.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : conversationsQuery.isError ? (
            <p className="px-3 py-1.5 text-sm text-zinc-400">{t('nav.loadFailed')}</p>
          ) : (
            (conversationsQuery.data ?? []).map((item) => (
              <SidebarItem
                key={item.id}
                label={item.title}
                to={`/chat/${item.id}`}
              />
            ))
          )}
        </SidebarSection>
      </div>
    </>
  )

  return (
    <div className="flex h-screen gap-2 overflow-hidden bg-zinc-100 p-2 text-zinc-950 [--sidebar-width:240px]">
      <aside className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col">
        <nav ref={navRef} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          {activeCourseId ? (
            <CourseSidebarSwitcher
              activeCourseId={activeCourseId}
              navigationSidebarContent={navigationSidebarContent}
            />
          ) : (
            <>
              <SidebarHeader />
              {navigationSidebarContent}
            </>
          )}

        </nav>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <LearnSpaceOnboardingDialog
        open={learnSpaceOnboardingOpen}
        onOpenChange={setLearnSpaceOnboardingOpen}
      />
    </div>
  )
}
