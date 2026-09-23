import type { ASRProvider } from './types';
import type {
  ProviderConfig,
  ProviderDeps,
  VoiceEvent,
  VoiceEventSink,
} from '../../core/types';

export interface DeepgramMessage {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: { alternatives?: Array<{ transcript?: string }> };
  channel_index?: number[];
}

/**
 * Pure translator: a Deepgram live WebSocket message -> normalized VoiceEvents.
 * Kept side-effect free so it is unit-testable without a network connection,
 * which is exactly what proves "provider events become unified Voice Events".
 */
export function deepgramMessageToEvents(
  msg: DeepgramMessage,
  opts?: { externalVad?: boolean },
): VoiceEvent[] {
  const out: VoiceEvent[] = [];
  const ts = Date.now();

  if (msg.type === 'UtteranceEnd' && !opts?.externalVad) {
    out.push({ type: 'speech_ended', timestamp: ts });
    return out;
  }

  if (msg.type === 'Results' && msg.channel?.alternatives?.length) {
    const transcript = (msg.channel.alternatives[0].transcript || '').trim();
    if (!transcript) return out;

    if (msg.is_final) {
      out.push({ type: 'transcript_final', text: transcript, timestamp: ts });
      if (!opts?.externalVad && msg.speech_final) {
        out.push({ type: 'speech_ended', timestamp: ts });
      }
    } else {
      out.push({ type: 'transcript_partial', text: transcript, timestamp: ts });
    }
  }
  return out;
}

/**
 * Deepgram streaming STT adapter.
 * Doc base: wss://api.deepgram.com/v1/listen  (Live Audio WebSocket)
 * Models: nova-3 (default), nova-2. Query: interim_results, endpointing (ms),
 * smart_format, language, utterance_end_ms. Auth: Token (api key) or temporary
 * Bearer token. In the browser, custom headers are not allowed, so the key/token
 * is passed via the Sec-WebSocket-Protocol subprotocol.
 */
export class DeepgramASRAdapter implements ASRProvider {
  readonly id = 'deepgram-asr';
  running = false;
  private cfg: ProviderConfig = {};
  private sink?: VoiceEventSink;
  private ws?: WebSocket;

  init(config: ProviderConfig): void {
    this.cfg = config;
  }

  async start(sink: VoiceEventSink): Promise<void> {
    this.sink = sink;
    this.running = true;
    const model = this.cfg.model ?? 'nova-3';
    const params = new URLSearchParams({
      model,
      interim_results: 'true',
      endpointing: String(this.cfg.extra?.endpointing ?? 300),
      smart_format: 'true',
    });
    if (this.cfg.language) params.set('language', this.cfg.language);
    const url = `${this.cfg.endpoint ?? 'wss://api.deepgram.com/v1/listen'}?${params.toString()}`;

    const subprotocols = this.cfg.token
      ? ['authorization', `Bearer ${this.cfg.token}`]
      : this.cfg.apiKey
        ? ['token', this.cfg.apiKey]
        : undefined;

    const ws = subprotocols ? new WebSocket(url, subprotocols) : new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => sink({ type: 'speech_started', timestamp: Date.now(), meta: { vendor: 'deepgram' } });
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as DeepgramMessage;
        for (const e of deepgramMessageToEvents(msg, { externalVad: !!this.cfg.extra?.externalVad })) {
          sink(e);
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onerror = () =>
      sink({
        type: 'error',
        error: { code: 'asr_ws_error', message: 'Deepgram WebSocket error', source: this.id },
        timestamp: Date.now(),
      });
    ws.onclose = () => {
      this.running = false;
    };
  }

  pushAudio(frame: Int16Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength));
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    try {
      this.ws?.send(JSON.stringify({ type: 'CloseStream' }));
    } catch {
      /* ignore */
    }
    this.ws?.close();
    this.ws = undefined;
  }
}
