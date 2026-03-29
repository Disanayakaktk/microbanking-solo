-- Add branch_id to customers for branch-based onboarding and account constraints.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN branch_id INT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'customers_branch_id_fkey'
    ) THEN
        ALTER TABLE customers
        ADD CONSTRAINT customers_branch_id_fkey
        FOREIGN KEY (branch_id) REFERENCES branch(branch_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
