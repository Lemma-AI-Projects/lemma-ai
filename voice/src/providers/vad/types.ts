import type { AudioInput, ProviderConfig } from '../../core/types';

export type VADEventType = 'speech_started' | 'speech_ended';

export interface VADEvent {
  type: VADEventType;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export type VADSink = (e: VADEvent) => void;

/**
 * VAD provider contract. First version is just a boundary detector:
 * speech_started / speech_ended. A future Silero or provider-side VAD slots in
 * here without touching the core.
 */
export interface VADProvider {
  readonly id: string;
  init(config: ProviderConfig): void;
  start(source: AudioInput, sink: VADSink): Promise<void>;
  stop(): Promise<void>;
  readonly running: boolean;
}
