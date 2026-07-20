import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  normalizeLicense,
  ERRORS,
  COMMENT_MAX,
  LICENSE_STRICT_RE,
} from "@/lib/license";
import { notifyWebhooks } from "@/lib/webhooks";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const license = normalizeLicense(body.license);
  if (!license) {
    return NextResponse.json({ error: ERRORS.license }, { status: 400 });
  }
  // // web adds are Georgian licences only; courier/legacy formats stay API-only
  // if (!LICENSE_STRICT_RE.test(license)) {
  //   return NextResponse.json({ error: ERRORS.licenseInvalid }, { status: 400 });
  // }
  const comment = String(body.comment ?? "").trim();
  if (!comment) {
    return NextResponse.json({ error: ERRORS.commentRequired }, { status: 400 });
  }
  if (comment.length > COMMENT_MAX) {
    return NextResponse.json({ error: ERRORS.commentTooLong }, { status: 400 });
  }

  const existing = await prisma.blacklistEntry.findFirst({
    where: { licenseNumber: license, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: ERRORS.alreadyBlacklisted },
      { status: 409 },
    );
  }

  try {
    const entry = await prisma.blacklistEntry.create({
      data: {
        licenseNumber: license,
        comment,
        createdVia: "WEB",
        createdById: user.id,
      },
    });
    after(() =>
      notifyWebhooks({
        event: "blacklist.added",
        license,
        comment,
        createdAt: entry.createdAt.toISOString(),
        source: "shavisia.ge",
      }),
    );
    return NextResponse.json({ ok: true, id: entry.id }, { status: 201 });
  } catch (e) {
    // partial unique index race: two adds of the same license at once
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: ERRORS.alreadyBlacklisted },
        { status: 409 },
      );
    }
    throw e;
  }
}
