import { describe, it, expect } from 'vitest';
import { MockASRAdapter } from '../providers/asr/mock';
import { MockTTSAdapter } from '../providers/tts/mock';
import type { VoiceEvent } from '../core/types';

describe('ASR adapter (mock)', () => {
  it('emits transcript_partial then transcript_final', async () => {
    const asr = new MockASRAdapter();
    const events: VoiceEvent[] = [];
    await asr.start((e) => events.push(e));
    await new Promise((r) => setTimeout(r, 120));
    expect(events.some((e) => e.type === 'transcript_partial')).toBe(true);
    expect(events.some((e) => e.type === 'transcript_final')).toBe(true);
    await asr.stop();
  });
});

describe('TTS adapter (mock)', () => {
  it('emits audio_started then audio_ended', async () => {
    const tts = new MockTTSAdapter();
    const events: VoiceEvent[] = [];
    await tts.speak('hello', (e) => events.push(e));
    expect(events[0].type).toBe('audio_started');
    expect(events[events.length - 1].type).toBe('audio_ended');
  });
});
