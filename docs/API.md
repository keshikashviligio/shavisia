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

### `GET /api/v1/blacklist/check?license=AH0673483`

```json
{ "blacklisted": true, "comment": "…", "source": "shavisia.ge" }
{ "blacklisted": false, "source": "shavisia.ge" }
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

A client can register a webhook URL (`npx tsx scripts/set-webhook.ts paypro https://paypro.example/webhooks/shavisia`). When any blacklist entry is added on shavisia.ge — by a website user or another integration — shavisia POSTs to the registered URL. **The client that created the entry is not notified of its own addition.**

Payload:

```json
{
  "event": "blacklist.added",
  "license": "AH0673483",
  "comment": "…",
  "createdAt": "2026-07-15T09:00:00.000Z",
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
