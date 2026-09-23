import type { VADProvider, VADEvent, VADSink } from './types';
import type { AudioInput, ProviderConfig } from '../../core/types';

/**
 * Client-side VAD using a Web Audio AnalyserNode energy (RMS) threshold.
 * No model download, no vendor. Demonstrates the swap-in point: replace with
 * Silero VAD or provider-side VAD later without touching the core.
 */
export class BrowserVADAdapter implements VADProvider {
  readonly id = 'browser-vad';
  running = false;
  private threshold: number;
  private ctx?: AudioContext;
  private proc?: ScriptProcessorNode;
  private stream?: MediaStream;
  private speaking = false;

  constructor(threshold = 0.02) {
    this.threshold = threshold;
  }

  init(config: ProviderConfig): void {
    if (typeof config.extra?.vadThreshold === 'number') this.threshold = config.extra.vadThreshold;
  }

  async start(source: AudioInput, sink: VADSink): Promise<void> {
    if (!source.stream) throw new Error('BrowserVAD needs a MediaStream from AudioInput');
    this.stream = source.stream;
    this.running = true;
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.stream);
    const proc = this.ctx.createScriptProcessor(1024, 1, 1);
    proc.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      if (!this.speaking && rms > this.threshold) {
        this.speaking = true;
        sink({ type: 'speech_started', timestamp: Date.now() } as VADEvent);
      } else if (this.speaking && rms < this.threshold) {
        this.speaking = false;
        sink({ type: 'speech_ended', timestamp: Date.now() } as VADEvent);
      }
    };
    src.connect(proc);
    proc.connect(this.ctx.destination);
    this.proc = proc;
  }

  async stop(): Promise<void> {
    this.running = false;
    try {
      this.proc?.disconnect();
    } catch {
      /* ignore */
    }
    this.ctx?.close().catch(() => undefined);
    this.proc = undefined;
    this.ctx = undefined;
    this.speaking = false;
  }
}
