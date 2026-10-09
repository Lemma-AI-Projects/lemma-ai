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

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  EMPTY_BLOCK_STATE,
  applyAction,
  applyBlockCue,
  figureWaitAt,
  type BoardBlockState,
  type BoardElement,
} from './board'
import { splitSentences } from './sentences'
import type { TeachingStep } from './types'
import { useVoiceRuntime } from './voice/runtime'

/** Beat between the last stroke of a sentence and the next sentence. */
const INK_SETTLE_MS = 260

/**
 * How long "now you touch it" waits for the click before letting the timeline go
 * on by itself.
 *
 * The reference product waits for that click indefinitely, and for a learner who
 * is actually playing along that is the right behaviour. But a learner who is
 * only reading never clicks — and an unbounded wait is not patience, it is a
 * lesson that has stopped with the board drawn and nothing left to move. So the
 * wait is bounded: long enough to still read as "take your time", short enough
 * that nobody is ever stranded at it.
 *
 * Nothing is sent to the server when it expires. A missed click is not a
 * question and not a statement about understanding, so the timeline simply
 * carries on — asking the model to react to it would invent a turn the learner
 * never had.
 */
const CLICK_WAIT_MS = 45_000

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
  /** The legacy board's elements (empty for block plans). */
  board: BoardElement[]
  /** The block board's content, in reveal order (empty for legacy plans). */
  blocks: BoardBlockState['blocks']
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
  start: (
    steps: TeachingStep[],
    options?: { clearBoard?: boolean; silent?: boolean }
  ) => void
  /** Abandon whatever is playing. Safe to call when nothing is. */
  stop: () => void
  /** Wipe the board — used before a re-explanation, which is a *new* drawing. */
  clearBoard: () => void
  /** Append already-played lines (resuming a session renders its transcript). */
  seedSaid: (lines: SaidLine[]) => void
  /**
   * Rebuild the board for steps that were played before this page load.
   *
   * The board is a projection of the action stream, so a refresh does not need
   * a snapshot of it — it needs the same projection run again. This is what
   * makes "come back later" honest: without it the transcript reappears but the
   * board stays blank, and the lesson looks like it never happened.
   */
  seedBoard: (steps: TeachingStep[]) => void
  /**
   * Mark a step as the one currently in play, without playing it.
   *
   * Used on resume: when the page was closed while a question was waiting, that
   * step is still the active one, and everything downstream (the question card,
   * the answer handlers) hangs off `activeStepId`. Leaving it null silently
   * skips the question.
   */
  focusStep: (stepId: string | null) => void
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
  const [blockState, setBlockState] = useState<BoardBlockState>(EMPTY_BLOCK_STATE)
  const [said, setSaid] = useState<SaidLine[]>([])
  const [phase, setPhase] = useState<PlaybackPhase>('idle')
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [clickTarget, setClickTarget] = useState<string | null>(null)
  const [clickHint, setClickHint] = useState<string | null>(null)

  // The voice — and whether it is muted — belongs to the runtime, not to the
  // timeline. `mutedRef` is borrowed only for the silent replay (see `start`).
  const {
    voice,
    muted,
    setMuted,
    available: voiceAvailable,
    mutedRef,
    prefetch,
  } = useVoiceRuntime()

  const cancelRef = useRef<(() => void) | null>(null)
  // Resolves the promise the timeline is parked on while waiting for a click.
  // Held in a ref because `stop()` has to be able to let go of it — a cancel
  // that leaves a wait pending freezes the lesson with no way back.
  const clickResolveRef = useRef<(() => void) | null>(null)
  // The bounded wait on that click. Cleared however the wait ends, so a stale
  // timer can never release a wait that a later step is parked on.
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)
  const playedRef = useRef(0)
  const onStepDoneRef = useRef(options?.onStepDone)
  useEffect(() => {
    onStepDoneRef.current = options?.onStepDone
  }, [options?.onStepDone])

  /**
   * End the click wait, whoever ended it — the learner clicked, the timer
   * expired, or the lesson was stopped.
   *
   * One path for all three, because the alternative is three copies of
   * "clear the target, clear the hint, resolve the promise" that drift apart,
   * and a wait released twice (or a timer left armed against the *next* step's
   * wait) is exactly the kind of bug that shows up as a lesson skipping ahead on
   * its own.
   */
  const releaseClickWait = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    const resolve = clickResolveRef.current
    clickResolveRef.current = null
    setClickTarget(null)
    setClickHint(null)
    resolve?.()
  }, [])

  const resolveClick = releaseClickWait

  const stop = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    // A click wait is the one place the loop can be parked outside `voice.speak`;
    // releasing it here is what keeps `stop()` from leaving the lesson wedged.
    releaseClickWait()
    setPhase('idle')
  }, [releaseClickWait])

  const clearBoard = useCallback(() => {
    setBoard([])
    setBlockState(EMPTY_BLOCK_STATE)
    seqRef.current = 0
  }, [])

  const seedSaid = useCallback((lines: SaidLine[]) => {
    setSaid(lines)
  }, [])

  const focusStep = useCallback((stepId: string | null) => {
    setActiveStepId(stepId)
  }, [])

  /**
   * Replay the already-played steps into the board, silently.
   *
   * Same fold as the live loop, minus the clock: the wipe that a re-teach does
   * is replayed too, because it happened — rebuilding only the strokes would
   * resurrect content the lesson deliberately cleared.
   */
  const seedBoard = useCallback((steps: TeachingStep[]) => {
    let legacy: BoardElement[] = []
    let blocks: BoardBlockState = EMPTY_BLOCK_STATE
    let seq = 0
    for (const step of steps) {
      if (step.branch === 'reteach') {
        legacy = []
        blocks = EMPTY_BLOCK_STATE
        seq = 0
      }
      const sentences = splitSentences(step.narration)
      for (let index = 0; index < sentences.length; index += 1) {
        const cue = Math.max(0, Math.min(sentences.length - 1, index))
        blocks = applyBlockCue(blocks, step.blocks, cue)
        const batch = step.actions.filter(
          (action) => Math.max(0, Math.min(sentences.length - 1, action.cue)) === cue
        )
        for (const action of batch) {
          seq += 1
          legacy = applyAction(legacy, action, seq)
        }
      }
    }
    setBoard(legacy)
    setBlockState(blocks)
    seqRef.current = seq
  }, [])

  const start = useCallback(
    (
      steps: TeachingStep[],
      startOptions?: {
        clearBoard?: boolean
        /**
         * Play it without sound. Used by the board replay, which re-draws the
         * lesson's ink for someone who wants to watch it again — narrating it a
         * second time would be a different feature (and a different button).
         * The learner's mute preference is left alone.
         */
        silent?: boolean
      }
    ) => {
      cancelRef.current?.()
      if (startOptions?.clearBoard) {
        setBoard([])
        seqRef.current = 0
      }
      if (steps.length === 0) return

      const wasMuted = mutedRef.current
      if (startOptions?.silent) mutedRef.current = true

      let cancelled = false
      let resolvePending: (() => void) | null = null
      const cancel = () => {
        cancelled = true
        voice.cancel()
        // The engine will not call onEnd after cancel(), so the awaiting promise
        // is settled here or the loop never returns.
        resolvePending?.()
        resolvePending = null
        // The click wait parks the loop outside `voice.speak`, so it needs the
        // same release — otherwise starting a new batch leaves this loop parked
        // on a click that will never come.
        releaseClickWait()
      }
      cancelRef.current = cancel

      void (async () => {
        try {
          for (const step of steps) {
          if (cancelled) return
          setActiveStepId(step.id)
          setPhase('playing')
          // A re-explanation is a new drawing on a clean board; anything else
          // keeps what is there (the reference product keeps the board when you
          // interrupt it, and wipes it when it re-teaches).
          if (step.branch === 'reteach') {
            setBoard([])
            setBlockState(EMPTY_BLOCK_STATE)
            seqRef.current = 0
          }
          const sentences = splitSentences(step.narration)
          let seq = seqRef.current
          for (let index = 0; index < sentences.length; index += 1) {
            if (cancelled) return
            setSentenceIndex(index)
            // Warm the next sentence while this one is being spoken. Synthesis is
            // a round trip, and the board's pace should not wait on the network —
            // one sentence ahead is enough, and prefetching the whole lesson would
            // spend the learner's bandwidth on sentences a question may stop us
            // before reaching.
            if (index + 1 < sentences.length) prefetch(sentences[index + 1])
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
            // Blocks (current plans): reveal this cue's blocks and fold the
            // figure geometry that belongs to this sentence. Legacy `actions`
            // are folded just below — a plan uses one contract or the other,
            // never both, and both paths are cheap no-ops when empty.
            setBlockState((previous) =>
              applyBlockCue(previous, step.blocks, cue)
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
            const figureWait = figureWaitAt(step.blocks, cue)
            if (waits.length > 0 || figureWait) {
              const wait = waits[waits.length - 1]
              setClickTarget(wait?.target ?? figureWait?.target ?? null)
              setClickHint(wait?.text ?? figureWait?.hint ?? null)
              setPhase('awaiting_click')
              await new Promise<void>((resolve) => {
                clickResolveRef.current = resolve
                // Bounded, so "wait for the click" cannot become "wait forever".
                // `releaseClickWait` clears this timer, so a click that lands
                // first cannot leave the timer armed against the next step.
                clickTimeoutRef.current = setTimeout(() => {
                  releaseClickWait()
                }, CLICK_WAIT_MS)
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
        } finally {
          // Restored on every exit — end of plan, a question, or a cancel — so a
          // silent replay cannot leave the lesson permanently mute.
          mutedRef.current = wasMuted
        }
      })()
    },
    [voice, releaseClickWait, prefetch, mutedRef]
  )

  return {
    board,
    blocks: blockState.blocks,
    said,
    phase,
    activeStepId,
    sentenceIndex,
    muted,
    voiceAvailable,
    setMuted,
    start,
    stop,
    clearBoard,
    seedSaid,
    seedBoard,
    focusStep,
    clickTarget,
    clickHint,
    resolveClick,
  }
}
