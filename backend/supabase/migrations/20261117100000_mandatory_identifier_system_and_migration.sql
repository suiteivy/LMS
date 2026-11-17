-- Migration: 20261117100000_mandatory_identifier_system_and_migration.sql
-- Description: Mandatory Admission, Staff, and Parent Identifier System with Atomic Counters, Immutability Guards, and Migration Crosswalk

-- 1. IDENTIFIER FORMATS CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.identifier_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_type TEXT NOT NULL UNIQUE CHECK (person_type IN ('student', 'staff', 'parent')),
    prefix TEXT NOT NULL DEFAULT '',
    min_digits INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.identifier_formats (person_type, prefix, min_digits)
VALUES
    ('student', '', 4),
    ('staff', 'ST', 4),
    ('parent', 'PA', 4)
ON CONFLICT (person_type) DO UPDATE SET
    prefix = EXCLUDED.prefix,
    min_digits = EXCLUDED.min_digits,
    updated_at = NOW();

-- 2. ATOMIC GAP-FREE COUNTERS TABLE
CREATE TABLE IF NOT EXISTS public.identifier_counters (
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    person_type TEXT NOT NULL CHECK (person_type IN ('student', 'staff', 'parent')),
    next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value >= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (institution_id, person_type)
);

CREATE INDEX IF NOT EXISTS idx_identifier_counters_inst ON public.identifier_counters(institution_id, person_type);

-- 3. LEGACY ARCHIVE & CROSSWALK TABLE
CREATE TABLE IF NOT EXISTS public.legacy_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL,
    person_type TEXT NOT NULL CHECK (person_type IN ('student', 'staff', 'parent')),
    old_identifier TEXT NOT NULL,
    new_identifier TEXT NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_legacy_identifier_record UNIQUE (institution_id, person_type, old_identifier, new_identifier)
);

CREATE INDEX IF NOT EXISTS idx_legacy_identifiers_lookup ON public.legacy_identifiers(institution_id, old_identifier);
CREATE INDEX IF NOT EXISTS idx_legacy_identifiers_person ON public.legacy_identifiers(institution_id, person_id);

-- 4. ADD NUMBER COLUMNS TO CORE ACTOR TABLES
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS number_value INTEGER;

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS staff_number TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS number_value INTEGER;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS staff_number TEXT;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS number_value INTEGER;

ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS parent_number TEXT;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS number_value INTEGER;

-- 5. FUNCTION: ASSIGN NEXT IDENTIFIER ATOMICALLY
CREATE OR REPLACE FUNCTION public.fn_assign_next_identifier(
    p_institution_id UUID,
    p_person_type TEXT
)
RETURNS TABLE (
    formatted_number TEXT,
    number_value INTEGER
) AS $$
DECLARE
    v_prefix TEXT;
    v_min_digits INTEGER;
    v_curr_val INTEGER;
    v_formatted TEXT;
BEGIN
    SELECT prefix, min_digits INTO v_prefix, v_min_digits
    FROM public.identifier_formats
    WHERE person_type = p_person_type;

    IF v_prefix IS NULL THEN
        IF p_person_type = 'student' THEN v_prefix := ''; v_min_digits := 4;
        ELSIF p_person_type = 'staff' THEN v_prefix := 'ST'; v_min_digits := 4;
        ELSIF p_person_type = 'parent' THEN v_prefix := 'PA'; v_min_digits := 4;
        ELSE RAISE EXCEPTION 'Invalid person type: %', p_person_type;
        END IF;
    END IF;

    INSERT INTO public.identifier_counters (institution_id, person_type, next_value)
    VALUES (p_institution_id, p_person_type, 1)
    ON CONFLICT (institution_id, person_type) DO NOTHING;

    SELECT next_value INTO v_curr_val
    FROM public.identifier_counters
    WHERE institution_id = p_institution_id AND person_type = p_person_type
    FOR UPDATE;

    v_formatted := v_prefix || LPAD(v_curr_val::TEXT, v_min_digits, '0');

    UPDATE public.identifier_counters
    SET next_value = v_curr_val + 1,
        updated_at = NOW()
    WHERE institution_id = p_institution_id AND person_type = p_person_type;

    RETURN QUERY SELECT v_formatted, v_curr_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CONTROLLED IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION public.fn_guard_identifier_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed TEXT;
