import { describe, it, expect } from 'vitest';
import { deepgramMessageToEvents } from '../providers/asr/deepgram';
import { webSpeechResultToEvents } from '../providers/asr/webspeech';

describe('provider event normalization', () => {
  it('Deepgram interim result -> transcript_partial', () => {
    const ev = deepgramMessageToEvents({
      type: 'Results',
      is_final: false,
      channel: { alternatives: [{ transcript: 'hello' }] },
    });
    expect(ev).toHaveLength(1);
    expect(ev[0].type).toBe('transcript_partial');
    expect(ev[0].text).toBe('hello');
  });

  it('Deepgram final + speech_final -> transcript_final + speech_ended', () => {
    const ev = deepgramMessageToEvents({
      type: 'Results',
      is_final: true,
      speech_final: true,
      channel: { alternatives: [{ transcript: 'hello world' }] },
    });
    expect(ev.map((e) => e.type)).toEqual(['transcript_final', 'speech_ended']);
  });

  it('external VAD suppresses Deepgram speech_ended', () => {
    const ev = deepgramMessageToEvents(
      { type: 'Results', is_final: true, speech_final: true, channel: { alternatives: [{ transcript: 'x' }] } },
      { externalVad: true },
    );
    expect(ev.map((e) => e.type)).toEqual(['transcript_final']);
  });

  it('Deepgram empty transcript is dropped', () => {
    expect(
      deepgramMessageToEvents({ type: 'Results', is_final: false, channel: { alternatives: [{ transcript: '  ' }] } }),
    ).toHaveLength(0);
  });

  it('Web Speech final result -> speech_started + transcript_final + speech_ended', () => {
    const fakeEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: { isFinal: true, 0: { transcript: 'hi there' } },
      },
    } as unknown as Parameters<typeof webSpeechResultToEvents>[0];
    const ev = webSpeechResultToEvents(fakeEvent);
    expect(ev.map((e) => e.type)).toEqual(['speech_started', 'transcript_final', 'speech_ended']);
    expect(ev[1].text).toBe('hi there');
  });

  it('Web Speech interim result -> transcript_partial only', () => {
    const fakeEvent = {
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: false, 0: { transcript: 'thinking' } } },
    } as unknown as Parameters<typeof webSpeechResultToEvents>[0];
    const ev = webSpeechResultToEvents(fakeEvent);
    expect(ev).toHaveLength(1);
    expect(ev[0].type).toBe('transcript_partial');
  });
});
