BEGIN;

-- Preserve legacy value for audit, then normalize to allowed type
UPDATE financial_transactions
SET
  meta = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{legacy_type}',
    to_jsonb(type),
    true
  ),
  type = 'other'
WHERE type = 'subscription';

-- Recreate constraint including revenue_deduction
ALTER TABLE IF EXISTS financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_type_check;

ALTER TABLE IF EXISTS financial_transactions
  ADD CONSTRAINT financial_transactions_type_check
  CHECK (
    type IS NULL OR type IN (
      'fee_payment',
      'salary_payout',
      'expense',
      'grant',
      'other',
      'revenue_deduction'
    )
  );

COMMIT;