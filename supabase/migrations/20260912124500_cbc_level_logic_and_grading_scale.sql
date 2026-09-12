-- Migration: 20260912124500_cbc_level_logic_and_grading_scale.sql
-- Description: Standardize school_categories level_label to Grade, update fn_enforce_level_logic, and seed Competency-Based Scale

UPDATE public.school_categories SET level_label = 'Grade' WHERE level_label = 'Form';

CREATE OR REPLACE FUNCTION public.fn_enforce_level_logic()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_level_label TEXT;
    v_level_val TEXT;
BEGIN
    SELECT sc.level_label INTO v_level_label
    FROM institutions i
    JOIN school_categories sc ON i.category_id = sc.id
    WHERE i.id = NEW.institution_id;

    IF v_level_label = 'Form' OR v_level_label IS NULL THEN
        v_level_label := 'Grade';
    END IF;

    IF NEW.grade_level IS NULL AND NEW.form_level IS NOT NULL THEN
        IF NEW.form_level BETWEEN 1 AND 4 THEN
            NEW.grade_level := NEW.form_level + 8;
        ELSIF NEW.form_level = 5 THEN
            NEW.grade_level := 12;
            IF NEW.stream IS NULL OR NEW.stream = '' THEN
                NEW.stream := 'Advanced';
            END IF;
        ELSE
            NEW.grade_level := NEW.form_level;
        END IF;
    END IF;

    IF NEW.education_level IS NULL THEN
        IF NEW.grade_level BETWEEN 1 AND 6 THEN
            NEW.education_level := 'primary';
        ELSIF NEW.grade_level BETWEEN 7 AND 9 THEN
            NEW.education_level := 'junior_secondary';
        ELSIF NEW.grade_level BETWEEN 10 AND 12 THEN
            NEW.education_level := 'senior_secondary';
        ELSIF NEW.grade_level = 0 THEN
            NEW.education_level := 'pre_primary';
        ELSIF NEW.grade_level = -1 THEN
            NEW.education_level := 'playgroup';
        ELSE
            NEW.education_level := 'primary';
        END IF;
    END IF;

    NEW.cbc_band := NEW.education_level;
    NEW.class_type := 'Grade';

    v_level_val := NEW.grade_level::text;

    NEW.display_name := TRIM(COALESCE(v_level_label, 'Grade') || ' ' || COALESCE(v_level_val, '') || ' ' || COALESCE(NEW.stream, ''));

    RETURN NEW;
END;
$function$;

-- Seed Competency-Based Scale rows for each institution if not already present
INSERT INTO public.grading_scales (
  id,
  name,
  institution_id,
  letter_grade,
  min_score,
  max_score,
  gpa_points,
  description,
  is_active
)
SELECT 
  gen_random_uuid(),
  'Competency-Based Scale',
  i.id,
  scale.letter_grade,
  scale.min_score,
  scale.max_score,
  scale.gpa_points,
  scale.description,
  true
FROM public.institutions i
CROSS JOIN (
  VALUES 
    ('Exceeding Expectation', 80.00, 100.00, 4.0, 'Exceeding Expectation'),
    ('Meeting Expectation', 60.00, 79.99, 3.0, 'Meeting Expectation'),
    ('Approaching Expectation', 40.00, 59.99, 2.0, 'Approaching Expectation'),
    ('Below Expectation', 0.00, 39.99, 1.0, 'Below Expectation')
) AS scale(letter_grade, min_score, max_score, gpa_points, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.grading_scales gs
  WHERE gs.institution_id = i.id AND gs.name = 'Competency-Based Scale'
);