BEGIN
    BEGIN
        v_allowed := current_setting('app.allowing_identifier_correction', true);
    EXCEPTION WHEN OTHERS THEN
        v_allowed := 'false';
    END;

    IF TG_TABLE_NAME = 'students' THEN
        IF OLD.admission_number IS NOT NULL AND NEW.admission_number IS DISTINCT FROM OLD.admission_number THEN
            IF v_allowed IS DISTINCT FROM 'true' THEN
                RAISE EXCEPTION 'Direct modifications to admission_number are forbidden. Use correct_person_identifier procedure.';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'teachers' OR TG_TABLE_NAME = 'admins' THEN
        IF OLD.staff_number IS NOT NULL AND NEW.staff_number IS DISTINCT FROM OLD.staff_number THEN
            IF v_allowed IS DISTINCT FROM 'true' THEN
                RAISE EXCEPTION 'Direct modifications to staff_number are forbidden. Use correct_person_identifier procedure.';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'parents' THEN
        IF OLD.parent_number IS NOT NULL AND NEW.parent_number IS DISTINCT FROM OLD.parent_number THEN
            IF v_allowed IS DISTINCT FROM 'true' THEN
                RAISE EXCEPTION 'Direct modifications to parent_number are forbidden. Use correct_person_identifier procedure.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_student_identifier ON public.students;
CREATE TRIGGER trg_guard_student_identifier
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

DROP TRIGGER IF EXISTS trg_guard_teacher_identifier ON public.teachers;
CREATE TRIGGER trg_guard_teacher_identifier
BEFORE UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

DROP TRIGGER IF EXISTS trg_guard_admin_identifier ON public.admins;
CREATE TRIGGER trg_guard_admin_identifier
BEFORE UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

DROP TRIGGER IF EXISTS trg_guard_parent_identifier ON public.parents;
CREATE TRIGGER trg_guard_parent_identifier
BEFORE UPDATE ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

