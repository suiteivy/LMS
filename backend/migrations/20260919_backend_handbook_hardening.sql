-- ============================================================================
-- Migration: 20260919_backend_handbook_hardening.sql
-- Description: Applied hardening for LMS backend according to Backend Handbook
-- Includes:
--   1. Composite multi-tenant performance indexes (classes, students, report_cards, etc.)
--   2. Transactional Outbox table for reliable background event propagation
--   3. Resilient background job queue table with retry and dead-lettering support
--   4. Teacher presence heartbeat column for TTL-based presence detection
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Composite & Multi-Tenant Performance Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_classes_institution_status 
    ON classes(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_students_institution_class 
    ON students(institution_id, class_id);

CREATE INDEX IF NOT EXISTS idx_report_cards_inst_student_term 
    ON report_cards(institution_id, student_id, term_id);

CREATE INDEX IF NOT EXISTS idx_report_card_items_card_id 
    ON report_card_items(report_card_id);

CREATE INDEX IF NOT EXISTS idx_record_of_work_inst_class_term 
    ON record_of_work(institution_id, class_id, term_id);

CREATE INDEX IF NOT EXISTS idx_attendance_inst_class_date 
    ON attendance(institution_id, class_id, date);

-- ----------------------------------------------------------------------------
-- 2. Transactional Outbox Pattern Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created 
    ON outbox_events(status, created_at) 
    WHERE status IN ('pending', 'processing');

-- ----------------------------------------------------------------------------
-- 3. Resilient Background Job Queue Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(100) NOT NULL DEFAULT 'default',
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed', 'dead_letter'
    priority INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    idempotency_key VARCHAR(255) UNIQUE,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    last_error TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_fetch 
    ON job_queue(status, run_at, priority DESC) 
    WHERE status = 'queued';

-- ----------------------------------------------------------------------------
-- 4. Teacher Presence TTL Tracking
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'teacher_attendance'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'teacher_attendance' AND column_name = 'last_heartbeat_at'
        ) THEN
            ALTER TABLE teacher_attendance ADD COLUMN last_heartbeat_at TIMESTAMPTZ;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'teacher_attendance' AND column_name = 'is_online'
        ) THEN
            ALTER TABLE teacher_attendance ADD COLUMN is_online BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;
