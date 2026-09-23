/**
 * The teaching timeline: narration speaks, the board follows, questions stop it.
 *
 * This is the one place where "voice and board are the same process" is
 * enforced. The loop is:
 *
 *     for each sentence of the step:
 *         speak it            <- the clock
 *         append it to the transcript
 *         apply its board actions
 *         let the ink settle
 *
 * so the board cannot run ahead of the voice, and the voice cannot talk over a
 * half-drawn figure. Driving the two from separate timers is exactly the
 * failure the brief names — "AI talks while a picture sits next to it".
 *
 * Two consequences worth stating, because they look like bugs otherwise:
 *
 * - **A step with a question ends the playthrough.** The reference product stops
 *   dead at a question and does not move on by itself; there is no skip. So
 *   `phase` becomes 'awaiting' and the queue halts until the learner acts.
 * - **Cancelling must resolve the pending sentence.** `voice.cancel()` means the
 *   engine will never call `onEnd`, so the promise the loop is awaiting would
 *   hang forever. The cancel path resolves it explicitly — that is the whole
 *   reason this is a class-shaped closure rather than a few `useEffect`s.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { applyAction, type BoardElement } from './board'
import { splitSentences } from './sentences'
import { createBrowserVoice, createSilentVoice, type Voice } from './speech'
import type { TeachingStep } from './types'

/** Beat between the last stroke of a sentence and the next sentence. */
const INK_SETTLE_MS = 260

export type PlaybackPhase =
  | 'idle'
  | 'playing'
  /** 停在问题上，等学习者回答。 */
  | 'awaiting'
  /** 停在白板的某个元素上，等学习者去点它（原文的 Circle 按钮）。 */
  | 'awaiting_click'

export interface SaidLine {
  stepId: string
  text: string
}

