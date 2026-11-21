-- ============================================================================
-- Seed File: 04_demo_finance.sql
-- Environment: Demo Only
-- Purpose: Complete financial module demo data covering fee structures, optional items,
--          billing, payments across all lifecycles (submitted, under_review, confirmed, flagged, reversed),
--          invoices, receipts, and ledger entries.
-- ============================================================================

DO $$
DECLARE
    v_inst_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';
    v_year_id UUID := 'c1111111-1111-1111-1111-111111111111';
    v_term1_id UUID := 'd1111111-1111-1111-1111-111111111111';

    -- Students
    v_stud1_id UUID;
    v_stud2_id UUID;
    v_stud3_id UUID;

    -- Admins / Bursars
    v_admin1_id UUID;

    -- Categories
    v_cat_fees UUID;
    v_cat_services UUID;

    -- Fee Types
    v_ft_tuition UUID := 'b1111111-1111-1111-1111-111111111111';
    v_ft_transport UUID := 'b2222222-2222-2222-2222-222222222222';
    v_ft_activity UUID := 'b3333333-3333-3333-3333-333333333333';

    -- Fee Structure
    v_fs_g7 UUID := 'e1111111-0000-0000-0000-000000000001';

    -- Payments
    v_pmt_conf UUID := 'p1111111-1111-1111-1111-111111111111';
    v_pmt_revw UUID := 'p2222222-2222-2222-2222-222222222222';
    v_pmt_flag UUID := 'p3333333-3333-3333-3333-333333333333';

    -- Invoices & Receipts
    v_inv1 UUID := 'i1111111-1111-1111-1111-111111111111';
    v_rec1 UUID := 'r1111111-1111-1111-1111-111111111111';
BEGIN
    SELECT id INTO v_stud1_id FROM public.students WHERE student_identifier = '0001';
    SELECT id INTO v_stud2_id FROM public.students WHERE student_identifier = '0002';
    SELECT id INTO v_stud3_id FROM public.students WHERE student_identifier = '0003';
    SELECT user_id INTO v_admin1_id FROM public.admins WHERE admin_identifier = 'AD0001';

    SELECT id INTO v_cat_fees FROM public.fee_categories WHERE institution_id = v_inst_id AND name = 'School Fees' LIMIT 1;
    SELECT id INTO v_cat_services FROM public.fee_categories WHERE institution_id = v_inst_id AND name = 'Services' LIMIT 1;

    -- 1. Create Fee Types
    INSERT INTO public.fee_types (id, institution_id, category_id, name, description, amount, billing_frequency, is_mandatory, status, created_at, updated_at)
    VALUES
        (v_ft_tuition, v_inst_id, v_cat_fees, 'Tuition & Development Fee', 'Core curriculum teaching fees', 35000.00, 'termly', true, 'active', NOW(), NOW()),
        (v_ft_transport, v_inst_id, v_cat_services, 'School Bus Transport', 'Zone 1 bus transport services', 8500.00, 'termly', false, 'active', NOW(), NOW()),
        (v_ft_activity, v_inst_id, v_cat_fees, 'Sports & Extracurricular', 'Inter-school athletics and clubs', 3000.00, 'termly', true, 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

    -- 2. Create Fee Structure for Grade 7
    INSERT INTO public.fee_structures (id, institution_id, academic_year_id, term_id, level, due_date, status, created_at, updated_at)
    VALUES (v_fs_g7, v_inst_id, v_year_id, v_term1_id, 'Grade 7', '2026-02-15', 'published', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Link Items
    INSERT INTO public.fee_structure_items (fee_structure_id, fee_type_id, institution_id, amount, is_optional, created_at)
    VALUES
        (v_fs_g7, v_ft_tuition, v_inst_id, 35000.00, false, NOW()),
        (v_fs_g7, v_ft_activity, v_inst_id, 3000.00, false, NOW()),
        (v_fs_g7, v_ft_transport, v_inst_id, 8500.00, true, NOW())
    ON CONFLICT DO NOTHING;

    -- 3. Student Invoices
    IF v_stud1_id IS NOT NULL THEN
        INSERT INTO public.invoices (id, institution_id, student_id, invoice_number, total_amount, amount_paid, balance, currency, status, term, academic_year, due_date, issued_at, created_at, updated_at)
        VALUES (v_inv1, v_inst_id, v_stud1_id, 'INV-2026-0001', 38000.00, 38000.00, 0.00, 'KES', 'paid', 'Term 1', '2026', '2026-02-15', NOW(), NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;

        -- 4. Confirmed Payment & Receipt for Student 1
        INSERT INTO public.payments (
            id, institution_id, student_id, amount, total_amount, confirmed_amount, currency, status,
            payment_method, reference_number, confirmed_by, confirmed_at, created_at, updated_at
        )
        VALUES (
            v_pmt_conf, v_inst_id, v_stud1_id, 38000.00, 38000.00, 38000.00, 'KES', 'confirmed',
            'mpesa', 'QGH8712KLM', v_admin1_id, NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.receipts (id, institution_id, payment_id, receipt_number, student_id, amount, currency, issued_by, issued_at, created_at)
        VALUES (v_rec1, v_inst_id, v_pmt_conf, 'REC-000001', v_stud1_id, 38000.00, 'KES', v_admin1_id, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;

        -- Ledger Entry
        INSERT INTO public.ledger_entries (
            institution_id, transaction_type, entry_type, amount, balance_after,
            account_id, reference_type, reference_id, currency, description, created_at
        )
        VALUES (
            v_inst_id, 'payment_received', 'credit', 38000.00, 38000.00,
            v_stud1_id, 'payment', v_pmt_conf, 'KES', 'Full payment for Term 1 tuition and activities', NOW()
        );
    END IF;

    -- 5. Under-Review Payment for Student 2
    IF v_stud2_id IS NOT NULL THEN
        INSERT INTO public.payments (
            id, institution_id, student_id, amount, total_amount, currency, status,
            payment_method, reference_number, created_at, updated_at
        )
        VALUES (
            v_pmt_revw, v_inst_id, v_stud2_id, 20000.00, 20000.00, 'KES', 'under_review',
            'bank_transfer', 'EFT-78891023', NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 6. Flagged Payment for Student 3 (Reason: amount mismatch)
    IF v_stud3_id IS NOT NULL THEN
        INSERT INTO public.payments (
            id, institution_id, student_id, amount, total_amount, currency, status,
            payment_method, reference_number, created_at, updated_at
        )
        VALUES (
            v_pmt_flag, v_inst_id, v_stud3_id, 15000.00, 15000.00, 'KES', 'flagged',
            'mpesa', 'QGH9912XYZ', NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.payment_flags (
            institution_id, payment_id, flag_reason_id, flagged_by, resolution_status, comments, created_at, updated_at
        )
        SELECT 
            v_inst_id, v_pmt_flag, fr.id, v_admin1_id, 'pending', 'Submitted slip says KES 15,000 but bank notification confirms KES 10,000', NOW(), NOW()
        FROM public.flag_reasons fr
        WHERE fr.institution_id = v_inst_id AND fr.reason_code = 'amount_mismatch'
        LIMIT 1;
    END IF;

END $$;
