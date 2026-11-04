// 从 docs/research/user-trajectory-lab/synthetic-trajectory-data.json 提取原型所需的子集，
// 生成 frontend/src/features/user-trajectory/data/dataset.generated.ts。
//
// 为什么要这一步：原型要的是「可复用同一份合成数据」，但不该把 157KB 的完整数据集
// （含 135 条活动、25 条证据）整个塞进前端包。这里按 id 白名单取一个子集，
// 文字一字不改 —— 生成结果里的每一句都能在数据集里 grep 到。
//
// 用法：node docs/research/user-trajectory-lab/tools/build-prototype-data.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../../../..'); // repo root
const SRC = path.join(ROOT, 'docs/research/user-trajectory-lab/synthetic-trajectory-data.json');
const OUT = path.join(ROOT, 'frontend/src/features/user-trajectory/data/dataset.generated.ts');

const d = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const byId = (arr, id) => {
  const r = arr.find((x) => x.id === id);
  if (!r) throw new Error('missing ' + id);
  return r;
};

const IDS = {
  material: ['mat-01', 'mat-05', 'mat-07', 'mat-12', 'mat-13', 'mat-16', 'mat-19', 'mat-28'],
  experience: ['lx-03', 'lx-04'],
  project: ['prj-01', 'prj-02', 'prj-03', 'prj-06', 'prj-07'],
  artifact: ['out-04', 'out-09', 'out-10', 'out-12'],
  focus: ['foc-01', 'foc-02', 'foc-03', 'foc-04', 'foc-05', 'foc-06', 'foc-07'],
  interest: ['int-01', 'int-02', 'int-03', 'int-04', 'int-06', 'int-07'],
  goal: ['goal-02', 'goal-05', 'goal-07'],
};

const ACTS = {
  'pe-01': ['act-004', 'act-011', 'act-013', 'act-015', 'act-016', 'act-062', 'act-067', 'act-069'],
  'pe-02': ['act-042', 'act-046', 'act-049', 'act-051', 'act-059', 'act-066'],
  'pe-03': ['act-106', 'act-107', 'act-109', 'act-112', 'act-119', 'act-121', 'act-122', 'act-126', 'act-128', 'act-132', 'act-133', 'act-134'],
  'pe-04': ['act-075', 'act-076', 'act-080'],
  'pe-05': ['act-078', 'act-085', 'act-086', 'act-088', 'act-093', 'act-094'],
  standalone: ['act-001', 'act-037', 'act-040', 'act-055', 'act-091', 'act-092', 'act-095', 'act-096', 'act-102', 'act-135'],
};
const ALL_ACTS = [...Object.values(ACTS).flat()];

const EVID = ['ev-03', 'ev-06', 'ev-08', 'ev-10', 'ev-14', 'ev-17', 'ev-18', 'ev-19', 'ev-21', 'ev-22', 'ev-23', 'ev-24', 'ev-25'];
const INS = ['ins-01', 'ins-02', 'ins-04', 'ins-07', 'ins-08', 'ins-11', 'ins-12', 'ins-13'];
const MS = ['ms-01', 'ms-05', 'ms-08', 'ms-09'];

const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const objects = [];
for (const id of IDS.material) {
  const m = byId(d.materials, id);
  objects.push({ id, kind: 'material', title: m.title, sub: m.author, meta: m.type, from: m.started, to: m.last_interaction, status: m.status });
}
for (const id of IDS.experience) {
  const x = byId(d.learning_experiences, id);
  objects.push({ id, kind: 'experience', title: x.title, sub: x.objective, meta: x.origin_type, from: x.started, to: x.ended, status: x.status });
}
for (const id of IDS.project) {
  const p = byId(d.projects, id);
  objects.push({ id, kind: 'project', title: p.title, sub: p.description, meta: p.status, from: p.created, to: p.completed_at || p.archived_at || p.ended || null, status: p.status });
}
for (const id of IDS.artifact) {
  const o = byId(d.outputs, id);
  objects.push({ id, kind: 'artifact', title: o.title, sub: o.note || '', meta: o.type, from: o.created, to: o.updated || null, status: o.status });
}
for (const id of IDS.focus) {
  const f = byId(d.focus, id);
  objects.push({ id, kind: 'focus', title: f.label, sub: f.framing, meta: f.status, from: f.from, to: f.to, status: f.status });
}
for (const id of IDS.interest) {
  const i = byId(d.interests, id);
  objects.push({ id, kind: 'interest', title: i.name, sub: i.origin, meta: i.current_relevance, from: i.first_observed, to: null, status: i.current_relevance + (i.confirmed_by_user ? '' : ' · 未确认') });
}
for (const id of IDS.goal) {
  const g = byId(d.goals, id);
  objects.push({ id, kind: 'goal', title: g.statement, sub: g.type, meta: g.status, from: g.stated_at, to: g.deadline || null, status: g.status });
}

