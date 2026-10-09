/**
 * Voice Runtime: the one place that owns "which voice is answering, and is it
 * muted".
 *
 * This is a *transport* concern, not a teaching one — nothing here decides what
 * gets said. The timeline (useTeachingPlayback) asks for a `Voice` and speaks
 * through it; which implementation answers is this module's business, and only
 * this module's.
 *
 * That seam is why it is a separate file at all. The implementations, in the
 * order they are tried:
 *
 *   - `createRemoteVoice()` — backend TTS. The primary source; it carries its own
 *     fallback, so it degrades internally instead of failing the lesson;
 *   - `createBrowserVoice()` — the V0 source, browser speech synthesis. Sits
 *     behind the remote voice and answers whenever the backend cannot;
 *   - `createSilentVoice()` — the clock-only voice, used when muted and when the
 *     browser has no speech engine at all.
 *
 * A lesson therefore still paces itself sentence by sentence no matter which one
 * ends up speaking, and swapping in another implementation changes this file and
 * nothing else.
 *
 * ⚠️ Two things are deliberately NOT here:
 *   - the playback phase (`idle`/`playing`/`awaiting`/`awaiting_click`) — that is
 *     the *course's* state, and merging it with the transport state produces the
 *     "listening but not waiting" ambiguity `docs/voice/01-overview.md` §2 warns
 *     about;
 *   - deciding silence for a replay. `start({ silent: true })` flips `mutedRef`
 *     for the duration of one playthrough and restores it after — that is a
 *     playback decision, so it stays in the playback and only borrows the ref.
 */

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'

import { createBrowserVoice, createSilentVoice, type Voice } from '../speech'
import { createRemoteVoice, prefetchSpeech } from './remote'

export interface VoiceRuntime {
  /** Speak through this. Never null — an absent voice is the silent one. */
  voice: Voice
  /** The learner's mute switch, as UI state. */
  muted: boolean
  setMuted: (muted: boolean) => void
  /**
   * Can this lesson produce sound at all?
   *
   * Optimistic to begin with, because the backend voice is the primary path and
   * the app cannot run without the backend anyway. It flips to false only when
   * we have *observed* the worst case: synthesis failed and the device has no
   * browser engine either. The rail uses it to say so rather than offering a
   * mute button that cannot mute anything.
   */
  available: boolean
  /**
   * The same mute flag as a ref, for the one caller that has to read it
   * *synchronously* mid-playthrough: the silent replay in `start()`. State would
   * be one render behind, and the replay would speak its first sentence.
   */
  mutedRef: RefObject<boolean>
  /**
   * Warm the audio for a sentence that is about to be spoken. A no-op when muted
   * (nothing will be played) and when the active voice is not the remote one.
   */
  prefetch: (text: string) => void
}

export function useVoiceRuntime(): VoiceRuntime {
  const [muted, setMutedState] = useState(false)
  const [available, setAvailable] = useState(true)
  const browserVoice = useMemo(() => createBrowserVoice(), [])
  const silentVoice = useMemo(() => createSilentVoice(), [])
  const remoteVoice = useMemo(
    () =>
      createRemoteVoice(browserVoice, {
        onUnavailable: () => setAvailable(false),
      }),
    [browserVoice]
  )
  const mutedRef = useRef(false)

  const voice = useMemo<Voice>(
    () => ({
      available: remoteVoice.available,
      speak: (text, speakOptions) =>
        (mutedRef.current ? silentVoice : remoteVoice).speak(text, speakOptions),
      cancel: () => {
        remoteVoice.cancel()
        silentVoice.cancel()
      },
    }),
    [remoteVoice, silentVoice]
  )

  const setMuted = useCallback(
    (next: boolean) => {
      mutedRef.current = next
      setMutedState(next)
      if (next) {
        // Silent immediately, not at the next sentence: a mute button that keeps
        // talking is the kind of thing people press twice and then distrust.
        remoteVoice.cancel()
        browserVoice.cancel()
      }
    },
    [remoteVoice, browserVoice]
  )

  const prefetch = useCallback((text: string) => {
    if (mutedRef.current) return
    prefetchSpeech(text)
  }, [])

  return { voice, muted, setMuted, available, mutedRef, prefetch }
}