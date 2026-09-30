-- Migration: 2026-09-28_per_class_subject_teachers.sql
-- Description:
-- 1. Add class_id and is_migrated to subject_teachers
-- 2. Drop old (subject_id, teacher_id) unique constraint
-- 3. Migrate existing un-classed assignments across all classes of the subject
-- 4. Enforce one teacher per subject per class constraint
-- 5. Update sync_subject_teacher trigger to preserve class context

-- 1. Add columns
ALTER TABLE public.subject_teachers
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_migrated BOOLEAN DEFAULT FALSE;

-- 2. Drop legacy unique constraint
ALTER TABLE public.subject_teachers
    DROP CONSTRAINT IF EXISTS subject_teachers_subject_id_teacher_id_key;

-- 3. Data Migration: For existing subject_teachers rows with NULL class_id
DO $$
DECLARE
    rec RECORD;
    cls RECORD;
    found_class BOOLEAN;
BEGIN
    FOR rec IN 
        SELECT id, subject_id, teacher_id, institution_id, is_hod 
        FROM public.subject_teachers 
        WHERE class_id IS NULL
    LOOP
        found_class := FALSE;
        
        -- Check subject_classes join table
        FOR cls IN 
            SELECT class_id FROM public.subject_classes WHERE subject_id = rec.subject_id
        LOOP
            found_class := TRUE;
            -- Insert per-class row if not already present
            IF NOT EXISTS (
                SELECT 1 FROM public.subject_teachers 
                WHERE subject_id = rec.subject_id 
                  AND class_id = cls.class_id
            ) THEN
                INSERT INTO public.subject_teachers (subject_id, teacher_id, class_id, institution_id, is_hod, is_migrated)
                VALUES (rec.subject_id, rec.teacher_id, cls.class_id, rec.institution_id, rec.is_hod, TRUE);
            END IF;
        END LOOP;

        -- Fallback to subjects.class_id if subject_classes had no rows
        IF NOT found_class THEN
            FOR cls IN 
                SELECT class_id FROM public.subjects WHERE id = rec.subject_id AND class_id IS NOT NULL
            LOOP
                found_class := TRUE;
                IF NOT EXISTS (
                    SELECT 1 FROM public.subject_teachers 
                    WHERE subject_id = rec.subject_id 
                      AND class_id = cls.class_id
                ) THEN
                    INSERT INTO public.subject_teachers (subject_id, teacher_id, class_id, institution_id, is_hod, is_migrated)
                    VALUES (rec.subject_id, rec.teacher_id, cls.class_id, rec.institution_id, rec.is_hod, TRUE);
                END IF;
            END LOOP;
        END IF;

        -- If migrated to at least one class and not an HOD, remove the un-classed row
        -- If it was an HOD, keep the row as the subject-wide HOD designation
        IF found_class AND (rec.is_hod IS NOT TRUE) THEN
            DELETE FROM public.subject_teachers WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- 4. Deduplicate any potential duplicate (institution_id, subject_id, class_id) rows before index creation
DELETE FROM public.subject_teachers a
USING public.subject_teachers b
WHERE a.id > b.id
  AND a.subject_id = b.subject_id
  AND a.class_id = b.class_id
  AND a.institution_id = b.institution_id
  AND a.class_id IS NOT NULL;

-- 5. Add unique index: One primary teacher per subject per class
CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_teachers_class
    ON public.subject_teachers(institution_id, subject_id, class_id)
    WHERE class_id IS NOT NULL;

-- Index for querying teacher's assigned subjects and classes quickly
CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_class
    ON public.subject_teachers(institution_id, teacher_id, class_id);

-- 6. Replace sync_subject_teacher trigger to handle class_id properly
CREATE OR REPLACE FUNCTION sync_subject_teacher()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.teacher_id IS NOT NULL AND NEW.class_id IS NOT NULL THEN
        INSERT INTO public.subject_teachers (subject_id, teacher_id, class_id, institution_id)
        VALUES (NEW.id, NEW.teacher_id, NEW.class_id, NEW.institution_id)
        ON CONFLICT (institution_id, subject_id, class_id) WHERE class_id IS NOT NULL
        DO UPDATE SET teacher_id = EXCLUDED.teacher_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
