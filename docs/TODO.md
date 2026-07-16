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

## Claude (next sessions)

- [ ] PayPro-side integration in `~/Documents/mygopro`: call shavisia
      `GET /api/v1/blacklist/check` on driver login, show "shavisia.ge" as the
      blacklist source (never the park name); optionally webhook receiver
- [ ] Run the real PayPro migration once the dump arrives: load it into a throwaway
      MySQL container on the droplet (`docker run mysql:8` on 127.0.0.1:3307),
      point `PAYPRO_DATABASE_URL` at it, dry-run → review report → real run → remove container
- [x] Rate limiting on public endpoints — per-IP in-memory limiter (`src/lib/rateLimit.ts`)
      on blacklist check (30/min), OTP request+verify, and phone change (5–15/10min)
- [x] Nightly `pg_dump` backup cron on the droplet — `deploy/backup.sh`, 01:30 UTC,
      7-day local rotation (see DEPLOY.md "Backups"); DO droplet backups recommended too
- [ ] Visual pass in the browser against `shavisia.ge.pdf` (spacing, colors, mobile layout)
- [ ] Small polish: loading states, close modals on Escape/outside-click consistency,
      OTP resend cooldown timer in the UI
- [ ] Security review pass before launch (headers, CSRF posture on state-changing
      routes, OTP brute-force windows)

## Parked / ideas

- Outbox table + retry cron if webhook delivery ever needs to be guaranteed
- Pagination for "ჩემი გაშავებული" and the v1 list endpoint if lists grow
- Admin view (entry counts per client/park) if moderation is ever needed
