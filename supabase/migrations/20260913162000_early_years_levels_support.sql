-- Migration: 20260913162000_early_years_levels_support.sql
-- Description: Ensure Playgroup (-2), PP1 (-1), and PP2 (0) are properly recognized in fn_enforce_level_logic

CREATE OR REPLACE FUNCTION public.fn_enforce_level_logic()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_level_label TEXT;
    v_display_prefix TEXT;
BEGIN
    SELECT sc.level_label INTO v_level_label
    FROM institutions i
    JOIN school_categories sc ON i.category_id = sc.id
    WHERE i.id = NEW.institution_id;

    IF v_level_label = 'Form' OR v_level_label IS NULL THEN
        v_level_label := 'Grade';
    END IF;

    -- Map legacy form_level if grade_level is not set
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

    -- Infer education_level / CBC band based on grade_level
    IF NEW.education_level IS NULL THEN
        IF NEW.grade_level = -2 THEN
            NEW.education_level := 'playgroup';
        ELSIF NEW.grade_level = -1 OR NEW.grade_level = 0 THEN
            NEW.education_level := 'pre_primary';
        ELSIF NEW.grade_level BETWEEN 1 AND 6 THEN
            NEW.education_level := 'primary';
        ELSIF NEW.grade_level BETWEEN 7 AND 9 THEN
            NEW.education_level := 'junior_secondary';
        ELSIF NEW.grade_level BETWEEN 10 AND 12 THEN
            NEW.education_level := 'senior_secondary';
        ELSE
            NEW.education_level := 'primary';
        END IF;
    END IF;

    NEW.cbc_band := NEW.education_level;
    NEW.class_type := 'Grade';

    -- Format display_name: Playgroup, PP1, PP2, or Grade 1-12
    IF NEW.grade_level = -2 THEN
        v_display_prefix := 'Playgroup';
    ELSIF NEW.grade_level = -1 THEN
        v_display_prefix := 'PP1';
    ELSIF NEW.grade_level = 0 THEN
        v_display_prefix := 'PP2';
    ELSE
        v_display_prefix := TRIM(COALESCE(v_level_label, 'Grade') || ' ' || COALESCE(NEW.grade_level::text, ''));
    END IF;

    NEW.display_name := TRIM(v_display_prefix || ' ' || COALESCE(NEW.stream, ''));

    RETURN NEW;
END;
$function$;
