/**
 * The remote voice: backend TTS, with the browser engine sitting behind it.
 *
 * Same `Voice` seam as `speech.ts` — the timeline cannot tell which one is
 * answering, and that is the point (`docs/voice/02-contract.md` §2). What is
 * different is where the audio comes from, and therefore what a failure means.
 * The browser engine fails only when the *device* has none; the backend fails
 * whenever the network or the provider does, which is a normal condition rather
 * than an exception. So every path here that cannot produce audio hands the same
 * sentence to `fallback` instead of dropping it — a lesson whose voice died
 * mid-step would otherwise stop dead with the board half-drawn.
 *
 * Two things this file adds that the browser voice has no use for:
 *
 *   - **A real clock.** `speech.ts` guesses a sentence's duration from its
 *     character count; an audio element reports when it actually ended, so the
 *     board follows the voice rather than an estimate of it.
 *   - **Prefetch.** Synthesis is a round trip, so the next sentence is requested
 *     while the current one is still being spoken (`prefetchSpeech`). The first
 *     sentence pays the latency; the rest are already in hand.
 */

import type { Voice } from '../speech'
import { synthesizeSpeech } from './speechApi'

/**
 * Synthesized sentences, keyed by their text.
 *
 * A lesson reads a fixed set of sentences and may be replayed, so the same text
 * recurs and the cache makes a replay free. FIFO-capped: sentences are consumed
 * in order, so the oldest entry is also the least likely to be wanted again.
 */
const CACHE_LIMIT = 24
const cache = new Map<string, Promise<Blob>>()
/** Prefetches still in flight, so an interruption can cancel them too. */
const pending = new Set<AbortController>()

function remember(text: string): Promise<Blob> {
  const existing = cache.get(text)
  if (existing) return existing

  const controller = new AbortController()
  pending.add(controller)
  const request = synthesizeSpeech(text, { signal: controller.signal }).finally(() => {
    pending.delete(controller)
  })
  cache.set(text, request)
  // A rejected promise must not stay cached: the next attempt should be a real
  // one, not a replay of the failure.
  request.catch(() => {
    if (cache.get(text) === request) cache.delete(text)
  })
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined && oldest !== text) cache.delete(oldest)
  }
  return request
}

/**
 * Warm the audio for a sentence that has not been spoken yet. Fire-and-forget:
 * a prefetch that fails is not a failure, it just means `speak` will do the work
 * itself when the time comes.
 */
export function prefetchSpeech(text: string): void {
  if (!text.trim() || cache.has(text)) return
  void remember(text).catch(() => {})
}

function cancelPendingSpeech(): void {
  for (const controller of pending) controller.abort()
  pending.clear()
}

function isAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error as { name?: string } | null)?.name === 'CanceledError'
}

export interface RemoteVoiceOptions {
  /**
   * Called the first time synthesis fails AND the fallback cannot speak either
   * (a device with no browser engine). That is the one combination where the
   * lesson truly has no voice, and the rail has to be able to say so
   * (`docs/voice/04-now-and-gaps.md` §3 断点 ①) instead of pretending.
   */
  onUnavailable?: () => void
}

export function createRemoteVoice(
  fallback: Voice,
  options?: RemoteVoiceOptions
): Voice {
  let controller: AbortController | null = null
  let audio: HTMLAudioElement | null = null
  let objectUrl: string | null = null
  let settled = false
  // Bumped on every speak/cancel so a late response from a superseded sentence
  // cannot start playing over the current one.
  let generation = 0

  const release = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.src = ''
      audio = null
    }
  }

  return {
    available: true,
    speak(text, { onEnd, onStart }) {
      settled = false
      const mine = (generation += 1)
      controller?.abort()
      release()
      const own = new AbortController()
      controller = own

      const finish = () => {
        if (settled) return
        settled = true
        release()
        onEnd()
      }

      // Hand this sentence to the browser engine — which is itself the silent
      // voice when the device has none — instead of failing the lesson.
      const degrade = () => {
        if (settled) return
        if (!fallback.available) options?.onUnavailable?.()
        fallback.speak(text, { onEnd: finish, onStart })
      }

      void (async () => {
        let blob: Blob
        try {
          const cached = cache.get(text)
          blob = cached
            ? await cached
            : await synthesizeSpeech(text, { signal: own.signal })
        } catch (error) {
          if (settled || mine !== generation) return
          if (isAbort(error, own.signal)) {
            finish()
            return
          }
          degrade()
          return
        }
        if (settled || mine !== generation) return

        objectUrl = URL.createObjectURL(blob)
        const element = new Audio(objectUrl)
        audio = element
        element.onended = finish
        element.onerror = degrade
        try {
          await element.play()
          onStart?.()
        } catch {
          // Autoplay policy, or a decode the browser refuses — same answer either
          // way: this sentence goes to the fallback.
          degrade()
        }
      })()
    },
    cancel() {
      settled = true
      generation += 1
      controller?.abort()
      controller = null
      release()
      // An interrupted lesson does not want the sentences it had queued up.
      cancelPendingSpeech()
      fallback.cancel()
    },
  }
}