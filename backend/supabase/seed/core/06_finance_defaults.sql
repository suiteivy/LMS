-- ============================================================================
-- Seed File: 06_finance_defaults.sql
-- Environment: Core (All environments)
-- Purpose: Default payment methods, flag reasons, fee categories, and finance settings.
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.institutions LOOP
        -- 1. Default Payment Methods
        INSERT INTO public.payment_methods (institution_id, name, code, requires_reference, requires_proof, display_order)
        VALUES 
            (r.id, 'M-Pesa', 'mpesa', true, true, 1),
            (r.id, 'Bank Deposit / Wire', 'bank_transfer', true, true, 2),
            (r.id, 'Cash', 'cash', false, false, 3),
            (r.id, 'Cheque', 'cheque', true, true, 4)
        ON CONFLICT (institution_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            requires_reference = EXCLUDED.requires_reference,
            requires_proof = EXCLUDED.requires_proof,
            display_order = EXCLUDED.display_order;

        -- 2. Default Flag Reasons
        INSERT INTO public.flag_reasons (institution_id, reason_code, label, description, display_order)
        VALUES 
            (r.id, 'not_found', 'Payment not found on statement', 'The reference code or amount does not appear on the official bank/M-Pesa statement.', 1),
            (r.id, 'amount_mismatch', 'Amount mismatch', 'The amount entered in the app differs from the actual funds received on the statement.', 2),
            (r.id, 'duplicate_reference', 'Duplicate transaction reference', 'A transaction with this exact reference code has already been confirmed.', 3),
            (r.id, 'invalid_account', 'Invalid or unassociated student', 'The payment cannot be mapped to the claimed student or account.', 4),
            (r.id, 'other', 'Other issue', 'A manual discrepancy noted by bursar or finance team.', 5)
        ON CONFLICT (institution_id, reason_code) DO UPDATE SET
            label = EXCLUDED.label,
            description = EXCLUDED.description,
            display_order = EXCLUDED.display_order;

        -- 3. Default Fee Categories
        INSERT INTO public.fee_categories (institution_id, name, description, display_order)
        VALUES 
            (r.id, 'School Fees', 'Core academic tuition and development', 1),
            (r.id, 'Services', 'Transport, meals, and boarding facilities', 2),
            (r.id, 'Activities', 'Sports, clubs, excursions, and extracurriculars', 3),
            (r.id, 'Administrative', 'Admission, exam registration, identity cards, and assessments', 4)
        ON CONFLICT (institution_id, name) DO UPDATE SET
            description = EXCLUDED.description,
            display_order = EXCLUDED.display_order;

        -- 4. Default Finance Settings
        INSERT INTO public.finance_settings (
            institution_id, currency_code, receipt_prefix, receipt_padding, receipt_footer_text,
            allow_overpayment_credit, allow_partial_payments, grace_period_days, late_penalty_percent,
            max_upload_size_mb, retention_days, auto_reminder_enabled
        ) VALUES (
            r.id, 'KES', 'REC-', 6, 'Thank you for your payment. Please keep this receipt for your records.',
            true, true, 14, 0.00,
            10, 2555, true
        ) ON CONFLICT (institution_id) DO UPDATE SET
            currency_code = EXCLUDED.currency_code,
            receipt_prefix = EXCLUDED.receipt_prefix,
            receipt_padding = EXCLUDED.receipt_padding,
            receipt_footer_text = EXCLUDED.receipt_footer_text,
            allow_overpayment_credit = EXCLUDED.allow_overpayment_credit,
            allow_partial_payments = EXCLUDED.allow_partial_payments;
    END LOOP;
END $$;
