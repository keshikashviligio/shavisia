import { createHmac } from "crypto";
import { prisma } from "./db";

export type BlacklistWebhookEvent = {
  event: "blacklist.added";
  license: string;
  comment: string;
  createdAt: string;
  source: "shavisia.ge";
};

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 5000;

/**
 * POST the event to every active client with a registered webhook.
 * The client that created the entry (excludeClientId) is not notified.
 * Runs post-response via next/server after() — never blocks the request.
 */
export async function notifyWebhooks(
  event: BlacklistWebhookEvent,
  excludeClientId?: string,
) {
  const clients = await prisma.apiClient.findMany({
    where: {
      active: true,
      webhookUrl: { not: null },
      ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
    },
    select: { id: true, name: true, webhookUrl: true, webhookSecret: true },
  });

  await Promise.allSettled(clients.map((client) => deliver(client, event)));
}

async function deliver(
  client: {
    name: string;
    webhookUrl: string | null;
    webhookSecret: string | null;
  },
  event: BlacklistWebhookEvent,
) {
  const body = JSON.stringify(event);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (client.webhookSecret) {
    headers["X-Shavisia-Signature"] = createHmac("sha256", client.webhookSecret)
      .update(body)
      .digest("hex");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(client.webhookUrl!, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return;
      console.error(
        `[webhook] ${client.name}: HTTP ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
    } catch (e) {
      console.error(
        `[webhook] ${client.name}: ${e instanceof Error ? e.message : e} (attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
    }
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
}