const TYPE_TO_KIND = {
  reading: 'learning', watching: 'learning', discussion: 'learning', note: 'reflection', reflecting: 'reflection',
  problem: 'research', experiment: 'research', research: 'research', coding: 'creation', creating: 'creation',
};

const parentOf = {};
for (const [pid, list] of Object.entries(ACTS)) for (const a of list) parentOf[a] = pid === 'standalone' ? null : pid;

const events = ALL_ACTS.map((id) => {
  const a = byId(d.activities, id);
  return {
    id,
    parentId: parentOf[id] ?? null,
    kind: TYPE_TO_KIND[a.type] || 'learning',
    type: a.type,
    date: a.ts.slice(0, 10),
    time: a.ts.slice(11, 16),
    title: a.desc,
    detail: a.note || '',
    objectIds: (a.objects || []).filter((o) => objects.some((x) => x.id === o)),
    focusIds: a.focus || [],
    evidenceIds: a.evidence || [],
    origin: 'observed',
  };
});

// 转变（direction）
const transitions = [
  { id: 'tr-goal-02', parentId: null, kind: 'direction', type: 'abandon', date: '2026-04-20', time: '', title: '放弃「三月前用 Rust 写一个能用的命令行工具」', detail: '截止日过了 20 天才承认。他写的理由是「我其实不需要它」。', objectIds: ['goal-02', 'prj-03'], focusIds: ['foc-06'], evidenceIds: ['ev-16'], origin: 'observed' },
  { id: 'tr-int-07', parentId: null, kind: 'direction', type: 'retire', date: '2026-09-02', time: '', title: '不再把自己当作「Rust 工程师」', detail: '被否的是那个身份框，不是「他学过 Rust」。', objectIds: ['int-07'], focusIds: ['foc-06'], evidenceIds: [], origin: 'observed' },
  { id: 'tr-prj-01', parentId: null, kind: 'direction', type: 'archive', date: '2026-05-26', time: '', title: 'recon-lab 冻结，README 写「暂停，不是放弃」', detail: '6-22 系统据此判为已停止，6-24 用户更正。', objectIds: ['prj-01'], focusIds: ['foc-01'], evidenceIds: [], origin: 'observed' },
  { id: 'tr-goal-05', parentId: null, kind: 'direction', type: 'abandon', date: '2026-09-01', time: '', title: '关掉「投一篇 workshop」这个目标', detail: '项目 5 月就死了，目标拖了 97 天才关。', objectIds: ['goal-05'], focusIds: ['foc-01'], evidenceIds: [], origin: 'observed' },
  { id: 'tr-foc-03', parentId: null, kind: 'direction', type: 'absorb', date: '2026-05-24', time: '', title: '「意识一手文献」并入「表征」这条线', detail: '被吸收不等于失败；名下 10 条活动一条也没有迁移。', objectIds: ['foc-03', 'foc-02'], focusIds: ['foc-03'], evidenceIds: [], origin: 'observed' },
];
const milestones = MS.map((id) => {
  const m = byId(d.milestones, id);
  return { id, parentId: null, kind: 'milestone', type: 'milestone', date: m.date, time: '', title: m.title, detail: m.note || '', objectIds: [m.project].filter(Boolean), focusIds: [], evidenceIds: m.evidence || [], origin: 'observed' };
});

