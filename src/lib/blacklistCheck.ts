import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

type CheckedEntry = {
  licenseNumber: string;
  comment: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  apiClientId: string | null;
};

/**
 * Find an active entry by license and/or phone. Phone matches entries whose
 * metadata.phone was supplied by the integration that created them (or by
 * the PayPro migration). A license match wins over a phone match.
 */
export async function findActiveEntry(
  license: string | null,
  phone: string | null,
): Promise<CheckedEntry | null> {
  const or: Prisma.BlacklistEntryWhereInput[] = [];
  if (license) or.push({ licenseNumber: license });
  if (phone) or.push({ metadata: { path: ["phone"], equals: phone } });
  if (or.length === 0) return null;

  const entries = await prisma.blacklistEntry.findMany({
    where: { status: "ACTIVE", OR: or },
    select: {
      licenseNumber: true,
      comment: true,
      metadata: true,
      createdAt: true,
      apiClientId: true,
    },
    take: 10,
  });
  if (entries.length === 0) return null;
  return entries.find((e) => e.licenseNumber === license) ?? entries[0];
}

/**
 * Response shape for API clients. The reporter is never exposed; metadata
 * (the caller's own park_id/admin_id/category/…) is returned only for
 * entries the calling client created itself.
 */
export function checkPayload(entry: CheckedEntry | null, clientId: string) {
  if (!entry) {
    return { blacklisted: false as const, source: "shavisia.ge" as const };
  }
  return {
    blacklisted: true as const,
    comment: entry.comment,
    source: "shavisia.ge" as const,
    ...(entry.apiClientId === clientId
      ? { metadata: entry.metadata, createdAt: entry.createdAt.toISOString() }
      : {}),
  };
}
