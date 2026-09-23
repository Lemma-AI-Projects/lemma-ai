import type { TTSProvider } from './types';
import type { ProviderConfig } from '../../core/types';
import { ElevenLabsTTSAdapter } from './elevenlabs';
import { BrowserTTSAdapter } from './browser';
import { MockTTSAdapter } from './mock';

export * from './types';
export { ElevenLabsTTSAdapter, BrowserTTSAdapter, MockTTSAdapter };

export function createTTS(id: string, config: ProviderConfig): TTSProvider {
  switch (id) {
    case 'elevenlabs':
      return new ElevenLabsTTSAdapter();
    case 'browser':
      return new BrowserTTSAdapter();
    case 'mock':
    default:
      return new MockTTSAdapter();
  }
}

export const TTS_PROVIDER_IDS = ['browser', 'elevenlabs', 'mock'] as const;
