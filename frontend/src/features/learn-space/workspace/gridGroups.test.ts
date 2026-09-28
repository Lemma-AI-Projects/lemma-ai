import { describe, expect, it } from 'vitest'

import type { DocPage } from '@/features/docs/types'
import { childrenOf, extensionOf, groupKeyOf, groupMaterials } from './gridGroups'

function page(overrides: Partial<DocPage>): DocPage {
  return {
    id: 'p',
    projectId: 'space',
    projectName: '空间',
    parentPageId: null,
    title: '未命名',
    kind: 'imported',
    source: 'upload',
    importRef: null,
    originalName: null,
    mime: null,
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

describe('extensionOf', () => {
  it('prefers the original file name and lowercases the extension', () => {
    expect(extensionOf(page({ originalName: '论文.PDF' }))).toBe('.pdf')
  })

  it('falls back to the import ref, then to nothing', () => {
    expect(extensionOf(page({ importRef: 'notes/x.md' }))).toBe('.md')
    expect(extensionOf(page({}))).toBe('')
  })
})

describe('groupKeyOf', () => {
  it('reads the type off the file, not off the (renamable) title', () => {
    const renamed = page({ title: '随便叫什么都行', originalName: 'slides.pptx' })
    expect(groupKeyOf(renamed)).toBe('presentation')
  })

  it('maps each uploadable kind', () => {
    expect(groupKeyOf(page({ originalName: 'a.pdf' }))).toBe('pdf')
    expect(groupKeyOf(page({ originalName: 'a.png' }))).toBe('image')
    expect(groupKeyOf(page({ originalName: 'a.mp4' }))).toBe('media')
    expect(groupKeyOf(page({ originalName: 'a.zip' }))).toBe('other')
  })

  it('treats a fileless import (a text board) as a document', () => {
    expect(groupKeyOf(page({ originalName: null, importRef: null }))).toBe('word')
  })

  it('keeps the space’s own content in its own groups', () => {
    expect(groupKeyOf(page({ kind: 'note', source: 'manual' }))).toBe('note')
    expect(groupKeyOf(page({ kind: 'canvas' }))).toBe('canvas')
    expect(groupKeyOf(page({ kind: 'folder' }))).toBe('folder')
  })
})

describe('groupMaterials', () => {
  it('returns non-empty groups in a fixed order, files before own content', () => {
    const groups = groupMaterials([
      page({ id: 'n', kind: 'note' }),
      page({ id: 'i', originalName: 'a.png' }),
      page({ id: 'd', originalName: 'a.pdf' }),
    ])
    expect(groups.map((group) => group.key)).toEqual(['pdf', 'image', 'note'])
    expect(groups[0].items.map((item) => item.id)).toEqual(['d'])
  })

  it('never invents an empty group', () => {
    const groups = groupMaterials([page({ id: 'd', originalName: 'a.pdf' })])
    expect(groups).toHaveLength(1)
    expect(groups.map((group) => group.key)).not.toContain('note')
  })

  it('orders within a group by source, then newest first', () => {
    const groups = groupMaterials([
      page({ id: 'old-manual', source: 'manual', updatedAt: '2026-01-01T00:00:00Z' }),
      page({ id: 'upload-old', updatedAt: '2026-01-01T00:00:00Z' }),
      page({ id: 'upload-new', updatedAt: '2026-09-01T00:00:00Z' }),
    ])
    expect(groups[0].items.map((item) => item.id)).toEqual([
      'upload-new',
      'upload-old',
      'old-manual',
    ])
  })

  it('is total: nothing is dropped', () => {
    const pages = [
      page({ id: '1', originalName: 'a.pdf' }),
      page({ id: '2', kind: 'folder' }),
      page({ id: '3', kind: 'note' }),
      page({ id: '4', originalName: 'weird.qqq' }),
    ]
    const flat = groupMaterials(pages).flatMap((group) => group.items)
    expect(flat).toHaveLength(pages.length)
    expect(new Set(flat.map((item) => item.id))).toEqual(new Set(['1', '2', '3', '4']))
  })
})

describe('childrenOf', () => {
  it('keeps only the direct children of a folder (null = the space root)', () => {
    const pages = [
      page({ id: 'root' }),
      page({ id: 'child', parentPageId: 'folder' }),
      page({ id: 'grandchild', parentPageId: 'child' }),
    ]
    expect(childrenOf(pages, 'folder').map((item) => item.id)).toEqual(['child'])
    expect(childrenOf(pages, null).map((item) => item.id)).toEqual(['root'])
  })
})
