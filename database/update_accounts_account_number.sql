-- Add and backfill account_number so UI can show real numeric account numbers.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'accounts' AND column_name = 'account_number'
    ) THEN
        ALTER TABLE accounts ADD COLUMN account_number VARCHAR(20);
    END IF;
END $$;

-- Backfill existing rows with deterministic unique numeric account numbers.
UPDATE accounts
SET account_number = TO_CHAR(COALESCE(created_at, NOW()), 'YYYYMMDD') || LPAD(account_id::text, 6, '0')
WHERE account_number IS NULL OR TRIM(account_number) = '';

-- Ensure uniqueness and not-null guarantee.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'accounts' AND indexname = 'idx_accounts_account_number_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_accounts_account_number_unique ON accounts(account_number);
    END IF;
END $$;

ALTER TABLE accounts
ALTER COLUMN account_number SET NOT NULL;
