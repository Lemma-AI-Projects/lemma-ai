import { FolderOpen } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { ProjectInput } from '@/features/project/ProjectInput'
import { ProjectPageActions } from '@/features/project/ProjectPageActions'
import { ProjectTabs } from '@/features/project/ProjectTabs'
import { projectItems } from '@/mock/projectItems'

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const projectName = projectItems.find((item) => item.id === id)?.label ?? ''

  return (
    <div className="relative h-full rounded-md border border-zinc-200/80 bg-zinc-50">
      <ProjectPageActions />
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="mb-74 flex w-full max-w-[48rem] flex-col">
          <div className="mb-7 flex translate-x-2 items-center gap-3">
            <FolderOpen className="size-9 text-foreground" strokeWidth={1.75} />
            <h1 className="text-2xl font-medium text-foreground">{projectName}</h1>
          </div>
          <ProjectInput />
          <div className="translate-x-3 translate-y-6">
            <ProjectTabs />
          </div>
        </div>
      </div>
    </div>
  )
}
