import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PROFILE = 'D:/github projects/lemma-ai/.worktrees/main-v3/.logs/chrome-cdp4'
const BASE = 'http://localhost:5173/preview/user-trajectory'
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9336', `--user-data-dir=${PROFILE}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9336/json/list')).json()
      const p = list.find((t) => t.type === 'page')
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('no target')
}
const ws = new WebSocket(await target())
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}) => { const mid = ++id; ws.send(JSON.stringify({ id: mid, method, params })); return new Promise((r) => pending.set(mid, r)) }
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return 'ERR ' + JSON.stringify(r.result.exceptionDetails).slice(0, 220)
  return r.result?.result?.value
}
await send('Page.enable'); await send('Runtime.enable')

await send('Page.navigate', { url: `${BASE}?view=explore&sel=prj-01` })
await sleep(6000)

const step = (js) => ev(`(async () => { ${js} })()`)
const click = (sel) => `const b = [...document.querySelectorAll('${sel}')].find(x => x.innerText.trim() === '暂存'); b.click(); await new Promise(r=>setTimeout(r,250));`

console.log('save1', await ev(`(async () => {
  const b = [...document.querySelectorAll('aside button')].find(x => x.innerText.trim() === '暂存');
  b.click(); await new Promise(r=>setTimeout(r,250));
  return document.querySelector('header').innerText.includes('1');
})()`))

console.log('hop', await step(`
  const hop = [...document.querySelectorAll('main button')].find(b => b.innerText.trim() === '走过去');
  if (!hop) return 'NO_HOP';
  hop.click(); await new Promise(r=>setTimeout(r,400));
  return document.querySelector('main h2')?.innerText;
`))

console.log('save2', await ev(`(async () => {
  const b = [...document.querySelectorAll('aside button')].find(x => x.innerText.trim() === '暂存');
  if (!b) return 'NO_SAVE';
  b.click(); await new Promise(r=>setTimeout(r,300));
  const h = document.querySelector('header').innerText;
  return { header: h.replace(/\\n/g,' | '), n: (h.match(/2/) ? 2 : 1) };
})()`))

console.log('sheet', await ev(`(async () => {
  const b = [...document.querySelectorAll('header button')].find(x => x.innerText.includes('暂存'));
  b.click(); await new Promise(r=>setTimeout(r,300));
  const cmp = [...document.querySelectorAll('aside button')].find(x => x.innerText.includes('并排看这'));
  if (!cmp) return 'NO_COMPARE_BTN';
  cmp.click(); await new Promise(r=>setTimeout(r,400));
  return { cols: document.querySelectorAll('main thead th').length, label: document.querySelector('main')?.innerText.slice(0,10) };
})()`))

console.log('back_from_compare', await ev(`(async () => {
  const b = [...document.querySelectorAll('main button')].find(x => x.innerText.trim() === '返回');
  b?.click(); await new Promise(r=>setTimeout(r,300));
  return { comparing: !document.querySelector('main thead') };
})()`))

void step
void click
ws.close(); chrome.kill()
