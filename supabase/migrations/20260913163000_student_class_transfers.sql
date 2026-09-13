-- Multi-Item Verification & Enhancement Batch: Item 8 - Student Class Transfer Workflow
-- Tracks student transfers between classes with admin approval flow.

CREATE TABLE IF NOT EXISTS student_class_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    to_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_class_transfers_institution ON student_class_transfers(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_class_transfers_student ON student_class_transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_class_transfers_status ON student_class_transfers(status);
