// Broad format used by the v1 API — must keep accepting courier keys
// (COURIER + hash) and legacy migrated values.
export const LICENSE_RE = /^[A-Z0-9]{3,15}$/;

// Georgian driving licence number: two Latin letters + seven digits
// (e.g. TH4844475). Enforced on the website UI and web add endpoint.
export const LICENSE_STRICT_RE = /^[A-Z]{2}[0-9]{7}$/;

export const ERRORS = {
  license: "გამოიყენეთ მხოლოდ ლათინური ასოები და ციფრები",
  licenseRequired: "შეიყვანეთ მართვის მოწმობის ნომერი",
  licenseInvalid: "მართვის მოწმობის ფორმატი არასწორია",
  commentRequired: "ჩაწერეთ გაშავების მიზეზი",
  commentTooLong: "კომენტარი არ უნდა აღემატებოდეს 500 სიმბოლოს",
  alreadyBlacklisted: "ეს მართვის მოწმობის ნომერი უკვე შავ სიაშია",
  generic: "დაფიქსირდა შეცდომა, სცადეთ თავიდან",
} as const;

export const COMMENT_MAX = 500;

/** Uppercase + validate; returns the normalized license or null if invalid. */
export function normalizeLicense(raw: string | null | undefined): string | null {
  const license = raw?.trim().toUpperCase() ?? "";
  return LICENSE_RE.test(license) ? license : null;
}
