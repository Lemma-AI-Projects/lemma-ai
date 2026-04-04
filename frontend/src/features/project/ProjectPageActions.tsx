import { Ellipsis, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProjectPageActions() {
  return (
    <div className="absolute right-4 top-4 flex items-center gap-3">
      <Button
        variant="outline"
        aria-label="Share project"
        className="h-9 rounded-full bg-transparent px-3 hover:bg-muted"
      >
        <Share2 className="size-4" />
        <span className="text-sm font-medium">Share</span>
      </Button>
      <Button
        variant="outline"
        aria-label="More actions"
        className="size-9 rounded-full bg-transparent p-0 hover:bg-muted"
      >
        <Ellipsis className="size-4" />
      </Button>
    </div>
  )
}
