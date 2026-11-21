-- ============================================================================
-- Seed File: 03_demo_users_and_roles.sql
-- Environment: Demo Only
-- Purpose: Demo staff, teachers, students, parents, and administrative roles.
-- Identifier standards: Students 0001.., Staff ST0001.., Parents PA0001.., Admins AD0001..
-- ============================================================================

DO $$
DECLARE
    v_inst_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';

    -- User UUIDs
    v_u_admin1 UUID := 'a1111111-0000-0000-0000-000000000001';
    v_u_admin2 UUID := 'a1111111-0000-0000-0000-000000000002';
    v_u_teach1 UUID := 'a1111111-0000-0000-0000-000000000003';
    v_u_teach2 UUID := 'a1111111-0000-0000-0000-000000000004';
    v_u_stud1  UUID := 'a1111111-0000-0000-0000-000000000005';
    v_u_stud2  UUID := 'a1111111-0000-0000-0000-000000000006';
    v_u_stud3  UUID := 'a1111111-0000-0000-0000-000000000007';
    v_u_parent1 UUID := 'a1111111-0000-0000-0000-000000000008';
    v_u_parent2 UUID := 'a1111111-0000-0000-0000-000000000009';

    -- Class UUIDs
    v_class_g7 UUID := 'e1111111-1111-1111-1111-111111111111';
    v_class_g8 UUID := 'e2222222-2222-2222-2222-222222222222';

    -- Role Record IDs
    v_stud1_id UUID;
    v_stud2_id UUID;
    v_stud3_id UUID;
    v_parent1_id UUID;
    v_parent2_id UUID;
    v_teach1_id UUID;
    v_teach2_id UUID;
    v_admin1_id UUID;
    v_admin2_id UUID;

    -- Roles / Templates
    v_sup_template_id UUID;
    v_fin_template_id UUID;
