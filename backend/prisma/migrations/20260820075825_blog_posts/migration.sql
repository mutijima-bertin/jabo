-- CreateEnum
CREATE TYPE "PostContentType" AS ENUM ('PROJECT_RECAP', 'CLIENT_STORY', 'EDUCATIONAL', 'STUDIO_NEWS');

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleRw" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptRw" TEXT,
    "contentEn" TEXT NOT NULL,
    "contentRw" TEXT NOT NULL,
    "contentType" "PostContentType" NOT NULL DEFAULT 'PROJECT_RECAP',
    "coverImageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");
