# TODO — shavisia.ge (updated 2026-07-17 evening)

## Current state

**The system is live end-to-end.** shavisia.ge runs on the droplet
(165.232.74.127, push-to-main auto-deploys); the mygopro (PayPro) integration
is deployed on their prod (157.230.110.67 / gopro.ge) and confirmed working —
all blacklist reads/writes go through the shavisia v1 API, the prod webhook is
registered (`https://gopro.ge/api/webhooks/shavisia`). The data migration ran
2026-07-17 (74 rows → 39 migrated incl. 8 courier-truncated; report:
`/opt/shavisia/migration-report-20260717.json` on the droplet); the cutover
re-run found 0 new rows, so there is no data gap. Design pass vs
`shavisia.ge.pdf` done (colored right-facing turtle, red on blacklisted, mobile
layout, modal/OTP polish — `74433f9`, `b330a1a`).

Local dev: `docker compose up -d` + `npm run dev`. mygopro test env:
`docker start mygopro-test-mysql` (127.0.0.1:3307 root/test, park 1, user 1
+995555777888/TEST9999 OTP `12345`, super-admin 100 +995555000111 code `54321`).

## Launch blockers (Kesho — only you can do these)

- [ ] **DNS**: point `shavisia.ge` + `www.shavisia.ge` A records at
      165.232.74.127 (currently → 217.147.225.186, `www` missing). HTTPS cert
      can't issue until then, so the public site is effectively unreachable.
- [ ] **smsoffice.ge**: API key + approved sender name — without it prod OTP
      codes only land in app logs, so real users cannot log in/register.
      Test after: `npx tsx scripts/sms-test.ts +9955XXXXXXXX "ტესტი"`

## Tomorrow (Claude)

- [ ] **Offsite backups** — nightly pg_dump currently stays on the same droplet
      (7-day rotation): single point of failure. Cheapest fix with zero new
      accounts: after each backup, scp the dump to the mygopro server
      (157.230.110.67, droplet already has SSH access) into e.g.
      `/root/shavisia-backups/` with its own rotation. DO Spaces later if wanted.
- [ ] **Launch meta** — `robots.txt`, `sitemap.xml`, openGraph/Twitter metadata
      in `layout.tsx` + an og-image (turtle + shavisia.ge wordmark). Favicon
      already exists (`src/app/icon.svg`).
- [ ] **Health + uptime** — add `/api/health` (DB ping); cron on the mygopro
      server curling it every 5 min and mailing/logging on failure (both boxes
      are ours — no external service needed). Revisit real monitoring later.
- [ ] **Prod webhook smoke test** — one add+remove of a TEST license via the
      shavisia v1 API on prod, confirm gopro.ge receives both events (was only
      verified on the local test env; prod registration exists but hasn't been
      exercised end-to-end).
- [ ] **E2E capture scripts → repo** — move the puppeteer-core screenshot
      scripts out of the session scratchpad into `scripts/e2e/` so visual
      regression checks survive this session.

## mygopro follow-ups (decide/verify with Kesho)

- [ ] admin blacklist `add` was verified against a mocked Yandex Fleet API —
      exercise once on gopro.ge prod/staging with the real fleet API (it
      fetches the car number via `findByProfileIdV1`).
- [ ] `register/verify-phone` issues a session with NO shavisia check (only the
      local restricted guard) — a shavisia-blacklisted driver can register at a
      new park and hold a session until next login. Pre-existing gap; decide
      whether registration should also call the check (small change, mirrors
      the login block).
- [ ] Two uncommitted files in ~/Documents/mygopro unrelated to the integration:
      `CarFormModal.tsx` (taxi_license tweaks), `verify-phone/route.ts`
      (notify-admins dedup). Commit or discard.

## Ideas / parked

- **Dispute flow**: the site publishes claims about identifiable drivers; add a
  visible "როგორ გავასაჩივრო" (how to dispute) note pointing at the support
  email, and think about takedown handling — reduces legal exposure under
  Georgian personal-data rules.
- Error tracking for shavisia (mygopro already has Sentry; needs an account
  decision).
- Outbox table + retry cron if webhook delivery ever needs to be guaranteed.
- Pagination for "ჩემი გაშავებული" and the v1 list endpoint if lists grow
  (39 entries today).
- Admin view (entry counts per client/park) if moderation is ever needed.

## Reference

- PayPro migration runbook (tunnel via droplet→157.230.110.67, `-w /tmp`,
  `REPORT_PATH`): see git history of this file at `6b5e042` if ever needed
  again — the migration itself is complete and idempotent re-runs found 0 rows.
- Droplet has SSH key `shavisia-droplet-paypro-migration` authorized on the
  mygopro server; mygopro DB creds live in `/var/www/mygopro/.env.local` there.
