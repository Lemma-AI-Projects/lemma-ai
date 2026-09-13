import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'

// ---------- Types ----------

export interface CalendarConnection {
  id: string
  provider: 'google' | 'apple'
  enabled: boolean
  syncDirection: string
  externalCalendarName: string | null
  lastSyncedAt: string | null
  syncError: string | null
  createdAt: string
}

export interface SyncedEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  description: string | null
  location: string | null
  provider: string
  externalEventId: string
}

export interface CalendarProviderInfo {
  id: string
  name: string
  directions: string[]
}

export interface AppleCalendarInfo {
  id: string
  name: string
  selected: boolean
}

// ---------- Query Keys ----------

export const calendarQueryKey = ['calendar'] as const
export const calendarConnectionsKey = [...calendarQueryKey, 'connections'] as const

export function calendarEventsKey(connectionId: string) {
  return [...calendarQueryKey, 'events', connectionId] as const
}

// ---------- Queries ----------

export function useCalendarProvidersQuery() {
  return useQuery({
    queryKey: [...calendarQueryKey, 'providers'],
    queryFn: async () => {
      const { data } = await signOutOn401(
        apiClient.get<CalendarProviderInfo[]>('/api/v1/calendar/providers')
      )
      return data
    },
    retry: retryUnlessClientError,
  })
}

export function useCalendarConnectionsQuery() {
  return useQuery({
    queryKey: calendarConnectionsKey,
    queryFn: async () => {
      const { data } = await signOutOn401(
        apiClient.get<CalendarConnection[]>('/api/v1/calendar/connections')
      )
      return data
    },
    retry: retryUnlessClientError,
  })
}

export function useCalendarEventsQuery(connectionId: string | null) {
  return useQuery({
    queryKey: calendarEventsKey(connectionId ?? ''),
    queryFn: async () => {
      const { data } = await signOutOn401(
        apiClient.get<SyncedEvent[]>(
          `/api/v1/calendar/connections/${connectionId}/events`
        )
      )
      return data
    },
    enabled: Boolean(connectionId),
    retry: retryUnlessClientError,
  })
}

export function useAppleCalendarsQuery(
  username: string,
  password: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...calendarQueryKey, 'apple-calendars', username],
    queryFn: async () => {
      const { data } = await signOutOn401(
        apiClient.get<AppleCalendarInfo[]>(
          '/api/v1/calendar/apple/calendars',
          { params: { username, password } }
        )
      )
      return data
    },
    enabled,
    retry: 1,
  })
}

// ---------- Mutations ----------

export function useGoogleAuthUrlQuery(redirectUri: string) {
  return useQuery({
    queryKey: [...calendarQueryKey, 'google-auth-url', redirectUri],
    queryFn: async () => {
      const { data } = await signOutOn401(
        apiClient.get<{ url: string }>(
          '/api/v1/calendar/google/auth-url',
          { params: { redirect_uri: redirectUri } }
        )
      )
      return data.url
    },
    enabled: false,
  })
}

export function useConnectGoogleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      code: string
      redirectUri: string
      calendarId: string
      calendarName: string
    }) => {
      const { data } = await signOutOn401(
        apiClient.post<CalendarConnection>(
          '/api/v1/calendar/google/connect',
          {
            code: vars.code,
            redirectUri: vars.redirectUri,
            calendarId: vars.calendarId,
            calendarName: vars.calendarName,
          }
        )
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarConnectionsKey })
    },
  })
}

export function useConnectAppleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      username: string
      password: string
      calendarId: string
      calendarName: string
    }) => {
      const { data } = await signOutOn401(
        apiClient.post<CalendarConnection>(
          '/api/v1/calendar/apple/connect',
          {
            username: vars.username,
            password: vars.password,
            calendarId: vars.calendarId,
            calendarName: vars.calendarName,
          }
        )
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarConnectionsKey })
    },
  })
}

export function useSyncCalendarMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await signOutOn401(
        apiClient.post(
          `/api/v1/calendar/connections/${connectionId}/sync`
        )
      )
      return data as {
        status: string
        created: number
        updated: number
        deleted: number
        error?: string
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarQueryKey })
    },
  })
}

export function useDisconnectCalendarMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (connectionId: string) => {
      await signOutOn401(
        apiClient.delete(`/api/v1/calendar/connections/${connectionId}`)
      )
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarConnectionsKey })
    },
  })
}
