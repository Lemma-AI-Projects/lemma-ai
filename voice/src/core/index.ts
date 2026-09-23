/**
 * VoiceCore public surface. Upper layers import from here and never touch a
 * vendor SDK. Everything below is provider-agnostic.
 */
export * from './types';
export * from './events';
export * from './session';
export { MicrophoneInput } from './audio/microphone';
export { SpeakerOutput } from './audio/speaker';

export { createASR, ASR_PROVIDER_IDS } from '../providers/asr';
export type { ASRProvider } from '../providers/asr';
export { createTTS, TTS_PROVIDER_IDS } from '../providers/tts';
export type { TTSProvider } from '../providers/tts';
export { createVAD, VAD_PROVIDER_IDS } from '../providers/vad';
export type { VADProvider, VADEvent, VADSink } from '../providers/vad';

import { VoiceSession, type VoiceSessionOptions } from './session';
import type { ProviderConfig } from './types';
import { MicrophoneInput } from './audio/microphone';
import { SpeakerOutput } from './audio/speaker';
import { createASR } from '../providers/asr';
import { createTTS } from '../providers/tts';
import { createVAD } from '../providers/vad';

export function createVoiceSession(opts: VoiceSessionOptions): VoiceSession {
  return new VoiceSession(opts);
}

export interface DefaultSessionConfig {
  asr?: string;
  tts?: string;
  vad?: string;
  asrConfig?: ProviderConfig;
  ttsConfig?: ProviderConfig;
  vadConfig?: ProviderConfig;
  sessionId?: string;
}

/**
 * Convenience factory for the browser demo: wires the real audio layer
 * (Microphone + Speaker) and picks providers by id. Switching a provider id
 * changes nothing about VoiceCore or the UI.
 */
export function createDefaultVoiceSession(cfg: DefaultSessionConfig = {}): VoiceSession {
  const asr = createASR(cfg.asr ?? 'webspeech', cfg.asrConfig ?? {});
  const tts = createTTS(cfg.tts ?? 'browser', cfg.ttsConfig ?? {});
  const vad = cfg.vad ? createVAD(cfg.vad, cfg.vadConfig ?? {}) : undefined;
  const audioInput = new MicrophoneInput();
  const audioOutput = new SpeakerOutput();
  return new VoiceSession({
    asr,
    tts,
    vad,
    audioInput,
    audioOutput,
    asrConfig: cfg.asrConfig,
    ttsConfig: cfg.ttsConfig,
    vadConfig: cfg.vadConfig,
    sessionId: cfg.sessionId,
  });
}
