-- Rename course_id to subject_id in fees table if it exists
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'fees') THEN
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'fees' AND column_name = 'course_id') THEN
            ALTER TABLE fees RENAME COLUMN course_id TO subject_id;
        END IF;
    END IF;
END $$;
