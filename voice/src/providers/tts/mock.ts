import type { TTSProvider } from './types';
import type { ProviderConfig, VoiceEventSink } from '../../core/types';

/** Scripted TTS for tests / offline fallback. Emits audio_started / audio_ended. */
export class MockTTSAdapter implements TTSProvider {
  readonly id = 'mock-tts';
  speaking = false;
  private cfg: ProviderConfig = {};

  init(config: ProviderConfig): void {
    this.cfg = config;
  }

  async speak(text: string, sink: VoiceEventSink): Promise<void> {
    if (!text.trim()) return;
    if (this.cfg.extra?.throwOnSpeak) throw new Error('mock tts speak failure');
    this.speaking = true;
    sink({ type: 'audio_started', timestamp: Date.now(), meta: { vendor: 'mock' } });
    await new Promise((r) => setTimeout(r, 20));
    sink({ type: 'audio_ended', timestamp: Date.now(), meta: { vendor: 'mock' } });
    this.speaking = false;
  }

  async stop(): Promise<void> {
    this.speaking = false;
  }
}
