-- Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Teachers can view their own announcements
CREATE POLICY "Teachers can view own announcements" 
ON public.announcements FOR SELECT 
TO authenticated 
USING (
    teacher_id IN (
        SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
);

-- 2. Teachers can insert announcements for themselves
CREATE POLICY "Teachers can insert own announcements" 
ON public.announcements FOR INSERT 
TO authenticated 
WITH CHECK (
    teacher_id IN (
        SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
);

-- 3. Teachers can update own announcements
CREATE POLICY "Teachers can update own announcements" 
ON public.announcements FOR UPDATE 
TO authenticated 
USING (
    teacher_id IN (
        SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
);

-- 4. Teachers can delete own announcements
CREATE POLICY "Teachers can delete own announcements" 
ON public.announcements FOR DELETE 
TO authenticated 
USING (
    teacher_id IN (
        SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
);

-- 5. Students can view announcements for courses they are enrolled in
CREATE POLICY "Students can view course announcements" 
ON public.announcements FOR SELECT 
TO authenticated 
USING (
    course_id IN (
        SELECT class_id FROM public.enrollments 
        WHERE student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    )
);

-- Allow admins to view all (optional, good for management)
CREATE POLICY "Admins can view all announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  )
);
