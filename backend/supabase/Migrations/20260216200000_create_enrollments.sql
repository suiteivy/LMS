-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('enrolled', 'completed', 'dropped')) DEFAULT 'enrolled',
    grade TEXT,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, subject_id)
);

-- RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON public.enrollments
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view enrollments for their subjects" ON public.enrollments
    FOR SELECT USING (
        subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = auth.uid() OR teacher_id IN (
                SELECT id FROM public.teachers WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage enrollments" ON public.enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow students to enroll themselves (insert)
CREATE POLICY "Students can enroll themselves" ON public.enrollments
    FOR INSERT WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );
