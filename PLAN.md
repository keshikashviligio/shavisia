# shavisia.ge — Project Plan

Shared driver blacklist for car-rental businesses in Georgia. Rental companies check a renter's **driver's license number** before handing over a car, and add problem renters to a shared blacklist.

---

## 1. What the design shows (shavisia.ge.pdf)

- **Dark theme**, centered turtle mascot, all UI text in **Georgian**.
- **Home page**: turtle + tagline "დაამატე ან გადაამოწმე მძღოლი **მართვის მოწმობის ნომრით**" + one large pill-shaped input with a single action button.
- **Search results**:
  - Not found → green text "მძღოლი არ არის შავ სიაში!" (turtle stays green).
  - Found → red text "მძღოლი შავ სიაშია!" + "კომენტარი:" block with the reason (turtle turns **red** — `turtle error.svg`).
- **Auth modal** ("ავტორიზაცია"): phone input with `+995` prefix, "შესვლა" button (then OTP step).
- **Add modal** ("შავ სიაში დამატება"): license number field + required comment textarea ("ჩაწერეთ გაშავების მიზეზი"), buttons "გაუქმება" / "დამატება".
- **Account menu** (person icon, top-right): პროფილი / ჩემი გაშავებული / გამოსვლა.
- **Account page** (breadcrumb "მთავარი / მენიუ") with tabs **პროფილი** | **ჩემი გაშავებული**:
  - My blacklisted: list rows `LICENSE · comment` with red trash icon; delete asks confirmation "ნამდვილად გსურთ შავი სიიდან ამოშლა?" (არა / დიახ).
  - Profile: mobile number only, editable.
- **Footer / info sections**: two feature blocks with Shield and Medal icons, `Support: shavisia@mail.ge`, `Copyright © 2026 shavisia.ge`.

## 2. Icons (already provided in `shavisia.ge icons/`)

| File | Use |
|---|---|
| `Turtle.svg` / `Tusrtle.svg` | Mascot, normal (green) state + favicon/logo |
| `turtle error.svg` | Mascot when driver IS blacklisted (red) |
| `Shield With Star.svg` | Footer feature block 1 |
| `Badge Reward Medal.png` | Footer feature block 2 |

Copy these into `public/icons/`. Remaining UI icons (search, plus, person, trash, close) — use an icon set (e.g. lucide) to match the design.

## 3. Tech stack (proposal — small & simple)

- **Next.js 15 (latest, App Router) + TypeScript + Tailwind CSS** — one repo, UI + API routes together.
- **PostgreSQL via Prisma** (chosen over MySQL: better Prisma support, free hosted tiers — Neon/Supabase — and clean unique-index handling for license numbers).
- **Auth**: phone + SMS OTP. Session = signed httpOnly cookie (JWT).
- **SMS provider**: smsoffice.ge or sender.ge (Georgian numbers, cheap). Dev mode: OTP printed to server log so everything works without a provider account.
- **Hosting**: any small VPS or Vercel + the `shavisia.ge` domain.

## 4. Data model

```
User            id, phone (unique, +995…), createdAt
ApiClient       id, name (unique, e.g. "paypro"), keyHash, active, createdAt
BlacklistEntry  id, licenseNumber (uppercase Latin), comment (≤500),
                status      (ACTIVE | REMOVED)   // soft delete, like PayPro
                createdById → User?         // set when added on the website
                apiClientId → ApiClient?    // set when added through the API
                metadata    JSONB?          // client-specific creator data
                createdVia  (WEB | API), createdAt, updatedAt, removedAt?
OtpCode         id, phone, codeHash, purpose (login | change-phone),
                expiresAt, attempts
```

**Soft delete:** removing an entry (site or API) sets `status = REMOVED` + `removedAt` — rows are never hard-deleted, matching PayPro's model and keeping an audit trail. Search/check, duplicate detection, and "ჩემი გაშავებული" only ever look at `ACTIVE` rows.

`licenseNumber` is **unique among ACTIVE entries** — one live blacklist entry per license (adding an already-active number is rejected; re-adding after removal is allowed). Enforced with a Postgres **partial unique index** (`WHERE status = 'ACTIVE'`), created via raw SQL in the Prisma migration since Prisma doesn't model partial indexes.

