import { useCallback, useRef, useState } from 'react'
import { AlertCircle, Mic } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

interface Turn {
  transcript: string
  replyText: string
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

/**
 * Push-to-talk voice turn (P0 spike, frontend half).
 *
 * Hold the mic button to record, release to send. The audio blob is POSTed raw
 * to /api/v1/voice/turn (Content-Type = blob mime), the backend runs
 * STT -> brain -> TTS and returns { transcript, reply_text, audio_base64 }, and
 * we play the reply audio via a transient object URL.
 */
export function VoiceChat() {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const releasedBeforeReadyRef = useRef(false)

  const sendTurn = useCallback(async (blob: Blob) => {
    setBusy(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/api/v1/voice/turn', blob, {
        headers: { 'Content-Type': blob.type || 'audio/webm' },
      })
      const { transcript, reply_text, audio_base64, audio_mime } = data as {
        transcript: string
        reply_text: string
        audio_base64: string
        audio_mime: string
      }
      setTurns((prev) => [
        ...prev,
        { transcript, replyText: reply_text },
      ])
      const audioBlob = base64ToBlob(audio_base64, audio_mime)
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (err) {
      const status = (err as { response?: { status: number } })?.response?.status
      if (status === 503) {
        setError('语音功能未启用（后端 VOICE_ENABLED=false）')
      } else if (status === 502) {
        setError('语音服务调用失败（STT / TTS 上游错误）')
      } else {
        setError('请求失败，请重试')
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      releasedBeforeReadyRef.current = true
    }
    setRecording(false)
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    releasedBeforeReadyRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        if (blob.size > 0) await sendTurn(blob)
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      if (releasedBeforeReadyRef.current) recorder.stop()
    } catch (err) {
      setError(
        '无法访问麦克风：' + (err instanceof Error ? err.message : String(err))
      )
      setRecording(false)
    }
  }, [sendTurn])

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        disabled={busy}
        onPointerDown={(e) => {
          e.preventDefault()
          if (!recording && !busy) void startRecording()
        }}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        className={[
          'flex size-28 items-center justify-center rounded-full border transition-colors',
          recording
            ? 'border-red-300 bg-red-50 text-red-500'
            : 'border-zinc-200 bg-background text-zinc-700 hover:bg-zinc-100',
          busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ].join(' ')}
        aria-label={recording ? '松开发送' : '按住说话'}
      >
        <Mic className="size-10" strokeWidth={1.5} />
      </button>

      <p className="text-sm text-zinc-500">
        {recording ? '正在聆听…松开发送' : busy ? '处理中…' : '按住说话'}
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {turns.length > 0 && (
        <ul className="mt-2 w-full max-w-md space-y-3">
          {turns.map((turn, i) => (
            <li key={i} className="space-y-1 text-sm">
              <p className="text-zinc-400">你：{turn.transcript || '（未识别）'}</p>
              <p className="rounded-md bg-zinc-100 px-3 py-2 text-zinc-800">
                助手：{turn.replyText}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
