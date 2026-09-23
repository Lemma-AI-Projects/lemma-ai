import type { ASRProvider } from './types';
import type { ProviderConfig } from '../../core/types';
import { DeepgramASRAdapter } from './deepgram';
import { WebSpeechASRAdapter } from './webspeech';
import { MockASRAdapter } from './mock';

export * from './types';
export { DeepgramASRAdapter, WebSpeechASRAdapter, MockASRAdapter };

/** Construct an ASR adapter by id. Adding a vendor = one new case here. */
export function createASR(id: string, config: ProviderConfig): ASRProvider {
  switch (id) {
    case 'deepgram':
      return new DeepgramASRAdapter();
    case 'webspeech':
      return new WebSpeechASRAdapter();
    case 'mock':
    default:
      return new MockASRAdapter();
  }
}

export const ASR_PROVIDER_IDS = ['webspeech', 'deepgram', 'mock'] as const;
