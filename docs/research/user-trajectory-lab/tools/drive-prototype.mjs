// 用 CDP 驱动真浏览器跑一遍关键交互（本仓库无 jsdom）。
// 只读 DOM + 发事件，不截图（截图走 Chrome CLI）。
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PROFILE = 'D:/github projects/lemma-ai/.worktrees/main-v3/.logs/chrome-cdp'
const BASE = 'http://localhost:5173/preview/user-trajectory'

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9333', `--user-data-dir=${PROFILE}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9333/json/list')).json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('no devtools target')
}

const ws = new WebSocket(await target())
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
const send = (method, params = {}) => {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((r) => pending.set(mid, r))
}
async function ev(expr) {
  const resp = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (resp.result?.exceptionDetails) return 'ERR: ' + JSON.stringify(resp.result.exceptionDetails).slice(0, 300)
  return resp.result?.result?.value
}

await send('Page.enable'); await send('Runtime.enable')
await send('Page.navigate', { url: `${BASE}?view=timeline&sel=act-112` })
await sleep(7000)

const out = {}
out.mounted = await ev(`document.body.innerText.includes('陈知远')`)
// 带着 ?sel= 进来：路径与右栏都该有它
out.deepLink = await ev(`(() => { const p = document.querySelector('[data-ut-path]'); return { path: p?.innerText.replace(/\\n/g,' ') ?? '', inspector: document.body.innerText.includes('消融跑完') }; })()`)

// 父事件展开
out.expand = await ev(`(() => {
  const closed = [...document.querySelectorAll('main button')].filter(b => b.getAttribute('aria-label') === '展开');
  const before = document.querySelectorAll('main .border-dashed button').length;
  if (closed[0]) closed[0].click();
  return new Promise(r => setTimeout(() => r({before, after: document.querySelectorAll('main .border-dashed button').length, hadClosed: closed.length}), 250));
})()`)

// 对象右键菜单应包含「放进对比」
out.objectMenu = await ev(`(() => {
  const tab = [...document.querySelectorAll('header button')].find(b => b.textContent.trim().startsWith('探索'));
  tab.click();
  return new Promise(r => setTimeout(() => {
    const obj = [...document.querySelectorAll('aside button')].find(b => b.textContent.includes('The Consciousness'));
    if (!obj) return r('no-object');
    obj.click();
    setTimeout(() => {
      const row = [...document.querySelectorAll('aside button')].find(b => b.textContent.includes('repr-view'));
      if (!row) return r('no-detail-row');
      row.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, clientX: 500, clientY: 300}));
      setTimeout(() => r([...document.querySelectorAll('div.fixed button')].map(b => b.textContent.trim()).filter(Boolean)), 250);
    }, 300);
  }, 400));
})()`)

// 对比：放进两个再打开
out.compare = await ev(`(() => {
  const item = [...document.querySelectorAll('div.fixed button')].find(b => b.textContent.trim() === '放进对比');
  if (item) item.click();
  setTimeout(() => {
    const close = [...document.querySelectorAll('div.fixed')][0];
    const bg = document.querySelector('div.fixed.inset-0');
    if (bg) bg.click();
  }, 150);
  return new Promise(r => setTimeout(() => {
    const head = [...document.querySelectorAll('header button')].find(b => b.textContent.trim().startsWith('对比'));
    const n = head.textContent.trim();
    head.click();
    setTimeout(() => r({label: n, dialog: document.body.innerText.includes('至少选两个') || document.body.innerText.includes('对比 2 个对象')}), 350);
  }, 500));
})()`)

// 理解：反驳证据在右栏
out.insightEvidence = await ev(`(() => {
  const bg = document.querySelector('div.fixed.inset-0'); if (bg) bg.click();
  const tab = [...document.querySelectorAll('header button')].find(b => b.textContent.trim().startsWith('理解'));
  tab.click();
  return new Promise(r => setTimeout(() => {
    const row = [...document.querySelectorAll('main button')].find(b => b.textContent.includes('5 月 22 日之后'));
    if (!row) return r('no-insight-row');
    row.click();
    setTimeout(() => {
      const t = document.body.innerText;
      r({ hasContradict: t.includes('反驳它'), hasProvenance: t.includes('谁说的'), hasFeedback: t.includes('不是我') });
    }, 300);
  }, 450));
})()`)

// 证据可点开
out.evidenceDrill = await ev(`(() => {
  const b = [...document.querySelectorAll('aside button, main button')].find(x => x.textContent.includes('repr-view v1：412 行'));
  if (!b) return 'no-evidence-button';
  b.click();
  return new Promise(r => setTimeout(() => r(document.body.innerText.includes('不能证明') && document.body.innerText.includes('局限')), 300));
})()`)

// 回应：否认后行内要变
out.rejectFlow = await ev(`(() => {
  const row = [...document.querySelectorAll('main button')].find(b => b.textContent.includes('5 月 22 日之后'));
  if (row) row.click();
  return new Promise(r => setTimeout(() => {
    const no = [...document.querySelectorAll('aside button')].find(b => b.textContent.trim() === '不是我');
    if (!no) return r('no-reject-button');
    no.click();
    setTimeout(() => r({ marked: document.body.innerText.includes('你否掉的'), stillListed: document.body.innerText.includes('5 月 22 日之后') }), 300);
  }, 350));
})()`)

// 候选：确认
out.candidate = await ev(`(() => {
  const b = [...document.querySelectorAll('main button')].find(x => x.textContent.trim() === '说得对');
  if (!b) return 'no-candidate';
  b.click();
  return new Promise(r => setTimeout(() => r(document.body.innerText.includes('你确认了它')), 300));
})()`)

console.log(JSON.stringify(out, null, 2))
ws.close(); chrome.kill()
