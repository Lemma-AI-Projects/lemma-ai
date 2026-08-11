/**
 * kb-engine P0-4：Express 应用工厂（可测试：注入 provider/sql）。
 *
 * 信任边界：本服务只监听内网/被 FastAPI 网关调用，不自己做认证。
 * RLS 租户上下文：每请求从 X-Lemma-User-Id（网关认证后注入）读取 uid →
 * provider.setAppUserId（会话级 app.user_id）→ 处理 → 响应结束重置。
 * 同步桥串行执行，设置/重置不会交叉污染。
 */
import express, { type Express, type Request, type Response } from 'express'
import type { PgProvider } from '../db/pg-provider.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'

/** FastAPI 网关认证后注入的用户头 */
export const USER_ID_HEADER = 'x-lemma-user-id'

export interface KbEngineContext {
  provider: PgProvider
  sql: SqlService
}

export interface NoteRow {
  noteId: string
  title: string
  type: string
  mime: string
  isDeleted: number
  dateCreated: string
  dateModified: string
}

export interface BranchRow {
  branchId: string
  noteId: string
  parentNoteId: string
  notePosition: number
}

export interface TreeNode {
  branchId: string
  noteId: string
  title: string
  type: string
  children: TreeNode[]
}

export function createKbApp(ctx: KbEngineContext): Express {
  const app = express()
  app.use(express.json())

  // ── RLS 租户中间件 ────────────────────────────────────────────────────────
  app.use((req: Request, res: Response, next: () => void) => {
    const uid = req.header(USER_ID_HEADER) ?? ''
    ctx.provider.setAppUserId(uid)
    res.on('finish', () => ctx.provider.setAppUserId(''))
    next()
  })

  // ── 健康检查（网关探活） ──────────────────────────────────────────────────
  app.get('/kb/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'kb-engine', ts: new Date().toISOString() })
  })

  // ── notes 列表（P0 目标：先接 notes 列表） ────────────────────────────────
  app.get('/kb/notes', (_req: Request, res: Response) => {
    try {
      const notes = ctx.sql.getRows<NoteRow>(
        `SELECT noteId, title, type, mime, isDeleted, dateCreated, dateModified
         FROM notes WHERE isDeleted = 0
         ORDER BY dateModified DESC LIMIT 200`,
      )
      res.json({ notes })
    } catch (e) {
      res.status(500).json({ error: (e as Error).message })
    }
  })

  // ── notes 树（branches 关联；JS 组装——pg-mem 无递归 CTE，真 PG 同样适用） ──
  app.get('/kb/notes/tree', (_req: Request, res: Response) => {
    try {
      const branches = ctx.sql.getRows<BranchRow>(
        `SELECT branchId, noteId, parentNoteId, notePosition
         FROM branches WHERE isDeleted = 0
         ORDER BY notePosition`,
      )
      const notes = ctx.sql.getRows<{ noteId: string; title: string; type: string }>(
        `SELECT noteId, title, type FROM notes WHERE isDeleted = 0`,
      )
      const noteMeta = new Map(notes.map((n) => [n.noteId, n]))

      // 多父树：每个 branchId 一个节点；parentNoteId 指向父 noteId
      const nodes = new Map<string, TreeNode>()
      for (const b of branches) {
        const meta = noteMeta.get(b.noteId)
        nodes.set(b.branchId, {
          branchId: b.branchId,
          noteId: b.noteId,
          title: meta?.title ?? '(deleted)',
          type: meta?.type ?? 'unknown',
          children: [],
        })
      }
      const roots: TreeNode[] = []
      for (const b of branches) {
        const node = nodes.get(b.branchId)!
        // 父分支 = 其父 note 下同 noteId 的分支（Trilium 语义：父 note 的多个分支都算父）
        const parentBranch = branches.find(
          (pb) => pb.noteId === b.parentNoteId && pb.branchId !== b.branchId,
        )
        if (parentBranch && nodes.has(parentBranch.branchId)) {
          nodes.get(parentBranch.branchId)!.children.push(node)
        } else {
          roots.push(node)
        }
      }
      res.json({ tree: roots })
    } catch (e) {
      res.status(500).json({ error: (e as Error).message })
    }
  })

  return app
}
