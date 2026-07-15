import "dotenv/config";
import { createHash, randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: npx tsx scripts/create-api-client.ts <name>");
    process.exit(1);
  }

  const key = `sk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(key).digest("hex");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const client = await prisma.apiClient.upsert({
    where: { name },
    update: { keyHash, active: true },
    create: { name, keyHash },
  });
  await prisma.$disconnect();

  console.log(`API client: ${client.name} (${client.id})`);
  console.log(`API key (shown once — store securely): ${key}`);
}

main();
