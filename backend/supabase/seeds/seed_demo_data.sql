-- Seed File: seed_demo_data.sql
-- Goal: Populate demo users with realistic, multi-child data and initial reports.
-- Final Check: Ensuring all foreign keys (students.class_id) are linked.

DO $$
DECLARE
    v_institution_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';
    
    -- User IDs (From seed_demo_users.js)
    v_parent_user_id UUID := '5392d979-e70a-4017-a340-502ea5706d41'; -- demo.parent@lms.com
    v_child1_user_id UUID := 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25'; -- demo.student@lms.com
    v_child2_user_id UUID := '2e5791b7-37ee-4609-a972-e5ce04ddf9e1'; -- student2@lms.com
    v_teacher_user_id UUID := 'a9270c4b-0f35-4d3b-87b8-4dc3da990587'; -- demo.teacher@lms.com
    v_admin_user_id UUID := 'b14cbc73-e3bf-4c0f-962a-b754a5979a84';  -- demo.admin@lms.com
    
    -- Role IDs (TEXT)
    v_parent_id TEXT;
    v_child1_id TEXT;
    v_child2_id TEXT ;
    v_teacher_id TEXT;
    
    -- Objects
    v_class1_id UUID;
    v_class2_id UUID;
    v_math_id UUID;
    v_eng_id UUID;
    v_exam1_id UUID;
    v_assign1_id UUID;
    
