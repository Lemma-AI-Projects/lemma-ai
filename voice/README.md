# Lemma AI — Voice System Foundation V0

A **standalone, provider-independent Voice Runtime**. It does not know any business
semantics (no "Learn Space", no "Socratic", no learner state). It only turns audio
into text and text into audio, exposing one normalized event stream.

This is the foundation only. No Voice Agent, no LLM, no memory, no scheduling.

---

## Principles

- **VoiceCore knows nothing about business.** Only Audio / Speech / Text / Session / Events.
- **Providers are swappable.** Upper code never imports a vendor SDK. Swap Deepgram →
  OpenAI by changing one id; the UI and core are untouched.
- **One event language.** Every vendor event is translated into a `VoiceEvent` before the
  upper layer sees it.

---

## Architecture

```
                         ┌─────────────────────────────┐
   Microphone ─────────► │          Voice Core           │ ──► Transcript / Events
                         │                               │
   Text      ─────────► │   AudioInput → ASR Provider    │
                         │   TTS Provider → AudioOutput   │ ──► Speaker
                         │   VAD Provider (optional)      │
                         │   VoiceSession (state + bus)   │
                         └─────────────────────────────┘
                                    │
                    normalized VoiceEvents (never vendor events)
                                    ▼
                         Demo / future product scenarios
              (Global Agent · Learn Space · Free Course · Method …)

  Provider layer (all behind interfaces):
    ASR:  DeepgramAdapter · WebSpeechAdapter · MockAdapter
    TTS:  ElevenLabsAdapter · BrowserTTSAdapter · MockAdapter
    VAD:  BrowserVADAdapter
```

---

## Run the demo

```bash
cd voice
npm install
npm run dev          # opens on http://localhost:5174
```

Browser: Chrome or Edge (Web Speech + mic). For a no-key run:

- ASR = `webspeech` (browser-native, keyless)
- TTS = `browser` (Web Speech, keyless)

Click **Start** → allow mic → speak → transcript appears. Type text → **Speak** → audio
plays. Switch providers in the dropdowns; UI/core do not change.

For real vendors, paste keys and pick `deepgram` / `elevenlabs`.

---

## Tests

```bash
npm test
```

Covers: session lifecycle, ASR/TTS adapters, event normalization (Deepgram + Web Speech →
`VoiceEvent`), provider errors, session errors, start/stop, and two-utterance continuity.

---

## Provider report (research-backed, official docs)

| Role | Current (V0 default path) | Backup | Future realtime |
|------|------|-------|-----------------|
| ASR  | **Deepgram** `nova-3` (streaming WS, sub-300ms, endpointing + interim) | OpenAI `gpt-4o-transcribe` (cheapest, 99+ langs) · ElevenLabs Scribe v2 Realtime (~150ms, 90+ langs) | OpenAI Realtime (speech-to-speech) as future adapter |
| TTS  | **ElevenLabs** `eleven_flash_v2_5` (~75ms, 70+ langs) | OpenAI `gpt-4o-mini-tts` / `tts-1` · Deepgram Aura TTS | OpenAI Realtime |
| VAD  | Browser energy VAD (client-side, keyless) | Deepgram/provider-side VAD · Silero | — |

Recommendation: **V0 ships Deepgram ASR + ElevenLabs TTS as the production adapters,
with browser-native adapters as the zero-key demo path.** OpenAI Realtime is reserved as
a future speech-to-speech adapter (out of scope now). Reasoning: Deepgram has the best
real-time streaming latency and the simplest WebSocket; ElevenLabs leads on voice quality
and multilingual coverage; both slot behind the same interfaces so either can be replaced
without touching the core.

---

## API list (official docs only)

| Provider | API / Endpoint | SDK | Use |
|----------|----------------|-----|-----|
| Deepgram | `wss://api.deepgram.com/v1/listen` (Live Audio WebSocket), params `model=nova-3`, `interim_results`, `endpointing`, `smart_format`, `language` | `@deepgram/sdk` (browser uses native WebSocket + subprotocol `token`) | Streaming ASR |
| ElevenLabs | `POST /v1/text-to-speech/{voice_id}/stream` (model `eleven_flash_v2_5`, `eleven_multilingual_v2`, `eleven_v3`), header `xi-api-key` | `@elevenlabs/elevenlabs-js` | TTS |
| ElevenLabs | `Scribe v2 Realtime` (WebSocket) — 90+ langs, ~150ms | `@elevenlabs/elevenlabs-js` | Backup realtime ASR |
| OpenAI | Realtime `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, header `Authorization: Bearer` + `OpenAI-Beta: realtime=v1` | `openai` / `openai-realtime` | Future speech-to-speech |
| OpenAI | `POST /v1/audio/transcriptions` (models `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`) | `openai` | Backup ASR |
| OpenAI | `POST /v1/audio/speech` (models `tts-1`, `gpt-4o-mini-tts`) | `openai` | Backup TTS |

---

## Code entry points

- **Voice Core:** `src/core/index.ts` — `createVoiceSession`, `createDefaultVoiceSession`, types.
- **Session / state / bus:** `src/core/session.ts`, `src/core/events.ts`, `src/core/types.ts`.
- **Audio layer:** `src/core/audio/microphone.ts` (AudioInput), `src/core/audio/speaker.ts` (AudioOutput).
- **Provider adapters:**
  - ASR: `src/providers/asr/{deepgram,webspeech,mock}.ts` + `index.ts` (`createASR`)
  - TTS: `src/providers/tts/{elevenlabs,browser,mock}.ts` + `index.ts` (`createTTS`)
  - VAD: `src/providers/vad/browser.ts` + `index.ts` (`createVAD`)
- **Demo:** `src/demo/main.ts` + `src/demo/styles.css` (entry `index.html`).
- **Tests:** `src/tests/*.test.ts`.

---

## Non-goals (explicitly not built)

Learn Space integration · Global Agent integration · Voice Agent · LLM orchestration ·
memory · learner state · method · scheduler · coordinator · wake word · voice cloning ·
emotion engine · complex interruption · multi-speaker.
