import type { ProviderConfig, ProviderDeps, VoiceEventSink } from '../../core/types';

/**
 * ASR provider contract. Minimal on purpose: start / stop / (optional) pushAudio.
 * The adapter is responsible for translating its vendor protocol into
 * normalized VoiceEvents (transcript_partial / transcript_final / speech_*).
 *
 * pushAudio is optional: cloud adapters that open their own socket consume
 * frames here, while browser-native ASR (Web Speech) captures the mic itself.
 */
export interface ASRProvider {
  readonly id: string;
  init(config: ProviderConfig, deps?: ProviderDeps): void;
  start(sink: VoiceEventSink): Promise<void>;
  pushAudio?(frame: Int16Array, sampleRate: number): void;
  stop(): Promise<void>;
  readonly running: boolean;
}