export interface TeachingPlayback {
  board: BoardElement[]
  said: SaidLine[]
  phase: PlaybackPhase
  /** The step being taught, or the one waiting for an answer. */
  activeStepId: string | null
  /** Index of the sentence being spoken, within the active step. */
  sentenceIndex: number
  /** The board element waiting to be clicked, while `phase === 'awaiting_click'`. */
  clickTarget: string | null
  /** What to say while waiting — from the action, or a generic default. */
  clickHint: string | null
  /** The learner clicked it: let the timeline continue. Safe to call anytime. */
  resolveClick: () => void
  muted: boolean
  voiceAvailable: boolean
  setMuted: (muted: boolean) => void
  /** Play these steps in order, halting at the first question or at the end. */
  start: (steps: TeachingStep[], options?: { clearBoard?: boolean }) => void
  /** Abandon whatever is playing. Safe to call when nothing is. */
  stop: () => void
  /** Wipe the board — used before a re-explanation, which is a *new* drawing. */
  clearBoard: () => void
  /** Append already-played lines (resuming a session renders its transcript). */
  seedSaid: (lines: SaidLine[]) => void
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function useTeachingPlayback(options?: {
  onStepDone?: (playedSteps: number) => void
}): TeachingPlayback {
  const [board, setBoard] = useState<BoardElement[]>([])
  const [said, setSaid] = useState<SaidLine[]>([])
  const [phase, setPhase] = useState<PlaybackPhase>('idle')
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [clickTarget, setClickTarget] = useState<string | null>(null)
  const [clickHint, setClickHint] = useState<string | null>(null)
  const [muted, setMutedState] = useState(false)

  const browserVoice = useMemo(() => createBrowserVoice(), [])
  const silentVoice = useMemo(() => createSilentVoice(), [])
  const mutedRef = useRef(false)
  const cancelRef = useRef<(() => void) | null>(null)
  // Resolves the promise the timeline is parked on while waiting for a click.
  // Held in a ref because `stop()` has to be able to let go of it — a cancel
  // that leaves a wait pending freezes the lesson with no way back.
  const clickResolveRef = useRef<(() => void) | null>(null)
  const seqRef = useRef(0)
  const playedRef = useRef(0)
  const onStepDoneRef = useRef(options?.onStepDone)
  useEffect(() => {
    onStepDoneRef.current = options?.onStepDone
  }, [options?.onStepDone])

  const voice = useMemo<Voice>(
    () => ({
      available: browserVoice.available,
      speak: (text, speakOptions) =>
        (mutedRef.current ? silentVoice : browserVoice).speak(text, speakOptions),
      cancel: () => {
        browserVoice.cancel()
        silentVoice.cancel()
      },
    }),
    [browserVoice, silentVoice]
  )

  const setMuted = useCallback((next: boolean) => {
    mutedRef.current = next
    setMutedState(next)
    if (next) {
      // Silent immediately, not at the next sentence: a mute button that keeps
      // talking is the kind of thing people press twice and then distrust.
      browserVoice.cancel()
    }
  }, [browserVoice])

  const resolveClick = useCallback(() => {
    const resolve = clickResolveRef.current
    clickResolveRef.current = null
    setClickTarget(null)
    setClickHint(null)
    resolve?.()
  }, [])

  const stop = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    // A click wait is the one place the loop can be parked outside `voice.speak`;
    // releasing it here is what keeps `stop()` from leaving the lesson wedged.
    clickResolveRef.current?.()
    clickResolveRef.current = null
    setClickTarget(null)
    setClickHint(null)
    setPhase('idle')
  }, [])

  const clearBoard = useCallback(() => {
    setBoard([])
    seqRef.current = 0
  }, [])

  const seedSaid = useCallback((lines: SaidLine[]) => {
    setSaid(lines)
  }, [])

  const start = useCallback(
    (steps: TeachingStep[], startOptions?: { clearBoard?: boolean }) => {
      cancelRef.current?.()
      if (startOptions?.clearBoard) {
        setBoard([])
        seqRef.current = 0
      }
      if (steps.length === 0) return

      let cancelled = false
      let resolvePending: (() => void) | null = null
      const cancel = () => {
        cancelled = true
        voice.cancel()
        // The engine will not call onEnd after cancel(), so the awaiting promise
        // is settled here or the loop never returns.
        resolvePending?.()
        resolvePending = null
      }
      cancelRef.current = cancel

      void (async () => {
        for (const step of steps) {
          if (cancelled) return
          setActiveStepId(step.id)
          setPhase('playing')
          // A re-explanation is a new drawing on a clean board; anything else
          // keeps what is there (the reference product keeps the board when you
          // interrupt it, and wipes it when it re-teaches).
          if (step.branch === 'reteach') {
            setBoard([])
            seqRef.current = 0
          }
          const sentences = splitSentences(step.narration)
          let seq = seqRef.current
          for (let index = 0; index < sentences.length; index += 1) {
            if (cancelled) return
            setSentenceIndex(index)
            await new Promise<void>((resolve) => {
              resolvePending = resolve
              voice.speak(sentences[index], { onEnd: resolve })
            })
            resolvePending = null
            if (cancelled) return

            setSaid((previous) => [...previous, { stepId: step.id, text: sentences[index] }])
            const cue = Math.max(0, Math.min(sentences.length - 1, index))
            const batch = step.actions.filter(
              (action) =>
                Math.max(0, Math.min(sentences.length - 1, action.cue)) === cue
            )
            if (batch.length > 0) {
              // Folded inside the state updater: the board is a function of the
              // action stream, so it must be advanced from whatever is actually
              // there, not from a snapshot the loop happens to hold.
              const base = seq
              setBoard((previous) => {
                let next = previous
                for (let offset = 0; offset < batch.length; offset += 1) {
                  next = applyAction(next, batch[offset], base + offset + 1)
                }
                return next
              })
              seq = base + batch.length
            }
            // "Now you touch it": the reference session stops here and waits for
            // a click on a shape it drew, then continues. The wait sits AFTER the
            // cue's actions, so the thing to click is already on the board.
            const waits = batch.filter((action) => action.kind === 'awaitClick')
            if (waits.length > 0) {
              const wait = waits[waits.length - 1]
              setClickTarget(wait.target ?? null)
              setClickHint(wait.text ?? null)
              setPhase('awaiting_click')
              await new Promise<void>((resolve) => {
                clickResolveRef.current = resolve
              })
              if (cancelled) return
              setPhase('playing')
            }

            await sleep(INK_SETTLE_MS)
            if (cancelled) return
          }
          seqRef.current = seq
          playedRef.current += 1
          onStepDoneRef.current?.(playedRef.current)
          if (step.question) {
            setPhase('awaiting')
            cancelRef.current = null
            return
          }
        }
        setPhase('idle')
        cancelRef.current = null
      })()
    },
    [voice]
  )

  return {
    board,
    said,
    phase,
    activeStepId,
    sentenceIndex,
    muted,
    voiceAvailable: voice.available,
    setMuted,
    start,
    stop,
    clearBoard,
    seedSaid,
    clickTarget,
    clickHint,
    resolveClick,
  }
}