-- 7. CONTROLLED CORRECTION RPC
CREATE OR REPLACE FUNCTION public.correct_person_identifier(
    p_institution_id UUID,
    p_person_id TEXT,
    p_person_type TEXT,
    p_new_number TEXT,
    p_reason TEXT,
    p_admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_old_number TEXT;
    v_num_val INTEGER;
    v_is_main BOOLEAN := false;
BEGIN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A valid correction reason is required.';
    END IF;

    SELECT is_main INTO v_is_main
    FROM public.admins
    WHERE user_id = p_admin_user_id AND institution_id = p_institution_id;

    IF v_is_main IS NOT TRUE THEN
        RAISE EXCEPTION 'Only Main Administrators can correct institutional identifiers.';
    END IF;

    IF p_person_type = 'student' THEN
        IF NOT (p_new_number ~ '^[0-9]{4,}$') THEN
            RAISE EXCEPTION 'Invalid student admission number format. Must be digits only (e.g. 0001).';
        END IF;
        v_num_val := p_new_number::INTEGER;

        SELECT admission_number INTO v_old_number FROM public.students WHERE id = p_person_id AND institution_id = p_institution_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Student record not found.'; END IF;

        PERFORM set_config('app.allowing_identifier_correction', 'true', true);
        UPDATE public.students SET admission_number = p_new_number, number_value = v_num_val, updated_at = NOW()
        WHERE id = p_person_id AND institution_id = p_institution_id;
        PERFORM set_config('app.allowing_identifier_correction', 'false', true);

    ELSIF p_person_type = 'staff' THEN
        IF NOT (p_new_number ~ '^ST[0-9]{4,}$') THEN
            RAISE EXCEPTION 'Invalid staff number format. Must start with ST followed by digits (e.g. ST0001).';
        END IF;
        v_num_val := substring(p_new_number from 3)::INTEGER;

        SELECT staff_number INTO v_old_number FROM public.teachers WHERE id = p_person_id AND institution_id = p_institution_id;
        IF FOUND THEN
            PERFORM set_config('app.allowing_identifier_correction', 'true', true);
            UPDATE public.teachers SET staff_number = p_new_number, number_value = v_num_val, updated_at = NOW()
            WHERE id = p_person_id AND institution_id = p_institution_id;
            PERFORM set_config('app.allowing_identifier_correction', 'false', true);
        ELSE
            SELECT staff_number INTO v_old_number FROM public.admins WHERE id = p_person_id AND institution_id = p_institution_id;
            IF NOT FOUND THEN RAISE EXCEPTION 'Staff record not found.'; END IF;

            PERFORM set_config('app.allowing_identifier_correction', 'true', true);
            UPDATE public.admins SET staff_number = p_new_number, number_value = v_num_val, updated_at = NOW()
            WHERE id = p_person_id AND institution_id = p_institution_id;
            PERFORM set_config('app.allowing_identifier_correction', 'false', true);
        END IF;

    ELSIF p_person_type = 'parent' THEN
        IF NOT (p_new_number ~ '^PA[0-9]{4,}$') THEN
            RAISE EXCEPTION 'Invalid parent number format. Must start with PA followed by digits (e.g. PA0001).';
        END IF;
        v_num_val := substring(p_new_number from 3)::INTEGER;

        SELECT parent_number INTO v_old_number FROM public.parents WHERE id = p_person_id AND institution_id = p_institution_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Parent record not found.'; END IF;

        PERFORM set_config('app.allowing_identifier_correction', 'true', true);
        UPDATE public.parents SET parent_number = p_new_number, number_value = v_num_val, updated_at = NOW()
        WHERE id = p_person_id AND institution_id = p_institution_id;
        PERFORM set_config('app.allowing_identifier_correction', 'false', true);
    ELSE
        RAISE EXCEPTION 'Unsupported person type: %', p_person_type;
    END IF;

    IF v_old_number IS NOT NULL AND v_old_number <> '' AND v_old_number <> p_new_number THEN
        INSERT INTO public.legacy_identifiers (institution_id, person_id, person_type, old_identifier, new_identifier)
        VALUES (p_institution_id, p_person_id, p_person_type, v_old_number, p_new_number)
        ON CONFLICT DO NOTHING;
    END IF;

    BEGIN
        INSERT INTO public.record_change_log (institution_id, table_name, record_id, action, changed_by, old_data, new_data, reason)
        VALUES (
            p_institution_id,
            p_person_type,
            p_person_id,
            'IDENTIFIER_CORRECTION',
            p_admin_user_id,
            jsonb_build_object('old_identifier', v_old_number),
            jsonb_build_object('new_identifier', p_new_number),
            p_reason
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object('success', true, 'old_number', v_old_number, 'new_number', p_new_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRANSITION RESOLUTION LOOKUP
CREATE OR REPLACE FUNCTION public.resolve_person_by_identifier(
    p_institution_id UUID,
    p_identifier TEXT
)
RETURNS TABLE (
    person_id TEXT,
    person_type TEXT,
    active_number TEXT,
    is_legacy BOOLEAN
) AS $$
DECLARE
    v_clean TEXT := upper(trim(replace(p_identifier, '-', '')));
BEGIN
    RETURN QUERY
    SELECT s.id, 'student'::TEXT, s.admission_number, false
    FROM public.students s
    WHERE s.institution_id = p_institution_id
      AND (s.admission_number = v_clean OR s.admission_number = trim(p_identifier))
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;

    RETURN QUERY
    SELECT t.id, 'staff'::TEXT, t.staff_number, false
    FROM public.teachers t
    WHERE t.institution_id = p_institution_id
      AND (t.staff_number = v_clean OR t.staff_number = trim(p_identifier))
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;

    RETURN QUERY
    SELECT a.id, 'staff'::TEXT, a.staff_number, false
    FROM public.admins a
    WHERE a.institution_id = p_institution_id
      AND (a.staff_number = v_clean OR a.staff_number = trim(p_identifier))
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;

    RETURN QUERY
    SELECT p.id, 'parent'::TEXT, p.parent_number, false
    FROM public.parents p
    WHERE p.institution_id = p_institution_id
      AND (p.parent_number = v_clean OR p.parent_number = trim(p_identifier))
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;

    RETURN QUERY
    SELECT l.person_id, l.person_type, l.new_identifier, true
    FROM public.legacy_identifiers l
    WHERE l.institution_id = p_institution_id
      AND (upper(trim(replace(l.old_identifier, '-', ''))) = v_clean OR l.old_identifier = trim(p_identifier))
    ORDER BY l.migrated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 9. DETERMINISTIC MIGRATION BACKFILL (Idempotent per institution)
DO $$
DECLARE
    r_inst RECORD;
    r_item RECORD;
    v_counter INTEGER;
    v_formatted TEXT;
BEGIN
    PERFORM set_config('app.allowing_identifier_correction', 'true', true);

    FOR r_inst IN SELECT id FROM public.institutions LOOP

        v_counter := 1;
        SELECT next_value INTO v_counter FROM public.identifier_counters WHERE institution_id = r_inst.id AND person_type = 'student';
        IF v_counter IS NULL THEN v_counter := 1; END IF;

        FOR r_item IN
            SELECT id, admission_number, created_at
            FROM public.students
            WHERE institution_id = r_inst.id
              AND (number_value IS NULL OR admission_number IS NULL OR admission_number ~ '^STU-')
            ORDER BY created_at ASC, id ASC
        LOOP
            v_formatted := LPAD(v_counter::TEXT, 4, '0');

            IF r_item.admission_number IS NOT NULL AND r_item.admission_number <> '' AND r_item.admission_number <> v_formatted THEN
                INSERT INTO public.legacy_identifiers (institution_id, person_id, person_type, old_identifier, new_identifier)
                VALUES (r_inst.id, r_item.id, 'student', r_item.admission_number, v_formatted)
                ON CONFLICT DO NOTHING;
            END IF;

            UPDATE public.students
            SET admission_number = v_formatted,
                number_value = v_counter
            WHERE id = r_item.id;

            v_counter := v_counter + 1;
        END LOOP;

        INSERT INTO public.identifier_counters (institution_id, person_type, next_value)
        VALUES (r_inst.id, 'student', v_counter)
        ON CONFLICT (institution_id, person_type) DO UPDATE SET next_value = GREATEST(identifier_counters.next_value, EXCLUDED.next_value);

        v_counter := 1;
        SELECT next_value INTO v_counter FROM public.identifier_counters WHERE institution_id = r_inst.id AND person_type = 'staff';
        IF v_counter IS NULL THEN v_counter := 1; END IF;

        FOR r_item IN
            SELECT id, staff_number, created_at
            FROM public.teachers
            WHERE institution_id = r_inst.id
              AND (number_value IS NULL OR staff_number IS NULL OR staff_number ~ '^TEA-|^TCH-')
            ORDER BY created_at ASC, id ASC
        LOOP
            v_formatted := 'ST' || LPAD(v_counter::TEXT, 4, '0');

            IF r_item.staff_number IS NOT NULL AND r_item.staff_number <> '' AND r_item.staff_number <> v_formatted THEN
                INSERT INTO public.legacy_identifiers (institution_id, person_id, person_type, old_identifier, new_identifier)
                VALUES (r_inst.id, r_item.id, 'staff', r_item.staff_number, v_formatted)
                ON CONFLICT DO NOTHING;
            END IF;

            UPDATE public.teachers
            SET staff_number = v_formatted,
                number_value = v_counter
            WHERE id = r_item.id;

            v_counter := v_counter + 1;
        END LOOP;

        FOR r_item IN
            SELECT id, staff_number, created_at
            FROM public.admins
            WHERE institution_id = r_inst.id
              AND (number_value IS NULL OR staff_number IS NULL OR staff_number ~ '^ADM-')
            ORDER BY created_at ASC, id ASC
        LOOP
            v_formatted := 'ST' || LPAD(v_counter::TEXT, 4, '0');

            IF r_item.staff_number IS NOT NULL AND r_item.staff_number <> '' AND r_item.staff_number <> v_formatted THEN
                INSERT INTO public.legacy_identifiers (institution_id, person_id, person_type, old_identifier, new_identifier)
                VALUES (r_inst.id, r_item.id, 'staff', r_item.staff_number, v_formatted)
                ON CONFLICT DO NOTHING;
            END IF;

            UPDATE public.admins
            SET staff_number = v_formatted,
                number_value = v_counter
            WHERE id = r_item.id;

            v_counter := v_counter + 1;
        END LOOP;

        INSERT INTO public.identifier_counters (institution_id, person_type, next_value)
        VALUES (r_inst.id, 'staff', v_counter)
        ON CONFLICT (institution_id, person_type) DO UPDATE SET next_value = GREATEST(identifier_counters.next_value, EXCLUDED.next_value);

        v_counter := 1;
        SELECT next_value INTO v_counter FROM public.identifier_counters WHERE institution_id = r_inst.id AND person_type = 'parent';
        IF v_counter IS NULL THEN v_counter := 1; END IF;

        FOR r_item IN
            SELECT id, parent_number, created_at
            FROM public.parents
            WHERE institution_id = r_inst.id
              AND (number_value IS NULL OR parent_number IS NULL OR parent_number ~ '^PAR-')
            ORDER BY created_at ASC, id ASC
        LOOP
            v_formatted := 'PA' || LPAD(v_counter::TEXT, 4, '0');

            IF r_item.parent_number IS NOT NULL AND r_item.parent_number <> '' AND r_item.parent_number <> v_formatted THEN
                INSERT INTO public.legacy_identifiers (institution_id, person_id, person_type, old_identifier, new_identifier)
                VALUES (r_inst.id, r_item.id, 'parent', r_item.parent_number, v_formatted)
                ON CONFLICT DO NOTHING;
            END IF;

            UPDATE public.parents
            SET parent_number = v_formatted,
                number_value = v_counter
            WHERE id = r_item.id;

            v_counter := v_counter + 1;
        END LOOP;

        INSERT INTO public.identifier_counters (institution_id, person_type, next_value)
        VALUES (r_inst.id, 'parent', v_counter)
        ON CONFLICT (institution_id, person_type) DO UPDATE SET next_value = GREATEST(identifier_counters.next_value, EXCLUDED.next_value);

    END LOOP;

    -- Also backfill any unassigned or orphaned demo accounts with NULL institution_id
    WITH numbered_students AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) as rn
        FROM public.students
        WHERE institution_id IS NULL AND (number_value IS NULL OR admission_number ~ '^STU-')
    )
    UPDATE public.students s
    SET admission_number = LPAD(n.rn::TEXT, 4, '0'),
        number_value = n.rn
    FROM numbered_students n
    WHERE s.id = n.id;

    WITH numbered_teachers AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) as rn
        FROM public.teachers
        WHERE institution_id IS NULL AND (number_value IS NULL OR staff_number IS NULL OR staff_number ~ '^TEA-|^TCH-')
    )
    UPDATE public.teachers t
    SET staff_number = 'ST' || LPAD(n.rn::TEXT, 4, '0'),
        number_value = n.rn
    FROM numbered_teachers n
    WHERE t.id = n.id;

    WITH numbered_admins AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) as rn
        FROM public.admins
        WHERE institution_id IS NULL AND (number_value IS NULL OR staff_number IS NULL OR staff_number ~ '^ADM-')
    )
    UPDATE public.admins a
    SET staff_number = 'ST' || LPAD(n.rn::TEXT, 4, '0'),
        number_value = n.rn
    FROM numbered_admins n
    WHERE a.id = n.id;

    WITH numbered_parents AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) as rn
        FROM public.parents
        WHERE institution_id IS NULL AND (number_value IS NULL OR parent_number IS NULL OR parent_number ~ '^PAR-')
    )
    UPDATE public.parents p
    SET parent_number = 'PA' || LPAD(n.rn::TEXT, 4, '0'),
        number_value = n.rn
    FROM numbered_parents n
    WHERE p.id = n.id;

    PERFORM set_config('app.allowing_identifier_correction', 'false', true);
