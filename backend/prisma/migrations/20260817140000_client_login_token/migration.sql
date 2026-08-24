-- AlterTable
-- Add single-use magic-login token fields to Client (hash + expiry)
ALTER TABLE "Client" ADD COLUMN "loginTokenHash" TEXT;
ALTER TABLE "Client" ADD COLUMN "loginTokenExpiresAt" TIMESTAMP(3);