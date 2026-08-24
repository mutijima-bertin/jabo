-- AlterTable
-- Add unique constraint on Client.email
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
