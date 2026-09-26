/**
 * User Home endpoints.
 *
 * Everything here goes through `/users/me/home`, which is scoped to the caller
 * by the token — there is no user id in any URL, so no client can ask for
 * someone else's Home by guessing one.
 *
 * Two cache keys matter: this one, and `currentUserQueryKey` (the nickname lives
 * in `profiles` and is shown on the same page).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { currentUserQueryKey } from '@/features/auth/useCurrentUser'
import type { HomeItemKind, UserHome, UserHomeItem } from './types'

export const userHomeQueryKey = ['user-home'] as const

async function getUserHome(): Promise<UserHome> {
  const { data } = await signOutOn401(apiClient.get<UserHome>('/api/v1/users/me/home'))
  return data
}

export function useUserHomeQuery() {
  return useQuery({
    queryKey: userHomeQueryKey,
    queryFn: getUserHome,
    retry: retryUnlessClientError,
  })
}

function useInvalidateHome() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: userHomeQueryKey })
    // The nickname is edited here but owned by `profiles`; the avatar menu shows
    // it too, so both keys are refreshed together.
    void queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
  }
}

/** About Me: partial update — only the fields sent are written. */
export function useUpdateAboutMutation() {
  const invalidate = useInvalidateHome()
  return useMutation({
    mutationFn: async (patch: { language?: string | null; background?: string | null }) => {
      const { data } = await signOutOn401(
        apiClient.patch<UserHome>('/api/v1/users/me/home', patch)
      )
      return data
    },
    onSuccess: invalidate,
  })
}

/** The learner's own line: confirmed and `origin: user` from the moment it lands. */
export function useAddHomeItemMutation() {
  const invalidate = useInvalidateHome()
  return useMutation({
    mutationFn: async (input: { kind: HomeItemKind; text: string }) => {
      const { data } = await signOutOn401(
        apiClient.post<UserHomeItem>('/api/v1/users/me/home/items', input)
      )
      return data
    },
    onSuccess: invalidate,
  })
}

/** Edit text, or confirm a proposal (`status: 'confirmed'`). */
export function useUpdateHomeItemMutation() {
  const invalidate = useInvalidateHome()
  return useMutation({
    mutationFn: async (input: {
      id: string
      text?: string
      status?: 'confirmed'
    }) => {
      const { id, ...patch } = input
      const { data } = await signOutOn401(
        apiClient.patch<UserHomeItem>(`/api/v1/users/me/home/items/${id}`, patch)
      )
      return data
    },
    onSuccess: invalidate,
  })
}

/** Remove a line, or ignore a proposal — the same call. */
export function useDeleteHomeItemMutation() {
  const invalidate = useInvalidateHome()
  return useMutation({
    mutationFn: async (id: string) => {
      await signOutOn401(apiClient.delete(`/api/v1/users/me/home/items/${id}`))
    },
    onSuccess: invalidate,
  })
}

/** The nickname is `profiles`' field, so it keeps its own endpoint. */
export function useUpdateNicknameMutation() {
  const invalidate = useInvalidateHome()
  return useMutation({
    mutationFn: async (nickname: string) => {
      const { data } = await signOutOn401(
        apiClient.patch('/api/v1/users/me', { nickname })
      )
      return data
    },
    onSuccess: invalidate,
  })
}
