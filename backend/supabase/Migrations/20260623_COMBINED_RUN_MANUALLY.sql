-- ==========================================
-- COMBINED MIGRATION: Submission Enrollment Trigger + Comprehensive Grading System
-- Run this in Supabase SQL Editor to apply all changes at once
-- Date: 2026-06-23
-- ==========================================

-- ==========================================
-- PART 1: SUBMISSION ENROLLMENT TRIGGER
-- ==========================================

-- Trigger function: prevents inserting submissions for students
-- not enrolled in the subject's class via either enrollments or class_enrollments.
CREATE OR REPLACE FUNCTION fn_check_submission_enrollment()
RETURNS trigger AS $$
DECLARE
    v_class_id uuid;
    v_student_id text;
    v_enrolled boolean;
BEGIN
    v_student_id := NEW.student_id;

    -- Resolve class_id from assignment → subject
    SELECT s.class_id INTO v_class_id
    FROM assignments a
    JOIN subjects s ON s.id = a.subject_id
    WHERE a.id = NEW.assignment_id;

    IF v_class_id IS NULL THEN
        RAISE EXCEPTION 'Assignment % has no valid subject/class', NEW.assignment_id;
    END IF;

    -- Check direct enrollment
    SELECT EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id = v_student_id
          AND subject_id = (SELECT subject_id FROM assignments WHERE id = NEW.assignment_id)
          AND status = 'enrolled'
    ) INTO v_enrolled;

    IF v_enrolled THEN
        RETURN NEW;
    END IF;

    -- Check class enrollment
    SELECT EXISTS (
        SELECT 1 FROM class_enrollments
        WHERE student_id = v_student_id
          AND class_id = v_class_id
    ) INTO v_enrolled;

    IF NOT v_enrolled THEN
        RAISE EXCEPTION 'Student % is not enrolled in class %', v_student_id, v_class_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trg_check_submission_enrollment ON submissions;

CREATE TRIGGER trg_check_submission_enrollment
    BEFORE INSERT ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_submission_enrollment();


-- ==========================================
-- PART 2: COMPREHENSIVE GRADING SYSTEM
-- ==========================================

-- ---------------------------------------------------------
-- 1. ACADEMIC YEARS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, institution_id)
);

-- ---------------------------------------------------------
-- 2. TERMS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(academic_year_id, name)
);

-- ---------------------------------------------------------
-- 3. ASSESSMENT TYPES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('continuous_assessment', 'examination')),
    default_weight NUMERIC(5,2) DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code, institution_id)
);

-- ---------------------------------------------------------
-- 4. GRADING SCALES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    letter_grade TEXT NOT NULL,
    gpa_points NUMERIC(3,1) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 5. SUBJECT WEIGHT CONFIGURATION
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS subject_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    assessment_type_id UUID REFERENCES assessment_types(id) ON DELETE CASCADE,
    weight NUMERIC(5,2) NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, assessment_type_id, class_id, term_id)
);

-- ---------------------------------------------------------
-- 6. GRADE ENTRIES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS grade_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    assessment_type_id UUID REFERENCES assessment_types(id) ON DELETE CASCADE,
    score NUMERIC(7,2),
    max_score NUMERIC(7,2) DEFAULT 100,
    percentage NUMERIC(5,2),
    weight_applied NUMERIC(5,2),
    weighted_score NUMERIC(7,2),
    feedback TEXT,
    graded_by TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'assignment', 'exam', 'import')),
    source_id UUID,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id, assessment_type_id, class_id, term_id, source_id)
);

-- ---------------------------------------------------------
-- 7. REPORT CARDS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    total_weighted_score NUMERIC(7,2),
    average_percentage NUMERIC(5,2),
    gpa NUMERIC(3,2),
    letter_grade TEXT,
    rank_in_class INTEGER,
    total_students_in_class INTEGER,
    attendance_count INTEGER DEFAULT 0,
    total_school_days INTEGER DEFAULT 0,
    teacher_remarks TEXT,
    admin_remarks TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'released')),
    released_at TIMESTAMPTZ,
    released_by UUID REFERENCES users(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id, term_id)
);

