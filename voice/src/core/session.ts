import type {
  AudioInput,
  AudioOutput,
  ProviderConfig,
  VoiceEvent,
  VoiceEventSink,
  VoiceSessionState,
} from './types';
import { VoiceEventBus } from './events';
import type { ASRProvider } from '../providers/asr/types';
import type { TTSProvider } from '../providers/tts/types';
import type { VADProvider, VADEvent } from '../providers/vad/types';

export interface VoiceSessionOptions {
  asr: ASRProvider;
  tts: TTSProvider;
  vad?: VADProvider;
  audioInput?: AudioInput;
  audioOutput?: AudioOutput;
  /** static config handed to providers at start() */
  asrConfig?: ProviderConfig;
  ttsConfig?: ProviderConfig;
  vadConfig?: ProviderConfig;
  sessionId?: string;
}

export type StateListener = (state: VoiceSessionState) => void;

/**
 * Minimal VoiceSession. Owns the lifecycle and the normalized event stream.
 * Knows nothing about business semantics — only Audio/Speech/Text/Session/Events.
 *
 * States: idle -> listening -> (processing on speech_ended) -> listening,
 *         -> speaking -> listening, and error on any provider failure.
 */
export class VoiceSession {
  readonly id: string;
  private state: VoiceSessionState = 'idle';
  private readonly bus = new VoiceEventBus();
  private readonly stateListeners = new Set<StateListener>();

  private readonly asr: ASRProvider;
  private readonly tts: TTSProvider;
  private readonly vad?: VADProvider;
  private readonly audioInput?: AudioInput;
  private readonly audioOutput?: AudioOutput;
  private asrConfig: ProviderConfig;
  private ttsConfig: ProviderConfig;
  private vadConfig: ProviderConfig;

  private started = false;
  private vadRunning = false;

  constructor(opts: VoiceSessionOptions) {
    this.id = opts.sessionId ?? `vs_${Math.random().toString(36).slice(2, 10)}`;
    this.asr = opts.asr;
    this.tts = opts.tts;
    this.vad = opts.vad;
    this.audioInput = opts.audioInput;
    this.audioOutput = opts.audioOutput;
    this.asrConfig = opts.asrConfig ?? {};
    this.ttsConfig = opts.ttsConfig ?? {};
    this.vadConfig = opts.vadConfig ?? {};
  }

  on(cb: (e: VoiceEvent) => void): () => void {
    return this.bus.on(cb);
  }

  onState(cb: StateListener): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  getState(): VoiceSessionState {
    return this.state;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const asrNeedsFrames = typeof this.asr.pushAudio === 'function';
    const needMic = !!this.vad || asrNeedsFrames;

    try {
      if (needMic && this.audioInput) {
        await this.audioInput.start();
        this.audioInput.onFrame((pcm, rate) => {
          if (asrNeedsFrames) this.asr.pushAudio?.(pcm, rate);
        });
      }

      // If an external VAD drives speech boundaries, suppress provider's own.
      if (this.vad) this.asrConfig = { ...this.asrConfig, extra: { ...this.asrConfig.extra, externalVad: true } };

      this.tts.init(this.ttsConfig, { audioOutput: this.audioOutput });
      this.asr.init(this.asrConfig);
      await this.asr.start((e) => this.handleProviderEvent(e));

      if (this.vad && this.audioInput) {
        try {
          this.vad.init(this.vadConfig);
          await this.vad.start(this.audioInput, (ve) => this.handleVadEvent(ve));
          this.vadRunning = true;
        } catch {
          // VAD is optional; a failure here must not abort the whole session.
        }
      }

      this.setState('listening');
      this.emit({ type: 'session_started', timestamp: Date.now() });
    } catch (err) {
      this.started = false;
      this.fail('session_start_failed', String((err as Error)?.message ?? err));
    }
  }

  async speak(text: string): Promise<void> {
    if (!text.trim() || !this.started) return;
    this.setState('speaking');
    try {
      await this.tts.speak(text, (e) => this.emit(e));
    } catch (err) {
      this.fail('tts_failed', String((err as Error)?.message ?? err));
    } finally {
      if (this.started) this.setState('listening');
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    try {
      await this.asr.stop();
      if (this.vadRunning) await this.vad?.stop();
      this.vadRunning = false;
      this.audioInput?.stop();
      await this.tts.stop();
    } catch {
      /* best effort */
    }
    if (this.state !== 'error') this.setState('idle');
    this.emit({ type: 'session_ended', timestamp: Date.now() });
    this.bus.clear();
    this.stateListeners.clear();
  }

  /* ----------------------------- internals ----------------------------- */

  private handleProviderEvent(e: VoiceEvent): void {
    if (e.type === 'speech_ended') this.setState('processing');
    else if (e.type === 'transcript_final' && this.state === 'processing') this.setState('listening');
    else if (e.type === 'error') this.fail(e.error?.code ?? 'asr_error', e.error?.message ?? 'asr error', e.error?.source);
    this.emit(e);
  }

  private handleVadEvent(e: VADEvent): void {
    if (e.type === 'speech_started') this.setState('listening');
    else if (e.type === 'speech_ended') this.setState('processing');
    this.emit({
      type: e.type,
      timestamp: e.timestamp,
      meta: { source: 'vad', ...(e.meta ?? {}) },
    });
  }

  private emit(e: VoiceEvent): void {
    this.bus.emit({ ...e, sessionId: this.id });
  }

  private fail(code: string, message: string, source?: string): void {
    this.setState('error');
    this.bus.emit({
      type: 'error',
      error: { code, message, source },
      timestamp: Date.now(),
      sessionId: this.id,
    });
  }

  private setState(next: VoiceSessionState): void {
    if (this.state === next) return;
    this.state = next;
    for (const l of this.stateListeners) l(next);
  }
}