### Who created an entry

Exactly one of `createdById` / `apiClientId` is set (DB CHECK constraint):

- **Website add** → `createdById` = the logged-in user, `metadata` null.
- **API add** → `apiClientId` = the calling integration (PayPro etc.), and the client passes its own creator identifiers in `metadata`. For PayPro:
  ```json
  { "park_id": 123, "admin_id": 45 }
  ```
  `metadata` is free-form JSONB, so a future client can store whatever identifies its actor — we don't hardcode PayPro's shape. Add an expression index on `(apiClientId, metadata->>'park_id')` for PayPro's delete/list queries.
- So "who added this?" is always answerable: either a shavisia.ge user, or *client X + that client's metadata*.

API-created entries appear in no one's personal "ჩემი გაშავებული" list; each client manages its own entries via the API (scoped by `apiClientId` + its metadata identifiers). The public check response still exposes only `source: "shavisia.ge"`.

## 5. Core behaviors & rules

### Home input (search ⇄ add morphing button)
- Input **empty** → button shows **"+ დამატება"** (Add).
- Input **has text** → button morphs to **"🔍 ძიება"** (Search).
- Delete the text → button reverts to Add. (Exactly as pages 1–2 of the PDF.)

### Input validation (license number)
- Lowercase is **auto-converted to uppercase** as you type.
- **Only Latin letters and digits** accepted; anything else (incl. Georgian chars) is rejected with an error message **in Georgian**, e.g. "გამოიყენეთ მხოლოდ ლათინური ასოები და ციფრები".
- Same rules in the add-modal license field.

### Search flow (public, no login needed)
1. Enter license → ძიება.
2. `GET /api/blacklist/check?license=XXX` → green "not in blacklist" or red "in blacklist" + comment, turtle swaps to red variant.

### Add flow
1. Click **დამატება**:
   - Not logged in → **auth modal**: enter mobile (+995) → შესვლა → OTP code entry → verify → session created.
   - Logged in (or after OTP) → **add modal** opens.
2. Add modal: license number (same validation) + **mandatory comment**, **max 500 chars** with live counter.
3. Submit `POST /api/blacklist`:
   - **Duplicate license** → the popup shows an error: "ეს მართვის მოწმობის ნომერი უკვე შავ სიაშია" (already blacklisted).
   - Success → entry saved, confirmation shown.

### Account area (login required)
- **Menu** (person icon): პროფილი, ჩემი გაშავებული, გამოსვლა.
- **პროფილი**: shows only the mobile number + edit (changing the number is confirmed with OTP to the new number).
- **ჩემი გაშავებული**: list of my entries; trash icon → confirmation dialog → `DELETE /api/blacklist/:id` (only own entries deletable).
- **გამოსვლა**: clears session.

## 6. PayPro (Feipro) integration

PayPro — fleet/park management system, first API client — must:
1. **Check the blacklist on every PayPro login** by the driver's license number, so status changes are always reflected.
2. When showing that a driver is blacklisted, display the source as **"shavisia.ge"** — *not* the name of the park that blacklisted them (reporter stays anonymous).

On the shavisia.ge side we provide (all with `Authorization: Bearer <API key>`; the key resolves to an `ApiClient`, so every write is attributed):
- `GET /api/v1/blacklist/check?license=XXX` →
  ```json
  { "blacklisted": true, "comment": "...", "source": "shavisia.ge" }
  ```
  The response deliberately contains **no reporter identity** — only `source: "shavisia.ge"`.
