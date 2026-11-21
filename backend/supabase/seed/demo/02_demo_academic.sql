-- ============================================================================
-- Seed File: 02_demo_academic.sql
-- Environment: Demo Only
-- Purpose: Academic calendar, years, terms, classes, streams, and subjects for demo academy.
-- ============================================================================

DO $$
DECLARE
    v_inst_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';
    v_year_id UUID := 'c1111111-1111-1111-1111-111111111111';
    v_term1_id UUID := 'd1111111-1111-1111-1111-111111111111';
    v_term2_id UUID := 'd2222222-2222-2222-2222-222222222222';
    v_term3_id UUID := 'd3333333-3333-3333-3333-333333333333';
    
    v_class_g7_id UUID := 'e1111111-1111-1111-1111-111111111111';
    v_class_g8_id UUID := 'e2222222-2222-2222-2222-222222222222';
    v_class_f1_id UUID := 'e3333333-3333-3333-3333-333333333333';
    v_class_f2_id UUID := 'e4444444-4444-4444-4444-444444444444';

    v_math_id UUID := 'f1111111-1111-1111-1111-111111111111';
    v_eng_id  UUID := 'f2222222-2222-2222-2222-222222222222';
    v_kisw_id UUID := 'f3333333-3333-3333-3333-333333333333';
    v_sci_id  UUID := 'f4444444-4444-4444-4444-444444444444';
BEGIN
    -- 1. Academic Year 2026
    INSERT INTO public.academic_years (id, name, start_date, end_date, is_current, institution_id, created_at, updated_at)
    VALUES (v_year_id, 'Academic Year 2026', '2026-01-05', '2026-11-27', true, v_inst_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET is_current = true;

    -- 2. Terms
    INSERT INTO public.terms (id, academic_year_id, name, start_date, end_date, is_current, institution_id, created_at, updated_at)
    VALUES 
        (v_term1_id, v_year_id, 'Term 1', '2026-01-05', '2026-04-10', false, v_inst_id, NOW(), NOW()),
        (v_term2_id, v_year_id, 'Term 2', '2026-05-04', '2026-08-07', false, v_inst_id, NOW(), NOW()),
        (v_term3_id, v_year_id, 'Term 3', '2026-08-31', '2026-11-27', true, v_inst_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET is_current = EXCLUDED.is_current;

    -- 3. Classes (CBC Junior & Senior Secondary)
    INSERT INTO public.classes (id, name, level, stream, capacity, institution_id, academic_year_id, created_at, updated_at)
    VALUES
        (v_class_g7_id, 'Grade 7 East', 'Grade 7', 'East', 40, v_inst_id, v_year_id, NOW(), NOW()),
        (v_class_g8_id, 'Grade 8 West', 'Grade 8', 'West', 40, v_inst_id, v_year_id, NOW(), NOW()),
        (v_class_f1_id, 'Form 1 Alpha', 'Form 1', 'Alpha', 45, v_inst_id, v_year_id, NOW(), NOW()),
        (v_class_f2_id, 'Form 2 Beta', 'Form 2', 'Beta', 45, v_inst_id, v_year_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, level = EXCLUDED.level;

    -- 4. Core Subjects
    INSERT INTO public.subjects (id, name, code, department, institution_id, created_at, updated_at)
    VALUES
        (v_math_id, 'Mathematics', 'MATH', 'Mathematics & Sciences', v_inst_id, NOW(), NOW()),
        (v_eng_id, 'English Language & Literature', 'ENG', 'Languages', v_inst_id, NOW(), NOW()),
        (v_kisw_id, 'Kiswahili', 'KISW', 'Languages', v_inst_id, NOW(), NOW()),
        (v_sci_id, 'Integrated Science', 'SCI', 'Mathematics & Sciences', v_inst_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

END $$;
