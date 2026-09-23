/**
 * Voice System Foundation V0 — core types.
 *
 * The core knows NOTHING about business semantics (no "Learn Space", no
 * "Socratic", no learner state). It only deals with Audio / Speech / Text /
 * Session / Events. Every provider adapter translates its native protocol into
 * these normalized VoiceEvents so the upper layer never sees a vendor event.
 */

export type VoiceSessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type VoiceEventType =
  | 'session_started'
  | 'session_ended'
  | 'speech_started'
  | 'speech_ended'
  | 'transcript_partial'
  | 'transcript_final'
  | 'audio_started'
  | 'audio_ended'
  | 'error';

export interface VoiceError {
  /** machine code, e.g. 'asr_start_failed' | 'tts_failed' | 'network' */
  code: string;
  message: string;
  /** provider id that produced the error, when known */
  source?: string;
}

export interface VoiceEvent {
  type: VoiceEventType;
  /** attached by VoiceSession; adapters may omit it */
  sessionId?: string;
  text?: string;
  error?: VoiceError;
  timestamp: number;
  /** transport-level details an upper layer may ignore */
  meta?: Record<string, unknown>;
}

export type VoiceEventSink = (event: VoiceEvent) => void;

/** Common config passed to every provider adapter. Plain data only. */
export interface ProviderConfig {
  apiKey?: string;
  /** short-lived token (preferred for client-side use) */
  token?: string;
  model?: string;
  /** BCP-47 or provider language code */
  language?: string;
  /** TTS voice id */
  voiceId?: string;
  /** override base endpoint (e.g. proxy) */
  endpoint?: string;
  /** anything vendor-specific, kept out of the typed surface */
  extra?: Record<string, unknown>;
}

export interface ProviderDeps {
  audioOutput?: AudioOutput;
  audioInput?: AudioInput;
}

/* ----------------------------------------------------------------------- */
/* Audio layer abstractions                                                 */
/* ----------------------------------------------------------------------- */

/**
 * AudioInput captures microphone audio and hands raw PCM frames to whoever
 * subscribes. It does NOT talk to any ASR — the session pumps frames into the
 * ASR adapter. This keeps "Microphone -> Audio Input -> ASR Adapter" separated.
 */
export interface AudioInput {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** PCM16 frames at `rate` Hz, mono */
  onFrame(cb: (pcm: Int16Array, rate: number) => void): void;
  /** underlying MediaStream (needed by client-side VAD) */
  readonly stream: MediaStream | null;
}

/**
 * AudioOutput plays bytes produced by a TTS adapter. "TTS Adapter -> Audio
 * Output -> Speaker" stays separated from the vendor SDK.
 */
export interface AudioOutput {
  play(bytes: ArrayBuffer, mime?: string): Promise<void>;
  stop(): void;
  readonly playing: boolean;
}
