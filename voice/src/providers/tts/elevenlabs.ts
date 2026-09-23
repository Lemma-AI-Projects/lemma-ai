import type { TTSProvider } from './types';
import type { AudioOutput, ProviderConfig, ProviderDeps, VoiceEventSink } from '../../core/types';

const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // a public English voice

/**
 * ElevenLabs TTS adapter. Doc: POST /v1/text-to-speech/{voice_id}/stream
 * Models: eleven_flash_v2_5 (~75ms, realtime), eleven_multilingual_v2 (quality),
 * eleven_v3 (most expressive), eleven_v3_conversational. Auth: xi-api-key header.
 * Bytes are decoded/played by the injected AudioOutput — ElevenLabs never
 * touches the speaker directly.
 */
export class ElevenLabsTTSAdapter implements TTSProvider {
  readonly id = 'elevenlabs-tts';
  speaking = false;
  private cfg: ProviderConfig = {};
  private audioOutput?: AudioOutput;

  init(config: ProviderConfig, deps?: ProviderDeps): void {
    this.cfg = config;
    this.audioOutput = deps?.audioOutput;
  }

  async speak(text: string, sink: VoiceEventSink): Promise<void> {
    if (!text.trim()) return;
    this.speaking = true;
    const voiceId = this.cfg.voiceId ?? DEFAULT_VOICE;
    const model = this.cfg.model ?? 'eleven_flash_v2_5';
    const base = this.cfg.endpoint ?? 'https://api.elevenlabs.io/v1/text-to-speech';
    const url = `${base}/${voiceId}/stream`;

    sink({ type: 'audio_started', timestamp: Date.now(), meta: { vendor: 'elevenlabs' } });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.cfg.apiKey ?? '',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text, model_id: model, output_format: 'mp3_44100_128' }),
      });
      if (!res.ok) {
        throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`);
      }
      const bytes = await res.arrayBuffer();
      if (this.audioOutput) await this.audioOutput.play(bytes, 'audio/mpeg');
      sink({ type: 'audio_ended', timestamp: Date.now(), meta: { vendor: 'elevenlabs' } });
    } catch (err) {
      sink({
        type: 'error',
        error: { code: 'tts_failed', message: String((err as Error)?.message ?? err), source: this.id },
        timestamp: Date.now(),
      });
    } finally {
      this.speaking = false;
    }
  }

  async stop(): Promise<void> {
    this.speaking = false;
  }
}
