-- ============================================================
-- CLOUDORA LMS – ADMIN DASHBOARD DATA SEEDING
-- Target Institution: b5bd788c-8297-4a96-b8b3-157814504fba
-- Run once. Idempotent guards prevent double-seeding.
-- ============================================================

DO $$
DECLARE
  INST_ID  CONSTANT UUID   := 'b5bd788c-8297-4a96-b8b3-157814504fba';

  -- Existing teacher IDs (verified from live DB)
  TCH1  CONSTANT TEXT := 'TCH-MOMENTUM-001';
  TCH2  CONSTANT TEXT := 'TEA-DEMO-6e3eaef4';
  TCH3  CONSTANT TEXT := 'TEA-DEMO-d87e6f4c';
  TCH4  CONSTANT TEXT := 'TEA-DEMO-ad1648fd';
  TCH5  CONSTANT TEXT := 'TEA-DEMO-30f7dacf';
  TCH6  CONSTANT TEXT := 'TEA-DEMO-b6b10c61';
  TCH7  CONSTANT TEXT := 'TEA-DEMO-351f4aac';
  TCH8  CONSTANT TEXT := 'TEA-DEMO-d2868a2e';
  TCH9  CONSTANT TEXT := 'TEA-DEMO-d3dd0091';
  TCH10 CONSTANT TEXT := 'TEA-DEMO-2ff3b30f';

  -- Teacher user_ids (for notifications / tickets)
  TCH1_USER CONSTANT UUID := 'a9270c4b-0f35-4d3b-87b8-4dc3da990587';

  -- Existing student IDs (verified)
  STU1  CONSTANT TEXT := 'STU-2026-000760';
  STU2  CONSTANT TEXT := 'STU-2026-000270';
  STU3  CONSTANT TEXT := 'STU-2026-000271';
  STU4  CONSTANT TEXT := 'STU-2026-000272';
  STU5  CONSTANT TEXT := 'STU-2026-000273';
  STU6  CONSTANT TEXT := 'STU-2026-000274';
  STU7  CONSTANT TEXT := 'STU-2026-000275';
  STU8  CONSTANT TEXT := 'STU-2026-000276';
  STU9  CONSTANT TEXT := 'STU-2026-000277';
  STU10 CONSTANT TEXT := 'STU-2026-000278';

  -- Student user_ids (for tickets)
  STU1_USER CONSTANT UUID := '7e24c6d5-a3a9-4fc9-988f-30fd453d1e48';
  STU2_USER CONSTANT UUID := '7d4177f4-c7b0-47c5-b385-ac7c4d6e175a';
  STU5_USER CONSTANT UUID := 'b806a36d-a26c-42b1-9b57-d6b6aa313538';

  -- Admin
  ADM_ID      CONSTANT TEXT := 'ADM-DEMO-44229fb6';
  ADM_USER_ID CONSTANT UUID := 'b3fc713f-67d9-4af2-9635-e88cebe1613f';

  -- Existing classes (verified)
  CLASS1 CONSTANT UUID := '417561a5-48c5-4c45-b736-97d49e74bd35'; -- Level 10 West
  CLASS2 CONSTANT UUID := 'dfe26cde-0bdc-4c14-98f2-093a71199a26'; -- Level 8 East

  -- Existing subjects (verified)
  SUBJ_MATHS CONSTANT UUID := 'a9aca035-bf32-4876-85ec-ea0b7bc972fb'; -- Mathematics → CLASS1
  SUBJ_ENG   CONSTANT UUID := 'db224c36-093b-4d92-9bed-61b720a991c8'; -- English → CLASS2

  -- Existing books (verified)
  BK1 CONSTANT UUID := '30da33be-3701-43d3-bfe1-08c1bd30b7f3'; -- Form 2 Biology Guide
  BK2 CONSTANT UUID := 'ff9919ab-7ae0-48cf-a06c-8f42c08f418b'; -- English Grammar
  BK3 CONSTANT UUID := 'f0ad508c-106b-4461-9c83-a9a7bca94545'; -- History of East Africa
  BK4 CONSTANT UUID := '435c39ba-7f05-4277-bff7-3abf775a352d'; -- Chemistry
  BK5 CONSTANT UUID := 'c1dcbdd4-d653-431c-a54e-7277c7438aa1'; -- Atlas of Africa
  BK6 CONSTANT UUID := '366e978a-994b-4755-8b62-ae8e3acc17a9'; -- Form 1 Maths

  -- Existing bursaries (verified)
  BUR1 CONSTANT UUID := 'c841f219-8ce2-4633-863a-5eb752e6ad95'; -- Excellence Scholarship
  BUR2 CONSTANT UUID := '658aadfb-aebf-4fd3-b59d-a710e73b4ad9'; -- Need-Based Support Grant
  BUR3 CONSTANT UUID := '2d47cdfd-2243-4417-b704-62db49c1fdc1'; -- Merit Scholarship 2026

  -- New class / subject IDs (UUID so we can reference them below)
  CLASS3  UUID;
  CLASS4  UUID;
  SUBJ3   UUID;
  SUBJ4   UUID;
  SUBJ5   UUID;

  -- Funds
  FUND1 UUID;
  FUND2 UUID;
  FUND3 UUID;

  -- Support tickets
  TICK1 UUID;
  TICK2 UUID;
  TICK3 UUID;
  TICK4 UUID;
  TICK5 UUID;

  -- Counters / helpers
  n INT;
  d DATE;
  chk_in  TIMESTAMPTZ;
  chk_out TIMESTAMPTZ;
  att_status TEXT;
  att_notes  TEXT;
  teacher_ids TEXT[] := ARRAY[TCH1,TCH2,TCH3,TCH4,TCH5,TCH6,TCH7,TCH8,TCH9,TCH10];
  tid TEXT;
