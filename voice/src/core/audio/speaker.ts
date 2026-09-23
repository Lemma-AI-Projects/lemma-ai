import type { AudioOutput } from '../types';

/**
 * Browser speaker output. Decodes encoded audio bytes (mp3 / wav / pcm wrapped
 * in a container) and plays them through an AudioContext. Network TTS adapters
 * (ElevenLabs, Deepgram Aura) push their bytes here so the vendor never touches
 * the UI directly.
 */
export class SpeakerOutput implements AudioOutput {
  private ctx?: AudioContext;
  private current?: AudioBufferSourceNode;
  playing = false;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctx: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    return this.ctx;
  }

  async play(bytes: ArrayBuffer, mime = 'audio/mpeg'): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer =
      mime === 'audio/x-pcm' || mime === 'application/octet-stream'
        ? this.decodeRawPcm(bytes, ctx)
        : await ctx.decodeAudioData(bytes.slice(0));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    this.playing = true;
    this.current = src;
    await new Promise<void>((resolve) => {
      src.onended = () => {
        this.playing = false;
        this.current = undefined;
        resolve();
      };
      src.start();
    });
  }

  private decodeRawPcm(bytes: ArrayBuffer, ctx: AudioContext): AudioBuffer {
    const int16 = new Int16Array(bytes);
    const float = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 0x8000;
    const buf = ctx.createBuffer(1, float.length, 24000);
    buf.copyToChannel(float, 0);
    return buf;
  }

  stop(): void {
    try {
      this.current?.stop();
    } catch {
      /* ignore */
    }
    this.playing = false;
    this.current = undefined;
  }
}
