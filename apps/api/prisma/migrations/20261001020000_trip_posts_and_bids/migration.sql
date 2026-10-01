-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('OPEN', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ServiceNeed" AS ENUM ('GUIDE_AND_TRANSPORT', 'GUIDE_ONLY', 'TRANSPORT_ONLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TripStatus" ADD VALUE 'POSTED';
ALTER TYPE "TripStatus" ADD VALUE 'BOOKED';
ALTER TYPE "TripStatus" ADD VALUE 'COMPLETED';

-- CreateTable
CREATE TABLE "TripPost" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "budgetMinUsd" INTEGER NOT NULL,
    "budgetMaxUsd" INTEGER NOT NULL,
    "need" "ServiceNeed" NOT NULL DEFAULT 'GUIDE_AND_TRANSPORT',
    "interests" TEXT[],
    "languages" TEXT[],
    "notes" TEXT NOT NULL DEFAULT '',
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "priceUsd" INTEGER NOT NULL,
    "inclusions" TEXT[],
    "pitch" TEXT NOT NULL,
    "availabilityConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripPost_tripId_key" ON "TripPost"("tripId");

-- CreateIndex
CREATE INDEX "TripPost_status_deadline_idx" ON "TripPost"("status", "deadline");

-- CreateIndex
CREATE INDEX "Bid_providerId_status_idx" ON "Bid"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_postId_providerId_key" ON "Bid"("postId", "providerId");

-- AddForeignKey
ALTER TABLE "TripPost" ADD CONSTRAINT "TripPost_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TripPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

