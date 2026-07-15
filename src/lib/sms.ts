/**
 * SMS via smsoffice.ge (same provider PayPro uses).
 * Dev mode: without SMS_API_KEY the message is printed to the server log.
 * SMS_SENDER must be a sender name approved in the smsoffice.ge cabinet.
 */
const SMSOFFICE_SEND_URL = "https://smsoffice.ge/api/v2/send/";

type SmsOfficeResponse = {
  Success?: boolean;
  Message?: string;
  Output?: string;
  ErrorCode?: number;
};

export class SmsSendError extends Error {
  constructor() {
    super("sms_send_failed");
  }
}

export async function sendSms(phone: string, text: string) {
  const key = process.env.SMS_API_KEY;
  if (!key) {
    console.log(`[SMS dev] → ${phone}: ${text}`);
    return;
  }

  const params = new URLSearchParams({
    key,
    destination: phone.replace(/^\+/, ""), // smsoffice expects 995XXXXXXXXX
    sender: process.env.SMS_SENDER || "shavisia.ge",
    content: text,
    urgent: "true",
  });

  let data: SmsOfficeResponse | null = null;
  try {
    const res = await fetch(`${SMSOFFICE_SEND_URL}?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    data = (await res.json().catch(() => null)) as SmsOfficeResponse | null;
    if (res.ok && data?.Success) return;
  } catch (e) {
    console.error(
      `[SMS] smsoffice request failed: ${e instanceof Error ? e.message : e}`,
    );
    throw new SmsSendError();
  }

  console.error(
    `[SMS] smsoffice rejected: ErrorCode=${data?.ErrorCode} Message=${data?.Message}`,
  );
  throw new SmsSendError();
}
