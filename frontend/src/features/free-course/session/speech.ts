/**
 * The voice. One seam, two implementations, and the seam is the point.
 *
 * The board is not animated on a timer that happens to match the speech: the
 * narration *is* the clock. Each sentence is spoken, and its board actions fire
 * when that sentence ends. That is what "voice and board are one process"
 * means in code — and it is also why this file has to be honest about failure,
 * because a clock that never ticks stops the whole lesson.
 *
 * Browser speech synthesis is the V0 source: it needs no key, no quota and no
 * network, and the reference product's voice is a *behaviour* to copy, not an
 * asset to license. Swapping in a neural TTS later means implementing `Voice`
 * and changing one line at the call site.
 *
 * The reliability problem this file exists to absorb: Chrome's speech synthesis
 * fires `onend` most of the time. Sometimes it does not — long text, a
 * backgrounded tab, a voice the engine silently refuses. An `onend` that never
 * arrives would freeze the lesson mid-sentence with no error anywhere. So every
 * utterance is also given a deadline derived from how long the text *should*
 * take to say, and whichever comes first wins.
 */

export interface SpeakOptions {
  onEnd: () => void
  onStart?: () => void
}

export interface Voice {
  /** Can this voice actually produce sound? Drives the mute control's state. */
  readonly available: boolean
  speak(text: string, options: SpeakOptions): void
  cancel(): void
}

/** Roughly how fast the default zh-CN voice reads, used only for deadlines. */
const CHARS_PER_SECOND = 5.2
/** Floor for a deadline: a very short sentence still needs time to be heard. */
const MIN_UTTERANCE_MS = 900
/** Slack over the estimate — an onend that arrives late is still an onend. */
const DEADLINE_SLACK = 1.9
const DEADLINE_HEADROOM_MS = 1200

export function estimateSpeechMs(text: string): number {
  const chars = text.replace(/\s+/g, '').length
  return Math.round(
    Math.max(
      MIN_UTTERANCE_MS,
      (chars / CHARS_PER_SECOND) * 1000 * DEADLINE_SLACK + DEADLINE_HEADROOM_MS
    )
  )
}

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

/**
 * A voice that only keeps time. Used when muted and when the browser has no
 * speech engine — the lesson still plays, still paces the board, and simply
 * says nothing. Falling back to "no timeline at all" would be the wrong
 * trade: reading a whiteboard is a legitimate way to use this.
 */
export function createSilentVoice(): Voice {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    available: false,
    speak(text, { onEnd, onStart }) {
      onStart?.()
      timer = setTimeout(onEnd, estimateSpeechMs(text))
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}

export function createBrowserVoice(): Voice {
  if (!supported()) return createSilentVoice()

  let deadline: ReturnType<typeof setTimeout> | null = null
  let settled = false

  const clearDeadline = () => {
    if (deadline !== null) {
      clearTimeout(deadline)
      deadline = null
    }
  }

  return {
    available: true,
    speak(text, { onEnd, onStart }) {
      settled = false
      clearDeadline()
      const finish = () => {
        // Guarded: both the engine and the deadline can fire, and a lesson that
        // advances twice for one sentence is worse than one that advances late.
        if (settled) return
        settled = true
        clearDeadline()
        onEnd()
      }

      let utterance: SpeechSynthesisUtterance
      try {
        utterance = new SpeechSynthesisUtterance(text)
      } catch {
        onStart?.()
        finish()
        return
      }
      utterance.lang = 'zh-CN'
      utterance.rate = 1
      utterance.pitch = 1
      utterance.onend = finish
      utterance.onerror = finish
      // Chrome drops the callback when the engine decides the utterance is
      // unspeakable (no voice, autoplay policy), so the deadline is not
      // optional.
      deadline = setTimeout(finish, estimateSpeechMs(text))

      try {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
        onStart?.()
      } catch {
        finish()
      }
    },
    cancel() {
      settled = true
      clearDeadline()
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* nothing to cancel */
      }
    },
  }
}
