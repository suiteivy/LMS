-- Seed File: seed_demo_data.sql
-- Goal: Populate demo users with realistic, multi-child data and initial reports.
-- Final Check: Ensuring all foreign keys (students.class_id) are linked.

DO $$
DECLARE
    v_institution_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';
    
    -- User IDs (Fetched dynamically)
    v_parent_user_id UUID;
    v_child1_user_id UUID;
    v_child2_user_id UUID;
    v_teacher_user_id UUID;
    v_admin_user_id UUID;
    
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
    v_fee1_id UUID;
    v_bursary1_id UUID;
    
BEGIN
    -- 0. Fetch Dynamic User IDs
    SELECT id INTO v_parent_user_id FROM public.users WHERE institution_id = v_institution_id AND role = 'parent' LIMIT 1;
    SELECT id INTO v_child1_user_id FROM public.users WHERE institution_id = v_institution_id AND role = 'student' LIMIT 1;
    SELECT id INTO v_child2_user_id FROM public.users WHERE institution_id = v_institution_id AND role = 'student' AND id != v_child1_user_id LIMIT 1;
    SELECT id INTO v_teacher_user_id FROM public.users WHERE institution_id = v_institution_id AND role = 'teacher' LIMIT 1;
    SELECT id INTO v_admin_user_id FROM public.users WHERE institution_id = v_institution_id AND role = 'admin' LIMIT 1;

    IF v_parent_user_id IS NULL OR v_child1_user_id IS NULL OR v_teacher_user_id IS NULL THEN
        RAISE NOTICE 'Required users for demo seed not found in institution %', v_institution_id;
        RETURN;
    END IF;

    -- 1. Update User Records (Labels & Naming Audit)
    UPDATE public.users SET full_name = 'James Mwangi', first_name = 'James', last_name = 'Mwangi' WHERE id = v_parent_user_id;
    UPDATE public.users SET full_name = 'Kelson Otieno', first_name = 'Kelson', last_name = 'Otieno' WHERE id = v_child1_user_id;
    
    IF v_child2_user_id IS NOT NULL THEN
        UPDATE public.users SET full_name = 'John Doe Jr.', first_name = 'John', last_name = 'Doe Jr.' WHERE id = v_child2_user_id;
    END IF;

    UPDATE public.users SET full_name = 'Sarah Chemutai', first_name = 'Sarah', last_name = 'Chemutai' WHERE id = v_teacher_user_id;
    
    IF v_admin_user_id IS NOT NULL THEN
        UPDATE public.users SET full_name = 'Cloudora Admin', first_name = 'Cloudora', last_name = 'Admin' WHERE id = v_admin_user_id;
    END IF;

    -- 2. Ensure Role records exist
    UPDATE public.parents SET occupation = 'Financial Analyst', address = 'Nairobi'
    WHERE user_id = v_parent_user_id
    RETURNING id INTO v_parent_id;
    
    SELECT id INTO v_child1_id FROM public.students WHERE user_id = v_child1_user_id;
    SELECT id INTO v_child2_id FROM public.students WHERE user_id = v_child2_user_id;
    SELECT id INTO v_teacher_id FROM public.teachers WHERE user_id = v_teacher_user_id;

    -- 3. Parental Linkage
    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.parent_students (parent_id, student_id, relationship, institution_id)
        VALUES (v_parent_id, v_child1_id, 'Father', v_institution_id)
        ON CONFLICT (parent_id, student_id) DO NOTHING;
    END IF;

    IF v_child2_id IS NOT NULL THEN
        INSERT INTO public.parent_students (parent_id, student_id, relationship, institution_id)
        VALUES (v_parent_id, v_child2_id, 'Father', v_institution_id)
        ON CONFLICT (parent_id, student_id) DO NOTHING;
    END IF;

    -- 4. Classes & Subjects
    INSERT INTO public.classes (display_name, grade_level, stream, institution_id, teacher_id)
    VALUES 
        ('Grade 10 West', 10, 'West', v_institution_id, v_teacher_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_class1_id;
    
    IF v_class1_id IS NULL THEN
        SELECT id INTO v_class1_id FROM public.classes WHERE display_name = 'Grade 10 West' AND institution_id = v_institution_id;
    END IF;

    INSERT INTO public.classes (display_name, grade_level, stream, institution_id, teacher_id)
    VALUES 
        ('Grade 8 East', 8, 'East', v_institution_id, v_teacher_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_class2_id;
    
    IF v_class2_id IS NULL THEN
        SELECT id INTO v_class2_id FROM public.classes WHERE display_name = 'Grade 8 East' AND institution_id = v_institution_id;
    END IF;

    -- CRITICAL FIX: Link students to their current class in the students table
    IF v_child1_id IS NOT NULL THEN
        UPDATE public.students SET class_id = v_class1_id, grade_level = 10, stream = 'West' WHERE id = v_child1_id;
    END IF;
    IF v_child2_id IS NOT NULL THEN
        UPDATE public.students SET class_id = v_class2_id, grade_level = 8, stream = 'East' WHERE id = v_child2_id;
    END IF;

    INSERT INTO public.subjects (title, institution_id, teacher_id, class_id)
    VALUES 
        ('Mathematics', v_institution_id, v_teacher_id, v_class1_id),
        ('English', v_institution_id, v_teacher_id, v_class2_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_math_id FROM public.subjects WHERE title = 'Mathematics' AND institution_id = v_institution_id AND class_id = v_class1_id LIMIT 1;
    SELECT id INTO v_eng_id FROM public.subjects WHERE title = 'English' AND institution_id = v_institution_id AND class_id = v_class2_id LIMIT 1;

    -- Enrollment (redundancy for many-to-many queries)
    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.class_enrollments (student_id, class_id, institution_id)
        VALUES (v_child1_id, v_class1_id, v_institution_id)
        ON CONFLICT (student_id, class_id) DO NOTHING;
    END IF;

    IF v_child2_id IS NOT NULL THEN
        INSERT INTO public.class_enrollments (student_id, class_id, institution_id)
        VALUES (v_child2_id, v_class2_id, v_institution_id)
        ON CONFLICT (student_id, class_id) DO NOTHING;
    END IF;

    -- 5. Assignments & Submissions
    INSERT INTO public.assignments (title, description, due_date, total_points, subject_id, teacher_id, class_id, status, is_published, institution_id)
    VALUES ('Algebra Basics', 'Complete exercises on page 42 regarding basic linear equations.', NOW() + INTERVAL '3 days', 50, v_math_id, v_teacher_id, v_class1_id, 'active', true, v_institution_id)
    RETURNING id INTO v_assign1_id;

    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.submissions (assignment_id, student_id, content, grade, status, institution_id)
        VALUES (v_assign1_id, v_child1_id, 'Completed all exercises. Followed the method discussed in class.', 45, 'graded', v_institution_id)
        ON CONFLICT (assignment_id, student_id) DO NOTHING;
    END IF;

    -- 6. Exams & Results
    INSERT INTO public.exams (title, date, max_score, is_published, subject_id, teacher_id, institution_id, term)
    VALUES ('Mid-Term Math', CURRENT_DATE - INTERVAL '10 days', 100, true, v_math_id, v_teacher_id, v_institution_id, 'Term 1')
    RETURNING id INTO v_exam1_id;

    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.exam_results (exam_id, student_id, score, feedback, graded_by, institution_id)
        VALUES (v_exam1_id, v_child1_id, 92, 'Outstanding work!', v_teacher_id, v_institution_id)
        ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    IF v_child2_id IS NOT NULL THEN
        INSERT INTO public.exam_results (exam_id, student_id, score, feedback, graded_by, institution_id)
        VALUES (v_exam1_id, v_child2_id, 78, 'Good effort, keep practicing.', v_teacher_id, v_institution_id)
        ON CONFLICT (exam_id, student_id) DO NOTHING;
    END IF;

    -- 7. Reports
    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.academic_reports (student_id, institution_id, term, academic_year, report_type, status, data)
        VALUES (v_child1_id, v_institution_id, 'Term 1', '2026', 'end-of-term', 'published', 
             '{"gpa": 4.0, "position": 1, "total_students": 30, "attendance": "98%", "comments": "An exemplary student. Kelson has consistently shown high aptitude in mathematics."}'::jsonb);
    END IF;

    IF v_child2_id IS NOT NULL THEN
        INSERT INTO public.academic_reports (student_id, institution_id, term, academic_year, report_type, status, data)
        VALUES (v_child2_id, v_institution_id, 'Term 1', '2026', 'end-of-term', 'published', 
             '{"gpa": 3.5, "position": 5, "total_students": 30, "attendance": "94%", "comments": "Active and engaged. John Jr. should focus more on his written expression."}'::jsonb);
    END IF;

    -- 8. Notifications
    IF v_parent_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read, institution_id)
        VALUES (v_parent_user_id, 'Fee Reminder', 'Please clear the outstanding balance for Term 1.', 'warning', false, v_institution_id);
    END IF;

    IF v_child1_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read, institution_id)
        VALUES (v_child1_user_id, 'Assignment Due', 'Your Math assignment is due tomorrow.', 'info', false, v_institution_id);
    END IF;

    IF v_teacher_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, is_read, institution_id)
        VALUES (v_teacher_user_id, 'Meeting Scheduled', 'Staff meeting at 4 PM in the main hall.', 'info', false, v_institution_id);
    END IF;

    -- 9. Attendance
    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.attendance (class_id, subject_id, student_id, date, status, notes, institution_id)
        VALUES 
            (v_class1_id, v_math_id, v_child1_id, CURRENT_DATE, 'present', 'Active in class', v_institution_id),
            (v_class1_id, v_math_id, v_child1_id, CURRENT_DATE - INTERVAL '1 day', 'present', '', v_institution_id)
        ON CONFLICT (student_id, class_id, date) DO NOTHING;
    END IF;

    IF v_child2_id IS NOT NULL THEN
        INSERT INTO public.attendance (class_id, subject_id, student_id, date, status, notes, institution_id)
        VALUES 
            (v_class2_id, v_eng_id, v_child2_id, CURRENT_DATE, 'absent', 'Medical reasons', v_institution_id)
        ON CONFLICT (student_id, class_id, date) DO NOTHING;
    END IF;

    -- 10. Fee Structures & Payments
    INSERT INTO public.fee_structures (title, description, amount, academic_year, term, institution_id)
    VALUES ('Term 1 Tuition', 'Basic tuition fee for Term 1', 15000.00, '2026', 'Term 1', v_institution_id)
    RETURNING id INTO v_fee1_id;

    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.payments (student_id, fee_structure_id, amount, payment_method, reference_number, institution_id)
        VALUES (v_child1_id, v_fee1_id, 10000.00, 'bank_transfer', 'REF12345', v_institution_id);
        
        UPDATE public.students SET fee_balance = 5000.00 WHERE id = v_child1_id;
    END IF;
    
    IF v_parent_user_id IS NOT NULL THEN
        INSERT INTO public.financial_transactions (user_id, institution_id, type, direction, amount, method, status, reference_id)
        VALUES (v_parent_user_id, v_institution_id, 'fee_payment', 'inflow', 10000.00, 'bank_transfer', 'completed', 'REF12345');
    END IF;

    -- 11. Bursaries
    INSERT INTO public.bursaries (title, description, amount, deadline, requirements, institution_id)
    VALUES ('Merit Scholarship 2026', 'For top performing students in Grade 10', 5000.00, CURRENT_DATE + INTERVAL '30 days', 'GPA above 3.8', v_institution_id)
    RETURNING id INTO v_bursary1_id;

    IF v_child1_id IS NOT NULL THEN
        INSERT INTO public.bursary_applications (bursary_id, student_id, justification, status, institution_id)
        VALUES (v_bursary1_id, v_child1_id, 'Consistent top performer in Mathematics and Sciences.', 'pending', v_institution_id)
        ON CONFLICT (bursary_id, student_id) DO NOTHING;
    END IF;

END $$;

