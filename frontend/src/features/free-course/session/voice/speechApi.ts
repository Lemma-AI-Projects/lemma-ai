/**
 * The speech endpoint, one function.
 *
 * Returns the audio bytes as a Blob — the backend deliberately does not store
 * them or hand back a URL (voice-v0 plan §4), so there is nothing here to cache
 * or invalidate: the caller either plays the blob or throws it away.
 *
 * `signal` is what makes an interruption real. Stopping a lesson has to cancel
 * the synthesis that is still in flight, not just ignore its result — otherwise
 * pressing Stop leaves a request billing in the background for a sentence nobody
 * will ever hear.
 */

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

export async function synthesizeSpeech(
  text: string,
  options?: { signal?: AbortSignal }
): Promise<Blob> {
  const { data } = await signOutOn401(
    apiClient.post<Blob>(
      '/api/v1/speech/synthesize',
      { text },
      { responseType: 'blob', signal: options?.signal }
    )
  )
  return data
}