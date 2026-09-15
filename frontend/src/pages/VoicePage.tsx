import { Mic } from 'lucide-react'
import { VoiceChat } from '@/features/voice/VoiceChat'

const voiceEnabled = import.meta.env.VITE_VOICE_ENABLED === 'true'

export function VoicePage() {
  return (
    <div className="mx-auto flex w-full max-w-[810px] flex-col px-4 pt-10 pb-12">
      <header className="mb-8 flex items-center gap-2">
        <Mic className="size-5 text-zinc-700" strokeWidth={1.75} />
        <h1 className="text-lg font-semibold text-zinc-900">语音伴学</h1>
      </header>

      {voiceEnabled ? (
        <VoiceChat />
      ) : (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          语音功能未启用。前端设置 <code>VITE_VOICE_ENABLED=true</code> 且后端
          <code>VOICE_ENABLED=true</code> 并配置火山引擎密钥后开放。
        </p>
      )}
    </div>
  )
}
