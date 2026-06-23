-- Promotion engine cycle + decision scaffolding
CREATE TABLE IF NOT EXISTS promotion_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  to_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  min_average_percentage NUMERIC(5,2) DEFAULT 50,
  min_attendance_percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'completed', 'completed_with_errors')),
  previewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_cycles_institution ON promotion_cycles(institution_id);
CREATE INDEX IF NOT EXISTS idx_promotion_cycles_term ON promotion_cycles(term_id);
CREATE INDEX IF NOT EXISTS idx_promotion_cycles_status ON promotion_cycles(status);

CREATE TABLE IF NOT EXISTS promotion_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES promotion_cycles(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  to_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  report_card_id UUID REFERENCES report_cards(id) ON DELETE SET NULL,
  average_percentage NUMERIC(5,2),
  attendance_percentage NUMERIC(5,2),
  eligible BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'promoted', 'retained', 'failed')),
  reason TEXT,
  promoted_at TIMESTAMPTZ,
  promoted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_decisions_cycle ON promotion_decisions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_promotion_decisions_student ON promotion_decisions(student_id);
CREATE INDEX IF NOT EXISTS idx_promotion_decisions_institution ON promotion_decisions(institution_id);
CREATE INDEX IF NOT EXISTS idx_promotion_decisions_status ON promotion_decisions(status);

-- Notification delivery history + retry queue
CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'retry_scheduled' CHECK (status IN ('retry_scheduled', 'delivered', 'failed')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_status ON notification_delivery_attempts(status);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_next_retry ON notification_delivery_attempts(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_recipient ON notification_delivery_attempts(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_institution ON notification_delivery_attempts(institution_id);
