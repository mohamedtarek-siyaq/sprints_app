const { init, SECRET, who, bad } = require('./db');
const open = require('./handlers/open');
const authed = require('./handlers/authed');

let ready;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SECRET || !process.env.DATABASE_URL) return res.status(500).json({ error: 'Server not configured: set DATABASE_URL and SESSION_SECRET' });
  try {
    if (!ready) { await init(); ready = true; }
    const b = req.body || {};
    if (open[b.a]) return res.json(await open[b.a](b, res));
    const uid = who(req); if (!uid) return res.status(401).json({ error: 'Please log in' });
    if (!authed[b.a]) throw bad('Unknown action');
    res.json(await authed[b.a](uid, b));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    ready = null; console.error(e); res.status(500).json({ error: 'Server error' });
  }
};
