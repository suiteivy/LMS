-- Rename course_id to subject_id in announcements table
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'course_id') THEN
        ALTER TABLE public.announcements RENAME COLUMN course_id TO subject_id;
    END IF;
END $$;

-- Update policies to use subject_id instead of course_id

-- 5. Students can view announcements for courses they are enrolled in
DROP POLICY IF EXISTS "Students can view course announcements" ON public.announcements;
CREATE POLICY "Students can view course announcements" 
ON public.announcements FOR SELECT 
TO authenticated 
USING (
    subject_id IN (
        SELECT class_id FROM public.enrollments 
        WHERE student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    )
);
