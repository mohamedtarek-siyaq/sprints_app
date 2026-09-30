// Cohort API — one serverless function, Postgres via Neon. Auth: username + password, signed cookie.
const { neon } = require('@neondatabase/serverless');
const c = require('crypto');
const sql = neon(process.env.DATABASE_URL || 'postgres://x');
const SECRET = process.env.SESSION_SECRET || '';
const bad = (m, status = 400) => Object.assign(new Error(m), { status });
const j = v => JSON.stringify(v ?? null);

let ready;
const init = () => ready || (ready = (async () => {
  await sql`create table if not exists users(id text primary key, username text unique not null, salt text not null, hash text not null)`;
  await sql`create table if not exists groups(id text primary key, name text not null, leader_id text not null, goal int not null default 120, days jsonb not null default '[0,1,2,3,4]')`;
  await sql`create table if not exists members(user_id text primary key, gid text not null, course jsonb, running jsonb, cheat jsonb, joined_at timestamptz not null default now())`;
  await sql`create table if not exists sessions(user_id text not null, s bigint not null, m int not null, primary key(user_id, s))`;
  await sql`create table if not exists done_courses(id bigserial primary key, user_id text not null, title text not null, domain text, at bigint not null)`;
  await sql`alter table members add column if not exists pgoal jsonb`;
  await sql`alter table members add column if not exists courses jsonb default '[]'::jsonb`;
  await sql`alter table members add column if not exists cheat_data text`;
  await sql`alter table done_courses add column if not exists cheat_name text`;
  await sql`create table if not exists attempts(username text not null, at bigint not null)`;
  await sql`create table if not exists cheers(id text primary key, gid text not null, from_id text not null, to_id text not null, at bigint not null)`;
  await sql`alter table cheers add column if not exists seen boolean not null default false`;
  await sql`create table if not exists nudges(id text primary key, gid text not null, from_id text not null, to_id text not null, at bigint not null, seen boolean not null default false)`;
  await sql`create table if not exists pdf_links(id bigserial primary key, gid text not null, user_id text not null, title text not null, url text not null, at bigint not null)`;
})());

const sign = s => c.createHmac('sha256', SECRET).update(s).digest('hex');
const token = uid => { const b = uid + '.' + (Date.now() + 2592e6); return b + '.' + sign(b); };
const setCookie = (res, v, age) => res.setHeader('Set-Cookie', `s=${v}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`);
function who(req) {
  const m = /(?:^|; )s=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return null;
  const [u, e, g] = m[1].split('.'); if (!g || !(+e > Date.now())) return null;
  const a = Buffer.from(sign(u + '.' + e)), z = Buffer.from(g);
  return a.length === z.length && c.timingSafeEqual(a, z) ? u : null;
}
const hash = (pw, salt) => c.scryptSync(pw, salt, 32).toString('hex');
const cred = b => {
  const username = String(b.username || '').trim().toLowerCase(), password = String(b.password || '');
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) throw bad('Username: 3–24 letters, numbers, . _ -');
  if (password.length < 6 || password.length > 100) throw bad('Password must be 6+ characters');
  return { username, password };
};

async function needLeader(uid, target) {
  const [r] = await sql`select g.id from groups g join members me on me.gid=g.id join members t on t.gid=g.id where g.leader_id=${uid} and me.user_id=${uid} and t.user_id=${target}`;
  if (!r) throw bad('Only the leader can do that', 403); return r.id;
}

module.exports = { neon, c, sql, SECRET, bad, j, init, sign, token, setCookie, who, hash, cred, needLeader };