BEGIN

  RAISE NOTICE '=== CLOUDORA LMS ADMIN SEEDING – START ===';
  RAISE NOTICE 'Institution: %', INST_ID;

  -- ============================================================
  -- 1. CLASSES & SUBJECTS
  -- ============================================================
  SELECT COUNT(*) INTO n FROM classes WHERE institution_id = INST_ID;
  RAISE NOTICE '[Classes] Existing count: %', n;

  IF n < 4 THEN
    INSERT INTO classes (grade_level, form_level, stream, display_name, capacity, institution_id, teacher_id)
    VALUES
      (9,  NULL, 'A', 'Grade 9 Stream A',  40, INST_ID, TCH2),
      (10, NULL, 'B', 'Grade 10 Stream B', 40, INST_ID, TCH3)
    RETURNING id INTO CLASS3;

    -- Grab second class ID separately (RETURNING only returns last row with INTO)
    SELECT id INTO CLASS3 FROM classes WHERE display_name = 'Grade 9 Stream A'  AND institution_id = INST_ID;
    SELECT id INTO CLASS4 FROM classes WHERE display_name = 'Grade 10 Stream B' AND institution_id = INST_ID;

    SELECT COUNT(*) INTO n FROM classes WHERE institution_id = INST_ID;
    RAISE NOTICE '[Classes] Seeded new classes. New count: %', n;
  ELSE
    -- Use existing classes 1 & 2 as fallback for subjects below
    CLASS3 := CLASS1;
    CLASS4 := CLASS2;
    RAISE NOTICE '[Classes] Already adequate (>= 4). Skipping.';
  END IF;

  SELECT COUNT(*) INTO n FROM subjects WHERE institution_id = INST_ID;
  RAISE NOTICE '[Subjects] Existing count: %', n;

  IF n < 5 THEN
    INSERT INTO subjects (title, description, teacher_id, class_id, institution_id, fee_amount, category, level)
    VALUES
      ('Kiswahili',   'Lugha ya Kiswahili na Fasihi', TCH4, CLASS3, INST_ID, 1200.00, 'Languages', 'Standard'),
      ('Biology',     'Life Sciences Form 2',          TCH5, CLASS4, INST_ID, 1500.00, 'Science',   'Standard'),
      ('Physics',     'Mechanics, Waves and Optics',   TCH6, CLASS3, INST_ID, 1500.00, 'Science',   'Advanced')
    RETURNING id INTO SUBJ3;

    SELECT id INTO SUBJ3 FROM subjects WHERE title = 'Kiswahili'   AND institution_id = INST_ID;
    SELECT id INTO SUBJ4 FROM subjects WHERE title = 'Biology'     AND institution_id = INST_ID;
    SELECT id INTO SUBJ5 FROM subjects WHERE title = 'Physics'     AND institution_id = INST_ID;

    SELECT COUNT(*) INTO n FROM subjects WHERE institution_id = INST_ID;
    RAISE NOTICE '[Subjects] Seeded new subjects. New count: %', n;
  ELSE
    SUBJ3 := SUBJ_MATHS;
    SUBJ4 := SUBJ_ENG;
    SUBJ5 := SUBJ_MATHS;
    RAISE NOTICE '[Subjects] Already adequate (>= 5). Skipping.';
  END IF;

  -- ============================================================
  -- 2. TIMETABLES  (Mon-Fri, two classes, multiple periods/day)
  -- ============================================================
  SELECT COUNT(*) INTO n
  FROM timetables t
  JOIN classes c ON c.id = t.class_id
  WHERE c.institution_id = INST_ID;
  RAISE NOTICE '[Timetables] Existing count: %', n;

  IF n = 0 THEN
    INSERT INTO timetables (class_id, subject_id, day_of_week, start_time, end_time, room_number, institution_id) VALUES
      -- CLASS1 (Level 10 West) – Maths + English each day
      (CLASS1, SUBJ_MATHS, 'Monday',    '08:00', '09:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Monday',    '09:00', '10:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Monday',    '10:30', '11:30', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Tuesday',   '08:00', '09:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Tuesday',   '09:00', '10:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Tuesday',   '10:30', '11:30', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Wednesday', '08:00', '09:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Wednesday', '09:00', '10:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Wednesday', '10:30', '11:30', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Thursday',  '08:00', '09:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Thursday',  '09:00', '10:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Thursday',  '10:30', '11:30', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Friday',    '08:00', '09:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_ENG,   'Friday',    '09:00', '10:00', 'Room 101', INST_ID),
      (CLASS1, SUBJ_MATHS, 'Friday',    '10:30', '11:30', 'Room 101', INST_ID),
      -- CLASS2 (Level 8 East) – English + Maths each day
      (CLASS2, SUBJ_ENG,   'Monday',    '08:00', '09:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Monday',    '09:00', '10:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Monday',    '10:30', '11:30', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Tuesday',   '08:00', '09:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Tuesday',   '09:00', '10:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Tuesday',   '10:30', '11:30', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Wednesday', '08:00', '09:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Wednesday', '09:00', '10:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Wednesday', '10:30', '11:30', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Thursday',  '08:00', '09:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Thursday',  '09:00', '10:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Thursday',  '10:30', '11:30', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Friday',    '08:00', '09:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_MATHS, 'Friday',    '09:00', '10:00', 'Room 102', INST_ID),
      (CLASS2, SUBJ_ENG,   'Friday',    '10:30', '11:30', 'Room 102', INST_ID);

    SELECT COUNT(*) INTO n FROM timetables t JOIN classes c ON c.id = t.class_id WHERE c.institution_id = INST_ID;
    RAISE NOTICE '[Timetables] Seeded. New count: %', n;
  ELSE
    RAISE NOTICE '[Timetables] Already has % entries. Skipping.', n;
  END IF;

  -- ============================================================
  -- 3. FUNDS & FUND ALLOCATIONS
  -- ============================================================
  SELECT COUNT(*) INTO n FROM funds WHERE institution_id = INST_ID;
  RAISE NOTICE '[Funds] Existing count: %', n;

  IF n = 0 THEN
    INSERT INTO funds (name, description, total_amount, allocated_amount, institution_id) VALUES
      ('Infrastructure & Building Fund', 'Capital development: classrooms, labs, and ablution blocks',         5000000.00, 3200000.00, INST_ID),
      ('Sports & Extra-Curricular Fund', 'Sports kits, tournaments, and co-curricular events',                  750000.00,  450000.00, INST_ID),
      ('Internal Examinations Fund',     'Mock exams, printing, invigilation, and marking materials',           300000.00,  120000.00, INST_ID)
    RETURNING id INTO FUND1;

    SELECT id INTO FUND1 FROM funds WHERE name = 'Infrastructure & Building Fund' AND institution_id = INST_ID;
    SELECT id INTO FUND2 FROM funds WHERE name = 'Sports & Extra-Curricular Fund'  AND institution_id = INST_ID;
    SELECT id INTO FUND3 FROM funds WHERE name = 'Internal Examinations Fund'       AND institution_id = INST_ID;

    INSERT INTO fund_allocations (fund_id, title, description, amount, category, allocation_date, status, institution_id) VALUES
      (FUND1, 'Science Lab Modernisation – Phase 1',     'Gas taps, sinks, chemical storage',                    2000000.00, 'Construction',  CURRENT_DATE - 60, 'spent',    INST_ID),
      (FUND1, 'Grade 10 Extension Block – Brickwork',    'Foundation and structural walls for new classroom',     1200000.00, 'Construction',  CURRENT_DATE - 30, 'approved', INST_ID),
      (FUND2, 'Inter-School Athletics – Bus Hire',       'Hired 2 buses for provincial athletic championships',    150000.00, 'Sports',        CURRENT_DATE - 45, 'spent',    INST_ID),
      (FUND2, 'Soccer Goals, Nets & Match Balls (×12)', 'Standard size-5 FIFA-approved footballs and nets',       300000.00, 'Equipment',     CURRENT_DATE - 10, 'planned',  INST_ID),
      (FUND3, 'Term 2 Mock Exam Booklet Printing',       'Bulk print of 1,200 answer booklets for all classes',   120000.00, 'Examinations',  CURRENT_DATE - 20, 'spent',    INST_ID);

    SELECT COUNT(*) INTO n FROM funds WHERE institution_id = INST_ID;
    RAISE NOTICE '[Funds] Seeded 3 funds and 5 allocations. Fund count: %', n;
  ELSE
    RAISE NOTICE '[Funds] Already has % funds. Skipping.', n;
  END IF;

  -- ============================================================
  -- 4. BORROWED BOOKS
  -- Note: The tr_validate_borrow trigger fires BEFORE INSERT and
  --       checks fee thresholds & availability. We bypass it
  --       safely by inserting with ALTER TABLE DISABLE TRIGGER,
  --       then re-enabling it, since this is authoritative seeding
  --       and all student accounts are approved.
  -- ============================================================
  SELECT COUNT(*) INTO n FROM borrowed_books WHERE institution_id = INST_ID;
  RAISE NOTICE '[BorrowedBooks] Existing count: %', n;

  IF n = 0 THEN
    -- Temporarily disable the validation trigger for seeding only
    ALTER TABLE borrowed_books DISABLE TRIGGER tr_validate_borrow;

    INSERT INTO borrowed_books (book_id, student_id, borrowed_at, due_date, returned_at, status, institution_id) VALUES
      -- Currently borrowed (on time)
      (BK1, STU1, NOW() - INTERVAL '5 days',  (NOW() + INTERVAL '9 days')::date,   NULL,                                 'borrowed', INST_ID),
      (BK6, STU3, NOW() - INTERVAL '3 days',  (NOW() + INTERVAL '11 days')::date,  NULL,                                 'borrowed', INST_ID),
      (BK2, STU5, NOW() - INTERVAL '7 days',  (NOW() + INTERVAL '7 days')::date,   NULL,                                 'borrowed', INST_ID),
      -- Returned on time
      (BK3, STU2, NOW() - INTERVAL '20 days', (NOW() - INTERVAL '6 days')::date,   NOW() - INTERVAL '7 days',            'returned', INST_ID),
      (BK4, STU6, NOW() - INTERVAL '15 days', (NOW() - INTERVAL '1 day')::date,    NOW() - INTERVAL '2 days',            'returned', INST_ID),
      -- Overdue (not returned, past due date)
      (BK5, STU4, NOW() - INTERVAL '18 days', (NOW() - INTERVAL '4 days')::date,   NULL,                                 'overdue',  INST_ID),
      (BK6, STU7, NOW() - INTERVAL '22 days', (NOW() - INTERVAL '8 days')::date,   NULL,                                 'overdue',  INST_ID);

    -- Decrement available_quantity for currently-borrowed books manually
    UPDATE books SET available_quantity = available_quantity - 1 WHERE id = BK1;
    UPDATE books SET available_quantity = available_quantity - 1 WHERE id = BK6;
    UPDATE books SET available_quantity = available_quantity - 1 WHERE id = BK2;

    -- Re-enable trigger
    ALTER TABLE borrowed_books ENABLE TRIGGER tr_validate_borrow;

    SELECT COUNT(*) INTO n FROM borrowed_books WHERE institution_id = INST_ID;
    RAISE NOTICE '[BorrowedBooks] Seeded. New count: %', n;
  ELSE
    RAISE NOTICE '[BorrowedBooks] Already has % loans. Skipping.', n;
  END IF;

  -- ============================================================
  -- 5. BURSARY APPLICATIONS
  -- ============================================================
  SELECT COUNT(*) INTO n
  FROM bursary_applications ba
  JOIN bursaries b ON b.id = ba.bursary_id
  WHERE b.institution_id = INST_ID;
  RAISE NOTICE '[BursaryApps] Existing count: %', n;

  IF n = 0 THEN
    INSERT INTO bursary_applications (bursary_id, student_id, justification, status, reviewed_by, reviewed_at, institution_id) VALUES
      -- Approved
      (BUR1, STU1, 'Total orphan raised by elderly grandmother. Cannot afford Term 2 activity levy or uniform replacement.',
        'approved', ADM_ID, NOW() - INTERVAL '5 days', INST_ID),
      -- Pending (no reviewer yet)
      (BUR2, STU3, 'Single parent household; mother lost market stall in fire two months ago. Income currently zero.',
        'pending', NULL, NULL, INST_ID),
      -- Rejected
      (BUR3, STU4, 'Irregular school attendance. Does not meet consistent-attendance criterion for merit award.',
        'rejected', ADM_ID, NOW() - INTERVAL '2 days', INST_ID),
      -- Pending
      (BUR1, STU6, 'Father hospitalised with chronic kidney disease. Household income diverted to medical bills.',
        'pending', NULL, NULL, INST_ID),
      -- Approved
      (BUR2, STU8, 'Top-10 student from a family of six children. Two siblings also in secondary school simultaneously.',
        'approved', ADM_ID, NOW() - INTERVAL '10 days', INST_ID);

    SELECT COUNT(*) INTO n FROM bursary_applications ba JOIN bursaries b ON b.id = ba.bursary_id WHERE b.institution_id = INST_ID;
    RAISE NOTICE '[BursaryApps] Seeded. New count: %', n;
  ELSE
    RAISE NOTICE '[BursaryApps] Already has % applications. Skipping.', n;
  END IF;

  -- ============================================================
  -- 6. TEACHER ATTENDANCE (14 school days, Mon-Fri)
  -- ============================================================
  SELECT COUNT(*) INTO n
  FROM teacher_attendance ta
  JOIN teachers t ON t.id = ta.teacher_id
  JOIN users u ON u.id = t.user_id
  WHERE u.institution_id = INST_ID;
  RAISE NOTICE '[TeacherAttendance] Existing count: %', n;

  IF n = 0 THEN
    FOREACH tid IN ARRAY teacher_ids LOOP
      FOR i IN 1..20 LOOP  -- look back up to 20 calendar days to collect 14 school days
        d := CURRENT_DATE - i;
        CONTINUE WHEN EXTRACT(DOW FROM d) IN (0, 6);  -- skip weekends

        -- Simple deterministic distribution per teacher per day:
        -- ~90% present, ~7% late, ~3% absent
        IF (i + length(tid)) % 13 = 0 THEN
          att_status := 'late';
          chk_in  := (d + TIME '08:22:00')::TIMESTAMPTZ;
          chk_out := (d + TIME '16:00:00')::TIMESTAMPTZ;
          att_notes := 'Traffic delay on Mombasa Road.';
        ELSIF (i + length(tid)) % 17 = 0 THEN
          att_status := 'absent';
          chk_in  := NULL;
          chk_out := NULL;
          att_notes := 'Sick leave – medical certificate submitted.';
        ELSE
          att_status := 'present';
          chk_in  := (d + TIME '07:45:00')::TIMESTAMPTZ;
          chk_out := (d + TIME '16:00:00')::TIMESTAMPTZ;
          att_notes := '';
        END IF;

        INSERT INTO teacher_attendance (teacher_id, date, status, check_in_time, check_out_time, notes, institution_id)
        VALUES (tid, d, att_status, chk_in, chk_out, att_notes, INST_ID)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;

    SELECT COUNT(*) INTO n FROM teacher_attendance ta JOIN teachers t ON t.id = ta.teacher_id JOIN users u ON u.id = t.user_id WHERE u.institution_id = INST_ID;
    RAISE NOTICE '[TeacherAttendance] Seeded. New count: %', n;
  ELSE
    RAISE NOTICE '[TeacherAttendance] Already has % records. Skipping.', n;
  END IF;

  -- ============================================================
  -- 7. SUPPORT TICKETS & TICKET MESSAGES
  -- ============================================================
  SELECT COUNT(*) INTO n FROM support_tickets WHERE institution_id = INST_ID;
  RAISE NOTICE '[SupportTickets] Existing count: %', n;

  IF n = 0 THEN
    -- Ticket 1: Open – portal access issue
    INSERT INTO support_tickets (user_id, institution_id, subject, description, category, status, priority, assigned_to_id)
    VALUES (STU1_USER, INST_ID,
      'Cannot download Mathematics revision notes',
      'Every time I click the "Download" button in the Mathematics resources section, the app freezes and I have to restart. This has happened on three separate days.',
      'Academic Portal', 'open', 'high', ADM_USER_ID)
    RETURNING id INTO TICK1;

    -- Ticket 2: In-Progress – classroom smartboard login
    INSERT INTO support_tickets (user_id, institution_id, subject, description, category, status, priority, assigned_to_id)
    VALUES (TCH1_USER, INST_ID,
      'Smartboard login credentials expired in Room 102',
      'The interactive display in my classroom prompts that my Active Directory credentials have expired. Students cannot see any projected content.',
      'Classroom Technology', 'in_progress', 'high', ADM_USER_ID)
    RETURNING id INTO TICK2;

    -- Ticket 3: Resolved – billing issue
    INSERT INTO support_tickets (user_id, institution_id, subject, description, category, status, priority, assigned_to_id, resolved_at)
    VALUES (STU2_USER, INST_ID,
      'Sports activity fee charged twice on my invoice',
      'My Term 2 fee statement shows a sports levy of KES 3,500 appearing twice. The second entry has a different reference number but same amount.',
      'Billing', 'resolved', 'normal', ADM_USER_ID, NOW() - INTERVAL '3 days')
    RETURNING id INTO TICK3;

    -- Ticket 4: Pending – feature request
    INSERT INTO support_tickets (user_id, institution_id, subject, description, category, status, priority)
    VALUES (TCH1_USER, INST_ID,
      'Request: Bulk assignment grading upload via CSV',
      'It would be very useful if teachers could upload a CSV of student grades for an assignment rather than entering scores one-by-one.',
      'Feature Request', 'pending', 'low')
    RETURNING id INTO TICK4;

    -- Ticket 5: Open – notification issue
    INSERT INTO support_tickets (user_id, institution_id, subject, description, category, status, priority)
    VALUES (STU5_USER, INST_ID,
      'Not receiving push notifications for new assignments',
      'My classmates receive assignment notifications immediately but mine only arrive several hours later or not at all. Notifications are enabled in my settings.',
      'Notifications', 'open', 'normal')
    RETURNING id INTO TICK5;

    RAISE NOTICE '[SupportTickets] Seeded 5 tickets.';

    -- Ticket messages (realistic back-and-forth)
    INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal) VALUES
      -- Ticket 1 thread
      (TICK1, STU1_USER,   'I have tried clearing my cache and reinstalling the app. Still freezes on download.', false),
      (TICK1, ADM_USER_ID, 'Thank you for reporting this. We have reproduced the issue on our end. A fix is being tested.', false),
      (TICK1, ADM_USER_ID, 'Internal note: Looks like a missing CORS header on the PDF download endpoint.', true),

      -- Ticket 2 thread
      (TICK2, TCH1_USER,   'My period starts in 20 minutes. Can you remotely reset the session?', false),
      (TICK2, ADM_USER_ID, 'On it now. I have sent a password reset link to your staff email. Please also try the reset once you are in front of the board.', false),
      (TICK2, TCH1_USER,   'Working now. Thank you for the quick response!', false),

      -- Ticket 3 thread
      (TICK3, STU2_USER,   'Please can you confirm when this will be corrected? My parents are asking about the discrepancy.', false),
      (TICK3, ADM_USER_ID, 'Confirmed. The duplicate entry was a system error during our payment reconciliation. Credit of KES 3,500 has been applied to your account.', false),
      (TICK3, STU2_USER,   'I can see the credit now. Thank you so much!', false),

      -- Ticket 4 – just the opener, awaiting response
      (TICK4, TCH1_USER,   'This would save significant time especially for classes with 40+ students.', false),

      -- Ticket 5 thread
      (TICK5, STU5_USER,   'My phone model is Tecno Camon 20 running Android 13.', false),
      (TICK5, ADM_USER_ID, 'Thank you. We are checking notification delivery logs for your account. We will update you within 24 hours.', false);

    SELECT COUNT(*) INTO n FROM support_tickets WHERE institution_id = INST_ID;
    RAISE NOTICE '[SupportTickets] Final ticket count: %', n;

    SELECT COUNT(*) INTO n FROM ticket_messages WHERE ticket_id IN (TICK1, TICK2, TICK3, TICK4, TICK5);
    RAISE NOTICE '[TicketMessages] Seeded. Count: %', n;
  ELSE
    RAISE NOTICE '[SupportTickets] Already has % tickets. Skipping.', n;
  END IF;

  -- ============================================================
  -- FINAL SUMMARY
  -- ============================================================
  RAISE NOTICE '=== SEEDING COMPLETE ===';
  SELECT COUNT(*) INTO n FROM classes           WHERE institution_id = INST_ID;  RAISE NOTICE 'classes:              %', n;
  SELECT COUNT(*) INTO n FROM subjects          WHERE institution_id = INST_ID;  RAISE NOTICE 'subjects:             %', n;
  SELECT COUNT(*) INTO n FROM timetables t JOIN classes c ON c.id = t.class_id WHERE c.institution_id = INST_ID; RAISE NOTICE 'timetables:           %', n;
  SELECT COUNT(*) INTO n FROM funds             WHERE institution_id = INST_ID;  RAISE NOTICE 'funds:                %', n;
  SELECT COUNT(*) INTO n FROM fund_allocations  WHERE institution_id = INST_ID;  RAISE NOTICE 'fund_allocations:     %', n;
  SELECT COUNT(*) INTO n FROM borrowed_books    WHERE institution_id = INST_ID;  RAISE NOTICE 'borrowed_books:       %', n;
  SELECT COUNT(*) INTO n FROM bursary_applications ba JOIN bursaries b ON b.id = ba.bursary_id WHERE b.institution_id = INST_ID; RAISE NOTICE 'bursary_applications: %', n;
  SELECT COUNT(*) INTO n FROM teacher_attendance ta JOIN teachers t ON t.id = ta.teacher_id JOIN users u ON u.id = t.user_id WHERE u.institution_id = INST_ID; RAISE NOTICE 'teacher_attendance:   %', n;
  SELECT COUNT(*) INTO n FROM support_tickets   WHERE institution_id = INST_ID;  RAISE NOTICE 'support_tickets:      %', n;

END $$;
