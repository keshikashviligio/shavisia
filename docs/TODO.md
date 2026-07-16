# TODO — shavisia.ge (updated 2026-07-16)

## Current state

Everything in `PLAN.md` is built, smoke-tested, and committed (initial commit `80c5209`):
site (search / add / OTP auth / account area), PayPro API v1 + webhooks,
`migrate-paypro.ts` (MySQL, verified against a seeded test DB), smsoffice.ge SMS
integration (dev mode works without a key), Docker + GitHub Actions deploy for a
DigitalOcean droplet (`docs/DEPLOY.md`). Local dev: `docker compose up -d` + `npm run dev`.

## Kesho (things only you can do)

- [x] Create the GitHub repo and push `main` (github.com/keshikashviligio/shavisia)
- [x] Create the DigitalOcean droplet (165.232.74.127) and complete `docs/DEPLOY.md`
      steps — stack is running; deploy key is `~/.ssh/shavisia_deploy`
- [ ] DNS: point `shavisia.ge` + `www.shavisia.ge` A records at 165.232.74.127
      (currently `shavisia.ge` → 217.147.225.186, `www` has no record; HTTPS
      cert can't issue until this is fixed)
- [x] Add GitHub Actions secrets: `DO_HOST`, `DO_USER`, `DO_SSH_KEY` — deploy is green
- [ ] smsoffice.ge: get the API key and an approved sender name; then test with
      `npx tsx scripts/sms-test.ts +9955XXXXXXXX "ტესტი"`
- [ ] PayPro coordination:
  - [ ] sign off the migration duplicate rule (same license in several parks →
        keep earliest, rest go to `migration-report.json`)
  - [ ] get a MySQL dump of the `driver_blacklist` table (no direct prod DB access —
        decided 2026-07-16): `mysqldump --single-transaction
        --default-character-set=utf8mb4 <db> driver_blacklist > paypro_blacklist.sql`;
        ask for a fresh dump again at cutover (script is idempotent, re-run picks up new rows)
  - [ ] decide the PayPro webhook endpoint URL (if PayPro wants push updates)
- [ ] After first deploy: generate the production PayPro API key on the droplet
      (`docker compose exec app npx tsx scripts/create-api-client.ts paypro`) and hand it to PayPro

## NEXT SESSION (resume 2026-07-17): finish mygopro integration verification

The full-replacement integration is BUILT in both repos (decided 2026-07-16:
mygopro reads/writes the blacklist only via the shavisia v1 API; local
`driver_blacklist` table frozen, dropped after migration; login fail-open).

**Uncommitted work** — do not lose:
- shavisia (this repo): v1 list `status=`/`license=` filters, own `license` in
  check payload, `docs/API.md` updates (check/check-batch/removed-webhook docs
  are committed in `bef1a9a`; these deltas are not)
- mygopro (~/Documents/mygopro, no git branch made): `services/shavisia.ts`,
  `helpers/blacklistSync.ts`, `app/api/webhooks/shavisia/route.ts`, rewritten
  login + blacklist admin routes (add/remove/update-status/list/info/by-licenses),
  update-status schema keys on `license` now, `BlacklistList.tsx` (ID column
  dropped, edit modal sends license), `.env.example` (SHAVISIA_* vars)

**Test env (prepared, paused):** `docker start mygopro-test-mysql` →
127.0.0.1:3307, root/test, db `mygopro`, all 94 migrations applied, seeded:
park id 1 (`host_origin=localhost:3001`), user id 1 (phone +995555777888,
license TEST9999), OTP row `12345` (numeric code in login body!). Local
shavisia dev DB has API clients `testclient` + `client2` (keys in that DB only;
re-read from session or recreate) and a webhook registered for testclient →
`http://localhost:3001/api/webhooks/shavisia` (secret printed by set-webhook;
re-run `npx tsx scripts/set-webhook.ts testclient <url>` to rotate if lost).
Run mygopro: `DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=root DB_PASS=test
DB_NAME=mygopro SHAVISIA_BASE_URL=http://localhost:3000 SHAVISIA_API_KEY=<testclient>
SHAVISIA_WEBHOOK_SECRET=<whsec> npm run dev -- -p 3001`

**Verified so far:** both repos typecheck; shavisia endpoints (phone check,
own-metadata rule, batch, removed webhook + HMAC) verified live; mygopro clean
login through the shavisia check verified (200, not blacklisted).

**Remaining tests:** add via client2 → webhook restricts user row;
login of restricted-cleared user → shavisia check path blocks (block_park_name
= "shavisia.ge" for foreign entry); removed webhook → reactivates; bad webhook
signature → 401; admin add/remove routes (needs seeded admin_user + role +
admin-token cookie, or verify in staging). Then commit both repos.

**Rollout order (important):** enable prod integration (SHAVISIA_* env on
mygopro prod + prod API key + webhook registration on the droplet) ONLY
together with the data migration — otherwise pre-existing local blacklist
entries are invisible to the shavisia-backed checks.

## Claude (later sessions)

- [ ] Run the real PayPro migration once the dump arrives: load it into a throwaway
      MySQL container on the droplet (`docker run mysql:8` on 127.0.0.1:3307),
      point `PAYPRO_DATABASE_URL` at it, dry-run → review report → real run → remove container
- [x] Rate limiting on public endpoints — per-IP in-memory limiter (`src/lib/rateLimit.ts`)
      on blacklist check (30/min), OTP request+verify, and phone change (5–15/10min)
- [x] Nightly `pg_dump` backup cron on the droplet — `deploy/backup.sh`, 01:30 UTC,
      7-day local rotation (see DEPLOY.md "Backups"); DO droplet backups recommended too
- [x] Security review pass (2026-07-16): headers/CSRF/OTP windows verified;
      added security headers + HSTS, prod SESSION_SECRET guard, non-root
      container (commit `06801f9`) — all verified in production
- [ ] Visual pass in the browser against `shavisia.ge.pdf` (spacing, colors, mobile layout)
- [ ] Small polish: loading states, close modals on Escape/outside-click consistency,
      OTP resend cooldown timer in the UI

## Parked / ideas

- Outbox table + retry cron if webhook delivery ever needs to be guaranteed
- Pagination for "ჩემი გაშავებული" and the v1 list endpoint if lists grow
- Admin view (entry counts per client/park) if moderation is ever needed
