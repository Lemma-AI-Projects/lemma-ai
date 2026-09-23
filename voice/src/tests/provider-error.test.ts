import { describe, it, expect } from 'vitest';
import { VoiceSession } from '../core/session';
import type { ASRProvider } from '../core';
import type { VoiceEvent, VoiceEventSink } from '../core/types';
import { MockASRAdapter } from '../providers/asr/mock';
import { MockTTSAdapter } from '../providers/tts/mock';

describe('provider / session errors', () => {
  it('ASR that throws on start -> session enters error state and emits error', async () => {
    const session = new VoiceSession({
      asr: new MockASRAdapter(),
      tts: new MockTTSAdapter(),
      asrConfig: { extra: { throwOnStart: true } },
    });
    const events: VoiceEvent[] = [];
    session.on((e) => events.push(e));
    await session.start();
    expect(session.getState()).toBe('error');
    expect(events.some((e) => e.type === 'error')).toBe(true);
    expect(events.find((e) => e.type === 'error')?.error?.code).toBe('session_start_failed');
  });

  it('a malformed/bogus provider event does not crash the session', async () => {
    class RogueASR implements ASRProvider {
      readonly id = 'rogue';
      running = false;
      init(): void {}
      async start(sink: VoiceEventSink): Promise<void> {
        this.running = true;
        sink({ type: 'transcript_final', text: 'real', timestamp: Date.now() } as VoiceEvent);
        // @ts-expect-error deliberately bogus event
        sink({ type: 'not_a_real_event', timestamp: Date.now() });
      }
      async stop(): Promise<void> {
        this.running = false;
      }
    }
    const session = new VoiceSession({ asr: new RogueASR(), tts: new MockTTSAdapter() });
    const events: VoiceEvent[] = [];
    session.on((e) => events.push(e));
    await session.start();
    expect(events.some((e) => e.type === 'transcript_final')).toBe(true);
    expect(events.some((e) => (e.type as string) === 'not_a_real_event')).toBe(true);
    await session.stop();
  });
});
