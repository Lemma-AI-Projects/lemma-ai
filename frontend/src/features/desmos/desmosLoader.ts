import { env } from '@/lib/env'
import type { DesmosNamespace } from './desmosTypes'

/**
 * Lazy singleton loader for the Desmos calculator script: the ~500KB
 * calculator.js is fetched only when the first graph card mounts, never as
 * part of the main bundle. Concurrent cards share one in-flight promise.
 */

const DESMOS_SCRIPT_URL = 'https://www.desmos.com/api/v1.12/calculator.js'

let loaderPromise: Promise<DesmosNamespace> | null = null

export function loadDesmos(): Promise<DesmosNamespace> {
  if (window.Desmos) {
    return Promise.resolve(window.Desmos)
  }
  if (loaderPromise) {
    return loaderPromise
  }
  if (!env.desmosApiKey) {
    return Promise.reject(
      new Error('VITE_DESMOS_API_KEY is not configured (see .env.example)')
    )
  }
  loaderPromise = new Promise<DesmosNamespace>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${DESMOS_SCRIPT_URL}?apiKey=${encodeURIComponent(env.desmosApiKey)}&lang=zh-CN`
    script.async = true
    script.onload = () => {
      if (window.Desmos) {
        resolve(window.Desmos)
      } else {
        reject(new Error('Desmos script loaded but window.Desmos is missing'))
      }
    }
    script.onerror = () => {
      // Allow a later retry (e.g. transient network failure) instead of
      // caching the rejection forever.
      loaderPromise = null
      script.remove()
      reject(new Error('failed to load the Desmos calculator script'))
    }
    document.head.appendChild(script)
  })
  return loaderPromise
}
