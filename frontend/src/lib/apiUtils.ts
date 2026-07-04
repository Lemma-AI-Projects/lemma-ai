import { isAxiosError } from 'axios'

import { supabase } from '@/lib/supabaseClient'

function getHeaderValue(headers: unknown, name: string): unknown {
  if (!headers || typeof headers !== 'object') {
    return undefined
  }

  const maybeGetter = (headers as { get?: (headerName: string) => unknown }).get
  if (typeof maybeGetter === 'function') {
    return maybeGetter.call(headers, name)
  }

  const record = headers as Record<string, unknown>
  return record[name] ?? record[name.toLowerCase()]
}

function requestHadBearerToken(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false
  }

  const authorization = getHeaderValue(error.config?.headers, 'Authorization')
  return (
    typeof authorization === 'string' && authorization.startsWith('Bearer ')
  )
}

/** 404 统一含义「不存在或不是你的」，UI 一律当不存在处理。 */
export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

/** 4xx 不重试（401 走守卫回登录、404 当不存在），其余至多重试一次。 */
export function retryUnlessClientError(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response && error.response.status < 500) {
    return false
  }
  return failureCount < 1
}

/** 带 Bearer token 的请求被判 401 时清掉本地会话，让守卫带回登录页。
 *
 * scope: 'local' 只清本地会话，不调用服务端 global logout —— 后者会用已过期的
 * token 去吊销全局会话，必然 403，反而让用户卡在 401 循环里出不去。本地清理才
 * 是这里想要的（与上面的注释一致），SIGNED_OUT 事件会触发守卫跳回登录页。
 * 没有实际发出 Bearer token 的 401 不代表 session 失效，不能在这里踢用户。 */
export async function signOutOn401<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      requestHadBearerToken(error)
    ) {
      void supabase.auth.signOut({ scope: 'local' })
    }
    throw error
  }
}
