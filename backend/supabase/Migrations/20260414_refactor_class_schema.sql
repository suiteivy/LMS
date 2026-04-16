-- 1. Drop the old trigger that uses 'name'
DROP TRIGGER IF EXISTS tr_parse_class_code ON classes;
DROP FUNCTION IF EXISTS public.fn_parse_class_code();

-- 2. Create the new enforcement function
CREATE OR REPLACE FUNCTION public.fn_enforce_level_logic()
RETURNS TRIGGER AS $$
DECLARE
    v_level_label TEXT;
BEGIN
    -- Get the level label for the institution
    SELECT sc.level_label INTO v_level_label
    FROM institutions i
    JOIN school_categories sc ON i.category_id = sc.id
    WHERE i.id = NEW.institution_id;

    IF v_level_label = 'Form' THEN
        -- Secondary school: nullify grade_level
        NEW.grade_level := NULL;
    ELSIF v_level_label = 'Grade' OR v_level_label = 'KG' THEN
        -- Primary/KG school: nullify form_level
        NEW.form_level := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply trigger to classes
DROP TRIGGER IF EXISTS tr_enforce_class_level_logic ON classes;
CREATE TRIGGER tr_enforce_class_level_logic
BEFORE INSERT OR UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_level_logic();

-- 4. Apply trigger to students
DROP TRIGGER IF EXISTS tr_enforce_student_level_logic ON students;
CREATE TRIGGER tr_enforce_student_level_logic
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_level_logic();

-- 5. Update existing data (Cleanup)
-- For classes
UPDATE classes c
SET grade_level = NULL
FROM institutions i
JOIN school_categories sc ON i.category_id = sc.id
WHERE c.institution_id = i.id AND sc.level_label = 'Form';

UPDATE classes c
SET form_level = NULL
FROM institutions i
JOIN school_categories sc ON i.category_id = sc.id
WHERE c.institution_id = i.id AND (sc.level_label = 'Grade' OR sc.level_label = 'KG');

-- For students
UPDATE students s
SET grade_level = NULL
FROM institutions i
JOIN school_categories sc ON i.category_id = sc.id
WHERE s.institution_id = i.id AND sc.level_label = 'Form';

UPDATE students s
SET form_level = NULL
FROM institutions i
JOIN school_categories sc ON i.category_id = sc.id
WHERE s.institution_id = i.id AND (sc.level_label = 'Grade' OR sc.level_label = 'KG');

-- 6. Update the view v_classes_detailed
-- (First drop it to change columns)
DROP VIEW IF EXISTS v_classes_detailed;
CREATE VIEW v_classes_detailed AS
 SELECT c.id,
    c.institution_id,
    c.created_at,
    c.updated_at,
    c.teacher_id,
    c.capacity,
    c.grade_level,
    c.form_level,
    c.stream,
    i.name AS institution_name,
    sc.name AS school_category_name,
    sc.level_label,
        CASE
            WHEN sc.level_label = 'Form' THEN (((COALESCE(sc.level_label, ''::text) || ' '::text) || COALESCE(c.form_level::text, ''::text)) || ' '::text) || COALESCE(c.stream, ''::text)
            WHEN sc.level_label = 'KG' THEN (((COALESCE(sc.level_label, ''::text) || ' '::text) || COALESCE(c.grade_level::text, ''::text)) || ' '::text) || COALESCE(c.stream, ''::text)
            ELSE (((COALESCE(sc.level_label, 'Level'::text) || ' '::text) || COALESCE(c.grade_level::text, ''::text)) || ' '::text) || COALESCE(c.stream, ''::text)
        END AS display_name
   FROM classes c
     JOIN institutions i ON c.institution_id = i.id
     LEFT JOIN school_categories sc ON i.category_id = sc.id;

-- 7. Drop the name column from classes
ALTER TABLE classes DROP COLUMN IF EXISTS name;
