import type { ProviderConfig, ProviderDeps, VoiceEventSink } from '../../core/types';

/**
 * TTS provider contract. Minimal: speak(text) / stop.
 * The adapter emits audio_started / audio_ended and (for network voices)
 * pushes bytes to the injected AudioOutput — the vendor SDK never touches the UI.
 */
export interface TTSProvider {
  readonly id: string;
  init(config: ProviderConfig, deps?: ProviderDeps): void;
  speak(text: string, sink: VoiceEventSink): Promise<void>;
  stop(): Promise<void>;
  readonly speaking: boolean;
}