- `POST /api/v1/blacklist` `{ "license": "AH0673483", "comment": "...", "metadata": { "park_id": 123, "admin_id": 45 } }` — stored with `apiClientId` = caller. Duplicate license → `409` with the "already blacklisted" message.
- `DELETE /api/v1/blacklist?license=XXX&park_id=123` — soft-removes (`status = REMOVED`) an entry, only if it belongs to the calling client and its `metadata.park_id` matches.
- `GET /api/v1/blacklist?park_id=123` — list the calling client's entries for a park (lets PayPro show a park its own blacklist).
- One API key per client (stored hashed); first client: **PayPro**.
- **Webhooks (outbound)**: a client may register a `webhookUrl` + signing secret (`scripts/set-webhook.ts`). On every new blacklist entry (web or API), shavisia POSTs `{ event: "blacklist.added", license, comment, createdAt, source }` to all registered clients — except the client that created the entry. HMAC-SHA256 signature in `X-Shavisia-Signature`; 3 attempts, best-effort (login-time check remains the source of truth). No reporter identity in the payload.

### Migration from PayPro `driver_blacklist`

One-time script (`scripts/migrate-paypro.ts`, run with `tsx`), reading PayPro's `driver_blacklist` table (direct DB connection or CSV export).

PayPro source fields: `id, driver_license_number, phone, park_id, admin_id, comment, status, created_at, updated_at, car_number, category`.

**Field mapping** (nothing is dropped — everything without a shavisia.ge column lands in `metadata`):

| PayPro field | → shavisia.ge |
|---|---|
| `driver_license_number` | `licenseNumber` (trim, uppercase, validate Latin+digits) |
| `comment` | `comment` (trim, truncate to 500; original kept as `metadata.original_comment` if truncated) |
| `park_id` | `metadata.park_id` |
| `admin_id` | `metadata.admin_id` |
| `phone` | `metadata.phone` (driver's phone — not shown on shavisia.ge, preserved) |
| `car_number` | `metadata.car_number` |
| `category` | `metadata.category` |
| `id` | not migrated |
| `status` | values: `active` / `removed` — only **`active`** rows are migrated; `removed` rows are skipped and logged |
| `created_at` | `createdAt` (preserved) |
| `updated_at` | `updatedAt` (preserved) |
| — | `apiClientId` = PayPro client, `createdVia` = API |

**Rules:**

1. **Deduplicate**: `licenseNumber` is globally unique, but PayPro may have the same license blacklisted by several parks. Rule: **keep the earliest `active` entry**, write every skipped duplicate to `migration-report.json` (full source row) so nothing is silently lost. ⚠️ Confirm this rule with PayPro before running.
2. **Invalid licenses** (non-Latin, empty, malformed) go to the report file, not the DB.
3. **Idempotent**: skip rows whose normalized license already exists in `BlacklistEntry`, so the script can re-run safely.
4. Dry-run mode (`--dry-run`) prints counts (migrated / duplicates / removed / invalid) without writing.
- The actual UI change inside PayPro (label text, login-time check) happens in the PayPro codebase — out of scope here; we ship the API + a short integration doc.

## 7. Build order (milestones)

1. **Scaffold** — Next.js + Tailwind + Prisma/SQLite, dark layout, copy icons, favicon.
2. **Home page UI** — turtle, tagline, morphing search/add input, footer sections (pixel-match the PDF).
3. **Search** — check endpoint + green/red result states + red turtle.
4. **Auth** — OTP request/verify endpoints, auth modal, session cookie, dev-mode OTP logging.
5. **Add** — add modal, validation (uppercase/Latin/500 chars), duplicate handling.
6. **Account** — menu, profile (phone edit w/ OTP), my-blacklisted list + delete confirmation.
7. **Integration API** — versioned check/add/delete/list endpoints + ApiClient key auth + integration doc for PayPro.
8. **PayPro migration** — `migrate-paypro.ts` script (normalize, dedupe, report), dry-run against a PayPro export, then real run.
9. **Polish & deploy** — Georgian error messages everywhere, mobile responsiveness, deploy + domain.

## 8. Open questions (non-blocking, defaults chosen)

- **SMS provider account** — which one to sign up for (default plan: smsoffice.ge; dev works without it).
- **License number format** — strict format enforcement (e.g. 2 letters + 7 digits, Georgian `AH0673483` style) vs. just Latin+digits? Plan: Latin+digits, length 5–15, no strict mask.
- **Rate limiting** — basic per-IP limits on OTP and check endpoints (included in plan, simple in-memory).
