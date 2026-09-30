const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
// Minimal fake DOM, just enough to run the real page script and inspect what it renders
function El(t) { return { nodeType: 1, t, value: '', ch: [], at: {}, ev: {}, style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false },
  append(...k) { this.ch.push(...k); }, replaceChildren(...k) { this.ch = k; }, setAttribute(n, v) { this.at[n] = v; }, addEventListener(n, f) { this.ev[n] = f; },
  querySelector: () => ({ style: {}, focus() {} }), querySelectorAll: () => [], contains: () => false, focus() {}, remove() {},
  set innerHTML(v) { this.html = v; }, set className(v) { this.cn = v; }, set textContent(v) { this.ch = [String(v)]; } }; }
const txt = e => (e == null || typeof e === 'boolean' ? String(e) : typeof e === 'string' ? e : (e.ch || []).map(txt).join(' ') + (e.html ? ' [svg]' : ''));
const find = (e, f, o = []) => { if (!e || typeof e === 'string' || !e.ch) return o; if (f(e)) o.push(e); e.ch.forEach(c => find(c, f, o)); return o; };
const els = { '#app': El('d'), '#modal': El('d'), '#toast': El('d') };
Object.assign(global, { document: { createElement: El, createTextNode: String, querySelector: s => els[s], querySelectorAll: () => [], documentElement: { dataset: {} }, addEventListener() {}, body: El('body'), hidden: false },
  requestAnimationFrame: f => f(), matchMedia: () => ({ matches: false }), localStorage: { getItem() {}, setItem() {} }, confirm: () => true, setInterval: () => 0, clearInterval() {} });
Object.defineProperty(global, 'navigator', { value: {}, configurable: true });
const now = Date.now(), calls = []; let fail = false;
const mem = (uid, name, x) => ({ uid, name, course: { title: 'SQL', domain: 'Data', status: 'active' }, sessions: [], running: null, cheat: null, pg: null, cheers: 0, ...x });
const state = { me: { id: 'u1', name: 'sara' }, group: { id: 'abc123', code: 'abc123', name: 'Team', leaderId: 'u1', goal: 120, days: [0, 1, 2, 3, 4] },
  members: [mem('u1', 'sara', { sessions: [{ s: now - 36e5, m: 45 }], pg: { text: 'Finish SQL' } }), mem('u2', 'omar', { running: { s: now - 6e5, acc: 6e5, seg: null, pomo: { w: 25, b: 5 }, ph: 'break', pt: now - 1e5 }, cheers: 2 })], nudges: [], last: { u1: 130, u2: 60 } };
const hist = { sessions: [{ uid: 'u1', s: String(now - 36e5), m: 45 }, { uid: 'u2', s: String(now - 8 * 864e5), m: 200 }], done: [{ uid: 'u2', title: 'Excel', domain: '', at: String(now - 864e5) }] };
global.fetch = async (u, o) => { const b = JSON.parse(o.body); if (fail) throw new Error('offline'); calls.push(b); return { ok: true, status: 200, json: async () => (b.a === 'state' ? state : b.a === 'history' ? hist : { ok: 1 }) }; };
const wait = () => new Promise(r => setTimeout(r, 15));
const app = () => { const a = txt(els['#app']); const m = a.match(/\b(false|null|undefined)\b/); assert.ok(!m, 'stray value rendered on screen: ' + (m && m[0])); return a; }, modal = () => txt(els['#modal']), toastText = () => txt(els['#toast']);
const click = async (label, root = els['#app']) => { const b = find(root, e => e.t === 'button' && (txt(e).includes(label) || e.at['aria-label'] === label))[0]; assert.ok(b, 'button not found: ' + label); await b.ev.click(); await wait(); };
let page;
test('boots and shows the team dashboard', async () => {
  page = new Function(js + ';return{refresh}')(); await wait();
  const a = app();
  for (const want of ['Team', 'sara (you)', 'omar', 'Last week', '☕ break', '🎯 Finish SQL', '👏 2', '▶ Start timer', '🍅 Pomodoro']) assert.ok(a.includes(want), 'missing: ' + want);
});
test('leaderboard renders points, medals and the scoring note', async () => {
  await click('Board'); const a = app();
  for (const want of ['pts', '🥇', 'Points:', 'best week']) assert.ok(a.includes(want), 'missing: ' + want);
});
test('history renders chart, weekly totals, my sessions and completed courses', async () => {
  await click('History'); const a = app();
  for (const want of ['My last 12 weeks', '[svg]', 'Weekly totals', 'My recent sessions', 'Completed courses', 'Excel']) assert.ok(a.includes(want), 'missing: ' + want);
});
test('settings shows leader tools', async () => {
  await click('Team'); await click('Settings'); const m = modal();
  for (const want of ['Change password', 'Export my data', 'Leave group', 'Members', 'omar', 'Make leader', 'Reset password', 'Remove']) assert.ok(m.includes(want), 'missing: ' + want);
  await click('Close', els['#modal']);
});
test('starting and stopping the timer talks to the server', async () => {
  await click('Start timer'); assert.ok(app().includes('studying now'));
  assert.ok(calls.some(c => c.a === 'save' && c.patch.running && c.patch.running.seg));
  await click('Stop & log'); assert.ok(calls.filter(c => c.a === 'save').length >= 2);
});
test('a lost connection shows a message and recovers', async () => {
  fail = true; await page.refresh(); assert.ok(toastText().includes('Connection problem'));
  fail = false; await page.refresh(); assert.ok(toastText().includes('Back online'));
});
