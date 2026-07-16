import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { issueOtp, OTP_ERRORS } from "@/lib/otp";
import { sendSms, SmsSendError } from "@/lib/sms";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "phone-change", {
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (limited) return limited;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }
  if (phone === user.phone) {
    return NextResponse.json(
      { error: "ეს ნომერი უკვე მითითებულია თქვენს პროფილში" },
      { status: 400 },
    );
  }
  const taken = await prisma.user.findUnique({ where: { phone } });
  if (taken) {
    return NextResponse.json(
      { error: "ეს ნომერი უკვე გამოყენებულია" },
      { status: 409 },
    );
  }

  const result = await issueOtp(phone, "CHANGE_PHONE");
  if (!result.ok) {
    return NextResponse.json({ error: OTP_ERRORS.tooMany }, { status: 429 });
  }

  try {
    await sendSms(phone, `shavisia.ge — ერთჯერადი კოდი: ${result.code}`);
  } catch (e) {
    if (e instanceof SmsSendError) {
      return NextResponse.json(
        { error: "SMS ვერ გაიგზავნა, სცადეთ მოგვიანებით" },
        { status: 502 },
      );
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
