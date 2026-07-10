BEGIN;

ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS origin_type text,
  ADD COLUMN IF NOT EXISTS origin_id text,
  ADD COLUMN IF NOT EXISTS origin_label text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id text,
  ADD COLUMN IF NOT EXISTS target_label text,
  ADD COLUMN IF NOT EXISTS recorded_by_user_id text,
  ADD COLUMN IF NOT EXISTS recorded_by_label text;

ALTER TABLE IF EXISTS financial_transactions
  ADD COLUMN IF NOT EXISTS origin_type text,
  ADD COLUMN IF NOT EXISTS origin_id text,
  ADD COLUMN IF NOT EXISTS origin_label text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id text,
  ADD COLUMN IF NOT EXISTS target_label text,
  ADD COLUMN IF NOT EXISTS recorded_by_user_id text,
  ADD COLUMN IF NOT EXISTS recorded_by_label text;

UPDATE payments p
SET
  target_type = COALESCE(target_type, 'student'),
  target_id = COALESCE(target_id, p.student_id::text),
  target_label = COALESCE(target_label, CASE WHEN p.student_id IS NOT NULL THEN 'Student ' || p.student_id::text ELSE NULL END),
  origin_type = COALESCE(origin_type, CASE WHEN p.fee_structure_id IS NOT NULL THEN 'fee_structure' ELSE 'legacy_payment' END),
  origin_id = COALESCE(origin_id, p.fee_structure_id::text),
  origin_label = COALESCE(origin_label, CASE WHEN p.fee_structure_id IS NOT NULL THEN 'Fee Structure ' || p.fee_structure_id::text ELSE 'Legacy Payment' END),
  recorded_by_user_id = COALESCE(recorded_by_user_id, NULL),
  recorded_by_label = COALESCE(recorded_by_label, 'Legacy/Unknown')
WHERE
  target_type IS NULL
  OR target_id IS NULL
  OR target_label IS NULL
  OR origin_type IS NULL
  OR origin_label IS NULL
  OR recorded_by_label IS NULL;

UPDATE financial_transactions ft
SET
  origin_type = COALESCE(origin_type, CASE WHEN ft.type = 'revenue_deduction' THEN 'revenue_pool' ELSE 'legacy_transaction' END),
  origin_id = COALESCE(origin_id, CASE WHEN ft.type = 'revenue_deduction' THEN ft.institution_id::text ELSE NULL END),
  origin_label = COALESCE(origin_label, CASE WHEN ft.type = 'revenue_deduction' THEN 'Revenue' ELSE 'Legacy Transaction' END),
  target_type = COALESCE(target_type, CASE WHEN ft.type = 'revenue_deduction' THEN 'custom' ELSE NULL END),
  target_id = COALESCE(target_id, NULL),
  target_label = COALESCE(target_label, CASE WHEN ft.type = 'revenue_deduction' THEN COALESCE(ft.meta->>'target', 'Legacy/Unknown') ELSE NULL END),
  recorded_by_user_id = COALESCE(recorded_by_user_id, ft.meta->>'recorded_by', ft.user_id::text),
  recorded_by_label = COALESCE(recorded_by_label, ft.meta->>'recorded_by_name', 'Legacy/Unknown')
WHERE
  origin_type IS NULL
  OR origin_label IS NULL
  OR recorded_by_label IS NULL
  OR (ft.type = 'revenue_deduction' AND (target_type IS NULL OR target_label IS NULL));

CREATE INDEX IF NOT EXISTS idx_payments_target_id ON payments(target_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by_user_id ON payments(recorded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_target_id ON financial_transactions(target_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_recorded_by_user_id ON financial_transactions(recorded_by_user_id);

COMMIT;
