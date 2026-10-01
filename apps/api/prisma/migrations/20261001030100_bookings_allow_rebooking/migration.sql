-- DropIndex
DROP INDEX "Booking_tripId_key";

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

