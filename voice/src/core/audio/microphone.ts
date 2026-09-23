import type { AudioInput } from '../types';

/** Tiny linear-interpolation resampler (e.g. 48k -> 16k). Good enough for V0. */
class LinearResampler {
  constructor(private fromRate: number, private toRate: number) {}

  process(input: Float32Array): Float32Array {
    const ratio = this.fromRate / this.toRate;
    const out = new Float32Array(Math.ceil(input.length / ratio));
    let o = 0;
    for (let pos = 0; pos < input.length; pos += ratio) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const a = input[i] ?? 0;
      const b = input[i + 1] ?? a;
      out[o++] = a + (b - a) * frac;
    }
    return out.subarray(0, o);
  }
}

/**
 * Browser microphone capture. Produces mono PCM16 frames at `targetRate`
 * (default 16 kHz, what most streaming STT vendors expect). Resamples from the
 * device rate when the browser ignores the requested sample rate.
 */
export class MicrophoneInput implements AudioInput {
  private ctx?: AudioContext;
  private mediaStream?: MediaStream;
  private proc?: ScriptProcessorNode;
  private frameCb?: (pcm: Int16Array, rate: number) => void;
  private resampler?: LinearResampler;
  readonly targetRate: number;
  stream: MediaStream | null = null;

  constructor(targetRate = 16000) {
    this.targetRate = targetRate;
  }

  async start(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.stream = this.mediaStream;
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.mediaStream);
    const proc = this.ctx.createScriptProcessor(4096, 1, 1);
    this.resampler = new LinearResampler(this.ctx.sampleRate, this.targetRate);

    proc.onaudioprocess = (e) => {
      const float = e.inputBuffer.getChannelData(0);
      const resampled = this.resampler!.process(float);
      const pcm = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.frameCb?.(pcm, this.targetRate);
    };

    src.connect(proc);
    proc.connect(this.ctx.destination); // required for the processor to run
    this.proc = proc;
  }

  onFrame(cb: (pcm: Int16Array, rate: number) => void): void {
    this.frameCb = cb;
  }

  async stop(): Promise<void> {
    try {
      this.proc?.disconnect();
    } catch {
      /* ignore */
    }
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    await this.ctx?.close().catch(() => undefined);
    this.proc = undefined;
    this.ctx = undefined;
  }
}
