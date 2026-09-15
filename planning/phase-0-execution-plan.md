# Phase 0 Execution Plan — TipTap Editor + Real Data

> **Goal**: Replace the doc editor stub with a working TipTap block editor backed by real API data.

---

## Scope

| # | Task | Files | Depends |
|---|------|-------|---------|
| 0.1 | Enable backend doc API | `backend/.env` | — |
| 0.2 | Install TipTap + extensions | `frontend/package.json` | — |
| 0.3 | Create TipTap editor shell | `frontend/src/features/docs/DocEditor.tsx` (new) | 0.2 |
| 0.4 | Replace DocEditorView stub | `frontend/src/features/docs/DocEditorView.tsx` | 0.3 |
| 0.5 | Add block save/load API hooks | `frontend/src/features/docs/docApi.ts` | 0.1 |
| 0.6 | Connect editor to blocks API | `frontend/src/features/docs/DocEditorView.tsx` | 0.4, 0.5 |
| 0.7 | Wire /knowledge to real API | `frontend/src/pages/KnowledgeBasePage.tsx` | 0.1 |

---

## Task Details

### 0.1 — Enable backend doc API

The migration `f7a8b9c0d1e2_doc_pages_blocks.py` already exists. Just flip the flag:

```
# backend/.env
DOC_FULL_API_ENABLED=true
```

No schema changes needed. The existing endpoints at `/api/v1/pages` handle everything.

---

### 0.2 — Install TipTap

```bash
cd frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-code-block-lowlight @tiptap/extension-image @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
```

`@tiptap/starter-kit` bundles: paragraph, heading, bold, italic, strike, code, blockquote, bullet-list, ordered-list, code-block, horizontal-rule, hard-break.

Extra extensions: placeholder, code-block-lowlight (syntax highlighting), image, task-list/item, table.

---

### 0.3 — Create DocEditor component

**New file**: `frontend/src/features/docs/DocEditor.tsx`

A TipTap editor component that:
- Accepts `initialBlocks: DocBlock[]` (from API)
- Accepts `onSave: (blocks: BlockIn[]) => void` callback
- Converts `DocBlock[]` ↔ TipTap JSON on mount/save
- Renders a floating toolbar (bold, italic, heading, list, code, quote)
- Auto-saves on blur or after 2s debounce
- Shows "Saving…" / "Saved" / "Unsaved changes" status indicator

**Block type mapping** (DocBlock → TipTap node):

| DocBlock.type | TipTap node | content shape |
|---------------|-------------|---------------|
| `paragraph` | `paragraph` | `{ text: string }` |
| `heading` | `heading` | `{ text: string, level: 1-6 }` |
| `list` | `bulletList` / `orderedList` | `{ items: string[] }` |
| `todo` | `taskList` | `{ items: [{ text: string, checked: bool }] }` |
| `code` | `codeBlock` | `{ code: string, language?: string }` |
| `quote` | `blockquote` | `{ text: string }` |
| `divider` | `horizontalRule` | `{}` |
| `image` | `image` | `{ src: string, alt?: string }` |
| `math` | (placeholder — render as code block with `math` lang) | `{ formula: string }` |
| `callout` | (custom div wrapper around paragraph) | `{ text: string, variant?: string }` |

**Conversion strategy**: On load, flatten the TipTap JSON `doc.content` array into `DocBlock[]` (one block per top-level node). On save, reconstruct TipTap JSON from `DocBlock[]` and PUT to `/api/v1/pages/{pageId}/blocks`.

---

### 0.4 — Replace DocEditorView stub

Rewrite `DocEditorView.tsx`:
1. Fetch page via `usePageQuery(pageId)` (already exists)
2. Fetch blocks via new `usePageBlocksQuery(pageId)`
3. Pass blocks to `<DocEditor />`
4. Wire `onSave` to `useSavePageBlocksMutation(pageId)`
5. Keep existing back-button header + page title

---

### 0.5 — Add block API hooks to docApi.ts

```typescript
// Read blocks for a page
export function usePageBlocksQuery(pageId: string | undefined)

// Save blocks (PUT /api/v1/pages/{pageId}/blocks)
export function useSavePageBlocksMutation(pageId: string)
```

These wrap the existing `GET /api/v1/pages/{pageId}/blocks` and `PUT /api/v1/pages/{pageId}/blocks` endpoints.

---

### 0.6 — Connect editor to blocks API

In `DocEditorView.tsx`, chain:
1. `usePageQuery` → page metadata
2. `usePageBlocksQuery` → block content
3. Pass both to `<DocEditor initialBlocks={blocks} page={page} />`
4. `useSavePageBlocksMutation` → called by editor's auto-save

Handle:
- Loading state (skeleton)
- Error state (page not found / API disabled)
- Optimistic concurrency (409 → show "conflict, reload?" toast)

---

### 0.7 — Wire /knowledge to real API

Replace mock data in `KnowledgeBasePage.tsx`:
1. Add `useAllPagesQuery()` hook (calls `GET /api/v1/pages` without `projectId`)
2. Map `PageWithProjectOut[]` → `KnowledgeBaseItem[]`
3. Remove `getKnowledgeBaseItems()` mock import
4. Keep existing folder/filter/search UI — it already works on array state

---

## Acceptance Criteria

- [ ] Create a new note in ShelterDrawer → opens editor → type content → auto-saves
- [ ] Reload page → content persists from DB
- [ ] /knowledge page shows real pages from all learn spaces
- [ ] Block types: paragraph, heading (h1-h3), bullet list, code block, divider all render
- [ ] Optimistic concurrency: two tabs editing same page → 409 toast on conflict
- [ ] API disabled (flag off) → editor shows "Doc API unavailable" message, not crash
- [ ] `npm run build` passes with no type errors
