/**
 * Doc-layer types (Page + Block). Mirrors backend/schemas/doc.py.
 *
 * `kind` is the shelter group key (note/canvas/imported/folder); a `folder` is a
 * pure container node with no blocks of its own. `source` records the origin so
 * Phase 1/2 import & incremental-sync can be told apart from manual notes.
 */

export type PageKind = 'note' | 'canvas' | 'imported' | 'folder'

export type PageSource = 'manual' | 'obsidian' | 'notion' | 'upload'

export interface DocPage {
  id: string
  projectId: string
  projectName: string
  parentPageId: string | null
  title: string
  kind: PageKind
  source: PageSource
  importRef: string | null
  updatedAt: string
}

/** TabTip node payload inside a page's block stream (P0.4 consumes this). */
export interface DocBlock {
  id: string
  type: string
  position: number
  content: Record<string, unknown>
  meta?: Record<string, unknown> | null
}

/** Block write payload (POST/PUT to API). id is null for new blocks. */
export interface BlockIn {
  id: string | null
  type: string
  position: number
  content: Record<string, unknown>
  meta?: Record<string, unknown> | null
}