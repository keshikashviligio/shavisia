export const PHONE_ERROR = "შეიყვანეთ სწორი მობილურის ნომერი";

/** Normalize a Georgian mobile number to +9955XXXXXXXX, or null if invalid. */
export function normalizePhone(raw: string | null | undefined): string | null {
  let p = (raw ?? "").replace(/[\s\-()]/g, "");
  if (p.startsWith("+995")) p = p.slice(4);
  else if (p.startsWith("995") && p.length === 12) p = p.slice(3);
  return /^5\d{8}$/.test(p) ? `+995${p}` : null;
}