BEGIN
    -- 1. Create Base User Records
    INSERT INTO public.users (id, institution_id, email, first_name, last_name, full_name, role, status, created_at, updated_at)
    VALUES
        (v_u_admin1, v_inst_id, 'admin.main@cloudora.demo', 'Arthur', 'Omondi', 'Arthur Omondi', 'admin', 'active', NOW(), NOW()),
        (v_u_admin2, v_inst_id, 'admin.supervisor@cloudora.demo', 'Beatrice', 'Njeri', 'Beatrice Njeri', 'admin', 'active', NOW(), NOW()),
        (v_u_teach1, v_inst_id, 'sarah.teacher@cloudora.demo', 'Sarah', 'Chemutai', 'Sarah Chemutai', 'teacher', 'active', NOW(), NOW()),
        (v_u_teach2, v_inst_id, 'geoffrey.librarian@cloudora.demo', 'Geoffrey', 'Kiprotich', 'Geoffrey Kiprotich', 'teacher', 'active', NOW(), NOW()),
        (v_u_stud1,  v_inst_id, 'kelson.student@cloudora.demo', 'Kelson', 'Otieno', 'Kelson Otieno', 'student', 'active', NOW(), NOW()),
        (v_u_stud2,  v_inst_id, 'faith.student@cloudora.demo', 'Faith', 'Mwangi', 'Faith Mwangi', 'student', 'active', NOW(), NOW()),
        (v_u_stud3,  v_inst_id, 'john.student@cloudora.demo', 'John', 'Mwangi', 'John Mwangi', 'student', 'active', NOW(), NOW()),
        (v_u_parent1, v_inst_id, 'james.parent@cloudora.demo', 'James', 'Mwangi', 'James Mwangi', 'parent', 'active', NOW(), NOW()),
        (v_u_parent2, v_inst_id, 'mary.parent@cloudora.demo', 'Mary', 'Mwangi', 'Mary Mwangi', 'parent', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = 'active';

    -- 2. Upsert Admins
    INSERT INTO public.admins (user_id, institution_id, is_main, admin_identifier, can_manage_users, created_at, updated_at)
    VALUES
        (v_u_admin1, v_inst_id, true, 'AD0001', true, NOW(), NOW()),
        (v_u_admin2, v_inst_id, false, 'AD0002', true, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        admin_identifier = EXCLUDED.admin_identifier,
        is_main = EXCLUDED.is_main
    RETURNING id INTO v_admin1_id;

    -- 3. Upsert Teachers & Librarian Designation
    INSERT INTO public.teachers (user_id, institution_id, teacher_identifier, status, created_at, updated_at)
    VALUES
        (v_u_teach1, v_inst_id, 'ST0001', 'active', NOW(), NOW()),
        (v_u_teach2, v_inst_id, 'ST0002', 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        teacher_identifier = EXCLUDED.teacher_identifier;

    -- Add Librarian Designation to Teacher 2
    INSERT INTO public.designations (institution_id, user_id, type, is_active, assigned_at, created_at, updated_at)
    VALUES (v_inst_id, v_u_teach2, 'librarian', true, NOW(), NOW(), NOW())
    ON CONFLICT (institution_id, user_id, type) DO UPDATE SET is_active = true;

    -- 4. Upsert Students with 4-digit numbers (0001, 0002, 0003)
    INSERT INTO public.students (user_id, institution_id, student_identifier, admission_number, class_id, status, created_at, updated_at)
    VALUES
        (v_u_stud1, v_inst_id, '0001', '0001', v_class_g7, 'active', NOW(), NOW()),
        (v_u_stud2, v_inst_id, '0002', '0002', v_class_g7, 'active', NOW(), NOW()),
        (v_u_stud3, v_inst_id, '0003', '0003', v_class_g8, 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        student_identifier = EXCLUDED.student_identifier,
        admission_number = EXCLUDED.admission_number,
        class_id = EXCLUDED.class_id;

    SELECT id INTO v_stud1_id FROM public.students WHERE user_id = v_u_stud1;
    SELECT id INTO v_stud2_id FROM public.students WHERE user_id = v_u_stud2;
    SELECT id INTO v_stud3_id FROM public.students WHERE user_id = v_u_stud3;

    -- 5. Upsert Parents with PA numbers
    INSERT INTO public.parents (user_id, institution_id, parent_identifier, phone, address, created_at, updated_at)
    VALUES
        (v_u_parent1, v_inst_id, 'PA0001', '+254 711 000 001', 'Nairobi, Kenya', NOW(), NOW()),
        (v_u_parent2, v_inst_id, 'PA0002', '+254 711 000 002', 'Nairobi, Kenya', NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        parent_identifier = EXCLUDED.parent_identifier,
        phone = EXCLUDED.phone;

    SELECT id INTO v_parent1_id FROM public.parents WHERE user_id = v_u_parent1;
    SELECT id INTO v_parent2_id FROM public.parents WHERE user_id = v_u_parent2;

    -- 6. Link Multi-child Parent (James has child 2 & child 3, Mary is co-guardian)
    IF v_parent1_id IS NOT NULL AND v_stud2_id IS NOT NULL THEN
        INSERT INTO public.parent_students (parent_id, student_id, relationship, institution_id, is_primary)
        VALUES 
            (v_parent1_id, v_stud2_id, 'Father', v_inst_id, true),
            (v_parent1_id, v_stud3_id, 'Father', v_inst_id, true)
        ON CONFLICT (parent_id, student_id) DO NOTHING;
    END IF;

    IF v_parent2_id IS NOT NULL AND v_stud2_id IS NOT NULL THEN
        INSERT INTO public.parent_students (parent_id, student_id, relationship, institution_id, is_primary)
        VALUES 
            (v_parent2_id, v_stud2_id, 'Mother', v_inst_id, false),
            (v_parent2_id, v_stud3_id, 'Mother', v_inst_id, false)
        ON CONFLICT (parent_id, student_id) DO NOTHING;
    END IF;

    -- Update identifier counters
    UPDATE public.identifier_counters SET last_number = 3 WHERE institution_id = v_inst_id AND entity_type = 'student';
    UPDATE public.identifier_counters SET last_number = 2 WHERE institution_id = v_inst_id AND entity_type = 'staff';
    UPDATE public.identifier_counters SET last_number = 2 WHERE institution_id = v_inst_id AND entity_type = 'parent';
    UPDATE public.identifier_counters SET last_number = 2 WHERE institution_id = v_inst_id AND entity_type = 'admin';

END $$;
