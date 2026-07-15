import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiClient } from "@/lib/apiAuth";
import { normalizeLicense } from "@/lib/license";

export async function GET(req: NextRequest) {
  const client = await getApiClient(req);
  if (!client) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const license = normalizeLicense(req.nextUrl.searchParams.get("license"));
  if (!license) {
    return NextResponse.json({ error: "invalid_license" }, { status: 400 });
  }

  const entry = await prisma.blacklistEntry.findFirst({
    where: { licenseNumber: license, status: "ACTIVE" },
    select: { comment: true },
  });

  // Never expose who reported the driver — only the shavisia.ge label.
  return NextResponse.json(
    entry
      ? { blacklisted: true, comment: entry.comment, source: "shavisia.ge" }
      : { blacklisted: false, source: "shavisia.ge" },
  );
}
