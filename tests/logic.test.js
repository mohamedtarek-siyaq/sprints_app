const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
const grab = (a, b) => js.slice(js.indexOf(a), js.indexOf(b));
const MIN = 6e4, T0 = 1e12;

test('Pomodoro: break time is never credited and idle time after a break is not counted', () => {
  const { adv, studied } = new Function(grab('const adv=', 'function runLabel') + ';return{adv,studied}')();
  const r = { s: T0, acc: 0, seg: T0, pomo: { w: 25, b: 5 }, ph: 'work', pt: T0 };
  const at = m => adv(r, T0 + m * MIN), mins = (q, m) => Math.round(studied(q, T0 + m * MIN) / MIN);
  assert.equal(at(10).ph, 'work');
  assert.equal(mins(at(10), 10), 10);
  assert.equal(at(26).ph, 'break');
  assert.equal(mins(at(26), 26), 25);
  assert.equal(at(31).ph, 'ready');
  assert.equal(mins(at(300), 300), 25);
});

test('Free timer: pause and resume excludes the break', () => {
  const { studied } = new Function(grab('const adv=', 'function runLabel') + ';return{studied}')();
  const paused = { acc: 20 * MIN, seg: null }, resumed = { acc: 20 * MIN, seg: T0 + 50 * MIN };
  assert.equal(Math.round(studied(paused, T0 + 40 * MIN) / MIN), 20);
  assert.equal(Math.round(studied(resumed, T0 + 80 * MIN) / MIN), 50);
});

test('Pace rule for a Sun–Thu week with a 2h goal', () => {
  const RealDate = Date, days = ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
  const expectZero = ['ok', 'behind', 'behind', 'behind', 'behind', 'behind'];
  const expect60 = ['ok', 'ok', 'ok', 'behind', 'behind', 'behind'];
  const G = { goal: 120, days: [0, 1, 2, 3, 4] };
  try {
    days.forEach((d, i) => {
      global.Date = class extends RealDate { constructor(...x) { super(...(x.length ? x : [d + 'T12:00:00'])); } static now() { return new RealDate(d + 'T12:00:00').getTime(); } };
      const f = new Function('G', 'WS', grab('function wk()', 'function nm(') + ';return{stats}')(G, 0);
      assert.equal(f.stats({ sessions: [] }).st, expectZero[i], 'zero minutes on day ' + i);
      assert.equal(f.stats({ sessions: [{ s: new global.Date(d + 'T09:00:00').getTime(), m: 60 }] }).st, expect60[i], '60 minutes on day ' + i);
    });
  } finally { global.Date = RealDate; }
});
