-- Add missing employee status support for activate/deactivate feature.
-- Safe to run multiple times.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status_enum') THEN
        CREATE TYPE employee_status_enum AS ENUM ('Active', 'Inactive');
    END IF;
END $$;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS status employee_status_enum;

UPDATE employees
SET status = COALESCE(status, 'Active');

ALTER TABLE employees
ALTER COLUMN status SET DEFAULT 'Active',
ALTER COLUMN status SET NOT NULL;
