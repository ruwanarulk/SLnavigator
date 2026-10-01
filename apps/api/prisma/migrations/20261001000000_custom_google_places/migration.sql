-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('CURATED', 'GOOGLE');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "address" TEXT,
ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "source" "LocationSource" NOT NULL DEFAULT 'CURATED';

-- CreateIndex
CREATE UNIQUE INDEX "Location_googlePlaceId_key" ON "Location"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Location_source_idx" ON "Location"("source");

