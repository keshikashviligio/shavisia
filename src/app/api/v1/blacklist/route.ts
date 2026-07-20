import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getApiClient } from "@/lib/apiAuth";
import { normalizeLicense, ERRORS, COMMENT_MAX } from "@/lib/license";
import { notifyWebhooks } from "@/lib/webhooks";

/** park_id may arrive as "123" in a query string but be stored as number 123. */
function parkIdFilters(parkId: string): Prisma.BlacklistEntryWhereInput[] {
  const filters: Prisma.BlacklistEntryWhereInput[] = [
    { metadata: { path: ["park_id"], equals: parkId } },
  ];
  if (/^\d+$/.test(parkId)) {
    filters.push({ metadata: { path: ["park_id"], equals: Number(parkId) } });
  }
  return filters;
}

// GET /api/v1/blacklist?park_id=123&status=active|removed|all&scope=own|all
// Lists the calling client's entries (default: active only, own only).
// scope=all additionally returns entries from other sources (web users,
// other clients) tagged source:"shavisia.ge" — with their metadata withheld,
// since metadata is private to the client that created the entry.
export async function GET(req: NextRequest) {
  const client = await getApiClient(req);
  if (!client) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parkId = req.nextUrl.searchParams.get("park_id");
  const license = normalizeLicense(req.nextUrl.searchParams.get("license"));
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  if (!["active", "removed", "all"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const scope = req.nextUrl.searchParams.get("scope") ?? "own";
  if (!["own", "all"].includes(scope)) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }

  const rows = await prisma.blacklistEntry.findMany({
    where: {
      ...(scope === "all" ? {} : { apiClientId: client.id }),
      ...(status === "all"
        ? {}
        : { status: status === "removed" ? "REMOVED" : "ACTIVE" }),
      ...(license ? { licenseNumber: license } : {}),
      ...(parkId ? { OR: parkIdFilters(parkId) } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      licenseNumber: true,
      comment: true,
      metadata: true,
      status: true,
      createdAt: true,
      removedAt: true,
      apiClientId: true,
    },
  });

  const entries = rows.map(({ apiClientId, metadata, ...entry }) => {
    const own = apiClientId === client.id;
    return {
      ...entry,
      metadata: own ? metadata : null,
      source: own ? ("own" as const) : ("shavisia.ge" as const),
    };
  });

  return NextResponse.json({ entries });
}

// POST /api/v1/blacklist — add an entry
// body: { license, comment, metadata?: { park_id, admin_id, ... } }
export async function POST(req: NextRequest) {
  const client = await getApiClient(req);
  if (!client) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const license = normalizeLicense(body.license);
  if (!license) {
    return NextResponse.json({ error: "invalid_license" }, { status: 400 });
  }
  const comment = String(body.comment ?? "").trim();
  if (!comment) {
    return NextResponse.json({ error: "comment_required" }, { status: 400 });
  }
  if (comment.length > COMMENT_MAX) {
    return NextResponse.json({ error: "comment_too_long" }, { status: 400 });
  }
  const metadata = body.metadata ?? null;
  if (
    metadata !== null &&
    (typeof metadata !== "object" || Array.isArray(metadata))
  ) {
    return NextResponse.json({ error: "invalid_metadata" }, { status: 400 });
  }

  const existing = await prisma.blacklistEntry.findFirst({
    where: { licenseNumber: license, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "already_blacklisted", message: ERRORS.alreadyBlacklisted },
      { status: 409 },
    );
  }

  try {
    const entry = await prisma.blacklistEntry.create({
      data: {
        licenseNumber: license,
        comment,
        createdVia: "API",
        apiClientId: client.id,
        metadata: metadata ?? undefined,
      },
    });
    // notify other integrations, never the client that just added the entry
    after(() =>
      notifyWebhooks(
        {
          event: "blacklist.added",
          license,
          comment,
          createdAt: entry.createdAt.toISOString(),
          source: "shavisia.ge",
        },
        client.id,
      ),
    );
    return NextResponse.json({ ok: true, id: entry.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: "already_blacklisted", message: ERRORS.alreadyBlacklisted },
        { status: 409 },
      );
    }
    throw e;
  }
}

// DELETE /api/v1/blacklist?license=XXX&park_id=123 — soft-remove own entry
export async function DELETE(req: NextRequest) {
  const client = await getApiClient(req);
  if (!client) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const license = normalizeLicense(req.nextUrl.searchParams.get("license"));
  if (!license) {
    return NextResponse.json({ error: "invalid_license" }, { status: 400 });
  }
  const parkId = req.nextUrl.searchParams.get("park_id");
  if (!parkId) {
    return NextResponse.json({ error: "park_id_required" }, { status: 400 });
  }

  const entry = await prisma.blacklistEntry.findFirst({
    where: {
      apiClientId: client.id,
      licenseNumber: license,
      status: "ACTIVE",
      OR: parkIdFilters(parkId),
    },
    select: { id: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const removedAt = new Date();
  await prisma.blacklistEntry.update({
    where: { id: entry.id },
    data: { status: "REMOVED", removedAt },
  });
  // notify other integrations, never the client that removed the entry
  after(() =>
    notifyWebhooks(
      {
        event: "blacklist.removed",
        license,
        removedAt: removedAt.toISOString(),
        source: "shavisia.ge",
      },
      client.id,
    ),
  );

  return NextResponse.json({ ok: true });
}
