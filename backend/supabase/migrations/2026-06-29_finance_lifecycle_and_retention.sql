-- Finance lifecycle + retention hardening
-- Adds optional columns used by backend safeguards.

ALTER TABLE IF EXISTS fee_structures
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS fee_structure_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until timestamptz;

UPDATE fee_structures
SET status_updated_at = COALESCE(status_updated_at, updated_at, created_at)
WHERE status_updated_at IS NULL;

UPDATE payments
SET
  status_updated_at = COALESCE(status_updated_at, reviewed_at, updated_at, created_at),
  confirmed_at = COALESCE(confirmed_at, CASE WHEN status = 'completed' THEN reviewed_at END),
  retention_until = COALESCE(retention_until, payment_date + interval '365 day')
WHERE status_updated_at IS NULL
   OR (status = 'completed' AND confirmed_at IS NULL)
   OR retention_until IS NULL;
