import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { verifyOtp, OTP_ERRORS } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  const code = String(body.code ?? "").trim();
  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const valid = await verifyOtp(phone, "CHANGE_PHONE", code);
  if (!valid) {
    return NextResponse.json({ error: OTP_ERRORS.wrongCode }, { status: 400 });
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: { phone } });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: "ეს ნომერი უკვე გამოყენებულია" },
        { status: 409 },
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true, phone });
}
