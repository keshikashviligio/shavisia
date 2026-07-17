/**
 * One-time migration of PayPro's `driver_blacklist` (MySQL) into shavisia.ge.
 *
 * Usage:
 *   PAYPRO_DATABASE_URL="mysql://user:pass@host:3306/paypro" \
 *     npx tsx scripts/migrate-paypro.ts [--dry-run]
 *
 * Rules (see PLAN.md):
 *   - only status='active' rows migrate; 'removed' rows are counted
 *   - license: trim + uppercase, must be Latin/digits 3-15 — else reported
 *   - courier rows (synthetic `COURIER<hash>` licenses, ~39 chars) are
 *     truncated to 15 chars (COURIER + first 8 hash chars) — the same
 *     normalization mygopro's shavisia service applies; the full value is
 *     kept in metadata.original_license and matching also works by phone
 *   - comment: required, truncated to 500 (original kept in metadata)
 *   - duplicates: licenseNumber is unique among ACTIVE — keep the earliest
 *     source row, report the rest; licenses already in shavisia are skipped
 *   - idempotent: safe to re-run; writes migration-report.json every run
 */
import "dotenv/config";
import { writeFileSync } from "fs";
import mysql from "mysql2/promise";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const LICENSE_RE = /^[A-Z0-9]{3,15}$/;
const COURIER_RE = /^COURIER[0-9A-F]{8,}$/;
const COMMENT_MAX = 500;
// Overridable because /app is read-only for the non-root prod container.
const REPORT_PATH = process.env.REPORT_PATH || "migration-report.json";

type PayProRow = {
  id: number;
  driver_license_number: string | null;
  phone: string | null;
  park_id: number | null;
  admin_id: number | null;
  comment: string | null;
  status: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  car_number: string | null;
  category: string | null;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const mysqlUrl = process.env.PAYPRO_DATABASE_URL;
  if (!mysqlUrl) {
    console.error("PAYPRO_DATABASE_URL is not set");
    process.exit(1);
  }
  const table = process.env.PAYPRO_TABLE || "driver_blacklist";

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const paypro = await prisma.apiClient.findUnique({
    where: { name: "paypro" },
  });
  if (!paypro) {
    console.error(
      'ApiClient "paypro" not found — run: npx tsx scripts/create-api-client.ts paypro',
    );
    process.exit(1);
  }

  const db = await mysql.createConnection({
    uri: mysqlUrl,
    charset: "utf8mb4",
  });
  // earliest first → "keep the earliest active entry" needs no sorting later
  const [rows] = await db.execute(
    `SELECT * FROM \`${table}\` ORDER BY created_at ASC, id ASC`,
  );
  await db.end();
  const source = rows as PayProRow[];

  // existing licenses in shavisia (any status) — skipped for idempotency
  const existing = new Set(
    (
      await prisma.blacklistEntry.findMany({
        select: { licenseNumber: true },
      })
    ).map((e) => e.licenseNumber),
  );

  const report = {
    ranAt: new Date().toISOString(),
    dryRun,
    counts: {
      total: source.length,
      migrated: 0,
      removedStatus: 0,
      courierTruncated: 0,
      invalidLicense: 0,
      emptyComment: 0,
      duplicateInSource: 0,
      alreadyInShavisia: 0,
    },
    invalidLicense: [] as PayProRow[],
    emptyComment: [] as PayProRow[],
    duplicateInSource: [] as PayProRow[],
    alreadyInShavisia: [] as PayProRow[],
    removedStatusIds: [] as number[],
  };
  const seen = new Set<string>();

  for (const row of source) {
    if ((row.status ?? "").toLowerCase() !== "active") {
      report.counts.removedStatus++;
      report.removedStatusIds.push(row.id);
      continue;
    }

    let license = (row.driver_license_number ?? "").trim().toUpperCase();
    let originalLicense: string | null = null;
    if (license.length > 15 && COURIER_RE.test(license)) {
      originalLicense = license;
      license = license.slice(0, 15);
      report.counts.courierTruncated++;
    }
    if (!LICENSE_RE.test(license)) {
      report.counts.invalidLicense++;
      report.invalidLicense.push(row);
      continue;
    }

    const fullComment = (row.comment ?? "").trim();
    if (!fullComment) {
      report.counts.emptyComment++;
      report.emptyComment.push(row);
      continue;
    }

    if (seen.has(license)) {
      report.counts.duplicateInSource++;
      report.duplicateInSource.push(row);
      continue;
    }
    if (existing.has(license)) {
      report.counts.alreadyInShavisia++;
      report.alreadyInShavisia.push(row);
      continue;
    }

    const truncated = fullComment.length > COMMENT_MAX;
    const metadata: Prisma.JsonObject = {};
    if (row.park_id != null) metadata.park_id = row.park_id;
    if (row.admin_id != null) metadata.admin_id = row.admin_id;
    if (row.phone) metadata.phone = row.phone;
    if (row.car_number) metadata.car_number = row.car_number;
    if (row.category) metadata.category = row.category;
    if (truncated) metadata.original_comment = fullComment;
    if (originalLicense) metadata.original_license = originalLicense;

    if (!dryRun) {
      await prisma.blacklistEntry.create({
        data: {
          licenseNumber: license,
          comment: truncated ? fullComment.slice(0, COMMENT_MAX) : fullComment,
          status: "ACTIVE",
          createdVia: "API",
          apiClientId: paypro.id,
          metadata,
          createdAt: row.created_at ?? undefined,
          updatedAt: row.updated_at ?? row.created_at ?? undefined,
        },
      });
    }
    seen.add(license);
    report.counts.migrated++;
  }

  await prisma.$disconnect();

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`${dryRun ? "[DRY RUN] " : ""}PayPro migration finished:`);
  console.table(report.counts);
  console.log(`Full report: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
