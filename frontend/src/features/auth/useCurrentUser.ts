import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/useAuth'
import { apiClient } from '@/lib/apiClient'

type ApiSubscriptionPlan = 'free' | 'pro'

interface CurrentUserResponse {
  id: string
  email: string
  nickname: string | null
  subscriptionPlan: ApiSubscriptionPlan
  avatarColor: string
  createdAt: string
}

export type DisplaySubscriptionPlan = 'Free' | 'Pro'

export interface CurrentUser {
  id: string
  email: string
  nickname: string
  subscriptionPlan: DisplaySubscriptionPlan
  avatarColor: string
  avatarLabel: string
  createdAt: string
}

function getEmailPrefix(email: string) {
  return email.split('@')[0] || email
}

function normalizeCurrentUser(user: CurrentUserResponse): CurrentUser {
  const nickname = user.nickname?.trim() || getEmailPrefix(user.email)
  const avatarLabel = Array.from(nickname)[0]?.toUpperCase() || 'U'

  return {
    ...user,
    nickname,
    subscriptionPlan: user.subscriptionPlan === 'pro' ? 'Pro' : 'Free',
    avatarLabel,
  }
}

async function getCurrentUser() {
  const { data } = await apiClient.get<CurrentUserResponse>('/api/v1/users/me')

  return normalizeCurrentUser(data)
}

export const currentUserQueryKey = ['current-user'] as const

export function useCurrentUser() {
  const { session, status } = useAuth()

  return useQuery({
    queryKey: [...currentUserQueryKey, session?.user.id],
    queryFn: getCurrentUser,
    enabled: status === 'authed' && session !== null,
    retry: (failureCount, error) =>
      !(isAxiosError(error) && error.response?.status === 401) &&
      failureCount < 1,
  })
}
