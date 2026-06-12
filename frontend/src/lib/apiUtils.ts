import { isAxiosError } from 'axios'

import { supabase } from '@/lib/supabaseClient'

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

/** token 失效时清掉本地会话，让 RequireAuth 守卫把用户带回登录页。 */
export async function signOutOn401<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      void supabase.auth.signOut()
    }
    throw error
  }
}
