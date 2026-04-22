-- Prevent duplicate active reservations per user/drop under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS "reservation_one_active_per_user_drop"
ON "Reservation" (user_id, drop_id)
WHERE status = 'ACTIVE'::"ReservationStatus";

-- Keep stock invariant valid at database level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'drop_available_stock_non_negative'
  ) THEN
    ALTER TABLE "Drop"
    ADD CONSTRAINT "drop_available_stock_non_negative"
    CHECK (available_stock >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'drop_available_stock_not_greater_than_total'
  ) THEN
    ALTER TABLE "Drop"
    ADD CONSTRAINT "drop_available_stock_not_greater_than_total"
    CHECK (available_stock <= total_stock);
  END IF;
END $$;
