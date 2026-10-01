const { sql, bad, hash, cred, c, setCookie, token } = require('../db');

const open = {
  async signup(b, res) {
    const { username, password } = cred(b), id = c.randomUUID(), salt = c.randomBytes(16).toString('hex');
    const rows = await sql`select count(*)::int as n from users`;
    const n = Number((rows && rows[0] && (rows[0].n ?? rows[0].count ?? rows[0].N ?? rows[0].COUNT)) ?? 0);
    const autoAdmin = n === 0;
    const cols = ['id','username','salt','hash']; const vals = [id,username,salt,hash(password, salt)];
    if (autoAdmin) { cols.push('admin'); vals.push(true); }
    const r = await sql`insert into users${sql('('+cols.join(',')+')')} values${sql([vals])} on conflict do nothing returning id`;
    if (!r.length) throw bad('That username is taken', 409);
    setCookie(res, token(id), 2592000); return { ok: 1, admin: autoAdmin };
  },
  async login(b, res) {
    const { username, password } = cred(b);
    const [f] = await sql`select count(*)::int as n from attempts where username=${username} and at > ${Date.now() - 6e5}`;
    if (f && f.n >= 5) throw bad('Too many attempts — wait 10 minutes and try again', 429);
    const [u] = await sql`select id,salt,hash from users where username=${username}`;
    if (!u || !c.timingSafeEqual(Buffer.from(hash(password, u.salt)), Buffer.from(u.hash))) {
      await sql`insert into attempts(username,at) values(${username},${Date.now()})`;
      throw bad('Wrong username or password', 401);
    }
    await sql`delete from attempts where username=${username}`;
    setCookie(res, token(u.id), 2592000); return { ok: 1 };
  },
  async logout(b, res) { setCookie(res, '', 0); return { ok: 1 }; },
};

module.exports = open;
