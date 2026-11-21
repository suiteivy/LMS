-- ============================================================================
-- Seed File: 07_grading_scales.sql
-- Environment: Core (All environments)
-- Purpose: Canonical CBC Competency rubric and standard 8-4-4 letter grade scales.
-- ============================================================================

DO $$
DECLARE
    inst RECORD;
BEGIN
    FOR inst IN SELECT id FROM public.institutions LOOP
        -- 1. Competency-Based Curriculum (CBC) Scale
        INSERT INTO public.grading_scales (
            institution_id, name, letter_grade, min_score, max_score, gpa_points, description, is_active, created_at, updated_at
        )
        SELECT 
            inst.id,
            'Competency-Based Scale',
            scale.letter_grade,
            scale.min_score,
            scale.max_score,
            scale.gpa_points,
            scale.description,
            true,
            NOW(),
            NOW()
        FROM (
            VALUES 
                ('Exceeding Expectation', 80.00, 100.00, 4.0, 'EE - Learner consistently demonstrates mastery and exceeds expectations'),
                ('Meeting Expectation', 60.00, 79.99, 3.0, 'ME - Learner demonstrates required competency and meets learning outcomes'),
                ('Approaching Expectation', 40.00, 59.99, 2.0, 'AE - Learner requires occasional assistance to meet competency targets'),
                ('Below Expectation', 0.00, 39.99, 1.0, 'BE - Learner requires targeted intervention and continuous guidance')
        ) AS scale(letter_grade, min_score, max_score, gpa_points, description)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.grading_scales gs
            WHERE gs.institution_id = inst.id 
              AND gs.name = 'Competency-Based Scale'
              AND gs.letter_grade = scale.letter_grade
        );

        -- 2. Standard Secondary / 8-4-4 Letter Grade Scale
        INSERT INTO public.grading_scales (
            institution_id, name, letter_grade, min_score, max_score, gpa_points, description, is_active, created_at, updated_at
        )
        SELECT 
            inst.id,
            'Standard Secondary Scale',
            scale.letter_grade,
            scale.min_score,
            scale.max_score,
            scale.gpa_points,
            scale.description,
            true,
            NOW(),
            NOW()
        FROM (
            VALUES 
                ('A', 80.00, 100.00, 4.0, 'Excellent / Distinction'),
                ('B', 65.00, 79.99, 3.0, 'Very Good / High Credit'),
                ('C', 50.00, 64.99, 2.0, 'Good / Credit'),
                ('D', 40.00, 49.99, 1.0, 'Pass / Satisfactory'),
                ('E', 0.00, 39.99, 0.0, 'Fail / Remedial Needed')
        ) AS scale(letter_grade, min_score, max_score, gpa_points, description)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.grading_scales gs
            WHERE gs.institution_id = inst.id 
              AND gs.name = 'Standard Secondary Scale'
              AND gs.letter_grade = scale.letter_grade
        );
    END LOOP;
END $$;
