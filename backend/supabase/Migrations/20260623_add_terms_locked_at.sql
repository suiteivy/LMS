-- Add term lock metadata for immutability enforcement
ALTER TABLE terms
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_terms_locked_at
ON terms (locked_at)
WHERE locked_at IS NOT NULL;
