const { sql, bad, j, c, hash, needLeader } = require('../db');

const authed = {
  async state(uid, b = {}) {
    const [u] = await sql`select username from users where id=${uid}`; if (!u) throw bad('Please log in', 401);
    const me = { id: uid, name: u.username };
    const [m] = await sql`select gid from members where user_id=${uid}`; if (!m) return { me, group: null };
    const [g] = await sql`select id,name,leader_id,goal,days from groups where id=${m.gid}`;
    const since = Date.now() - 8 * 864e5;
    const members = await sql`select m.user_id as uid, u.username as name, m.course, coalesce((select json_agg(json_build_object('s', x.s, 'm', x.m) order by x.s) from sessions x where x.user_id=m.user_id and x.s > ${since}), '[]'::json) as sessions, m.pgoal as pg, m.running, m.cheat from members m join users u on u.id=m.user_id where m.gid=${m.gid} order by m.joined_at`;
    const cs = await sql`select to_id, count(*)::int as n from cheers where gid=${m.gid} and at > ${Date.now() - 7 * 864e5} group by to_id`;
    members.forEach(x => { x.cheers = (cs.find(y => y.to_id === x.uid) || {}).n || 0; });
    const nudges = await sql`select id, from_id as "from" from nudges where to_id=${uid} and gid=${m.gid} and not seen`;
    const newCheers = await sql`select id, from_id as "from" from cheers where to_id=${uid} and gid=${m.gid} and not seen`;
    const w0 = Number(b.w0), w1 = Number(b.w1), last = {};
    if (w0 > 0 && w1 > w0 && w1 - w0 <= 8 * 864e5) (await sql`select x.user_id as uid, sum(x.m)::int as m from sessions x join members mm on mm.user_id=x.user_id where mm.gid=${m.gid} and x.s >= ${w0} and x.s < ${w1} group by x.user_id`).forEach(y => { last[y.uid] = y.m; });
    return { me, group: { id: g.id, code: g.id, name: g.name, leaderId: g.leader_id, goal: g.goal, days: g.days }, members, nudges, newCheers, last };
  },
  async create(uid, b) {
    const name = String(b.name || '').trim().slice(0, 50); if (!name) throw bad('Name your group');
    if ((await sql`select 1 from members where user_id=${uid}`).length) throw bad('You are already in a group');
    const code = c.randomBytes(4).toString('hex').slice(0, 6);
    await sql`insert into groups(id,name,leader_id,days) values(${code},${name},${uid},'[0,1,2,3,4]'::jsonb)`;
    await sql`insert into members(user_id,gid) values(${uid},${code})`; return { ok: 1 };
  },
  async join(uid, b) {
    const code = String(b.code || '').trim().toLowerCase();
    if (!(await sql`select 1 from groups where id=${code}`).length) throw bad('No group with that code', 404);
    await sql`insert into members(user_id,gid) values(${uid},${code}) on conflict do nothing`; return { ok: 1 };
  },
  async save(uid, b) {
    const p = b.patch || {}, k = {};
    if ('course' in p) { const x = p.course; k.course = x ? { title: String(x.title || '').slice(0, 80), domain: String(x.domain || '').slice(0, 40), status: x.status === 'complete' ? 'complete' : 'active', ...(Number.isFinite(x.completedAt) ? { completedAt: x.completedAt } : {}) } : null; }
    if ('running' in p) {
      const x = p.running, n = v => (Number.isFinite(+v) ? +v : 0);
      k.running = x && Number.isFinite(x.s) ? { s: x.s, acc: Math.max(0, n(x.acc)), seg: x.seg ? n(x.seg) : null, ...(x.pomo ? { pomo: { w: Math.min(180, Math.max(1, n(x.pomo.w))), b: Math.min(60, Math.max(1, n(x.pomo.b))) }, ph: ['work', 'break', 'ready'].includes(x.ph) ? x.ph : 'work', pt: n(x.pt) } : { pomo: null }) } : null;
    }
    if ('pg' in p) { const t = String((p.pg && p.pg.text) || '').trim().slice(0, 120); k.pg = t ? { text: t } : null; }
    if ('cheat' in p) {
      const x = p.cheat || {}; k.cheatData = null;
      if (x.kind === 'file' && /^data:(image\/[a-z+.-]+|application\/pdf);base64,/.test(String(x.data || '').slice(0, 60)) && x.data.length <= 1.4e6) { k.cheat = { kind: 'file', text: String(x.text || 'file').slice(0, 120), at: Date.now() }; k.cheatData = x.data; }
      else k.cheat = x.kind !== 'file' && String(x.text || '').trim() ? { kind: x.kind === 'link' ? 'link' : 'note', text: String(x.text).slice(0, 4000), at: Date.now() } : null;
    }
    if (k.course && k.course.status === 'complete') {
      const [cur] = await sql`select cheat, course from members where user_id=${uid}`;
      const theCheat = 'cheat' in k ? k.cheat : (cur && cur.cheat);
      if (!theCheat) throw bad('Attach a cheat sheet first');
      if (!(cur && cur.course && cur.course.status === 'complete')) await sql`insert into done_courses(user_id,title,domain,at,cheat_name) values(${uid},${k.course.title},${k.course.domain},${Date.now()},${theCheat.text})`;
    }
    if ('course' in k) await sql`update members set course=${j(k.course)}::jsonb where user_id=${uid}`;
    if ('running' in k) await sql`update members set running=${j(k.running)}::jsonb where user_id=${uid}`;
    if ('pg' in k) await sql`update members set pgoal=${j(k.pg)}::jsonb where user_id=${uid}`;
    if ('cheat' in k) await sql`update members set cheat=${j(k.cheat)}::jsonb, cheat_data=${k.cheatData ?? null} where user_id=${uid}`;
    return { ok: 1 };
  },
  async goal(uid, b) {
    const goal = Math.round(+b.goal), days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter(d => d >= 0 && d <= 6))] : [];
    if (!(goal >= 30 && goal <= 2400) || !days.length) throw bad('Invalid goal');
    const r = await sql`update groups set goal=${goal}, days=${j(days)}::jsonb where id=(select gid from members where user_id=${uid}) and leader_id=${uid} returning id`;
    if (!r.length) throw bad('Only the leader can edit the goal', 403); return { ok: 1 };
  },
  async nudge(uid, b) {
    const to = String(b.to || '');
    const [g] = await sql`select a.gid from members a join members t on t.gid=a.gid where a.user_id=${uid} and t.user_id=${to}`;
    if (!g || to === uid) throw bad('That person is not in your group');
    const id = uid + '_' + to + '_' + new Date().toISOString().slice(0, 10);
    const r = await sql`insert into nudges(id,gid,from_id,to_id,at) values(${id},${g.gid},${uid},${to},${Date.now()}) on conflict do nothing returning id`;
    return { already: !r.length };
  },
  async log(uid, b) {
    const s = Math.round(+b.s), m = Math.round(+b.m);
    if (!(s > 0) || !(m > 0 && m <= 600)) throw bad('Invalid session');
    await sql`insert into sessions(user_id,s,m) values(${uid},${s},${m}) on conflict do nothing`;
    if (b.stop) await sql`update members set running=null where user_id=${uid}`;
    return { ok: 1 };
  },
  async history(uid) {
    const [g] = await sql`select gid from members where user_id=${uid}`; if (!g) return { sessions: [], done: [] };
    const sessions = await sql`select x.user_id as uid, x.s, x.m from sessions x join members m on m.user_id=x.user_id where m.gid=${g.gid} order by x.s limit 50000`;
    const done = await sql`select d.user_id as uid, d.title, d.domain, d.at, d.cheat_name from done_courses d join members m on m.user_id=d.user_id where m.gid=${g.gid} order by d.at desc limit 500`;
    return { sessions, done };
  },
  async passwd(uid, b) {
    const np = String(b.new || ''); if (np.length < 6 || np.length > 100) throw bad('Password must be 6+ characters');
    const [u] = await sql`select salt,hash from users where id=${uid}`;
    if (!u || !c.timingSafeEqual(Buffer.from(hash(String(b.old || ''), u.salt)), Buffer.from(u.hash))) throw bad('Current password is wrong', 403);
    const salt = c.randomBytes(16).toString('hex');
    await sql`update users set salt=${salt}, hash=${hash(np, salt)} where id=${uid}`; return { ok: 1 };
  },
  async resetpw(uid, b) {
    const to = String(b.to || ''); await needLeader(uid, to);
    const temp = c.randomBytes(4).toString('hex'), salt = c.randomBytes(16).toString('hex');
    await sql`update users set salt=${salt}, hash=${hash(temp, salt)} where id=${to}`; return { temp };
  },
  async leave(uid) {
    const [m] = await sql`select m.gid, g.leader_id from members m join groups g on g.id=m.gid where m.user_id=${uid}`; if (!m) return { ok: 1 };
    const [{ n }] = await sql`select count(*)::int as n from members where gid=${m.gid}`;
    if (m.leader_id === uid && n > 1) throw bad('Hand leadership to someone else before leaving');
    await sql`delete from members where user_id=${uid}`;
    if (n === 1) await sql`delete from groups where id=${m.gid}`;
    return { ok: 1 };
  },
  async remove(uid, b) {
    const to = String(b.to || ''); if (to === uid) throw bad('Use Leave group instead'); await needLeader(uid, to);
    await sql`delete from members where user_id=${to}`; return { ok: 1 };
  },
  async promote(uid, b) {
    const to = String(b.to || ''), gid = await needLeader(uid, to);
    await sql`update groups set leader_id=${to} where id=${gid}`; return { ok: 1 };
  },
  async delsession(uid, b) { await sql`delete from sessions where user_id=${uid} and s=${Math.round(+b.s)}`; return { ok: 1 }; },
  async editsession(uid, b) {
    const m = Math.round(+b.m); if (!(m > 0 && m <= 600)) throw bad('Invalid minutes');
    await sql`update sessions set m=${m} where user_id=${uid} and s=${Math.round(+b.s)}`; return { ok: 1 };
  },
  async cheatfile(uid, b) {
    const [r] = await sql`select t.cheat_data as data, t.cheat from members t join members a on a.gid=t.gid where a.user_id=${uid} and t.user_id=${String(b.to || '')}`;
    return { data: (r && r.data) || null, name: (r && r.cheat && r.cheat.text) || '' };
  },
  async cheer(uid, b) {
    const to = String(b.to || '');
    const [g] = await sql`select a.gid from members a join members t on t.gid=a.gid where a.user_id=${uid} and t.user_id=${to}`;
    if (!g || to === uid) throw bad('That person is not in your group');
    const id = uid + '_' + to + '_' + new Date().toISOString().slice(0, 10);
    const r = await sql`insert into cheers(id,gid,from_id,to_id,at) values(${id},${g.gid},${uid},${to},${Date.now()}) on conflict do nothing returning id`;
    return { already: !r.length };
  },
  async seen(uid) {
    await sql`update nudges set seen=true where to_id=${uid}`;
    await sql`update cheers set seen=true where to_id=${uid}`;
    return { ok: 1 };
  },
  async listpdfs(uid) {
    const [m] = await sql`select gid from members where user_id=${uid}`; if (!m) return { pdfs: [] };
    const pdfs = await sql`select p.id, p.title, p.url, p.at, u.username as added_by from pdf_links p join users u on u.id=p.user_id where p.gid=${m.gid} order by p.at desc limit 200`;
    return { pdfs };
  },
  async addpdf(uid, b) {
    const title = String(b.title || '').trim().slice(0, 120); if (!title) throw bad('Title required');
    const url = String(b.url || '').trim(); if (!/^https?:\/\//i.test(url) || url.length > 1000) throw bad('Enter a valid URL');
    const [m] = await sql`select gid from members where user_id=${uid}`; if (!m) throw bad('Join a group first');
    const [row] = await sql`insert into pdf_links(gid,user_id,title,url,at) values(${m.gid},${uid},${title},${url},${Date.now()}) returning id,title,url,at`;
    return { ok: 1, pdf: { ...row, added_by: '' } };
  },
  async delpdf(uid, b) {
    const id = Math.round(+b.id); if (!id) throw bad('Invalid id');
    const [m] = await sql`select gid from members where user_id=${uid}`;
    const [g] = await sql`select leader_id from groups where id=${m && m.gid}`;
    const r = await sql`delete from pdf_links where id=${id} and gid=${m && m.gid} and (user_id=${uid} or ${(g && g.leader_id) === uid}::boolean) returning id`;
    if (!r.length) throw bad('Not found or no permission', 403);
    return { ok: 1 };
  },
};

module.exports = authed;
