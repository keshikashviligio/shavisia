# TODO — shavisia.ge (updated 2026-07-15)

## Current state

Everything in `PLAN.md` is built, smoke-tested, and committed (initial commit `80c5209`):
site (search / add / OTP auth / account area), PayPro API v1 + webhooks,
`migrate-paypro.ts` (MySQL, verified against a seeded test DB), smsoffice.ge SMS
integration (dev mode works without a key), Docker + GitHub Actions deploy for a
DigitalOcean droplet (`docs/DEPLOY.md`). Local dev: `docker compose up -d` + `npm run dev`.

## Kesho (things only you can do)

- [ ] Create the GitHub repo and push `main` (`git remote add origin … && git push -u origin main`)
- [ ] Create the DigitalOcean droplet and complete `docs/DEPLOY.md` steps 1–7
      (Docker, `/opt/shavisia` files, `.env` secrets, ghcr login, DNS A records)
- [ ] Add GitHub Actions secrets: `DO_HOST`, `DO_USER`, `DO_SSH_KEY`
- [ ] smsoffice.ge: get the API key and an approved sender name; then test with
      `npx tsx scripts/sms-test.ts +9955XXXXXXXX "ტესტი"`
- [ ] PayPro coordination:
  - [ ] sign off the migration duplicate rule (same license in several parks →
        keep earliest, rest go to `migration-report.json`)
  - [ ] access to the PayPro MySQL DB (`PAYPRO_DATABASE_URL`) for the migration
  - [ ] decide the PayPro webhook endpoint URL (if PayPro wants push updates)
- [ ] After first deploy: generate the production PayPro API key on the droplet
      (`docker compose exec app npx tsx scripts/create-api-client.ts paypro`) and hand it to PayPro

## Claude (next sessions)

- [ ] PayPro-side integration in `~/Documents/mygopro`: call shavisia
      `GET /api/v1/blacklist/check` on driver login, show "shavisia.ge" as the
      blacklist source (never the park name); optionally webhook receiver
- [ ] Run the real PayPro migration (dry-run → review report → real run) once DB access exists
- [ ] Rate limiting on public endpoints (`/api/blacklist/check`, OTP request) — per-IP
- [ ] Nightly `pg_dump` backup cron on the droplet (to DO Spaces or at least local rotation)
- [ ] Visual pass in the browser against `shavisia.ge.pdf` (spacing, colors, mobile layout)
- [ ] Small polish: loading states, close modals on Escape/outside-click consistency,
      OTP resend cooldown timer in the UI
- [ ] Security review pass before launch (headers, CSRF posture on state-changing
      routes, OTP brute-force windows)

## Parked / ideas

- Outbox table + retry cron if webhook delivery ever needs to be guaranteed
- Pagination for "ჩემი გაშავებული" and the v1 list endpoint if lists grow
- Admin view (entry counts per client/park) if moderation is ever needed
