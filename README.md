# Cohort — deploy on Vercel (about 5 minutes)

Files: `public/index.html` (the app), `api/rpc.js` (the server), `package.json`.

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project →** import the repo (Framework: *Other*, no build command).
3. In the Vercel project: **Storage → Create → Neon (Postgres)**. This adds `DATABASE_URL` automatically.
4. **Settings → Environment Variables**: add `SESSION_SECRET` = any long random string (e.g. `openssl rand -hex 32`).
5. **Redeploy**, open the URL, sign up, create a group, share the invite code.

**Run locally:** `npm install`, copy `.env.example` to `.env.local` and fill it in, then `npx vercel dev`.

Tables are created automatically on the first request. No other setup.

**Behaviour:** username + password login (no email). Everyone sees live progress (refreshes every 8s and when the tab regains focus). Leader-only goal edits, own-data-only writes and the cheat-sheet completion gate are enforced on the server.

**Work week:** Sunday–Thursday by default (the week starts on Sunday). The leader can change the working days with **Edit goal**.

**History:** every study session is stored permanently; the **History** button shows weekly totals per person (all time) and completed courses.

**Timer:** free timer with ⏸ Break / Resume, or 🍅 Pomodoro (25/5, 50/10, 90/15 focus/break minutes). Breaks are never counted as study time.

**Motivation:** 🏆 Board ranks the team by points (1 per minute, +60 per week the goal is met, +100 per completed course, with weekly and all-time views and streaks). Everyone can set a 🎯 personal goal that teammates see and 👏 cheer (once per person per day).

**Accounts & groups:** login attempts are limited (5 wrong tries = 10 min wait). ⚙ Settings has Change password, Export my data (CSV) and Leave group. The leader can also make someone else leader, remove a member, or issue a temporary password.

**Data:** edit or delete your own sessions under History, see a 12-week chart, and a Last week recap on the Team screen. Cheat sheets can be a note, a link, a photo or a PDF (up to 1 MB, stored in the database).

**Install as an app:** open the site on your phone and choose *Add to Home Screen*.

**Tests:** `npm test` (logic and API checks; no database needed).

**Not included yet (needs extra services):** push notifications when the app is closed, instant (non-polling) updates, Arabic/right-to-left, more than one group per person.
