import { NextRequest, NextResponse } from "next/server";

// In-memory fixed-window limiter. The app runs as a single Node process
// behind Caddy (deploy/docker-compose.yml), so no shared store is needed.
// If the app ever scales to multiple instances, move this to Redis/Postgres.

const buckets = new Map<string, { count: number; resetAt: number }>();
const SWEEP_THRESHOLD = 10_000;

export const RATE_LIMIT_ERROR = "ძალიან ბევრი მოთხოვნა, სცადეთ მოგვიანებით";

// Caddy appends the real client address as the LAST X-Forwarded-For entry;
// earlier entries arrive from the client and are spoofable.
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    const last = parts[parts.length - 1].trim();
    if (last) return last;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function sweep(now: number) {
  if (buckets.size < SWEEP_THRESHOLD) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Returns a 429 response when the caller's IP exceeded `limit` requests
 * within `windowMs`, otherwise records the request and returns null.
 */
export function rateLimit(
  req: NextRequest,
  name: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
  const now = Date.now();
  sweep(now);

  const key = `${name}:${clientIp(req)}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (bucket.count >= limit) {
    return NextResponse.json(
      { error: RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      },
    );
  }
  bucket.count += 1;
  return null;
}
