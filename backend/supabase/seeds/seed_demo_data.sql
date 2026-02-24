-- Seed File: seed_demo_data.sql
-- Goal: Populate demo users (student, teacher, parent, admin) with realistic data for a trial experience.

-- 1. Get IDs for Demo Users
DO $$
DECLARE
    v_institution_id UUID;
    v_demo_student_user_id UUID;
    v_demo_teacher_user_id UUID;
    v_demo_parent_user_id UUID;
    v_demo_admin_user_id UUID;
    
    v_student_id UUID;
    v_teacher_id UUID;
    v_parent_id UUID;
    
    v_class_id UUID;
    v_subject_math_id UUID;
    v_subject_eng_id UUID;
    
BEGIN
    -- Get Institution (Assuming one exists, pick the first one)
    SELECT id INTO v_institution_id FROM institutions LIMIT 1;
    
    -- Get User IDs from auth.users (or public.users if IDs match)
    SELECT id INTO v_demo_student_user_id FROM users WHERE email = 'demo.student@lms.com';
    SELECT id INTO v_demo_teacher_user_id FROM users WHERE email = 'demo.teacher@lms.com';
    SELECT id INTO v_demo_parent_user_id FROM users WHERE email = 'demo.parent@lms.com';
    SELECT id INTO v_demo_admin_user_id FROM users WHERE email = 'demo.admin@lms.com';

    -- Get Role-Specific IDs
    SELECT id INTO v_student_id FROM students WHERE user_id = v_demo_student_user_id;
    SELECT id INTO v_teacher_id FROM teachers WHERE user_id = v_demo_teacher_user_id;
    SELECT id INTO v_parent_id FROM parents WHERE user_id = v_demo_parent_user_id;

    -- ==========================================
    -- 1. SETUP TEACHER DATA (Classes & Subjects)
    -- ==========================================
    
    -- Create a Class if not exists or use existing
    INSERT INTO classes (name, grade_level, academic_year, institution_id, teacher_id)
    VALUES ('Grade 10A', '10', '2025', v_institution_id, v_teacher_id)
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_class_id FROM classes WHERE teacher_id = v_teacher_id LIMIT 1;

    -- Create Subjects assigned to this teacher
    INSERT INTO subjects (name, code, description, institution_id, teacher_id)
    VALUES 
        ('Mathematics', 'MATH101', 'Introduction to Algebra and Geometry', v_institution_id, v_teacher_id),
        ('English Literature', 'ENG101', 'Classic and Modern Literature', v_institution_id, v_teacher_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_subject_math_id FROM subjects WHERE code = 'MATH101' AND teacher_id = v_teacher_id;
    SELECT id INTO v_subject_eng_id FROM subjects WHERE code = 'ENG101' AND teacher_id = v_teacher_id;

    -- ==========================================
    -- 2. SETUP STUDENT DATA (Enrollment & Grades)
    -- ==========================================

    -- Enroll Student in the Class
    -- Enroll Student in Subjects (Required by Schema)
    INSERT INTO enrollments (student_id, subject_id, status)
    VALUES 
    (v_student_id, v_subject_math_id, 'enrolled'),
    (v_student_id, v_subject_eng_id, 'enrolled')
    ON CONFLICT DO NOTHING;
    
    -- Enroll Student in Subjects (if explicit enrollment table exists, otherwise implied by class/assignments)
    -- Using 'student_subjects' if it exists, otherwise skipping.
    -- Assuming a simple schema where assignments link to subjects.

    -- Create Assignments
    INSERT INTO assignments (title, description, due_date, total_marks, subject_id, teacher_id, class_id)
    VALUES 
        ('Algebra Quiz 1', 'Solve linear equations', NOW() + INTERVAL '2 days', 20, v_subject_math_id, v_teacher_id, v_class_id),
        ('Essay on Macbeth', 'Analyze the theme of ambition', NOW() + INTERVAL '5 days', 50, v_subject_eng_id, v_teacher_id, v_class_id)
    ON CONFLICT DO NOTHING;

    -- Insert Grades / Submissions logic if tables exist
    -- Check for 'grades' or 'submissions' table
    -- Inserting dummy grades for previous assignments
    INSERT INTO grades (student_id, subject_id, assessment_type, marks_obtained, total_marks, remarks, date_recorded)
    VALUES
        (v_student_id, v_subject_math_id, 'Test', 85, 100, 'Excellent work', NOW() - INTERVAL '10 days'),
        (v_student_id, v_subject_eng_id, 'Assignment', 78, 100, 'Good analysis, work on grammar', NOW() - INTERVAL '5 days');

    -- Attendance Records
    INSERT INTO attendance (student_id, class_id, date, status, remarks)
    VALUES 
        (v_student_id, v_class_id, CURRENT_DATE - INTERVAL '1 day', 'present', NULL),
        (v_student_id, v_class_id, CURRENT_DATE - INTERVAL '2 days', 'present', NULL),
        (v_student_id, v_class_id, CURRENT_DATE - INTERVAL '3 days', 'absent', 'Medical emergency');

    -- Library History (if table exists)
    -- INSERT INTO library_transactions ...

    -- ==========================================
    -- 3. SETUP PARENT DATA (Linkage & Fees)
    -- ==========================================
    
    -- Link Parent to Student
    INSERT INTO parent_students (parent_id, student_id, relationship)
    VALUES (v_parent_id, v_student_id, 'Mother')
    ON CONFLICT DO NOTHING;

    -- Fee Structure & Payments (if tables exist)
     INSERT INTO fee_structures (institution_id, title, amount, due_date, academic_year, term)
     VALUES (v_institution_id, 'Term 1 Tuition', 50000, NOW() + INTERVAL '30 days', '2025', 'Term 1')
     ON CONFLICT DO NOTHING;
    
    -- INSERT INTO fee_payments ...

    -- ==========================================
    -- 4. SETUP ADMIN DATA (Logs & Reports)
    -- ==========================================
    -- System logs are usually auto-generated, but we can insert some dummy financial records if a table exists.

END $$;
