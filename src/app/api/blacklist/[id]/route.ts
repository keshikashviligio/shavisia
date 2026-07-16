import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { notifyWebhooks } from "@/lib/webhooks";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.blacklistEntry.findFirst({
    where: { id, createdById: user.id, status: "ACTIVE" },
    select: { id: true, licenseNumber: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "ჩანაწერი ვერ მოიძებნა" }, { status: 404 });
  }

  const removedAt = new Date();
  await prisma.blacklistEntry.update({
    where: { id },
    data: { status: "REMOVED", removedAt },
  });
  after(() =>
    notifyWebhooks({
      event: "blacklist.removed",
      license: entry.licenseNumber,
      removedAt: removedAt.toISOString(),
      source: "shavisia.ge",
    }),
  );

  return NextResponse.json({ ok: true });
}
