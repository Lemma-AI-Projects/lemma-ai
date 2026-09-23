import type { VoiceEvent, VoiceEventSink } from './types';

export type VoiceEventListener = (event: VoiceEvent) => void;

/**
 * Minimal typed event bus. The upper layer (demo, future product scenarios)
 * subscribes here and only ever receives normalized VoiceEvents.
 */
export class VoiceEventBus {
  private listeners = new Set<VoiceEventListener>();

  on(cb: VoiceEventListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  emit(event: VoiceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* a bad subscriber must not break the stream */
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const asSink = (bus: VoiceEventBus): VoiceEventSink => (e) => bus.emit(e);
