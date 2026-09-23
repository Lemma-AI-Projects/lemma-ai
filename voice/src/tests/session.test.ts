import { describe, it, expect } from 'vitest';
import { VoiceSession } from '../core/session';
import { MockASRAdapter } from '../providers/asr/mock';
import { MockTTSAdapter } from '../providers/tts/mock';
import type { VoiceEvent } from '../core/types';

function collect(session: VoiceSession) {
  const events: VoiceEvent[] = [];
  session.on((e) => events.push(e));
  return events;
}

function waitFor(events: VoiceEvent[], type: VoiceEvent['type'], timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      if (events.some((e) => e.type === type)) {
        clearInterval(iv);
        resolve();
      }
    }, 5);
    setTimeout(() => {
      clearInterval(iv);
      reject(new Error(`timeout waiting for ${type}`));
    }, timeout);
  });
}

describe('VoiceSession lifecycle', () => {
  it('start -> listening, emits session_started, then transcript_final, then idle on stop', async () => {
    const session = new VoiceSession({ asr: new MockASRAdapter(), tts: new MockTTSAdapter() });
    const events = collect(session);
    const states: string[] = [];
    session.onState((s) => states.push(s));

    await session.start();
    expect(session.getState()).toBe('listening');
    expect(events[0].type).toBe('session_started');

    await waitFor(events, 'transcript_final');
    expect(events.some((e) => e.type === 'transcript_final')).toBe(true);

    await session.stop();
    expect(session.getState()).toBe('idle');
    expect(events.some((e) => e.type === 'session_ended')).toBe(true);
    expect(states).toContain('listening');
  });

  it('Test C: two scripted utterances yield two transcript_final events', async () => {
    const session = new VoiceSession({
      asr: new MockASRAdapter(),
      tts: new MockTTSAdapter(),
      asrConfig: { extra: { scripted: ['first sentence', 'second sentence'] } },
    });
    const events = collect(session);
    await session.start();
    await new Promise((r) => setTimeout(r, 200));
    const finals = events.filter((e) => e.type === 'transcript_final');
    expect(finals.map((e) => e.text)).toEqual(['first sentence', 'second sentence']);
    await session.stop();
  });

  it('speak() transitions to speaking then back to listening', async () => {
    const session = new VoiceSession({ asr: new MockASRAdapter(), tts: new MockTTSAdapter() });
    const states: string[] = [];
    session.onState((s) => states.push(s));
    await session.start();
    const spoken = session.speak('hello');
    await spoken;
    expect(states).toContain('speaking');
    expect(states).toContain('listening');
    await session.stop();
  });
});
