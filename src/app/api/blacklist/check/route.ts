import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeLicense, ERRORS } from "@/lib/license";

export async function GET(req: NextRequest) {
  const license = normalizeLicense(req.nextUrl.searchParams.get("license"));
  if (!license) {
    return NextResponse.json({ error: ERRORS.license }, { status: 400 });
  }

  const entry = await prisma.blacklistEntry.findFirst({
    where: { licenseNumber: license, status: "ACTIVE" },
    select: { comment: true },
  });

  return NextResponse.json(
    entry
      ? { blacklisted: true, comment: entry.comment, source: "shavisia.ge" }
      : { blacklisted: false, source: "shavisia.ge" },
  );
}
