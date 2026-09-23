import {
  createDefaultVoiceSession,
  ASR_PROVIDER_IDS,
  TTS_PROVIDER_IDS,
  type VoiceEvent,
  type VoiceSessionState,
} from '../core';

const root = document.getElementById('app')!;
root.innerHTML = `
  <main class="vs">
    <h1>Lemma Voice System — Demo V0</h1>
    <p class="sub">Standalone, provider-independent Voice Runtime. No Learn Space / Global Agent.</p>

    <section class="card">
      <div class="row">
        <label>ASR
          <select id="asr">${ASR_PROVIDER_IDS.map((id) => `<option value="${id}">${id}</option>`).join('')}</select>
        </label>
        <label>ASR key
          <input id="asrKey" type="password" placeholder="Deepgram key/token" autocomplete="off" />
        </label>
      </div>
      <div class="row">
        <label>TTS
          <select id="tts">${TTS_PROVIDER_IDS.map((id) => `<option value="${id}">${id}</option>`).join('')}</select>
        </label>
        <label>TTS key
          <input id="ttsKey" type="password" placeholder="ElevenLabs key" autocomplete="off" />
        </label>
      </div>
      <div class="row">
        <label>Language
          <input id="lang" value="en-US" />
        </label>
        <label class="check">
          <input id="vad" type="checkbox" /> Client-side VAD (browser)
        </label>
      </div>
      <div class="row">
        <button id="start">Start</button>
        <button id="stop" disabled>Stop</button>
        <span class="state">state: <b id="state">idle</b></span>
      </div>
    </section>

    <section class="card cols">
      <div>
        <h3>Transcript</h3>
        <div id="partial" class="partial"></div>
        <div id="transcript" class="transcript"></div>
      </div>
      <div>
        <h3>Event stream</h3>
        <div id="log" class="log"></div>
      </div>
    </section>

    <section class="card">
      <div class="row">
        <input id="text" placeholder="Type a response and click Speak…" style="flex:1" />
        <button id="speak">Speak</button>
      </div>
    </section>
  </main>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const asrSel = $<HTMLSelectElement>('asr');
const ttsSel = $<HTMLSelectElement>('tts');
const asrKey = $<HTMLInputElement>('asrKey');
const ttsKey = $<HTMLInputElement>('ttsKey');
const lang = $<HTMLInputElement>('lang');
const vadChk = $<HTMLInputElement>('vad');
const startBtn = $<HTMLButtonElement>('start');
const stopBtn = $<HTMLButtonElement>('stop');
const speakBtn = $<HTMLButtonElement>('speak');
const textIn = $<HTMLInputElement>('text');
const stateEl = $('state');
const partialEl = $('partial');
const transcriptEl = $('transcript');
const logEl = $('log');

let unsub: (() => void) | null = null;
let unsubState: (() => void) | null = null;

function logEvent(e: VoiceEvent) {
  const line = document.createElement('div');
  line.className = `ev ev-${e.type}`;
  const t = e.text ? ` "${e.text}"` : '';
  const err = e.error ? ` [${e.error.code}] ${e.error.message}` : '';
  line.textContent = `${new Date(e.timestamp).toLocaleTimeString()}  ${e.type}${t}${err}`;
  logEl.prepend(line);
  while (logEl.childElementCount > 200) logEl.lastElementChild?.remove();
}

function setState(s: VoiceSessionState) {
  stateEl.textContent = s;
}

function buildConfig() {
  const asr = asrSel.value;
  const tts = ttsSel.value;
  return {
    asr,
    tts,
    vad: vadChk.checked ? 'browser' : undefined,
    asrConfig: {
      language: lang.value || undefined,
      apiKey: asr === 'deepgram' ? asrKey.value || undefined : undefined,
      token: undefined,
    },
    ttsConfig: {
      apiKey: tts === 'elevenlabs' ? ttsKey.value || undefined : undefined,
    },
  };
}

startBtn.addEventListener('click', async () => {
  const session = createDefaultVoiceSession(buildConfig());
  unsub = session.on(logEvent);
  unsubState = session.onState(setState);
  startBtn.disabled = true;
  stopBtn.disabled = false;
  partialEl.textContent = '';
  transcriptEl.textContent = '';
  logEl.innerHTML = '';
  try {
    await session.start();
  } catch {
    /* error event already emitted */
  }
  // keep a handle for Speak / Stop
  (window as unknown as { __vs: typeof session }).__vs = session;
});

stopBtn.addEventListener('click', async () => {
  const session = (window as unknown as { __vs?: ReturnType<typeof createDefaultVoiceSession> }).__vs;
  if (session) await session.stop();
  unsub?.();
  unsubState?.();
  unsub = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

speakBtn.addEventListener('click', () => {
  const session = (window as unknown as { __vs?: ReturnType<typeof createDefaultVoiceSession> }).__vs;
  const text = textIn.value.trim();
  if (session && text) session.speak(text);
});
