import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { verifyOtp, OTP_ERRORS } from "@/lib/otp";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  const code = String(body.code ?? "").trim();
  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const valid = await verifyOtp(phone, "LOGIN", code);
  if (!valid) {
    return NextResponse.json({ error: OTP_ERRORS.wrongCode }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, phone: user.phone });
}
