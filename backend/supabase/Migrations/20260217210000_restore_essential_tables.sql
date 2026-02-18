-- Migration: Restore Essential Tables & Add Bursary Role
-- Created: 2026-02-17 21:00:00

BEGIN;

-- 1. Restore Student Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
    notes TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
-- Policies for student attendance
CREATE POLICY "Everyone view student attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Teachers/Admins manage student attendance" ON public.attendance FOR ALL USING (
    public.get_current_user_role() IN ('admin', 'teacher')
);

-- 2. Restore Fee Structures Table
-- Note: We'll keep the subject-specific fee_config as well, but global fees need a table.
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    academic_year TEXT,
    term TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view fee structures" ON public.fee_structures FOR SELECT USING (true);
CREATE POLICY "Admins manage fee structures" ON public.fee_structures FOR ALL USING (
    public.get_current_user_role() IN ('admin', 'bursary')
);

-- 3. Add Bursary Role to Users
-- We need to update the check constraint on users.role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'student', 'teacher', 'parent', 'bursary'));

-- Add bursary specific ID table (similar to admins)
CREATE TABLE IF NOT EXISTS public.bursars (
    id TEXT PRIMARY KEY DEFAULT public.generate_custom_id('BUR'),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bursars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view bursars" ON public.bursars FOR SELECT USING (true);
CREATE POLICY "Admins manage bursars" ON public.bursars FOR ALL USING (public.get_current_user_role() = 'admin');

-- 4. Automatic Balance Tracking (Add balance field to students)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fee_balance NUMERIC(12, 2) DEFAULT 0;

-- Trigger to update balance on fee_payment
CREATE OR REPLACE FUNCTION public.update_student_fee_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id TEXT;
BEGIN
    IF NEW.type = 'fee_payment' THEN
        -- Get custom student_id from user_id
        SELECT id INTO v_student_id FROM public.students WHERE user_id = NEW.user_id;
        
        IF v_student_id IS NOT NULL THEN
            IF NEW.direction = 'inflow' AND NEW.status = 'completed' THEN
                UPDATE public.students 
                SET fee_balance = fee_balance - NEW.amount 
                WHERE id = v_student_id;
            ELSIF NEW.direction = 'outflow' THEN
                -- This shouldn't normally happen for fee_payment, but for safety:
                UPDATE public.students 
                SET fee_balance = fee_balance + NEW.amount 
                WHERE id = v_student_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_update_fee_balance ON public.financial_transactions;
CREATE TRIGGER tr_update_fee_balance
AFTER INSERT OR UPDATE OF status ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_student_fee_balance();

-- Function to re-calculate all balances (for initial run)
CREATE OR REPLACE FUNCTION public.recalculate_all_student_balances()
RETURNS void AS $$
BEGIN
    -- 1. Reset balances to sum of all active fee structures
    UPDATE public.students s
    SET fee_balance = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.fee_structures 
        WHERE is_active = true
    );
    
    -- 2. Subtract all completed fee payments
    UPDATE public.students s
    SET fee_balance = fee_balance - (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.financial_transactions ft
        WHERE ft.user_id = s.user_id 
          AND ft.type = 'fee_payment' 
          AND ft.status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
