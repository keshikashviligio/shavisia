import { createHash, randomInt } from "crypto";
import { prisma } from "./db";

export type OtpPurpose = "LOGIN" | "CHANGE_PHONE";

const TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60_000;

export const OTP_ERRORS = {
  tooMany: "ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით",
  wrongCode: "კოდი არასწორია ან ვადაგასულია",
} as const;

function hash(code: string) {
  return createHash("sha256")
    .update(code + (process.env.SESSION_SECRET || "dev-secret-change-me"))
    .digest("hex");
}

export async function issueOtp(phone: string, purpose: OtpPurpose) {
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await prisma.otpCode.count({
    where: { phone, purpose, createdAt: { gte: since } },
  });
  if (recent >= MAX_CODES_PER_WINDOW) return { ok: false as const };

  const code = randomInt(100000, 1000000).toString();
  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return { ok: true as const, code };
}

export async function verifyOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
) {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false;

  if (otp.codeHash !== hash(code)) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpCode.deleteMany({ where: { phone, purpose } });
  return true;
}
