-- Add missing FD plan columns for editable min amount and penalty.
-- Safe to run multiple times.

ALTER TABLE fd_plans
ADD COLUMN IF NOT EXISTS min_amount decimal(12,2);

ALTER TABLE fd_plans
ADD COLUMN IF NOT EXISTS penalty_rate decimal(5,2);

UPDATE fd_plans
SET min_amount = COALESCE(min_amount, 10000),
    penalty_rate = COALESCE(penalty_rate, 1.00);

ALTER TABLE fd_plans
ALTER COLUMN min_amount SET NOT NULL,
ALTER COLUMN penalty_rate SET NOT NULL;

ALTER TABLE fd_plans
ALTER COLUMN min_amount SET DEFAULT 10000,
ALTER COLUMN penalty_rate SET DEFAULT 1.00;
