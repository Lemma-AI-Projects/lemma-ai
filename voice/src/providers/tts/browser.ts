import type { TTSProvider } from './types';
import type { ProviderConfig, VoiceEventSink } from '../../core/types';

/**
 * Browser-native TTS via the Web Speech Synthesis API. Zero API key, works in
 * Chrome / Edge. It IS the speaker, so no AudioOutput is injected. Used as the
 * default demo TTS so Test B works with no credentials.
 */
export class BrowserTTSAdapter implements TTSProvider {
  readonly id = 'browser-tts';
  speaking = false;
  private cfg: ProviderConfig = {};
  private utter?: SpeechSynthesisUtterance;

  init(config: ProviderConfig): void {
    this.cfg = config;
  }

  async speak(text: string, sink: VoiceEventSink): Promise<void> {
    if (!text.trim()) return;
    const synth = window.speechSynthesis;
    if (!synth) {
      sink({
        type: 'error',
        error: { code: 'tts_unavailable', message: 'speechSynthesis unavailable', source: this.id },
        timestamp: Date.now(),
      });
      return;
    }
    this.speaking = true;
    sink({ type: 'audio_started', timestamp: Date.now(), meta: { vendor: 'browser' } });
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (this.cfg.voiceId) u.voice = synth.getVoices().find((v) => v.voiceURI === this.cfg.voiceId) ?? null;
      if (this.cfg.language) u.lang = this.cfg.language;
      u.onend = () => resolve();
      u.onerror = () =>
        sink({
          type: 'error',
          error: { code: 'tts_error', message: 'speechSynthesis error', source: this.id },
          timestamp: Date.now(),
        });
      this.utter = u;
      synth.cancel();
      synth.speak(u);
    });
    sink({ type: 'audio_ended', timestamp: Date.now(), meta: { vendor: 'browser' } });
    this.speaking = false;
  }

  async stop(): Promise<void> {
    window.speechSynthesis?.cancel();
    this.speaking = false;
  }
}
