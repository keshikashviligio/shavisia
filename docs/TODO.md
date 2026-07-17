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

## mygopro integration — VERIFIED 2026-07-17, both repos committed

All integration tests passed live on 2026-07-17 (shavisia :3000 + mygopro :3001
against the seeded test MySQL):
- add via client2 → `blacklist.added` webhook restricted mygopro user
  (utf8mb4 Georgian comment stored correctly)
- login of blacklisted user → shavisia check blocks (500, user restricted,
  `block_park_name = "shavisia.ge"` for the foreign entry)
- forged + missing webhook HMAC → 401, no state change
- DELETE via client2 → `blacklist.removed` webhook reactivated the user
- all six admin routes verified with a seeded super-admin (park 1):
  add / remove / update-status (removed↔active round-trip, keys on license,
  uses the new `status=all&license=` list filters) / list / info / by-licenses
  (body key is `license_numbers`)

**Caveats / follow-ups:**
- [ ] admin `add` calls the Yandex Fleet API (`findByProfileIdV1`, env
      `YANDEX_BASE_URL`) for the car number — verified against a local mock;
      re-check once in staging with the real fleet API
- [ ] `app/api/register/verify-phone/route.ts` issues a session token with NO
      shavisia check (only the local `status=restricted` guard) — a driver
      blacklisted on shavisia but not yet restricted at that park can register
      and get a session until their next login. Pre-existing behavior (old code
      had the same gap), but decide whether registration should also check.
- mygopro has two UNCOMMITTED files unrelated to this integration (left as-is):
  `app/admin/dashboard/rental/CarFormModal.tsx` (taxi_license default/options
  tweaks) and `app/api/register/verify-phone/route.ts` (notify-admins dedup on
  re-verification)

**Test env:** `docker start mygopro-test-mysql` → 127.0.0.1:3307, root/test,
db `mygopro`; park id 1, user id 1 (+995555777888 / TEST9999, OTP `12345`,
numeric in body), super-admin id 100 (+995555000111, code `54321`, numeric).
API keys rotated 2026-07-17 (dev only, hashed in dev DB — recreate via
`scripts/create-api-client.ts` + `scripts/set-webhook.ts` if needed).
Mock fleet API used for admin add: serve
`POST /v1/parks/driver-profiles/list` → `{driver_profiles:[{driver_profile:
{...}, car:{number:"..."}}]}` and set `YANDEX_BASE_URL` on mygopro.

**Rollout order (important):** enable prod integration (SHAVISIA_* env on
mygopro prod + prod API key + webhook registration on the droplet) ONLY
together with the data migration — otherwise pre-existing local blacklist
entries are invisible to the shavisia-backed checks.

## Claude (later sessions)

- [ ] Run the REAL PayPro migration at cutover (dry runs verified 2026-07-17,
      both from laptop and from the droplet's app container). Courier rows
      (synthetic `COURIER<hash>` licenses) migrate truncated to 15 chars
      (`fd68fd1`; mygopro service applies the same normalization, `c5c357a`) —
      prod dry run: 74 rows → 39 migrate (8 courier-truncated), 35
      removed-status, 0 invalid/duplicates/empty. Runbook (droplet has SSH
      access to mygopro prod since 2026-07-17, key `shavisia-droplet-paypro-
      migration`):
      ```
      ssh root@165.232.74.127
      ssh -f -N -L 172.18.0.1:3308:127.0.0.1:3306 root@157.230.110.67
      # DB_PASS from /var/www/mygopro/.env.local on 157.230.110.67 (URL-encode!)
      cd /opt/shavisia && docker compose exec -T -w /tmp \
        -e PAYPRO_DATABASE_URL="mysql://mygopro:<pass>@172.18.0.1:3308/mygopro" \
        app npx tsx /app/scripts/migrate-paypro.ts --dry-run   # then real run
      docker compose cp app:/tmp/migration-report.json .       # keep the report
      pkill -f "ssh.*-L 172.18.0.1:3308"
      ```
      Prod `paypro` ApiClient already exists. Re-run at cutover picks up new
      rows (idempotent). PayPro sign-off still pending: keep-earliest duplicate
      rule (0 duplicates in current data) + courier truncation approach.
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
