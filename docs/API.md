# shavisia.ge — Integration API (v1)

REST API for external systems (first client: **PayPro**). All endpoints require an API key:

```
Authorization: Bearer sk_...
```

Keys are issued per client (`npx tsx scripts/create-api-client.ts paypro`) and stored hashed. Base URL: `https://shavisia.ge`.

## Integration rules for PayPro

1. **Check the blacklist on every PayPro login** with the driver's license number (`GET /check`), so removals/additions on shavisia.ge are always reflected.
2. When showing a blacklisted driver, display the source as **"shavisia.ge"** — never the name of the park that reported them. The API deliberately returns no reporter identity.
3. When adding entries, pass your own creator identifiers in `metadata` (PayPro: `park_id`, `admin_id`). `park_id` is required later to delete or list those entries.

## Endpoints

### `GET /api/v1/blacklist/check?license=AH0673483&phone=%2B995555123456`

At least one of `license` / `phone` is required (`400 license_or_phone_required`
otherwise); invalid values are ignored so a malformed license never blocks a
phone-only check. Phone matches entries whose `metadata.phone` was supplied at
creation (integration adds and the PayPro migration set it). A license match
wins over a phone match.

```json
{ "blacklisted": true, "comment": "…", "source": "shavisia.ge" }
{ "blacklisted": false, "source": "shavisia.ge" }
```

If the matched entry was created by the **calling client itself**, the response
additionally carries its own `metadata` and `createdAt` — so an integration can
show its internal park/admin/category for its own entries while foreign entries
stay anonymous:

```json
{ "blacklisted": true, "comment": "…", "source": "shavisia.ge",
  "metadata": { "park_id": 123, "admin_id": 45, "phone": "+995…", "category": "…" },
  "createdAt": "2026-07-15T09:00:00.000Z" }
```

### `POST /api/v1/blacklist/check-batch`

Body: `{ "licenses": ["AH0673483", "…"] }` (max 100). Returns results keyed by
normalized license — **only blacklisted licenses appear**; invalid entries are
skipped. Each value has the same shape as a `/check` response (own-entry
metadata rule included):

```json
{ "results": { "AH0673483": { "blacklisted": true, "comment": "…", "source": "shavisia.ge" } } }
```

### `POST /api/v1/blacklist`

```json
{
  "license": "AH0673483",
  "comment": "მიზეზი (მაქს. 500 სიმბოლო)",
  "metadata": { "park_id": 123, "admin_id": 45 }
}
```

Responses: `201 { ok, id }` · `409 { error: "already_blacklisted", message }` if the license is already actively blacklisted (by anyone) · `400 { error: invalid_license | comment_required | comment_too_long | invalid_metadata }`.

License format: Latin letters and digits only, 3–15 characters; lowercase is normalized to uppercase.

### `DELETE /api/v1/blacklist?license=AH0673483&park_id=123`

Soft-removes the entry — only if it was created by the calling client **and** its `metadata.park_id` matches. Responses: `200 { ok }` · `404 { error: "not_found" }`.

Note: after removal the license can be blacklisted again (by anyone).

### `GET /api/v1/blacklist?park_id=123`

Lists the calling client's active entries (optionally filtered by `park_id`, max 1000, newest first):

```json
{ "entries": [ { "licenseNumber": "…", "comment": "…", "metadata": {…}, "createdAt": "…" } ] }
```

## Webhooks

A client can register a webhook URL (`npx tsx scripts/set-webhook.ts paypro https://paypro.example/webhooks/shavisia`). When any blacklist entry is added **or removed** on shavisia.ge — by a website user or another integration — shavisia POSTs to the registered URL. **The client that performed the action is not notified of its own change.**

Payloads:

```json
{
  "event": "blacklist.added",
  "license": "AH0673483",
  "comment": "…",
  "createdAt": "2026-07-15T09:00:00.000Z",
  "source": "shavisia.ge"
}
```

```json
{
  "event": "blacklist.removed",
  "license": "AH0673483",
  "removedAt": "2026-07-16T09:00:00.000Z",
  "source": "shavisia.ge"
}
```

As with the check endpoint, the payload carries no reporter identity.

**Signature**: the `X-Shavisia-Signature` header is `hex(HMAC-SHA256(secret, rawBody))` using the signing secret issued at registration. Verify it before trusting the payload:

```js
const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
```

Delivery: up to 3 attempts with a 5s timeout and back-off; respond `2xx` to acknowledge. Delivery is best-effort — keep checking the blacklist on login (rule 1) as the source of truth.

## Errors

All errors are `{ "error": "<machine_code>" }` with appropriate HTTP status (`401 unauthorized`, `400`, `404`, `409`). `already_blacklisted` additionally carries a Georgian `message` suitable for display.
