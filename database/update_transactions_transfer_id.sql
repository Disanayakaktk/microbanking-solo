-- Add deterministic transfer_id support for exact transfer pairing.
CREATE SEQUENCE IF NOT EXISTS transfer_group_seq START 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'transfer_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN transfer_id BIGINT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);

-- Keep sequence ahead of existing values if any were manually assigned.
SELECT setval(
    'transfer_group_seq',
    GREATEST(
        COALESCE((SELECT MAX(transfer_id) FROM transactions), 0),
        COALESCE((SELECT last_value FROM transfer_group_seq), 0)
    ) + 1,
    false
);
