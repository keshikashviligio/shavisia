import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "@/lib/apiAuth";
import { normalizeLicense } from "@/lib/license";
import { normalizePhone } from "@/lib/phone";
import { findActiveEntry, checkPayload } from "@/lib/blacklistCheck";

// GET /api/v1/blacklist/check?license=AH0673483&phone=%2B995555123456
// At least one of license/phone must be valid; invalid values are ignored
// so a malformed license never blocks a phone-only check.
export async function GET(req: NextRequest) {
  const client = await getApiClient(req);
  if (!client) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const license = normalizeLicense(req.nextUrl.searchParams.get("license"));
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone"));
  if (!license && !phone) {
    return NextResponse.json(
      { error: "license_or_phone_required" },
      { status: 400 },
    );
  }

  const entry = await findActiveEntry(license, phone);
  return NextResponse.json(checkPayload(entry, client.id));
}
