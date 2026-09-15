import { renderToStaticMarkup } from 'react-dom/server'

import i18n from '@/i18n'
import { ImportDestinationStep } from '@/features/docs/import/ImportDestinationStep'
import { ImportResultStep } from '@/features/docs/import/ImportResultStep'
import { ImportSourceStep } from '@/features/docs/import/ImportSourceStep'
import { ImportTreeStep } from '@/features/docs/import/ImportTreeStep'
import type {
  ImportSourceKind,
  ImportTreeNode,
} from '@/features/docs/import/types'
import { importSpaces, treeForSource } from '@/mock/importFlow'

export { importSpaces, treeForSource }

export function translationsReady(): boolean {
  return i18n.t('import.title') !== 'import.title'
}

export function renderSourceStep(value: ImportSourceKind | null): string {
  return renderToStaticMarkup(<ImportSourceStep value={value} onChange={() => {}} />)
}

export function renderTreeStep(tree: ImportTreeNode[], selected: string[]): string {
  return renderToStaticMarkup(
    <ImportTreeStep
      tree={tree}
      selected={new Set(selected)}
      onSelectedChange={() => {}}
    />
  )
}

export function renderDestinationStep(value: string | null): string {
  return renderToStaticMarkup(
    <ImportDestinationStep
      spaces={importSpaces}
      value={value}
      onChange={() => {}}
    />
  )
}

export function renderResultStep(
  source: ImportSourceKind,
  files: number,
  folders: number,
  destinationId: string
): string {
  const destination = importSpaces.find((space) => space.id === destinationId)
  if (!destination) throw new Error(`unknown space: ${destinationId}`)
  return renderToStaticMarkup(
    <ImportResultStep
      source={source}
      counts={{ files, folders }}
      destination={destination}
    />
  )
}
