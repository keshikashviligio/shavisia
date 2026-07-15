/**
 * Send a single test SMS through smsoffice.ge to verify the account setup.
 * Usage: npx tsx scripts/sms-test.ts +995555123456 "ტესტი"
 */
import "dotenv/config";
import { sendSms } from "../src/lib/sms";
import { normalizePhone } from "../src/lib/phone";

async function main() {
  const [rawPhone, text] = process.argv.slice(2);
  const phone = normalizePhone(rawPhone);
  if (!phone || !text) {
    console.error('Usage: npx tsx scripts/sms-test.ts <+9955XXXXXXXX> "text"');
    process.exit(1);
  }
  if (!process.env.SMS_API_KEY) {
    console.warn("SMS_API_KEY is empty — running in dev mode (log only)");
  }
  await sendSms(phone, text);
  console.log(`Sent to ${phone}`);
}

main().catch((e) => {
  console.error("Send failed:", e.message);
  process.exit(1);
});
