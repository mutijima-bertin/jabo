-- CreateEnum
CREATE TYPE "TestimonialSource" AS ENUM ('ADMIN', 'CLIENT');

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "source" "TestimonialSource" NOT NULL DEFAULT 'ADMIN';

-- CreateIndex
CREATE INDEX "Testimonial_clientId_idx" ON "Testimonial"("clientId");

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
