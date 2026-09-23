-- Migration: 20260920122000_add_admission_number_to_students.sql
-- Description: Add admission_number and id_number to students table with automatic fallback to student id

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS id_number TEXT;

UPDATE public.students SET admission_number = id WHERE admission_number IS NULL;

CREATE OR REPLACE FUNCTION public.fn_sync_student_admission_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
        NEW.admission_number := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_student_admission_number ON public.students;
CREATE TRIGGER trg_sync_student_admission_number
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_student_admission_number();
