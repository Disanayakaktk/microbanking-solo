-- Add missing last_login support for dashboard system information.
-- Safe to run multiple times.

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS last_login timestamp;
