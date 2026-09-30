const test = require('node:test'), assert = require('node:assert'), Module = require('module');
let respond = () => [];
const orig = Module._load;
Module._load = function (r, ...a) { if (r === '@neondatabase/serverless') return { neon: () => async (q, ...v) => respond(q.join('?').replace(/\s+/g, ' '), v) }; return orig.call(this, r, ...a); };
process.env.DATABASE_URL = 'x'; process.env.SESSION_SECRET = 'test-secret';
const handler = require('../api/rpc.js');
const call = async (b, cookie = '') => { const r = { hdr: {} }; await handler({ method: 'POST', body: b, headers: { cookie } }, { setHeader: (k, v) => { r.hdr[k] = v; }, status(c) { r.code = c; return this; }, json(x) { r.out = x; r.code = r.code || 200; } }); return r; };
const session = async () => { respond = q => (q.includes('insert into users') ? [{ id: 'u1' }] : []); const r = await call({ a: 'signup', username: 'sara', password: 'secret1' }); return r.hdr['Set-Cookie'].split(';')[0]; };

test('requests without a login cookie are rejected', async () => { assert.equal((await call({ a: 'state' })).code, 401); });
test('a tampered cookie is rejected', async () => { const ck = await session(); assert.equal((await call({ a: 'state' }, ck.slice(0, -2) + 'zz')).code, 401); });
test('signup validates username and password', async () => { assert.equal((await call({ a: 'signup', username: 'a', password: 'x' })).code, 400); });
test('login is rate limited after 5 failed attempts', async () => { respond = q => (q.includes('from attempts') ? [{ n: 5 }] : []); assert.equal((await call({ a: 'login', username: 'sara', password: 'secret1' })).code, 429); });
test('only the leader can edit the goal', async () => { const ck = await session(); respond = () => []; assert.equal((await call({ a: 'goal', goal: 120, days: [0, 1, 2, 3, 4] }, ck)).code, 403); });
test('only the leader can remove, promote or reset passwords', async () => { const ck = await session(); respond = () => []; for (const a of ['remove', 'promote', 'resetpw']) assert.equal((await call({ a, to: 'u2' }, ck)).code, 403, a); });
test('a course cannot be completed without a cheat sheet', async () => { const ck = await session(); respond = q => (q.includes('select cheat, course') ? [{ cheat: null, course: null }] : []); assert.equal((await call({ a: 'save', patch: { course: { title: 'SQL', status: 'complete' } } }, ck)).code, 400); });
test('nudge and cheer only work inside your group', async () => { const ck = await session(); respond = () => []; for (const a of ['nudge', 'cheer']) assert.equal((await call({ a, to: 'stranger' }, ck)).code, 400, a); });
test('invalid session lengths are rejected', async () => { const ck = await session(); assert.equal((await call({ a: 'log', s: Date.now(), m: 9999 }, ck)).code, 400); assert.equal((await call({ a: 'editsession', s: 1, m: 0 }, ck)).code, 400); });
test('oversized or non-file cheat data is not stored as a file', async () => {
  const ck = await session(); const stored = []; respond = (q, v) => { if (q.includes('update members set cheat=')) stored.push(v); return q.includes('select cheat, course') ? [{ cheat: null, course: null }] : []; };
  await call({ a: 'save', patch: { cheat: { kind: 'file', text: 'x', data: 'javascript:alert(1)' } } }, ck);
  assert.equal(stored[0][0], 'null');
});
