-- ============================================================================
-- Seed File: 06_demo_attendance_and_reports.sql
-- Environment: Demo Only
-- Purpose: Realistic student attendance entries, CBC assessment scores, and report cards.
-- ============================================================================

DO $$
DECLARE
    v_inst_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';
    v_year_id UUID := 'c1111111-1111-1111-1111-111111111111';
    v_term1_id UUID := 'd1111111-1111-1111-1111-111111111111';
    v_class_g7 UUID := 'e1111111-1111-1111-1111-111111111111';

    -- Students
    v_stud1_id UUID;
    v_stud2_id UUID;

    -- Teachers
    v_teach_id UUID;

    -- Subjects
    v_math_id UUID := 'f1111111-1111-1111-1111-111111111111';
    v_eng_id  UUID := 'f2222222-2222-2222-2222-222222222222';
    v_sci_id  UUID := 'f4444444-4444-4444-4444-444444444444';
BEGIN
    SELECT id INTO v_stud1_id FROM public.students WHERE student_identifier = '0001';
    SELECT id INTO v_stud2_id FROM public.students WHERE student_identifier = '0002';
    SELECT id INTO v_teach_id FROM public.teachers WHERE teacher_identifier = 'ST0001';

    -- 1. Daily Attendance (Past 5 School Days)
    IF v_stud1_id IS NOT NULL THEN
        INSERT INTO public.attendance (institution_id, student_id, class_id, date, status, remarks, created_at, updated_at)
        VALUES
            (v_inst_id, v_stud1_id, v_class_g7, CURRENT_DATE - 4, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud1_id, v_class_g7, CURRENT_DATE - 3, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud1_id, v_class_g7, CURRENT_DATE - 2, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud1_id, v_class_g7, CURRENT_DATE - 1, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud1_id, v_class_g7, CURRENT_DATE,     'present', 'On time', NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_stud2_id IS NOT NULL THEN
        INSERT INTO public.attendance (institution_id, student_id, class_id, date, status, remarks, created_at, updated_at)
        VALUES
            (v_inst_id, v_stud2_id, v_class_g7, CURRENT_DATE - 4, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud2_id, v_class_g7, CURRENT_DATE - 3, 'excused', 'Medical clinic appointment', NOW(), NOW()),
            (v_inst_id, v_stud2_id, v_class_g7, CURRENT_DATE - 2, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud2_id, v_class_g7, CURRENT_DATE - 1, 'present', 'On time', NOW(), NOW()),
            (v_inst_id, v_stud2_id, v_class_g7, CURRENT_DATE,     'present', 'On time', NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

    -- 2. CBC Assessment Results for Student 1
    IF v_stud1_id IS NOT NULL THEN
        INSERT INTO public.exam_results (
            institution_id, student_id, subject_id, class_id, exam_id, score, max_score, grade, term, academic_year, created_at, updated_at
        )
        VALUES
            (v_inst_id, v_stud1_id, v_math_id, v_class_g7, gen_random_uuid(), 88.0, 100.0, 'Exceeding Expectation', 'Term 1', '2026', NOW(), NOW()),
            (v_inst_id, v_stud1_id, v_eng_id,  v_class_g7, gen_random_uuid(), 76.5, 100.0, 'Meeting Expectation', 'Term 1', '2026', NOW(), NOW()),
            (v_inst_id, v_stud1_id, v_sci_id,  v_class_g7, gen_random_uuid(), 82.0, 100.0, 'Exceeding Expectation', 'Term 1', '2026', NOW(), NOW())
        ON CONFLICT DO NOTHING;

        -- 3. Report Card with CBC Learner Competencies
        INSERT INTO public.report_cards (
            institution_id, student_id, class_id, term_id, academic_year_id,
            total_weighted_score, average_percentage, gpa, letter_grade, rank_in_class,
            total_students_in_class, attendance_count, total_school_days,
            teacher_remarks, admin_remarks, status, curriculum_type,
            learner_development, created_at, updated_at
        )
        VALUES (
            v_inst_id, v_stud1_id, v_class_g7, v_term1_id, v_year_id,
            246.50, 82.17, 3.80, 'Exceeding Expectation', 1,
            38, 65, 65,
            'Kelson displays exemplary diligence and creative mathematical problem-solving skills.',
            'Promoted to the next term with distinction honors.',
            'published',
            'cbc',
            '[
                {"competency": "Communication & Collaboration", "rating": "EE", "remarks": "Actively leads peer study group discussions"},
                {"competency": "Critical Thinking & Problem Solving", "rating": "EE", "remarks": "Excels in non-routine mathematical investigation"},
                {"competency": "Digital Literacy", "rating": "ME", "remarks": "Comfortably uses learning tablets for research"},
                {"competency": "Self-Efficacy", "rating": "ME", "remarks": "Shows strong personal initiative in assignment submission"}
            ]'::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
