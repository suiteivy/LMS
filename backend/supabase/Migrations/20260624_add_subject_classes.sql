-- Canonical subject <-> class relationship table
-- Replaces metadata.class_ids filtering with relational joins.

CREATE TABLE IF NOT EXISTS subject_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_classes_subject_id ON subject_classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_classes_class_id ON subject_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_subject_classes_institution_id ON subject_classes(institution_id);
CREATE INDEX IF NOT EXISTS idx_subject_classes_institution_class ON subject_classes(institution_id, class_id);

ALTER TABLE subject_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strict_institution_isolation" ON subject_classes;
CREATE POLICY "strict_institution_isolation" ON subject_classes
FOR ALL USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

-- Backfill from legacy single class_id.
INSERT INTO subject_classes (subject_id, class_id, institution_id)
SELECT s.id, s.class_id, s.institution_id
FROM subjects s
WHERE s.class_id IS NOT NULL
ON CONFLICT (subject_id, class_id) DO NOTHING;

-- Backfill from legacy metadata.class_ids JSON array.
INSERT INTO subject_classes (subject_id, class_id, institution_id)
SELECT
    s.id,
    jsonb_array_elements_text(s.metadata->'class_ids')::uuid AS class_id,
    s.institution_id
FROM subjects s
WHERE jsonb_typeof(s.metadata->'class_ids') = 'array'
ON CONFLICT (subject_id, class_id) DO NOTHING;
