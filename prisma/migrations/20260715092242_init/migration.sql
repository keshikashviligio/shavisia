-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "CreatedVia" AS ENUM ('WEB', 'API');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'CHANGE_PHONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistEntry" (
    "id" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "comment" VARCHAR(500) NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdVia" "CreatedVia" NOT NULL,
    "createdById" TEXT,
    "apiClientId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "BlacklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ApiClient_name_key" ON "ApiClient"("name");

-- CreateIndex
CREATE INDEX "BlacklistEntry_licenseNumber_status_idx" ON "BlacklistEntry"("licenseNumber", "status");

-- CreateIndex
CREATE INDEX "BlacklistEntry_createdById_status_idx" ON "BlacklistEntry"("createdById", "status");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_idx" ON "OtpCode"("phone", "purpose");

-- AddForeignKey
ALTER TABLE "BlacklistEntry" ADD CONSTRAINT "BlacklistEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlacklistEntry" ADD CONSTRAINT "BlacklistEntry_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- licenseNumber unique among ACTIVE entries only (soft delete allows re-adding after removal)
CREATE UNIQUE INDEX "BlacklistEntry_licenseNumber_active_key"
  ON "BlacklistEntry" ("licenseNumber")
  WHERE "status" = 'ACTIVE';

-- exactly one creator: a website user XOR an API client
ALTER TABLE "BlacklistEntry"
  ADD CONSTRAINT "BlacklistEntry_one_creator_check"
  CHECK (("createdById" IS NOT NULL) <> ("apiClientId" IS NOT NULL));

-- fast PayPro park-scoped queries
CREATE INDEX "BlacklistEntry_apiClient_park_idx"
  ON "BlacklistEntry" ("apiClientId", (metadata ->> 'park_id'));
