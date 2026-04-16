-- Migration: Add Academic Reports and Unique Phone constraint
-- ---------------------------------------------------------
-- PART 1: UNIQUE PHONE
-- ---------------------------------------------------------

-- Note: We use a unique index with a filter to allow multiple NULLs if needed, 
-- but the requirement usually implies one account per phone.
-- However, standard UNIQUE constraint also allows multiple NULLs in Postgres.
ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);

-- ---------------------------------------------------------
-- PART 2: ACADEMIC REPORTS TABLE
-- ---------------------------------------------------------
CREATE TABLE academic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    report_type TEXT CHECK (report_type IN ('end-of-term', 'individual', 'statistical', 'ranking')) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Stores scores, class average, position, etc.
    file_url TEXT, -- In case a PDF is generated and uploaded
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- PART 3: RLS POLICIES
-- ---------------------------------------------------------
ALTER TABLE academic_reports ENABLE ROW LEVEL SECURITY;

-- Allow all users in the same institution to see published reports relevant to them
-- Admin/Teacher: All
-- Student/Parent: Only their own (checked via student_id)
CREATE POLICY "academic_reports_isolation" ON academic_reports
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    AND (
        get_current_user_role() IN ('admin', 'teacher', 'master_admin') 
        OR (status = 'published' AND (
            student_id = current_user_student_id() 
            OR EXISTS (
                SELECT 1 FROM parent_students ps
                JOIN parents p ON ps.parent_id = p.id
                WHERE ps.student_id = academic_reports.student_id 
                AND p.user_id = auth.uid()
            )
        ))
    )
);

-- ---------------------------------------------------------
-- PART 4: TRIGGERS
-- ---------------------------------------------------------
CREATE TRIGGER tr_update_academic_reports_updated_at 
BEFORE UPDATE ON academic_reports 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
