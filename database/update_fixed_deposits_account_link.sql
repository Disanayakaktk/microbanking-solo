-- Allow one account to have multiple fixed deposits by moving ownership to fixed_deposits.account_id.
-- Safe to run multiple times.

ALTER TABLE fixed_deposits
ADD COLUMN IF NOT EXISTS account_id int;

UPDATE fixed_deposits fd
SET account_id = a.account_id
FROM accounts a
WHERE a.fd_id = fd.fd_id
  AND fd.account_id IS NULL;

-- Keep nullable for now to avoid breaking any historical orphan data during migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fixed_deposits_account_id_fkey'
  ) THEN
    ALTER TABLE fixed_deposits
    ADD CONSTRAINT fixed_deposits_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fixed_deposits_account_id ON fixed_deposits(account_id);
