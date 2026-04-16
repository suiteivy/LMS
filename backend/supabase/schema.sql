-- ==========================================
-- LMS SYSTEM MASTER SCHEMA
-- Consolidated: 2026-02-11
-- ==========================================

-- ---------------------------------------------------------
-- PART 0: UTILITIES & EXTENSIONS
-- ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- ---------------------------------------------------------
-- PART 0.1: SCHOOL CATEGORIES
-- ---------------------------------------------------------
CREATE TABLE school_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g. 'Primary School', 'High School'
    level_label TEXT NOT NULL, -- e.g. 'Grade', 'Form', 'KG'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- PART 1: CORE TABLES (UUID BASED)
-- ---------------------------------------------------------

-- 1. Institutions
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    email TEXT,
    type TEXT CHECK (type IN ('primary', 'secondary', 'tertiary', 'vocational')),
    principal_name TEXT,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    subscription_plan TEXT DEFAULT 'trial' CHECK (subscription_plan IN ('trial', 'beta', 'basic', 'pro', 'premium', 'custom')),
    has_used_trial BOOLEAN DEFAULT TRUE,
    trial_start_date TIMESTAMPTZ DEFAULT NOW(),
    trial_end_date TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    addon_bursary BOOLEAN NOT NULL DEFAULT false,
    addon_library BOOLEAN NOT NULL DEFAULT false,
    addon_messaging BOOLEAN NOT NULL DEFAULT false,
    addon_finance BOOLEAN NOT NULL DEFAULT false,
    addon_analytics BOOLEAN NOT NULL DEFAULT false,
    addon_diary BOOLEAN NOT NULL DEFAULT false,
    addon_attendance BOOLEAN NOT NULL DEFAULT false,
    email_domain TEXT,
    custom_student_limit INTEGER,
    category_id UUID REFERENCES school_categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Base table for Auth mapping)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT CHECK (role IN ('admin', 'student', 'teacher', 'parent', 'bursary', 'master_admin')) NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    phone TEXT UNIQUE, -- Added unique constraint for identification
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    address TEXT,
    avatar_url TEXT,
    institution_id UUID REFERENCES institutions(id),
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique name constraint per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_name_per_institution 
ON users (institution_id, LOWER(first_name), LOWER(last_name)) 
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- ---------------------------------------------------------
-- PART 2: CUSTOM ID SYSTEM
-- ---------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS global_id_seq;

