-- Migration: 20260310_diary_and_enrollment_fix.sql
-- Description: Add diary_entries table and verify class_enrollments

-- 1. Create diary_entries table
CREATE TABLE IF NOT EXISTS diary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL, -- Using TEXT as per schema preference for custom IDs
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for diary_entries
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- 2. Verify/Fix class_enrollments (if missing or inconsistent with database.ts)
-- Based on database.ts, it should have student_id (TEXT/Custom) and class_id (UUID)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'class_enrollments') THEN
        CREATE TABLE class_enrollments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
            class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(student_id, class_id)
        );
        ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 3. Add institution_id to assignments if missing (based on controller observation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'institution_id') THEN
        ALTER TABLE assignments ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Add institution_id to submissions if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'institution_id') THEN
        ALTER TABLE submissions ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Policies (Simplified for development - adjust based on actual RLS requirements)
CREATE POLICY "Users can view diary entries for their institution" ON diary_entries
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE institution_id = diary_entries.institution_id));

CREATE POLICY "Teachers can create diary entries" ON diary_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'teacher' 
            AND institution_id = diary_entries.institution_id
        )
    );
