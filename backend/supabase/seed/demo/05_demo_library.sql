-- ============================================================================
-- Seed File: 05_demo_library.sql
-- Environment: Demo Only
-- Purpose: Library catalog, books, and borrowing records for demo institution.
-- ============================================================================

DO $$
DECLARE
    v_inst_id UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';

    -- Students
    v_stud1_id UUID;
    v_stud2_id UUID;

    -- Teachers
    v_teach_lib UUID;

    -- Books
    v_book1 UUID := 'b1111111-0000-0000-0000-000000000001';
    v_book2 UUID := 'b1111111-0000-0000-0000-000000000002';
    v_book3 UUID := 'b1111111-0000-0000-0000-000000000003';
    v_book4 UUID := 'b1111111-0000-0000-0000-000000000004';
BEGIN
    SELECT id INTO v_stud1_id FROM public.students WHERE student_identifier = '0001';
    SELECT id INTO v_stud2_id FROM public.students WHERE student_identifier = '0002';
    SELECT user_id INTO v_teach_lib FROM public.teachers WHERE teacher_identifier = 'ST0002';

    -- 1. Ensure Library Config
    INSERT INTO public.library_config (institution_id, settings, created_at, updated_at)
    VALUES (
        v_inst_id,
        '{
            "defaultBorrowDurationDays": 14,
            "maxBooksPerStudent": 3,
            "overdueFinePerDay": 20,
            "userRoles": {
                "student": {"borrowDuration": 14, "maxBooks": 3},
                "teacher": {"borrowDuration": 30, "maxBooks": 10}
            }
        }'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (institution_id) DO UPDATE SET
        settings = EXCLUDED.settings,
        updated_at = NOW();

    -- 2. Catalog Books
    INSERT INTO public.books (
        id, institution_id, title, author, isbn, publisher, category, total_copies, available_copies, status, created_at, updated_at
    )
    VALUES
        (v_book1, v_inst_id, 'Spotlight Quick Revision Mathematics Grade 7', 'J. Mwangi & P. Kariuki', '978-9966-05-123-1', 'Spotlight Publishers', 'Mathematics', 15, 14, 'available', NOW(), NOW()),
        (v_book2, v_inst_id, 'Top Mark CBC Integrated Science Grade 7', 'Dr. Mary Achieng', '978-9966-05-124-8', 'KLB Kenya', 'Science', 20, 19, 'available', NOW(), NOW()),
        (v_book3, v_inst_id, 'The River Between', 'Ngugi wa Thiong''o', '978-0435-905-484', 'Heinemann Educational', 'Literature', 10, 10, 'available', NOW(), NOW()),
        (v_book4, v_inst_id, 'Kiswahili Mufti Ghorofa ya 7', 'Wallah Bin Wallah', '978-9966-22-345-0', 'Longhorn Publishers', 'Languages', 25, 25, 'available', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        total_copies = EXCLUDED.total_copies,
        available_copies = EXCLUDED.available_copies;

    -- 3. Active Loans
    IF v_stud1_id IS NOT NULL THEN
        INSERT INTO public.borrowed_books (
            institution_id, book_id, user_id, student_id, borrow_date, due_date, status, created_at, updated_at
        )
        VALUES (
            v_inst_id, v_book1, (SELECT user_id FROM public.students WHERE id = v_stud1_id), v_stud1_id,
            CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '11 days', 'borrowed', NOW(), NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4. Overdue Loan for Demonstration
    IF v_stud2_id IS NOT NULL THEN
        INSERT INTO public.borrowed_books (
            institution_id, book_id, user_id, student_id, borrow_date, due_date, status, created_at, updated_at
        )
        VALUES (
            v_inst_id, v_book2, (SELECT user_id FROM public.students WHERE id = v_stud2_id), v_stud2_id,
            CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '6 days', 'overdue', NOW(), NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