END;
$$;

-- 10. UNIQUE INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_institution_admission_number
ON public.students(institution_id, admission_number)
WHERE admission_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_teachers_institution_staff_number
ON public.teachers(institution_id, staff_number)
WHERE staff_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_institution_staff_number
ON public.admins(institution_id, staff_number)
WHERE staff_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_parents_institution_parent_number
ON public.parents(institution_id, parent_number)
WHERE parent_number IS NOT NULL;

-- 11. ROW LEVEL SECURITY
ALTER TABLE public.identifier_formats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "identifier_formats_read_all" ON public.identifier_formats;
CREATE POLICY "identifier_formats_read_all" ON public.identifier_formats
FOR SELECT USING (true);

ALTER TABLE public.identifier_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "identifier_counters_admin_read" ON public.identifier_counters;
CREATE POLICY "identifier_counters_admin_read" ON public.identifier_counters
FOR SELECT USING (
    institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    )
);

ALTER TABLE public.legacy_identifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "legacy_identifiers_admin_read" ON public.legacy_identifiers;
CREATE POLICY "legacy_identifiers_admin_read" ON public.legacy_identifiers
FOR SELECT USING (
    institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    )
);

-- 12. INVOICE SCHEMA UPGRADES (Sequential Numbering, Void Support)
DO $$
BEGIN
    ALTER TABLE public.student_fee_invoices ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
    ALTER TABLE public.student_fee_invoices ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    ALTER TABLE public.student_fee_invoices ADD COLUMN IF NOT EXISTS void_reason TEXT;
    
    ALTER TABLE public.student_fee_invoices DROP CONSTRAINT IF EXISTS student_fee_invoices_status_check;
    ALTER TABLE public.student_fee_invoices ADD CONSTRAINT student_fee_invoices_status_check
        CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled', 'voided', 'cleared'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

