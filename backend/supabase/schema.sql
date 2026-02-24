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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Base table for Auth mapping)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT CHECK (role IN ('admin', 'student', 'teacher', 'parent', 'bursary')) NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    phone TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    address TEXT,
    avatar_url TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    position TEXT CHECK (position IN ('teacher', 'head_of_department', 'assistant', 'class_teacher', 'dean')) DEFAULT 'teacher',
    hire_date DATE DEFAULT CURRENT_DATE,
    specialization TEXT,
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('STU'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    grade_level TEXT,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- ---------------------------------------------------------
-- PART 3: ACADEMIC MODULE
-- ---------------------------------------------------------

-- 1. Classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, 
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
    UNIQUE(student_id, subject_id)
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
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    borrowed_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE,
    returned_at TIMESTAMPTZ NULL,
    status TEXT DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
    institution_id UUID REFERENCES institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO admins (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
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
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institution_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_student_id() RETURNS TEXT AS $$
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
  RETURN EXISTS (SELECT 1 FROM enrollments WHERE class_id = p_class_id AND student_id = p_student_id);
END;
$$;

-- ---------------------------------------------------------
-- PART 8: ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bursars ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowed_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bursaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bursary_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. General Access Helper (Used by many)
-- Users can see anything that belongs to their institution OR global items (institution_id IS NULL)
-- RLS: institution_id IS NOT DISTINCT FROM get_current_user_institution_id()

-- 2. Master Policies

-- Global View (Anything in same institution OR global)
CREATE POLICY "institution_scoped_view" ON institutions FOR SELECT USING (true); -- Institutions are public/read-only for listing
CREATE POLICY "institution_scoped_users" ON users FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id() OR role = 'admin');

-- Academic View
CREATE POLICY "institution_scoped_subjects" ON subjects FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());
CREATE POLICY "institution_scoped_assignments" ON assignments FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());
CREATE POLICY "institution_scoped_announcements" ON announcements FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());
CREATE POLICY "institution_scoped_resources" ON resources FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());
CREATE POLICY "institution_scoped_exams" ON exams FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());

-- Roles specific access
CREATE POLICY "teachers_manage_assigned" ON subjects FOR ALL USING (teacher_id = current_user_teacher_id() OR get_current_user_role() = 'admin');
CREATE POLICY "admins_manage_all" ON subjects FOR ALL USING (get_current_user_role() = 'admin');

-- Library
CREATE POLICY "institution_scoped_books" ON books FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());
CREATE POLICY "student_view_own_borrows" ON borrowed_books FOR SELECT USING (student_id = current_user_student_id());

-- Finance
CREATE POLICY "institution_scoped_financials" ON financial_transactions FOR SELECT USING (institution_id IS NOT DISTINCT FROM get_current_user_institution_id());
CREATE POLICY "bursars_manage_finance" ON financial_transactions FOR ALL USING (get_current_user_role() IN ('admin', 'bursary'));

-- Messaging
CREATE POLICY "user_view_own_messages" ON messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "user_view_own_notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

-- FALLBACK: Allow Admins Full Access to everything in their institution
-- This is a generic pattern for any table missing a specific policy
-- (Applying manually to critical ones)

CREATE POLICY "admin_all_access" ON subjects FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "admin_all_access_classes" ON classes FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "admin_all_access_users" ON users FOR ALL USING (get_current_user_role() = 'admin');

-- 3. Custom RPC Functions

-- Calculate student rank within their institution
CREATE OR REPLACE FUNCTION get_student_rank(p_student_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_institution_id UUID;
    v_result JSONB;
BEGIN
    -- Get institution_id of the target student
    SELECT institution_id INTO v_institution_id FROM students WHERE id = p_student_id;

    WITH student_averages AS (
        SELECT 
            s.id AS student_id,
            COALESCE(AVG(sub.grade), 0) AS avg_score
        FROM students s
        LEFT JOIN submissions sub ON s.id = sub.student_id AND sub.status = 'graded'
        WHERE s.institution_id = v_institution_id
        GROUP BY s.id
    ),
    ranked_students AS (
        SELECT 
            student_id,
            avg_score,
            RANK() OVER (ORDER BY avg_score DESC) as rank,
            COUNT(*) OVER () as total_count
        FROM student_averages
    )
    SELECT 
        jsonb_build_object(
            'rank', rank,
            'total_students', total_count,
            'average_score', ROUND(avg_score, 2)
        ) INTO v_result
    FROM ranked_students
    WHERE student_id = p_student_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
