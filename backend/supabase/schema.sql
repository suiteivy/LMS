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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Base table for Auth mapping)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT CHECK (role IN ('admin', 'student', 'teacher', 'parent')) NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    phone TEXT,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teachers (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('TEA'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    department TEXT,
    qualification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('STU'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    grade_level TEXT,
    parent_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parents (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('PAR'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    total_points INTEGER DEFAULT 100,
    status TEXT CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT,
    content TEXT,
    grade NUMERIC,
    feedback TEXT,
    status TEXT CHECK (status IN ('submitted', 'graded', 'late', 'pending')) DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- 6. Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id, date)
);

-- 7. Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('pdf', 'video', 'link', 'other')) DEFAULT 'other',
    url TEXT NOT NULL,
    size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

CREATE OR REPLACE VIEW config AS SELECT * FROM library_config;

-- 2. Books (Plural)
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

-- 3. Borrowed Books (Plural)
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
    due_date DATE,
    academic_year TEXT,
    term TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payments
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
    UNIQUE(bursary_id, student_id)
);

-- 5. Teacher Payouts
CREATE TABLE teacher_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    period_start DATE,
    period_end DATE,
    status TEXT CHECK (status IN ('pending', 'processing', 'paid', 'failed')) DEFAULT 'pending',
    payout_date TIMESTAMPTZ,
    reference_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    INSERT INTO admins (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'teacher' THEN
    INSERT INTO teachers (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'student' THEN
    INSERT INTO students (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'parent' THEN
    INSERT INTO parents (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_create_role_entry ON users;
CREATE TRIGGER tr_create_role_entry
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION handle_user_role_entry();

-- ---------------------------------------------------------
-- PART 7: HELPER FUNCTIONS FOR RLS
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_student_id() RETURNS TEXT AS $$
    SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION current_user_teacher_id() RETURNS TEXT AS $$
    SELECT id FROM teachers WHERE user_id = auth.uid();
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
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowed_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book ENABLE ROW LEVEL SECURITY;
ALTER TABLE library ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bursaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bursary_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payouts ENABLE ROW LEVEL SECURITY;

-- 1. Users Policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin/Teacher read all users" ON users FOR SELECT USING (role IN ('admin', 'teacher'));

-- 2. Role Table Policies
CREATE POLICY "select_admins" ON admins FOR SELECT USING (true);
CREATE POLICY "select_teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "select_students" ON students FOR SELECT USING (true);
CREATE POLICY "select_parents" ON parents FOR SELECT USING (true);

-- Use specific commands for management (avoids FOR ALL and SELECT path)
CREATE POLICY "insert_admins" ON admins FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "update_admins" ON admins FOR UPDATE USING (get_current_user_role() = 'admin');
CREATE POLICY "delete_admins" ON admins FOR DELETE USING (get_current_user_role() = 'admin');

CREATE POLICY "insert_teachers" ON teachers FOR INSERT WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "update_teachers" ON teachers FOR UPDATE USING (get_current_user_role() = 'admin');
CREATE POLICY "delete_teachers" ON teachers FOR DELETE USING (get_current_user_role() = 'admin');

-- 3. Academic Policies
CREATE POLICY "Everyone view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Teachers manage own subjects" ON subjects FOR ALL USING (teacher_id = current_user_teacher_id());
CREATE POLICY "Admins manage all subjects" ON subjects FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "View assignments" ON assignments FOR SELECT USING (true);
CREATE POLICY "Manage assignments" ON assignments FOR ALL USING (get_current_user_role() IN ('admin', 'teacher'));

CREATE POLICY "Manage submissions" ON submissions FOR ALL USING (student_id = current_user_student_id() OR get_current_user_role() IN ('admin', 'teacher'));

-- 4. Library Policies
CREATE POLICY "Everyone view books" ON books FOR SELECT USING (true);
CREATE POLICY "Admins manage library" ON books FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "Students view own borrows" ON borrowed_books FOR SELECT USING (student_id = current_user_student_id());
CREATE POLICY "Admins manage borrows" ON borrowed_books FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Everyone view singular books" ON book FOR SELECT USING (true);
CREATE POLICY "Everyone view library entry" ON library FOR SELECT USING (true);

-- 5. Finance Policies
CREATE POLICY "Everyone view fee structures" ON fee_structures FOR SELECT USING (true);
CREATE POLICY "Students view own payments" ON payments FOR SELECT USING (student_id = current_user_student_id());
CREATE POLICY "Anyone view bursaries" ON bursaries FOR SELECT USING (true);
CREATE POLICY "Students manage own applications" ON bursary_applications FOR ALL USING (student_id = current_user_student_id());
CREATE POLICY "Admins manage finance" ON fee_structures FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "Admins manage payments" ON payments FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "Admins manage bursaries" ON bursary_applications FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "Teachers view own payouts" ON teacher_payouts FOR SELECT USING (teacher_id = current_user_teacher_id());
