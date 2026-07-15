import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./db";

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/** Resolve the Bearer API key to an active ApiClient, or null. */
export async function getApiClient(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const key = auth.slice(7).trim();
  if (!key) return null;
  return prisma.apiClient.findFirst({
    where: { keyHash: hashApiKey(key), active: true },
  });
}
