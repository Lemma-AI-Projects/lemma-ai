import type { ASRProvider } from './types';
import type { ProviderConfig, VoiceEvent, VoiceEventSink } from '../../core/types';

/* Minimal structural type for the (prefixed) Web Speech Recognition API. */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  readonly length: number;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Pure translator for a Web Speech result set -> normalized VoiceEvents. */
export function webSpeechResultToEvents(ev: SpeechRecognitionEventLike): VoiceEvent[] {
  const out: VoiceEvent[] = [];
  const ts = Date.now();
  let interim = '';
  let final = '';
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const r = ev.results[i];
    if (r.isFinal) final += r[0].transcript;
    else interim += r[0].transcript;
  }
  if (interim) out.push({ type: 'transcript_partial', text: interim, timestamp: ts });
  if (final) {
    out.push({ type: 'speech_started', timestamp: ts, meta: { vendor: 'webspeech' } });
    out.push({ type: 'transcript_final', text: final, timestamp: ts });
    out.push({ type: 'speech_ended', timestamp: ts });
  }
  return out;
}

/**
 * Browser-native ASR via the Web Speech API. Zero API key, works in Chrome /
 * Edge. Captures the mic itself, so pushAudio is intentionally absent.
 * Used as the default demo ASR so Test A works with no credentials.
 */
export class WebSpeechASRAdapter implements ASRProvider {
  readonly id = 'webspeech-asr';
  running = false;
  private cfg: ProviderConfig = {};
  private rec?: SpeechRecognitionLike;
  private sink?: VoiceEventSink;

  init(config: ProviderConfig): void {
    this.cfg = config;
  }

  async start(sink: VoiceEventSink): Promise<void> {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      throw new Error('Web Speech Recognition unavailable in this browser (try Chrome/Edge).');
    }
    this.sink = sink;
    this.running = true;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    if (this.cfg.language) rec.lang = this.cfg.language;

    rec.onresult = (e) => {
      for (const ev of webSpeechResultToEvents(e)) sink(ev);
    };
    rec.onerror = (e) =>
      sink({
        type: 'error',
        error: { code: 'asr_error', message: e.error, source: this.id },
        timestamp: Date.now(),
      });
    rec.onend = () => {
      if (this.running) {
        try {
          rec.start();
        } catch {
          /* ignore double-start */
        }
      }
    };
    rec.start();
    this.rec = rec;
  }

  async stop(): Promise<void> {
    this.running = false;
    try {
      this.rec?.stop();
    } catch {
      /* ignore */
    }
    this.rec = undefined;
  }
}
