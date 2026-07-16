import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiClient } from "@/lib/apiAuth";
import { normalizeLicense } from "@/lib/license";
import { checkPayload } from "@/lib/blacklistCheck";

const MAX_LICENSES = 100;

// POST /api/v1/blacklist/check-batch — body: { licenses: string[] }
// Returns results keyed by the normalized license; only blacklisted
// licenses appear. Invalid licenses are silently skipped.
export async function POST(req: NextRequest) {
  const client = await getApiClient(req);
  if (!client) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.licenses)) {
    return NextResponse.json({ error: "licenses_required" }, { status: 400 });
  }
  if (body.licenses.length > MAX_LICENSES) {
    return NextResponse.json(
      { error: "too_many_licenses", max: MAX_LICENSES },
      { status: 400 },
    );
  }

  const licenses: string[] = [
    ...new Set(
      (body.licenses as unknown[])
        .map((l) => normalizeLicense(typeof l === "string" ? l : null))
        .filter((l): l is string => l !== null),
    ),
  ];
  if (licenses.length === 0) {
    return NextResponse.json({ results: {} });
  }

  const entries = await prisma.blacklistEntry.findMany({
    where: { licenseNumber: { in: licenses }, status: "ACTIVE" },
    select: {
      licenseNumber: true,
      comment: true,
      metadata: true,
      createdAt: true,
      apiClientId: true,
    },
  });

  const results: Record<string, ReturnType<typeof checkPayload>> = {};
  for (const entry of entries) {
    results[entry.licenseNumber] = checkPayload(entry, client.id);
  }
  return NextResponse.json({ results });
}