-- ---------------------------------------------------------
-- 8. REPORT CARD ITEMS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_card_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_card_id UUID REFERENCES report_cards(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name TEXT,
    total_score NUMERIC(7,2),
    average_percentage NUMERIC(5,2),
    letter_grade TEXT,
    gpa_points NUMERIC(3,1),
    class_average NUMERIC(5,2),
    rank_in_subject INTEGER,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    teacher_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 9. GRADE AUDIT LOG
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS grade_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'release', 'publish')),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_grade_entries_student ON grade_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_subject ON grade_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_class_term ON grade_entries(class_id, term_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_assessment ON grade_entries(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_institution ON grade_entries(institution_id);

CREATE INDEX IF NOT EXISTS idx_report_cards_student ON report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_class_term ON report_cards(class_id, term_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_status ON report_cards(status);
CREATE INDEX IF NOT EXISTS idx_report_cards_institution ON report_cards(institution_id);

CREATE INDEX IF NOT EXISTS idx_report_card_items_report ON report_card_items(report_card_id);
CREATE INDEX IF NOT EXISTS idx_report_card_items_subject ON report_card_items(subject_id);

CREATE INDEX IF NOT EXISTS idx_subject_weights_subject ON subject_weights(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_weights_class_term ON subject_weights(class_id, term_id);

CREATE INDEX IF NOT EXISTS idx_grading_scales_institution ON grading_scales(institution_id);
CREATE INDEX IF NOT EXISTS idx_assessment_types_institution ON assessment_types(institution_id);

CREATE INDEX IF NOT EXISTS idx_academic_years_institution ON academic_years(institution_id);
CREATE INDEX IF NOT EXISTS idx_terms_year ON terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_terms_institution ON terms(institution_id);

CREATE INDEX IF NOT EXISTS idx_grade_audit_entity ON grade_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_grade_audit_institution ON grade_audit_log(institution_id);

-- ---------------------------------------------------------
-- TRIGGERS: auto-update updated_at
-- ---------------------------------------------------------
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_terms_updated_at BEFORE UPDATE ON terms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_types_updated_at BEFORE UPDATE ON assessment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grading_scales_updated_at BEFORE UPDATE ON grading_scales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_weights_updated_at BEFORE UPDATE ON subject_weights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grade_entries_updated_at BEFORE UPDATE ON grade_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_cards_updated_at BEFORE UPDATE ON report_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- TRIGGER: auto-compute percentage and weighted_score on grade_entries
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_grade_entry_derived()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.max_score IS NOT NULL AND NEW.max_score > 0 THEN
        NEW.percentage := ROUND((NEW.score / NEW.max_score) * 100, 2);
    END IF;
    IF NEW.weight_applied IS NOT NULL AND NEW.percentage IS NOT NULL THEN
        NEW.weighted_score := ROUND(NEW.percentage * NEW.weight_applied / 100, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_compute_grade_derived
    BEFORE INSERT OR UPDATE ON grade_entries
    FOR EACH ROW EXECUTE FUNCTION compute_grade_entry_derived();

-- ---------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_years_isolation" ON academic_years FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terms_isolation" ON terms FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_types_isolation" ON assessment_types FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grading_scales_isolation" ON grading_scales FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

ALTER TABLE subject_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subject_weights_isolation" ON subject_weights FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

ALTER TABLE grade_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grade_entries_isolation" ON grade_entries FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_cards_isolation" ON report_cards FOR ALL
USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

ALTER TABLE report_card_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_card_items_isolation" ON report_card_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM report_cards rc
        WHERE rc.id = report_card_items.report_card_id
        AND (rc.institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin')
    )
);

ALTER TABLE grade_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grade_audit_log_isolation" ON grade_audit_log FOR ALL
USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

-- ---------------------------------------------------------
-- FUNCTIONS: Letter grade & GPA lookup
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION get_letter_grade(p_institution_id UUID, p_percentage NUMERIC)
RETURNS TEXT AS $$
    SELECT letter_grade FROM grading_scales
    WHERE institution_id = p_institution_id
    AND is_active = true
    AND p_percentage >= min_score
    AND p_percentage <= max_score
    ORDER BY min_score DESC LIMIT 1;
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_gpa_points(p_institution_id UUID, p_percentage NUMERIC)
RETURNS NUMERIC AS $$
    SELECT gpa_points FROM grading_scales
    WHERE institution_id = p_institution_id
    AND is_active = true
    AND p_percentage >= min_score
    AND p_percentage <= max_score
    ORDER BY min_score DESC LIMIT 1;
$$ LANGUAGE sql STABLE SET search_path = public;
