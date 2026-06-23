-- Keep terms.current flag aligned with date-driven active-term logic.
-- Runtime source of truth remains: start_date <= today <= end_date.

-- 1) Ensure date validity at DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'terms_start_before_end_chk'
  ) THEN
    ALTER TABLE terms
      ADD CONSTRAINT terms_start_before_end_chk
      CHECK (start_date <= end_date);
  END IF;
END $$;

-- 2) Ensure at most one current term per academic year.
CREATE UNIQUE INDEX IF NOT EXISTS idx_terms_one_current_per_year
  ON terms (academic_year_id)
  WHERE is_current = true;

-- 3) Optional guard: if is_current=true on insert/update, enforce date window.
CREATE OR REPLACE FUNCTION fn_terms_enforce_current_flag_date_window()
RETURNS TRIGGER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  IF NEW.is_current = true THEN
    IF NEW.start_date > v_today OR NEW.end_date < v_today THEN
      RAISE EXCEPTION 'is_current can only be true when today (%) is inside [% - %]', v_today, NEW.start_date, NEW.end_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_terms_enforce_current_flag_date_window ON terms;
CREATE TRIGGER trg_terms_enforce_current_flag_date_window
  BEFORE INSERT OR UPDATE ON terms
  FOR EACH ROW
  EXECUTE FUNCTION fn_terms_enforce_current_flag_date_window();

-- 4) Create reusable sync function for manual/cron invocation.
-- Picks one active term per institution (latest start_date if overlaps exist).
CREATE OR REPLACE FUNCTION sync_terms_current_flags(p_reference_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  UPDATE terms
  SET is_current = false
  WHERE is_current = true;

  WITH active_terms AS (
    SELECT DISTINCT ON (institution_id)
      id
    FROM terms
    WHERE start_date <= p_reference_date
      AND end_date >= p_reference_date
    ORDER BY institution_id, start_date DESC, id DESC
  )
  UPDATE terms t
  SET is_current = true
  FROM active_terms a
  WHERE t.id = a.id;
END;
$$ LANGUAGE plpgsql;

-- 5) One-time backfill sync.
SELECT sync_terms_current_flags(CURRENT_DATE);
