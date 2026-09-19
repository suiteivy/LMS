-- Migration: Create and configure storage buckets for resources and assignments with 10MB limit and document MIME types
-- Date: 2026-09-19

-- 1. Ensure 'assignments' bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assignments',
    'assignments',
    true,
    10485760, -- 10MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf'
    ]::text[];

-- 2. Update 'course_materials' bucket with 10MB limit and allowed document MIME types
UPDATE storage.buckets
SET 
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf'
    ]::text[]
WHERE id = 'course_materials';

-- 3. Storage Policies for 'assignments' bucket
DO $$
BEGIN
    -- Public Read Assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Public Read Assignments'
    ) THEN
        CREATE POLICY "Public Read Assignments" ON storage.objects FOR SELECT USING (bucket_id = 'assignments');
    END IF;

    -- Authenticated Upload Assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Authenticated Upload Assignments'
    ) THEN
        CREATE POLICY "Authenticated Upload Assignments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignments');
    END IF;

    -- Authenticated Update Assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Authenticated Update Assignments'
    ) THEN
        CREATE POLICY "Authenticated Update Assignments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assignments') WITH CHECK (bucket_id = 'assignments');
    END IF;

    -- Authenticated Delete Assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Authenticated Delete Assignments'
    ) THEN
        CREATE POLICY "Authenticated Delete Assignments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assignments');
    END IF;
END $$;
