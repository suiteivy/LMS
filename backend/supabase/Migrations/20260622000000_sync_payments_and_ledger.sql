-- Migration: Sync Payments and Ledger
-- Created: 2026-06-22

-- 1. Backfill existing completed fee payments from financial_transactions to payments
DO $$
DECLARE
    r RECORD;
    v_student_id TEXT;
    v_payment_id UUID;
BEGIN
    FOR r IN 
        SELECT ft.id as tx_id, ft.user_id, ft.amount, ft.method, ft.date, ft.institution_id, ft.reference_id 
        FROM public.financial_transactions ft
        WHERE ft.type = 'fee_payment' AND ft.status = 'completed'
    LOOP
        -- Find student_id for this user_id
        SELECT id INTO v_student_id FROM public.students WHERE user_id = r.user_id;
        
        IF v_student_id IS NOT NULL THEN
            -- Check if a payment record already exists
            IF NOT EXISTS (
                SELECT 1 FROM public.payments 
                WHERE student_id = v_student_id AND amount = r.amount AND payment_date = r.date
            ) THEN
                v_payment_id := gen_random_uuid();
                
                -- Insert into payments
                INSERT INTO public.payments (
                    id,
                    student_id,
                    fee_structure_id,
                    amount,
                    payment_method,
                    reference_number,
                    payment_date,
                    status,
                    institution_id,
                    is_evidence_confirmed,
                    admin_notes,
                    created_at,
                    updated_at
                ) VALUES (
                    v_payment_id,
                    v_student_id,
                    NULL,
                    r.amount,
                    COALESCE(r.method, 'bank_transfer'),
                    r.reference_id,
                    r.date,
                    'completed',
                    r.institution_id,
                    TRUE,
                    'Migrated from transactions general ledger',
                    r.date,
                    r.date
                );
                
                -- Link the transaction back to the new payment
                UPDATE public.financial_transactions 
                SET reference_id = v_payment_id::text 
                WHERE id = r.tx_id;
                
                -- Update student fee balance
                UPDATE public.students 
                SET fee_balance = COALESCE(fee_balance, 0) - r.amount
                WHERE id = v_student_id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 2. Create the Trigger Function to automate synchronization
CREATE OR REPLACE FUNCTION public.handle_payment_status_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- If a payment is marked as completed (approved or manually recorded as completed)
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Get student's user_id
        SELECT user_id INTO v_user_id FROM public.students WHERE id = NEW.student_id;
        
        -- Decrement student's fee balance
        UPDATE public.students 
        SET fee_balance = COALESCE(fee_balance, 0) - NEW.amount 
        WHERE id = NEW.student_id;
        
        -- Insert general ledger transaction if not already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.financial_transactions 
            WHERE reference_id = NEW.id::text AND type = 'fee_payment'
        ) THEN
            INSERT INTO public.financial_transactions (
                institution_id,
                user_id,
                type,
                direction,
                amount,
                date,
                method,
                status,
                reference_id,
                meta
            ) VALUES (
                NEW.institution_id,
                v_user_id,
                'fee_payment',
                'inflow',
                NEW.amount,
                COALESCE(NEW.payment_date, NOW())::date,
                NEW.payment_method,
                'completed',
                NEW.id::text,
                jsonb_build_object(
                    'notes', NEW.admin_notes,
                    'reference_number', NEW.reference_number,
                    'fee_structure_id', NEW.fee_structure_id
                )
            );
        END IF;
        
    -- If a payment is rolled back (changed from completed to failed/pending)
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        -- Increment student's fee balance back
        UPDATE public.students 
        SET fee_balance = COALESCE(fee_balance, 0) + OLD.amount 
        WHERE id = NEW.student_id;
        
        -- Delete or mark failed the general ledger transaction
        DELETE FROM public.financial_transactions 
        WHERE reference_id = OLD.id::text AND type = 'fee_payment';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create the Trigger on payments table
DROP TRIGGER IF EXISTS tr_sync_payment_status ON public.payments;
CREATE TRIGGER tr_sync_payment_status
AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_status_sync();
