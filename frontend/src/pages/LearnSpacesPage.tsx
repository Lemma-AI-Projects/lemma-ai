import { LearnSpacesView } from '@/features/learn-space/LearnSpacesView'
import { useProjectsQuery } from '@/features/project/projectApi'

export function LearnSpacesPage() {
  const projectsQuery = useProjectsQuery()

  return (
    <LearnSpacesView
      spaces={projectsQuery.data ?? []}
      isPending={projectsQuery.isPending}
      isError={projectsQuery.isError}
    />
  )
}
