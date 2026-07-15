import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  const entries = await prisma.blacklistEntry.findMany({
    where: { createdById: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, licenseNumber: true, comment: true, createdAt: true },
  });

  return NextResponse.json({ entries });
}
