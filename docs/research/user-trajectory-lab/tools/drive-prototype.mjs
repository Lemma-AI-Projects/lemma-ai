// 用 CDP 驱动真浏览器跑一遍重做后的关键交互。
// 只读 DOM + 发事件，不截图（截图走 Chrome CLI）。
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PROFILE = 'D:/github projects/lemma-ai/.worktrees/main-v3/.logs/chrome-cdp2'
const BASE = 'http://localhost:5173/preview/user-trajectory'

const chrome = spawn(
  CHROME,
  ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9334', `--user-data-dir=${PROFILE}`, '--window-size=1440,1000', 'about:blank'],
  { stdio: 'ignore' },
)

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9334/json/list')).json()
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
ws.onmessage = (evd) => {
  const m = JSON.parse(evd.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
}
const send = (method, params = {}) => {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((r) => pending.set(mid, r))
}
async function ev(expr) {
  const resp = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (resp.result?.exceptionDetails) return 'ERR: ' + JSON.stringify(resp.result.exceptionDetails).slice(0, 260)
  return resp.result?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')

const out = {}
const log = (k, v) => {
  out[k] = v
  console.log(String(k).padEnd(22), typeof v === 'object' ? JSON.stringify(v) : v)
}

// ── 概览 ───────────────────────────────────────────────
await send('Page.navigate', { url: BASE })
await sleep(6500)

log('mounted', await ev(`document.body.innerText.includes('陈知远')`))
log('sections', await ev(`(() => { const t = document.body.innerText; return { discovery: t.includes('发现'), territory: t.includes('这一年'), noDashboard: !/完成率|打卡|连续 d+ 天|本周目标/.test(t) }; })()`))
log('chrome_count', await ev(`document.querySelectorAll('header *').length`))

// 1) 打开一条发现 → 应切到对应视角并选中
log('discovery', await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(b => b.innerText.trim().startsWith('走下去'));
  if (!b) return 'NO_BUTTON';
  b.click();
  return new Promise(r => setTimeout(() => {
    const active = [...document.querySelectorAll('header nav button')].find(b => b.querySelector('span.bg-zinc-900'));
    r({ view: active?.innerText, panel: !!document.querySelector('aside'), panelText: document.querySelector('aside')?.innerText.slice(0, 40) });
  }, 400));
})()`))

// 2) 选中一个对象 → 右栏出现；输入法无关
await send('Page.navigate', { url: `${BASE}?view=timeline` })
await sleep(2200)
log('select_row', await ev(`(() => {
  const rows = [...document.querySelectorAll('main button')];
  const r = rows.find(b => b.innerText.includes('开始读 Axler'));
  if (!r) return 'NO_ROW';
  r.click();
  return new Promise(res => setTimeout(() => res({ panel: !!document.querySelector('aside'), head: document.querySelector('aside')?.innerText.split('\\n').slice(0, 3) }), 350));
})()`))

// 3) 展开父事件
log('expand_parent', await ev(`(() => {
  const before = document.querySelectorAll('main button[aria-label="收起"]').length;
  const chev = document.querySelector('main button[aria-label="展开"]');
  if (!chev) return 'NO_CHEVRON';
  chev.click();
  return new Promise(res => setTimeout(() => {
    const open = document.querySelectorAll('main button[aria-label="收起"]').length;
    const child = [...document.querySelectorAll('main button')].some(b => b.innerText.includes('开始读 Axler'));
    res({ before, open, childVisible: child });
  }, 300));
})()`))

// 4) 跨视角保留选中 + Esc 关闭
log('cross_view', await ev(`(() => {
  const nav = [...document.querySelectorAll('header nav button')];
  const explore = nav.find(b => b.innerText.trim() === '探索');
  explore.click();
  return new Promise(r => setTimeout(() => r({ view: 'explore', panelKept: !!document.querySelector('aside') }), 350));
})()`))
log('esc_close', await ev(`(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return new Promise(r => setTimeout(() => r({ panelClosed: !document.querySelector('aside') }), 300));
})()`))

// 5) 探索：连接块 + 走过去
await send('Page.navigate', { url: `${BASE}?view=explore&sel=mat-19` })
await sleep(2200)
log('explore', await ev(`(() => {
  const t = document.body.innerText;
  const hop = [...document.querySelectorAll('main button')].find(b => b.innerText.trim() === '走过去');
  const before = t.includes('repr-view');
  hop?.click();
  return new Promise(r => setTimeout(() => r({ hasConn: before, hoppedTo: document.querySelector('main h2')?.innerText }), 300));
})()`))

// 6) 无选中时的起点
await send('Page.navigate', { url: `${BASE}?view=explore` })
await sleep(2000)
log('explore_start', await ev(`(() => ({ starts: document.querySelectorAll('main button').length, text: document.body.innerText.includes('从这几处开始') }))()`))

// 7) 理解：驳论分组展开 + 回应
await send('Page.navigate', { url: `${BASE}?view=insights&sel=ins-13` })
await sleep(2200)
log('insight_panel', await ev(`(() => {
  const a = document.querySelector('aside');
  const t = a?.innerText ?? '';
  return { hasContradict: t.includes('反驳它'), hasSupports: t.includes('支撑它'), hasEffect: t.includes('生效'), canRespond: t.includes('不是我') };
})()`))
log('respond', await ev(`(() => {
  const b = [...document.querySelectorAll('aside button')].find(b => b.innerText.trim() === '不是我');
  if (!b) return 'NO_BTN';
  b.click();
  return new Promise(r => setTimeout(() => r({ said: document.querySelector('aside')?.innerText.includes('你的回应') }), 300));
})()`))

// 8) 候选：点进右栏再处理
log('candidate', await ev(`(() => {
  const row = [...document.querySelectorAll('main button')].find(b => b.innerText.includes('外部截止日期之前'));
  if (!row) return 'NO_ROW';
  row.click();
  return new Promise(r => setTimeout(() => {
    const t = document.querySelector('aside')?.innerText ?? '';
    const btn = [...document.querySelectorAll('aside button')].find(b => b.innerText.trim() === '说得对');
    btn?.click();
    setTimeout(() => r({ inPanel: t.includes('攒它的记录'), hadActions: !!btn, flash: document.querySelector('header')?.innerText.includes('已记成') }), 300);
  }, 350));
})()`))

// 9) 暂存 → 面板 → 并排
await send('Page.navigate', { url: `${BASE}?view=timeline&sel=act-112` })
await sleep(2200)
log('save', await ev(`(() => {
  const b = [...document.querySelectorAll('aside button')].find(b => b.innerText.trim() === '暂存');
  b?.click();
  return new Promise(r => setTimeout(() => {
    const head = document.querySelector('header')?.innerText ?? '';
    r({ saved: head.includes('1'), flash: head.includes('已放进暂存') });
  }, 300));
})()`))
log('sheet', await ev(`(() => {
  const b = [...document.querySelectorAll('header button')].find(b => b.innerText.includes('暂存'));
  b.click();
  return new Promise(r => setTimeout(() => {
    const s = [...document.querySelectorAll('aside')].pop();
    r({ open: !!s && s.innerText.includes('提出为理解'), text: s?.innerText.slice(0, 60) });
  }, 300));
})()`))
log('compare_gate', await ev(`(() => {
  const t = document.body.innerText;
  return { hint: t.includes('存 2 个对象才能并排') };
})()`))

// 10) Esc 关面板
log('esc_sheet', await ev(`(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return new Promise(r => setTimeout(() => r({ closed: !document.body.innerText.includes('存两个以上的对象才能并排') }), 300));
})()`))

// 11) 搜索
await send('Page.navigate', { url: `${BASE}?view=explore` })
await sleep(2000)
log('search', await ev(`(() => {
  const i = document.querySelector('main input');
  if (!i) return 'NO_INPUT';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, 'NeRF');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return new Promise(r => setTimeout(() => {
    const rows = [...document.querySelectorAll('main button')].filter(b => b.innerText.includes('NeRF'));
    r({ hits: rows.length, first: rows[0]?.innerText.slice(0, 30) });
  }, 350));
})()`))

// 12) 深链 + 窄屏不塌
await send('Page.navigate', { url: `${BASE}?view=insights&sel=ins-13` })
await sleep(2000)
log('deep_link', await ev(`(() => {
  const a = document.querySelector('aside');
  const main = document.querySelector('main');
  const r = main.getBoundingClientRect();
  return { panel: !!a, panelW: a?.getBoundingClientRect().width, mainW: Math.round(r.width), overflowX: document.documentElement.scrollWidth > window.innerWidth };
})()`))

console.log('\n--- JSON ---')
console.log(JSON.stringify(out, null, 1))
ws.close()
chrome.kill()
