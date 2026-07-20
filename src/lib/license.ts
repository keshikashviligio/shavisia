export const LICENSE_RE = /^[A-Z0-9]{3,15}$/;

export const ERRORS = {
  license: "გამოიყენეთ მხოლოდ ლათინური ასოები და ციფრები",
  licenseRequired: "შეიყვანეთ მართვის მოწმობის ნომერი",
  licenseInvalid: "მართვის მოწმობის ნომერი არასწორია",
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