const EV_KIND = {
  correctness: 'performance', error_pattern: 'performance', self_test: 'performance',
  explanation: 'reasoning', independent_reasoning: 'reasoning', transfer: 'reasoning', external_critique: 'reasoning',
  project_based: 'artifact', process: 'behavioral', conversation: 'behavioral', self_report: 'self-report',
  judgement_pending: 'reasoning', output_attempt: 'artifact',
};
const evidence = EVID.map((id) => {
  const e = byId(d.evidence, id);
  return {
    id,
    kind: EV_KIND[e.kind] || 'behavioral',
    rawKind: e.kind,
    date: e.ts.slice(0, 10),
    observed: e.observed,
    verdict: e.verdict,
    supports: e.supports,
    notSupport: e.does_not_support || '',
    limitation: e.limitations || '',
    confidence: e.confidence,
    by: e.provenance?.asserted_by || 'agent',
    activityId: e.activity || null,
  };
});

const relFor = (insId) => d.evidence_relations.filter((r) => r.insight === insId);
const interpretations = INS.map((id) => {
  const i = byId(d.insights, id);
  const rels = relFor(id);
  const pick = (t) => rels.filter((r) => r.relation === t).map((r) => r.evidence);
  return {
    id,
    epistemic: i.origin === 'user' ? 'confirmed' : 'interpretation',
    assertedBy: i.origin === 'user' ? 'user' : 'system',
    date: i.ts.slice(0, 10),
    statement: i.content,
    confidence: i.confidence || null,
    status: i.user_status,
    supports: pick('supports').concat((i.related_evidence || []).filter((e) => !rels.some((r) => r.evidence === e))),
    contradicts: pick('contradicts'),
    qualifies: pick('qualifies'),
    weakens: pick('weakens'),
    objectIds: (i.related_objects || []).filter((o) => objects.some((x) => x.id === o)),
    eventIds: (i.related_activities || []).filter((a) => ALL_ACTS.includes(a)),
    basis: i.confidence_basis || '',
    note: i.note || '',
    effectiveFrom: i.effective_from || i.ts.slice(0, 10),
    effectiveTo: i.effective_to || null,
    reinterpretedAt: i.reinterpreted_at ? i.reinterpreted_at.slice(0, 10) : null,
    reinterpretation: i.reinterpretation || '',
  };
});

// 用户自述：按分类规范属于「解释」而不是证据（hypothesis）
const claim = byId(d.evidence, 'ev-18');
interpretations.push({
  id: 'ev-18',
  epistemic: 'hypothesis',
  assertedBy: 'user',
  date: claim.ts.slice(0, 10),
  statement: claim.observed.replace(/^用户说：/, '').replace(/^"|"$/g, ''),
  confidence: null,
  status: 'unreviewed',
  supports: [],
  contradicts: [],
  qualifies: [],
  weakens: [],
  objectIds: ['mat-12', 'mat-13'],
  eventIds: [],
  basis: '',
  note: '他自己说的，没有任何检验。唯一一次可查的检验是 ev-21，结果不确定。',
  effectiveFrom: claim.ts.slice(0, 10),
  effectiveTo: null,
  reinterpretedAt: null,
  reinterpretation: '',
});

const out = `// ⚠️ 生成文件，不要手改。来源：docs/research/user-trajectory-lab/synthetic-trajectory-data.json（v0.2）
// 重新生成：node docs/research/user-trajectory-lab/tools/build-prototype-data.mjs
// 文字与数据集一字不改；这里只做了按 id 取子集 + 字段改名。
import type { DevEvent, DevObject, EvidenceRec, InterpretationRec } from '../types'

export const OBJECTS: DevObject[] = ${JSON.stringify(objects, null, 2)}

export const EVENTS: DevEvent[] = ${JSON.stringify([...events, ...transitions, ...milestones], null, 2)}

export const EVIDENCE: EvidenceRec[] = ${JSON.stringify(evidence, null, 2)}

export const INTERPRETATIONS: InterpretationRec[] = ${JSON.stringify(interpretations, null, 2)}
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');
console.log('wrote', OUT, '\nobjects', objects.length, 'events', events.length + transitions.length + milestones.length, 'evidence', evidence.length, 'interps', interpretations.length);
