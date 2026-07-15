import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const [name, url, secretArg] = process.argv.slice(2);
  if (!name || (!url && url !== "off")) {
    console.error(
      "Usage: npx tsx scripts/set-webhook.ts <client-name> <url|off> [secret]",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  if (url === "off") {
    await prisma.apiClient.update({
      where: { name },
      data: { webhookUrl: null, webhookSecret: null },
    });
    console.log(`Webhook disabled for ${name}`);
  } else {
    const secret = secretArg || `whsec_${randomBytes(24).toString("hex")}`;
    await prisma.apiClient.update({
      where: { name },
      data: { webhookUrl: url, webhookSecret: secret },
    });
    console.log(`Webhook for ${name}: ${url}`);
    console.log(`Signing secret (share with the client): ${secret}`);
  }

  await prisma.$disconnect();
}

main();
