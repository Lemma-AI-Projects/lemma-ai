import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'lemma-feature-defaults'

export interface FeatureDefaults {
  plugins: boolean
  webSearch: boolean
  memory: boolean
  deepThinking: boolean
}

const defaults: FeatureDefaults = {
  plugins: false,
  webSearch: false,
  memory: false,
  deepThinking: false,
}

function readStorage(): FeatureDefaults {
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
function getSnapshot(): FeatureDefaults {
  return cached
}

function setFeatureDefaults(partial: Partial<FeatureDefaults>): void {
  cached = { ...cached, ...partial }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  } catch { /* silent */ }
  window.dispatchEvent(new Event('storage'))
}

export function useFeatureDefaults(): [
  FeatureDefaults,
  (partial: Partial<FeatureDefaults>) => void,
] {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => defaults)
  const update = useCallback((partial: Partial<FeatureDefaults>) => {
    setFeatureDefaults(partial)
  }, [])
  return [value, update]
}
