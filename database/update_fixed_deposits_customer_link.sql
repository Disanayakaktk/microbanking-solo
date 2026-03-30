-- Track the selected customer per fixed deposit so reports show the correct owner.
-- Safe to run multiple times.

ALTER TABLE fixed_deposits
ADD COLUMN IF NOT EXISTS customer_id int;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fixed_deposits_customer_id_fkey'
  ) THEN
    ALTER TABLE fixed_deposits
    ADD CONSTRAINT fixed_deposits_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill where account has exactly one holder (unambiguous historical data only).
UPDATE fixed_deposits fd
SET customer_id = holder.customer_id
FROM (
    SELECT t.account_id, MIN(t.customer_id) AS customer_id
    FROM takes t
    GROUP BY t.account_id
    HAVING COUNT(DISTINCT t.customer_id) = 1
) holder
WHERE fd.customer_id IS NULL
  AND fd.account_id = holder.account_id;

CREATE INDEX IF NOT EXISTS idx_fixed_deposits_customer_id ON fixed_deposits(customer_id);
