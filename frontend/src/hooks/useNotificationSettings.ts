import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'lemma-notification-settings'

export interface NotificationSettings {
  enabled: boolean
  dailyReminder: boolean
  reminderTime: string
}

const defaults: NotificationSettings = {
  enabled: false,
  dailyReminder: false,
  reminderTime: '09:00',
}

function readStorage(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

let cached = readStorage()
function getSnapshot(): NotificationSettings {
  return cached
}

function setNotificationSettings(partial: Partial<NotificationSettings>): void {
  cached = { ...cached, ...partial }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  } catch { /* silent */ }
  window.dispatchEvent(new Event('storage'))
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function useNotificationSettings(): [
  NotificationSettings,
  (partial: Partial<NotificationSettings>) => void,
] {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => defaults)
  const update = useCallback((partial: Partial<NotificationSettings>) => {
    setNotificationSettings(partial)
  }, [])
  return [value, update]
}