CREATE OR REPLACE FUNCTION generate_custom_id(prefix TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('global_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Role-specific tables with Custom IDs
CREATE TABLE admins (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('ADM'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teachers (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('TEA'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    department TEXT,
    qualification TEXT,
    position TEXT CHECK (position IN ('teacher', 'head_of_department', 'assistant', 'class_teacher', 'dean', 'headteacher', 'deputy_headteacher', 'subject_teacher')) DEFAULT 'teacher',
    hire_date DATE DEFAULT CURRENT_DATE,
    specialization TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('STU'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    grade_level_legacy TEXT,
    grade_level INTEGER,
    form_level INTEGER,
    academic_year TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    fee_balance NUMERIC DEFAULT 0,
    parent_contact TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parents (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('PAR'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    occupation TEXT,
    address TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bursars (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('BUR'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    relationship TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- ---------------------------------------------------------
-- PART 3: ACADEMIC MODULE
-- ---------------------------------------------------------

-- 1. Classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level INTEGER,
    form_level INTEGER,
    stream TEXT,
    display_name TEXT,
    capacity INTEGER DEFAULT 40, -- Added for reporting
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('enrolled', 'completed', 'dropped')) DEFAULT 'enrolled',
    grade TEXT,
    UNIQUE(student_id, subject_id),
    institution_id UUID REFERENCES institutions(id)
);

-- 3. Class Enrollments
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    institution_id UUID REFERENCES institutions(id),
    UNIQUE(student_id, class_id)
);

-- 3. Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_id TEXT REFERENCES teachers(id),
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id),
    fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fee_config JSONB DEFAULT '{}'::jsonb,
    materials JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    category TEXT, -- e.g. 'Science', 'Arts'
    level TEXT, -- e.g. 'Advanced', 'Standard'
    image_url TEXT,
    duration TEXT,
    rating DOUBLE PRECISION DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    scheduled_at TIMESTAMPTZ,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Timetables
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week TEXT CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    total_points INTEGER DEFAULT 100,
    status TEXT CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'active',
    is_published BOOLEAN DEFAULT false,
    weight NUMERIC DEFAULT 0,
    term TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT,
    content TEXT,
    grade NUMERIC,
    feedback TEXT,
    status TEXT CHECK (status IN ('submitted', 'graded', 'late', 'pending')) DEFAULT 'pending',
    institution_id UUID REFERENCES institutions(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- 8. Academic Reports (NEW)
CREATE TABLE academic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    report_type TEXT CHECK (report_type IN ('end-of-term', 'individual', 'statistical', 'ranking')) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
    notes TEXT,
    institution_id UUID REFERENCES institutions(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id, date)
);

-- 9. Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    size TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Diary Entries
CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Exams
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    max_score NUMERIC DEFAULT 100,
    is_published BOOLEAN DEFAULT false,
    weight NUMERIC DEFAULT 0,
    term TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Exam Results
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    score NUMERIC,
    feedback TEXT,
    graded_by TEXT REFERENCES teachers(id),
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

-- ---------------------------------------------------------
-- PART 4: LIBRARY MODULE
-- ---------------------------------------------------------

-- 1. Library Config
CREATE TABLE library_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_fee_percent_for_borrow NUMERIC(3, 2) DEFAULT 0.50,
    default_borrow_limit INTEGER DEFAULT 3,
    active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Books
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    category TEXT,
    total_quantity INTEGER NOT NULL DEFAULT 1,
    available_quantity INTEGER NOT NULL DEFAULT 1,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Borrowed Books
CREATE TABLE borrowed_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) NOT NULL,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    borrowed_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE,
    returned_at TIMESTAMPTZ NULL,
    status TEXT DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_borrower_presence CHECK (
        (student_id IS NOT NULL AND teacher_id IS NULL) OR 
        (student_id IS NULL AND teacher_id IS NOT NULL)
    )
);

-- 4. Legacy/Preserved Tables (Singular)
CREATE TABLE book (
    id BIGSERIAL PRIMARY KEY,
    book_id UUID DEFAULT gen_random_uuid(),
    book_title TEXT,
    author TEXT,
    isbn TEXT,
    category TEXT,
    borrowed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id BIGINT REFERENCES book(id),
    category TEXT,
    quantity NUMERIC
);

-- ---------------------------------------------------------
-- PART 5: FINANCE MODULE
-- ---------------------------------------------------------

-- 1. Fee Structures
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    academic_year TEXT,
    term TEXT,
    is_active BOOLEAN DEFAULT true,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payments (Legacy)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'scholarship')),
    reference_number TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bursaries
CREATE TABLE bursaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    deadline DATE,
    requirements TEXT,
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bursary Applications
CREATE TABLE bursary_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bursary_id UUID REFERENCES bursaries(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    justification TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by TEXT REFERENCES admins(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    institution_id UUID REFERENCES institutions(id),
    UNIQUE(bursary_id, student_id)
);

-- 5. Funds
CREATE TABLE funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    allocated_amount NUMERIC(10, 2) DEFAULT 0,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Fund Allocations
CREATE TABLE fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID REFERENCES funds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT,
    allocation_date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('planned', 'approved', 'spent')) DEFAULT 'planned',
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Financial Transactions
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id),
    type TEXT CHECK (type IN ('fee_payment', 'salary_payout', 'expense', 'grant', 'other')),
    direction TEXT CHECK (direction IN ('inflow', 'outflow')),
    amount NUMERIC(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    method TEXT,
    status TEXT DEFAULT 'completed',
    reference_id TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Teacher Payouts
CREATE TABLE teacher_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    period_start DATE,
    period_end DATE,
    status TEXT CHECK (status IN ('pending', 'processing', 'paid', 'failed')) DEFAULT 'pending',
    payout_date TIMESTAMPTZ,
    reference_number TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Teacher Attendance
CREATE TABLE teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    notes TEXT,
    institution_id UUID REFERENCES institutions(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- PART 6: COMMUNICATION MODULE
-- ---------------------------------------------------------

-- 1. Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- PART 6: VIEWS & TRIGGERS
-- ---------------------------------------------------------

-- 1. Fees View (Library threshold check)
CREATE OR REPLACE VIEW fees AS
WITH student_totals AS (
    SELECT 
        s.id as student_id,
        s.user_id as user_id,
        COALESCE(SUM(fs.amount), 0) as total_fee
    FROM students s
    CROSS JOIN fee_structures fs
    WHERE fs.is_active = true
    GROUP BY s.id, s.user_id
),
payment_totals AS (
    SELECT 
        student_id,
        COALESCE(SUM(amount), 0) as amount_paid
    FROM payments
    WHERE status = 'completed'
    GROUP BY student_id
)
SELECT 
    st.student_id,
    st.user_id,
    st.total_fee,
    COALESCE(pt.amount_paid, 0) as amount_paid
FROM student_totals st
LEFT JOIN payment_totals pt ON st.student_id = pt.student_id;

-- 2. Library Borrow Trigger
CREATE OR REPLACE FUNCTION _validate_and_decrement_book()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  unpaid_ratio numeric := 1;
  max_borrow int := 3;
  current_borrow_count int;
  overdue_count int;
  user_inst_id uuid;
  book_inst_id uuid;
  user_status text;
  cfg_min_fee numeric;
begin
  select u.status, u.institution_id into user_status, user_inst_id
  from users u
  join students s on s.user_id = u.id
  where s.id = NEW.student_id;

  if user_status != 'approved' then
    raise exception 'User is not approved to borrow books';
  end if;

  select available_quantity, institution_id into overdue_count, book_inst_id
  from books 
  where id = NEW.book_id;
  
  if overdue_count <= 0 then
    raise exception 'Book not available';
  end if;

  select min_fee_percent_for_borrow, default_borrow_limit into cfg_min_fee, max_borrow
  from library_config
  where active = true
  order by effective_from desc
  limit 1;
  
  max_borrow := coalesce(max_borrow, 3);
  cfg_min_fee := coalesce(cfg_min_fee, 0.5);

  select case when total_fee > 0 then (amount_paid / total_fee) else 1 end
  into unpaid_ratio
  from fees
  where student_id = NEW.student_id;

  if unpaid_ratio < cfg_min_fee then
    raise exception 'Payment below required threshold (% percent)', (cfg_min_fee * 100)::int;
  end if;

  select count(*) into current_borrow_count
  from borrowed_books
  where student_id = NEW.student_id and returned_at is null;

  if current_borrow_count >= max_borrow then
    raise exception 'Borrow limit reached';
  end if;

  update books set available_quantity = available_quantity - 1 where id = NEW.book_id;
  return NEW;
end;
$$ SET search_path = public;

DROP TRIGGER IF EXISTS tr_validate_borrow ON borrowed_books;
CREATE TRIGGER tr_validate_borrow
BEFORE INSERT ON borrowed_books
FOR EACH ROW EXECUTE FUNCTION _validate_and_decrement_book();

-- 3. User Role Entry Trigger
CREATE OR REPLACE FUNCTION handle_user_role_entry()
RETURNS trigger AS $$
DECLARE
    v_is_main BOOLEAN := false;
BEGIN
  IF NEW.role = 'admin' THEN
    IF NOT EXISTS (SELECT 1 FROM admins WHERE institution_id = NEW.institution_id) THEN
        v_is_main := true;
    END IF;
    INSERT INTO admins (user_id, institution_id, is_main) 
    VALUES (NEW.id, NEW.institution_id, v_is_main) 
    ON CONFLICT (user_id) DO UPDATE SET is_main = EXCLUDED.is_main;
  ELSIF NEW.role = 'teacher' THEN
    INSERT INTO teachers (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'student' THEN
    INSERT INTO students (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'parent' THEN
    INSERT INTO parents (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'bursary' THEN
    INSERT INTO bursars (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_create_role_entry ON users;
CREATE TRIGGER tr_create_role_entry
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION handle_user_role_entry();

-- 4. Apply Updated_At Triggers to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_update_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER tr_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;

-- ---------------------------------------------------------
-- PART 7: HELPER FUNCTIONS FOR RLS
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION get_current_user_institution_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Non-recursive lookup: explicitly check auth.uid() first
  SELECT institution_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $
  SELECT role FROM users WHERE id = auth.uid();
$;

CREATE OR REPLACE FUNCTION is_subscription_active(p_institution_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM institutions
    WHERE id = p_institution_id
    AND subscription_status = 'active'
    AND (trial_end_date IS NULL OR trial_end_date > NOW())
  );
END;
$;

CREATE OR REPLACE FUNCTION current_user_student_id() RETURNS TEXT AS $
    SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION current_user_teacher_id() RETURNS TEXT AS $$
    SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION current_user_bursar_id() RETURNS TEXT AS $$
    SELECT id FROM bursars WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_student_in_class(p_class_id UUID, p_student_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM class_enrollments WHERE class_id = p_class_id AND student_id = p_student_id);
END;
$$;

-- ---------------------------------------------------------
-- PART 8: ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------

-- Apply strict institution isolation to all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Fixed recursion by checking id = auth.uid() first to short-circuit policy evaluation
CREATE POLICY "strict_institution_isolation" ON users FOR ALL 
USING (
    id = auth.uid() 
    OR (
        institution_id = get_current_user_institution_id() 
        AND (SELECT role FROM users WHERE id = auth.uid()) != 'master_admin'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'master_admin'
);
-- Academic Reports Policy
ALTER TABLE academic_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_reports_isolation" ON academic_reports FOR ALL 
USING (
    institution_id = get_current_user_institution_id() 
    AND (
        get_current_user_role() IN ('admin', 'teacher', 'master_admin') 
        OR (status = 'published' AND student_id = current_user_student_id())
    )
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON admins FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON teachers FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON students FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON parents FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE bursars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON bursars FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON classes FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON enrollments FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON subjects FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON lessons FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON timetables FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON assignments FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON submissions FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON attendance FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON resources FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON announcements FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON exams FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON exam_results FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON books FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE borrowed_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON borrowed_books FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON fee_structures FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON payments FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE bursaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON bursaries FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE bursary_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON bursary_applications FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON funds FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE fund_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON fund_allocations FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON financial_transactions FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE teacher_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON teacher_payouts FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON teacher_attendance FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON messages FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON notifications FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON class_enrollments FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON diary_entries FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strict_institution_isolation" ON institutions FOR ALL USING (id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
CREATE POLICY "public_read_institutions" ON institutions FOR SELECT USING (true);


-- ---------------------------------------------------------
-- PART 9: PLATFORM ADMINS & SUPPORT REQUESTS
-- ---------------------------------------------------------

-- 1. Platform Admins
CREATE TABLE platform_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can see all platform admins" 
ON platform_admins FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'master_admin'
    )
);

CREATE POLICY "Service role full access" 
ON platform_admins FOR ALL 
USING (true)
WITH CHECK (true);

-- 2. Password Reset Rate Limiting
CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    requested_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_password_reset_email_time ON password_reset_requests(email, requested_at);

-- 3. Trial/Demo Sessions Tracking
CREATE TABLE trial_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT,
    demo_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    session_token TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trial_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trial sessions are internal-only" ON trial_sessions FOR ALL USING (false); -- Admin/System access via Service Role

-- 4. Support Ticketing System
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'in_progress', 'awaiting_customer', 'escalated', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    escalation_level INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets policies
CREATE POLICY "Users can view own tickets" 
ON support_tickets FOR SELECT
USING (user_id = auth.uid() OR assigned_to_id = auth.uid());

CREATE POLICY "Users can create tickets" 
ON support_tickets FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can manage all tickets" 
ON support_tickets FOR ALL
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'));

-- Ticket messages policies
CREATE POLICY "Users can view messages for their tickets"
ON ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE id = ticket_messages.ticket_id 
        AND (user_id = auth.uid() OR assigned_to_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
);

CREATE POLICY "Users can add messages to their tickets"
ON ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE id = ticket_messages.ticket_id 
        AND (user_id = auth.uid() OR assigned_to_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin')
);

-- 4. Add-on Requests
CREATE TABLE addon_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    addon_type TEXT NOT NULL CHECK (addon_type IN ('library', 'messaging', 'finance', 'analytics', 'bursary')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE addon_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view and create their own institution's requests
CREATE POLICY "Admins can view own addon requests" 
ON addon_requests FOR SELECT
USING (institution_id = get_current_user_institution_id());

CREATE POLICY "Admins can create addon requests" 
ON addon_requests FOR INSERT
WITH CHECK (institution_id = get_current_user_institution_id());

-- Master Admins can view and update all requests
CREATE POLICY "Master admins can view all addon requests" 
ON addon_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'master_admin'
    )
);

CREATE POLICY "Master admins can update addon requests" 
ON addon_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'master_admin'
    )
);


-- ---------------------------------------------------------
-- PART 6: TRIGGERS & BUSINESS LOGIC
-- ---------------------------------------------------------

-- 1. Level Enforcement Logic
-- This trigger handles:
-- a) Nullifying irrelevant level fields (Grade vs Form) based on Institution Category
-- b) Generating display_name for classes automatically
CREATE OR REPLACE FUNCTION fn_enforce_level_logic()
RETURNS TRIGGER AS $$
DECLARE
    v_level_label TEXT;
BEGIN
    -- 1. Get the level label for this institution
    SELECT sc.level_label INTO v_level_label
    FROM institutions i
    JOIN school_categories sc ON i.category_id = sc.id
    WHERE i.id = NEW.institution_id;

    -- 2. Enforce Level Logic (Nullify irrelevant fields)
    IF v_level_label = 'Form' THEN
        NEW.grade_level := NULL;
    ELSIF v_level_label IN ('Grade', 'KG') THEN
        NEW.form_level := NULL;
    END IF;

    -- 3. Auto-generate display_name for CLASSES
    -- This only applies if we are inserting/updating the 'classes' table
    IF TG_TABLE_NAME = 'classes' THEN
        IF v_level_label = 'Form' THEN
            NEW.display_name := 'Form ' || COALESCE(NEW.form_level::text, '?') || ' ' || COALESCE(NEW.stream, '');
        ELSIF v_level_label = 'KG' THEN
            NEW.display_name := 'KG ' || COALESCE(NEW.grade_level::text, '?') || ' ' || COALESCE(NEW.stream, '');
        ELSE
            NEW.display_name := 'Grade ' || COALESCE(NEW.grade_level::text, '?') || ' ' || COALESCE(NEW.stream, '');
        END IF;
        NEW.display_name := TRIM(NEW.display_name);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply logic to classes
CREATE TRIGGER tr_classes_level_logic
BEFORE INSERT OR UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION fn_enforce_level_logic();

-- Apply logic to students
CREATE TRIGGER tr_students_level_logic
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION fn_enforce_level_logic();


-- ---------------------------------------------------------
-- PART 7: VIEWS (REPORITNG & UI)
-- ---------------------------------------------------------

CREATE OR REPLACE VIEW v_classes_detailed AS
 SELECT c.id,
    c.institution_id,
    c.created_at,
    c.updated_at,
    c.teacher_id,
    c.grade_level,
    c.form_level,
    c.stream,
    c.display_name,
    i.name AS institution_name,
    sc.name AS school_category_name,
    sc.level_label
   FROM classes c
     JOIN institutions i ON c.institution_id = i.id
     LEFT JOIN school_categories sc ON i.category_id = sc.id;

CREATE OR REPLACE VIEW v_students_detailed AS
 SELECT s.id,
    s.user_id,
    s.grade_level_legacy,
    s.parent_contact,
    s.created_at,
    s.updated_at,
    s.admission_date,
    s.academic_year,
    s.emergency_contact_name,
    s.emergency_contact_phone,
    s.fee_balance,
    s.institution_id,
    s.class_id,
    s.grade_level,
    s.form_level,
    u.full_name,
    u.email,
    sc.level_label AS institution_level_label,
        CASE
            WHEN sc.level_label = 'Form' THEN 'Form ' || s.form_level::text
            WHEN sc.level_label = 'KG' THEN 'KG ' || s.grade_level::text
            ELSE 'Grade ' || s.grade_level::text
        END AS level_display_name
   FROM students s
     JOIN users u ON s.user_id = u.id
     JOIN institutions i ON s.institution_id = i.id
     LEFT JOIN school_categories sc ON i.category_id = sc.id;

-- 4. Transfer Main Admin Status Function
CREATE OR REPLACE FUNCTION transfer_main_admin_status(p_old_admin_user_id UUID, p_new_admin_user_id UUID)
RETURNS void AS $$
DECLARE
    v_inst_id UUID;
BEGIN
    SELECT institution_id INTO v_inst_id FROM admins WHERE user_id = p_old_admin_user_id AND is_main = true;
    IF v_inst_id IS NULL THEN
        RAISE EXCEPTION 'Sender is not a Main Admin';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = p_new_admin_user_id AND institution_id = v_inst_id) THEN
        RAISE EXCEPTION 'Recipient must be an admin in the same institution';
    END IF;

    UPDATE admins SET is_main = false WHERE user_id = p_old_admin_user_id;
    UPDATE admins SET is_main = true WHERE user_id = p_new_admin_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