BEGIN
    -- 1. Update User Records (Labels & Naming Audit)
    UPDATE public.users SET full_name = 'James Mwangi', first_name = 'James', last_name = 'Mwangi', phone = '+254711223344', institution_id = v_institution_id WHERE id = v_parent_user_id;
    UPDATE public.users SET full_name = 'Kelson Otieno', first_name = 'Kelson', last_name = 'Otieno', institution_id = v_institution_id WHERE id = v_child1_user_id;
    UPDATE public.users SET full_name = 'John Doe Jr.', first_name = 'John', last_name = 'Doe Jr.', institution_id = v_institution_id WHERE id = v_child2_user_id;
    UPDATE public.users SET full_name = 'Sarah Chemutai', first_name = 'Sarah', last_name = 'Chemutai', institution_id = v_institution_id WHERE id = v_teacher_user_id;
    UPDATE public.users SET full_name = 'Cloudora Admin', first_name = 'Cloudora', last_name = 'Admin', institution_id = v_institution_id WHERE id = v_admin_user_id;

    -- 2. Ensure Role records exist
    INSERT INTO public.parents (user_id, institution_id, id, occupation, phone) 
    VALUES (v_parent_user_id, v_institution_id, 'PAR-DEMO-001', 'Financial Analyst', '+254711223344')
    ON CONFLICT (user_id) DO UPDATE SET institution_id = EXCLUDED.institution_id, full_name = 'James Mwangi'
    RETURNING id INTO v_parent_id;
    
    INSERT INTO public.students (user_id, institution_id, id) 
    VALUES (v_child1_user_id, v_institution_id, 'STU-DEMO-001')
    ON CONFLICT (user_id) DO UPDATE SET institution_id = EXCLUDED.institution_id
    RETURNING id INTO v_child1_id;

    INSERT INTO public.students (user_id, institution_id, id) 
    VALUES (v_child2_user_id, v_institution_id, 'STU-DEMO-002')
    ON CONFLICT (user_id) DO UPDATE SET institution_id = EXCLUDED.institution_id
    RETURNING id INTO v_child2_id;

    SELECT id INTO v_teacher_id FROM public.teachers WHERE user_id = v_teacher_user_id;

    -- 3. Parental Linkage
    INSERT INTO public.parent_students (parent_id, student_id, relationship, institution_id)
    VALUES 
        (v_parent_id, v_child1_id, 'Father', v_institution_id),
        (v_parent_id, v_child2_id, 'Father', v_institution_id)
    ON CONFLICT (parent_id, student_id) DO NOTHING;

    -- 4. Classes & Subjects
    INSERT INTO public.classes (display_name, grade_level, stream, institution_id, teacher_id)
    VALUES 
        ('Grade 10 West', 10, 'West', v_institution_id, v_teacher_id)
    ON CONFLICT (institution_id, display_name) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
    RETURNING id INTO v_class1_id;

    INSERT INTO public.classes (display_name, grade_level, stream, institution_id, teacher_id)
    VALUES 
        ('Grade 8 East', 8, 'East', v_institution_id, v_teacher_id)
    ON CONFLICT (institution_id, display_name) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
    RETURNING id INTO v_class2_id;

    -- CRITICAL FIX: Link students to their current class in the students table
    UPDATE public.students SET class_id = v_class1_id, grade_level = 10, stream = 'West' WHERE id = v_child1_id;
    UPDATE public.students SET class_id = v_class2_id, grade_level = 8, stream = 'East' WHERE id = v_child2_id;

    INSERT INTO public.subjects (title, institution_id, teacher_id, class_id)
    VALUES 
        ('Mathematics', v_institution_id, v_teacher_id, v_class1_id),
        ('English', v_institution_id, v_teacher_id, v_class2_id)
    ON CONFLICT (institution_id, title, class_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id;

    SELECT id INTO v_math_id FROM public.subjects WHERE title = 'Mathematics' AND institution_id = v_institution_id AND class_id = v_class1_id;
    SELECT id INTO v_eng_id FROM public.subjects WHERE title = 'English' AND institution_id = v_institution_id AND class_id = v_class2_id;

    -- Enrollment (redundancy for many-to-many queries)
    INSERT INTO public.class_enrollments (student_id, class_id, institution_id)
    VALUES 
        (v_child1_id, v_class1_id, v_institution_id),
        (v_child2_id, v_class2_id, v_institution_id)
    ON CONFLICT (student_id, class_id) DO NOTHING;

    -- 5. Assignments & Submissions
    INSERT INTO public.assignments (title, description, due_date, total_points, subject_id, teacher_id, class_id, status, is_published, institution_id)
    VALUES ('Algebra Basics', 'Complete exercises on page 42 regarding basic linear equations.', NOW() + INTERVAL '3 days', 50, v_math_id, v_teacher_id, v_class1_id, 'active', true, v_institution_id)
    RETURNING id INTO v_assign1_id;

    INSERT INTO public.submissions (assignment_id, student_id, content, grade, status, institution_id)
    VALUES (v_assign1_id, v_child1_id, 'Completed all exercises. Followed the method discussed in class.', 45, 'graded', v_institution_id)
    ON CONFLICT (assignment_id, student_id) DO NOTHING;

    -- 6. Exams & Results
    INSERT INTO public.exams (title, date, max_score, is_published, subject_id, teacher_id, institution_id, term)
    VALUES ('Mid-Term Math', CURRENT_DATE - INTERVAL '10 days', 100, true, v_math_id, v_teacher_id, v_institution_id, 'Term 1')
    RETURNING id INTO v_exam1_id;

    INSERT INTO public.exam_results (exam_id, student_id, score, feedback, graded_by, institution_id)
    VALUES 
        (v_exam1_id, v_child1_id, 92, 'Outstanding work!', v_teacher_id, v_institution_id),
        (v_exam1_id, v_child2_id, 78, 'Good effort, keep practicing.', v_teacher_id, v_institution_id)
    ON CONFLICT (exam_id, student_id) DO NOTHING;

    -- 7. Reports
    INSERT INTO public.academic_reports (student_id, institution_id, term, academic_year, report_type, status, data)
    VALUES 
        (v_child1_id, v_institution_id, 'Term 1', '2026', 'end-of-term', 'published', 
         '{"gpa": 4.0, "position": 1, "total_students": 30, "attendance": "98%", "comments": "An exemplary student. Kelson has consistently shown high aptitude in mathematics."}'::jsonb),
        (v_child2_id, v_institution_id, 'Term 1', '2026', 'end-of-term', 'published', 
         '{"gpa": 3.5, "position": 5, "total_students": 30, "attendance": "94%", "comments": "Active and engaged. John Jr. should focus more on his written expression."}'::jsonb);

END $$;
