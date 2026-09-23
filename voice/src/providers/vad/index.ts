import type { VADProvider } from './types';
import type { ProviderConfig } from '../../core/types';
import { BrowserVADAdapter } from './browser';

export * from './types';
export { BrowserVADAdapter };

export function createVAD(id: string, config: ProviderConfig): VADProvider {
  switch (id) {
    case 'browser':
    default:
      return new BrowserVADAdapter(Number(config.extra?.vadThreshold) || 0.02);
  }
}

export const VAD_PROVIDER_IDS = ['browser'] as const;
