-- ============================================================================
-- Seed File: reset_demo.sql
-- Environment: Demo Only
-- Purpose: Provides stored procedure reset_demo_data() to restore the demo academy
--          to a pristine, clean state on demand.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_demo_data(p_institution_id UUID DEFAULT 'b5bd788c-8297-4a96-b8b3-157814504fba')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_demo BOOLEAN;
    v_result JSONB;
BEGIN
    -- 1. Guard: ONLY allow resetting institutions explicitly marked with is_demo = true
    SELECT is_demo INTO v_is_demo FROM public.institutions WHERE id = p_institution_id;
    IF v_is_demo IS NOT TRUE THEN
        RAISE EXCEPTION 'Safety Guard: reset_demo_data() cannot be run on a non-demo institution (ID: %). Operation blocked.', p_institution_id;
    END IF;

    -- 2. Clear volatile child data for this demo institution
    DELETE FROM public.attendance WHERE institution_id = p_institution_id;
    DELETE FROM public.report_cards WHERE institution_id = p_institution_id;
    DELETE FROM public.exam_results WHERE institution_id = p_institution_id;
    DELETE FROM public.borrowed_books WHERE institution_id = p_institution_id;
    DELETE FROM public.receipts WHERE institution_id = p_institution_id;
    DELETE FROM public.payment_flags WHERE institution_id = p_institution_id;
    DELETE FROM public.payments WHERE institution_id = p_institution_id;
    DELETE FROM public.invoices WHERE institution_id = p_institution_id;
    DELETE FROM public.ledger_entries WHERE institution_id = p_institution_id;
    DELETE FROM public.messages WHERE institution_id = p_institution_id;
    DELETE FROM public.announcements WHERE institution_id = p_institution_id;
    DELETE FROM public.notifications WHERE institution_id = p_institution_id;

    -- 3. Reset identifier counters for this demo institution
    UPDATE public.identifier_counters SET last_number = 3 WHERE institution_id = p_institution_id AND entity_type = 'student';
    UPDATE public.identifier_counters SET last_number = 2 WHERE institution_id = p_institution_id AND entity_type = 'staff';
    UPDATE public.identifier_counters SET last_number = 2 WHERE institution_id = p_institution_id AND entity_type = 'parent';
    UPDATE public.identifier_counters SET last_number = 2 WHERE institution_id = p_institution_id AND entity_type = 'admin';

    v_result := jsonb_build_object(
        'success', true,
        'institution_id', p_institution_id,
        'status', 'demo_data_reset_complete',
        'timestamp', NOW()
    );

    RETURN v_result;
END;
$$;
