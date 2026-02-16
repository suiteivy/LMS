-- Migration: Feature Enhancements (Timetable, Funds, Attendance, Profile)
-- Created: 2026-02-16 16:00:00

BEGIN;

-- 1. Profile Enhancements
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Timetable Management
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    day_of_week TEXT CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, day_of_week, start_time) -- Prevent double booking class
);

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view timetables" ON public.timetables FOR SELECT USING (true);
CREATE POLICY "Admins manage timetables" ON public.timetables FOR ALL USING (public.get_current_user_role() = 'admin');

-- 3. Fund Allocation
CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Tracked via triggers or app logic
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID REFERENCES public.funds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT, -- e.g., 'Maintenance', 'Salaries', 'Events'
    allocation_date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('planned', 'approved', 'spent')) DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage funds" ON public.funds FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins manage fund allocations" ON public.fund_allocations FOR ALL USING (public.get_current_user_role() = 'admin');

-- 4. Attendance Refactor
-- Drop legacy student attendance if it exists (Optional: Back up first if needed, but per instruction "Remove")
DROP TABLE IF EXISTS public.attendance; 

CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    notes TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, date)
);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage teacher attendance" ON public.teacher_attendance FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Teachers view own attendance" ON public.teacher_attendance FOR SELECT USING (teacher_id = public.current_user_teacher_id());

COMMIT;
