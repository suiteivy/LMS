-- Migration: Create public avatars storage bucket with RLS policies
-- Date: 2026-09-05

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DO $$
BEGIN
    -- Public Read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Public Read Avatars'
    ) THEN
        CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    -- Authenticated Upload
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Authenticated Upload Avatars'
    ) THEN
        CREATE POLICY "Authenticated Upload Avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
    END IF;

    -- Authenticated Update
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Authenticated Update Avatars'
    ) THEN
        CREATE POLICY "Authenticated Update Avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
    END IF;

    -- Authenticated Delete
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'Authenticated Delete Avatars'
    ) THEN
        CREATE POLICY "Authenticated Delete Avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
    END IF;
END $$;
