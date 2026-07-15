import { NextRequest, NextResponse } from "next/server";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { issueOtp, OTP_ERRORS } from "@/lib/otp";
import { sendSms, SmsSendError } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const result = await issueOtp(phone, "LOGIN");
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
