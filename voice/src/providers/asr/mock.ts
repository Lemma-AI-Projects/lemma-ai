import type { ASRProvider } from './types';
import type { ProviderConfig, VoiceEventSink } from '../../core/types';

/**
 * Scripted ASR for the offline demo and for tests. No network, no mic.
 * Emits the same normalized events a real adapter would, so the session and
 * event stream can be exercised end-to-end without credentials.
 */
export class MockASRAdapter implements ASRProvider {
  readonly id = 'mock-asr';
  running = false;
  private cfg: ProviderConfig = {};
  private timers: ReturnType<typeof setTimeout>[] = [];

  init(config: ProviderConfig): void {
    this.cfg = config;
  }

  async start(sink: VoiceEventSink): Promise<void> {
    if (this.cfg.extra?.throwOnStart) {
      throw new Error('mock asr start failure');
    }
    this.running = true;
    const lines: string[] =
      (this.cfg.extra?.scripted as string[] | undefined) ?? ['Hello, this is a test.'];

    let delay = 0;
    for (const line of lines) {
      delay += 10;
      this.timers.push(
        setTimeout(() => sink({ type: 'speech_started', timestamp: Date.now(), meta: { vendor: 'mock' } }), delay),
      );
      delay += 10;
      this.timers.push(
        setTimeout(() => sink({ type: 'transcript_partial', text: line, timestamp: Date.now() }), delay),
      );
      delay += 10;
      this.timers.push(
        setTimeout(() => sink({ type: 'transcript_final', text: line, timestamp: Date.now() }), delay),
      );
      delay += 10;
      this.timers.push(
        setTimeout(() => sink({ type: 'speech_ended', timestamp: Date.now() }), delay),
      );
      delay += 10;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
