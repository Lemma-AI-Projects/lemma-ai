/**
 * kb-engine K2：引擎 REST 层挂载（buildSharedApiRoutes 注入式适配）。
 *
 * 范式与引擎官方测试（packages/core/src/test/api_tester.ts）完全同构：
 *   - apiRoute：同步 + 事务包裹（getContext().init + getSql().transactional）
 *   - asyncApiRoute：异步 + 无事务（上传/导入类，handler 返回 promise）
 *   - route/asyncRoute：同步/异步 + 中间件数组【全部旁路】 + 可选 resultHandler
 *
 * 认证旁路理由（信任边界）：FastAPI 网关是唯一外部入口（Supabase JWT 认证 +
 * X-Lemma-User-Id 注入），Express 只监听内网；RLS 租户中间件（app.ts 层）已做
 * 每请求 setAppUserId。与 api_tester 的 noop 中间件完全同构——区别仅在
 * app.use 层的 RLS 中间件真实生效。
 *
 * 响应格式：formatApiResult 同构（trilium-max-entity-change-id 头 +
 * convertEntitiesToPojo + [status, body] 数组 / 204 / 200）。
 * 错误映射：HttpError（ValidationError=400 等）按 statusCode，其余 500。
 */
import type { Express, Request, Response } from 'express'
import {
  buildSharedApiRoutes,
  convertEntitiesToPojo,
} from '../../packages/core/src/routes/index.ts'
import { getContext } from '../../packages/core/src/services/context.ts'
import { getSql } from '../../packages/core/src/services/sql/index.ts'
import entityChanges from '../../packages/core/src/services/entity_changes.ts'
import { HttpError } from '../../packages/core/src/errors.ts'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Handler = (req: Request, res?: Response) => unknown
interface CaptureResponse {
  setHeader(name: string, value: string): void
  captured?: unknown
}
type ResultHandler = (
  req: Request,
  res: CaptureResponse,
  result: unknown,
) => void

/** formatApiResult 同构（引擎响应格式） */
function formatApiResult(
  result: unknown,
): { status: number; headers: Record<string, string>; body?: unknown } {
  const headers = {
    'trilium-max-entity-change-id': String(entityChanges.getMaxEntityChangeId()),
  }
  const pojo = convertEntitiesToPojo(result)
  if (Array.isArray(pojo) && pojo.length > 0 && Number.isInteger(pojo[0])) {
    const [status, body] = pojo as [number, unknown]
    return { status, headers, body }
  }
  if (pojo === undefined) return { status: 204, headers }
  return { status: 200, headers, body: pojo }
}

function sendResult(res: Response, formatted: { status: number; headers: Record<string, string>; body?: unknown }): void {
  res.status(formatted.status).set(formatted.headers)
  if (formatted.body === undefined) res.end()
  else res.json(formatted.body)
}

export function mountApiRoutes(app: Express, prefix = '/kb'): void {
  const register = (
    method: HttpMethod,
    path: string,
    run: (req: Request, res: Response) => void,
  ) => {
    app[method](prefix + path, (req: Request, res: Response) => {
      run(req, res)
    })
  }
  const fail = (res: Response, e: unknown): void => {
    const status = e instanceof HttpError ? e.statusCode : 500
    res.status(status).json({ error: (e as Error).message })
  }

  // apiRoute：同步 + 事务（引擎标准 API 形态）
  const apiRoute = (method: HttpMethod, path: string, handler: Handler): void => {
    register(method, path, (req, res) => {
      try {
        const result = getContext().init(() => getSql().transactional(() => handler(req)))
        sendResult(res, formatApiResult(result))
      } catch (e) {
        fail(res, e)
      }
    })
  }

  // asyncApiRoute：异步 + 无事务（handler 返回 promise）
  const asyncApiRoute = (method: HttpMethod, path: string, handler: Handler): void => {
    register(method, path, async (req, res) => {
      try {
        const result = await getContext().init(async () => await handler(req))
        sendResult(res, formatApiResult(result))
      } catch (e) {
        fail(res, e)
      }
    })
  }

  // route/asyncRoute：中间件旁路 + 可选 resultHandler（sync 路由用）
  const buildRoute =
    (transactional: boolean) =>
    (
      method: HttpMethod,
      path: string,
      _mw: unknown[],
      handler: Handler,
      resultHandler?: ResultHandler | null,
    ): void => {
      register(method, path, (req, res) => {
        try {
          const invoke = () => handler(req, res)
          const result = transactional
            ? getContext().init(() => getSql().transactional(invoke))
            : getContext().init(() => invoke())
          if (resultHandler) {
            const capture: CaptureResponse = {
              setHeader(name, value) {
                res.set(name, value)
              },
            }
            resultHandler(req, capture, result)
            if (capture.captured !== undefined) {
              sendResult(res, capture.captured as { status: number; headers: Record<string, string>; body?: unknown })
              return
            }
          }
          sendResult(res, formatApiResult(result))
        } catch (e) {
          fail(res, e)
        }
      })
    }

  // 中间件全部旁路：认证/CSRF/限流/上传解析由网关或后续步骤处理（与 api_tester 同构）
  const noopMw = (): void => undefined

  buildSharedApiRoutes({
    route: buildRoute(true),
    asyncRoute: buildRoute(false),
    asyncRouteWithoutTransaction: buildRoute(false),
    apiRoute,
    asyncApiRoute,
    apiResultHandler: (_req, res, result) => {
      res.captured = formatApiResult(result)
    },
    checkApiAuth: noopMw,
    checkApiAuthOrElectron: noopMw,
    checkAppNotInitialized: noopMw,
    checkCredentials: noopMw,
    loginRateLimiter: noopMw,
    uploadMiddlewareWithErrorHandling: noopMw,
    importMiddlewareWithErrorHandling: noopMw,
    csrfMiddleware: noopMw,
  } as never)
}
