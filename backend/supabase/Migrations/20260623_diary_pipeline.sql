-- 1. Alter assignments table to add student_id and grades_released columns
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS grades_released BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Alter diary_entries table to add student_id and assignment_id columns
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE;

-- 3. Create indexes for high performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_student_id ON public.diary_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_assignment_id ON public.diary_entries(assignment_id);

-- 4. Create trigger function to sync assignments to diary entries
CREATE OR REPLACE FUNCTION public.sync_assignment_to_diary()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id TEXT;
    v_class_id UUID;
    v_teacher_name TEXT;
    v_diary_title TEXT;
    v_diary_content TEXT;
BEGIN
    -- Determine teacher full name
    IF NEW.teacher_id IS NOT NULL THEN
        SELECT u.full_name INTO v_teacher_name 
        FROM public.teachers t 
        JOIN public.users u ON t.user_id = u.id 
        WHERE t.id = NEW.teacher_id;
    END IF;
    IF v_teacher_name IS NULL THEN
        v_teacher_name := 'Subject Teacher';
    END IF;

    -- Construct diary content/title
    v_diary_title := 'Assignment: ' || NEW.title;
    v_diary_content := COALESCE(NEW.description, 'No description provided.');

    -- On INSERT:
    IF (TG_OP = 'INSERT') THEN
        -- If the assignment is draft, do not propagate yet
        IF NEW.status = 'draft' THEN
            RETURN NEW;
        END IF;

        -- Target: Individual student
        IF NEW.student_id IS NOT NULL THEN
            SELECT class_id INTO v_class_id FROM public.class_enrollments WHERE student_id = NEW.student_id LIMIT 1;
            
            IF NOT EXISTS (SELECT 1 FROM public.diary_entries WHERE assignment_id = NEW.id AND student_id = NEW.student_id) THEN
                INSERT INTO public.diary_entries (
                    institution_id, class_id, teacher_id, student_id, assignment_id, title, content, entry_date, status
                ) VALUES (
                    NEW.institution_id, COALESCE(v_class_id, NEW.class_id), NEW.teacher_id, NEW.student_id, NEW.id, v_diary_title, v_diary_content, CURRENT_DATE, 'approved'
                );
            END IF;

        -- Target: Subject enrolled students
        ELSIF NEW.subject_id IS NOT NULL THEN
            SELECT class_id INTO v_class_id FROM public.subjects WHERE id = NEW.subject_id;

            FOR v_student_id IN 
                SELECT student_id FROM public.enrollments WHERE subject_id = NEW.subject_id AND status = 'enrolled'
            LOOP
                IF NOT EXISTS (SELECT 1 FROM public.diary_entries WHERE assignment_id = NEW.id AND student_id = v_student_id) THEN
                    INSERT INTO public.diary_entries (
                        institution_id, class_id, teacher_id, student_id, assignment_id, title, content, entry_date, status
                    ) VALUES (
                        NEW.institution_id, COALESCE(v_class_id, NEW.class_id), NEW.teacher_id, v_student_id, NEW.id, v_diary_title, v_diary_content, CURRENT_DATE, 'approved'
                    );
                END IF;
            END LOOP;

        -- Target: Class enrolled students
        ELSIF NEW.class_id IS NOT NULL THEN
            FOR v_student_id IN 
                SELECT student_id FROM public.class_enrollments WHERE class_id = NEW.class_id
            LOOP
                IF NOT EXISTS (SELECT 1 FROM public.diary_entries WHERE assignment_id = NEW.id AND student_id = v_student_id) THEN
                    INSERT INTO public.diary_entries (
                        institution_id, class_id, teacher_id, student_id, assignment_id, title, content, entry_date, status
                    ) VALUES (
                        NEW.institution_id, NEW.class_id, NEW.teacher_id, v_student_id, NEW.id, v_diary_title, v_diary_content, CURRENT_DATE, 'approved'
                    );
                END IF;
            END LOOP;
        END IF;

    -- On UPDATE:
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If status changed from draft to active, create entries
        IF OLD.status = 'draft' AND NEW.status = 'active' THEN
            -- Target: Individual student
            IF NEW.student_id IS NOT NULL THEN
                SELECT class_id INTO v_class_id FROM public.class_enrollments WHERE student_id = NEW.student_id LIMIT 1;
                IF NOT EXISTS (SELECT 1 FROM public.diary_entries WHERE assignment_id = NEW.id AND student_id = NEW.student_id) THEN
                    INSERT INTO public.diary_entries (
                        institution_id, class_id, teacher_id, student_id, assignment_id, title, content, entry_date, status
                    ) VALUES (
                        NEW.institution_id, COALESCE(v_class_id, NEW.class_id), NEW.teacher_id, NEW.student_id, NEW.id, v_diary_title, v_diary_content, CURRENT_DATE, 'approved'
                    );
                END IF;
            -- Target: Subject enrolled students
            ELSIF NEW.subject_id IS NOT NULL THEN
                SELECT class_id INTO v_class_id FROM public.subjects WHERE id = NEW.subject_id;
                FOR v_student_id IN 
                    SELECT student_id FROM public.enrollments WHERE subject_id = NEW.subject_id AND status = 'enrolled'
                LOOP
                    IF NOT EXISTS (SELECT 1 FROM public.diary_entries WHERE assignment_id = NEW.id AND student_id = v_student_id) THEN
                        INSERT INTO public.diary_entries (
                            institution_id, class_id, teacher_id, student_id, assignment_id, title, content, entry_date, status
                        ) VALUES (
                            NEW.institution_id, COALESCE(v_class_id, NEW.class_id), NEW.teacher_id, v_student_id, NEW.id, v_diary_title, v_diary_content, CURRENT_DATE, 'approved'
                        );
                    END IF;
                END LOOP;
            -- Target: Class enrolled students
            ELSIF NEW.class_id IS NOT NULL THEN
                FOR v_student_id IN 
                    SELECT student_id FROM public.class_enrollments WHERE class_id = NEW.class_id
                LOOP
                    IF NOT EXISTS (SELECT 1 FROM public.diary_entries WHERE assignment_id = NEW.id AND student_id = v_student_id) THEN
                        INSERT INTO public.diary_entries (
                            institution_id, class_id, teacher_id, student_id, assignment_id, title, content, entry_date, status
                        ) VALUES (
                            NEW.institution_id, NEW.class_id, NEW.teacher_id, v_student_id, NEW.id, v_diary_title, v_diary_content, CURRENT_DATE, 'approved'
                        );
                    END IF;
                END LOOP;
            END IF;
        ELSE
            -- Sync details on update
            UPDATE public.diary_entries 
            SET title = v_diary_title,
                content = v_diary_content,
                updated_at = NOW()
            WHERE assignment_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger to assignments table for syncing
DROP TRIGGER IF EXISTS tr_sync_assignment_to_diary ON public.assignments;
CREATE TRIGGER tr_sync_assignment_to_diary
AFTER INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_to_diary();


-- 5. Create trigger function for notifications
CREATE OR REPLACE FUNCTION public.notify_on_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id TEXT;
    v_student_user_id UUID;
    v_student_name TEXT;
    v_parent RECORD;
    v_subject_title TEXT;
    v_notify_title TEXT;
    v_notify_message TEXT;
    v_is_due_date_update BOOLEAN := FALSE;
BEGIN
    -- Check if we should notify
    IF (TG_OP = 'INSERT' AND NEW.status = 'draft') THEN
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.status = 'draft') THEN
            RETURN NEW;
        END IF;
        
        IF (NEW.due_date IS DISTINCT FROM OLD.due_date) THEN
            v_is_due_date_update := TRUE;
        ELSIF (OLD.status = 'active') THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Get subject title
    IF NEW.subject_id IS NOT NULL THEN
        SELECT title INTO v_subject_title FROM public.subjects WHERE id = NEW.subject_id;
    END IF;

    -- Case 1: Targeted individual student
    IF NEW.student_id IS NOT NULL THEN
        SELECT s.user_id, u.full_name INTO v_student_user_id, v_student_name 
        FROM public.students s
        JOIN public.users u ON s.user_id = u.id
        WHERE s.id = NEW.student_id;

        IF v_student_user_id IS NOT NULL THEN
            IF v_is_due_date_update THEN
                v_notify_title := '⚠️ Assignment Due Date Changed: ' || NEW.title;
                v_notify_message := 'The due date for "' || NEW.title || '" has been updated to ' || to_char(NEW.due_date, 'YYYY-MM-DD');
            ELSE
                v_notify_title := '📝 New Assignment: ' || NEW.title;
                v_notify_message := 'A new assignment has been published for you. Due date: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
            END IF;

            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
            VALUES (
                v_student_user_id, v_notify_title, v_notify_message, 'info', false,
                jsonb_build_object('type', 'assignment', 'assignment_id', NEW.id), NEW.institution_id, NOW()
            );

            FOR v_parent IN
                SELECT p.user_id 
                FROM public.parents p
                JOIN public.parent_students ps ON ps.parent_id = p.id
                WHERE ps.student_id = NEW.student_id AND p.institution_id = NEW.institution_id
            LOOP
                IF v_is_due_date_update THEN
                    v_notify_title := '⚠️ Assignment Due Date Changed for ' || v_student_name;
                    v_notify_message := 'The due date for ' || v_student_name || '''s assignment "' || NEW.title || '" has been updated to ' || to_char(NEW.due_date, 'YYYY-MM-DD');
                ELSE
                    v_notify_title := '📝 New Assignment for ' || v_student_name;
                    v_notify_message := v_student_name || ' has a new assignment: "' || NEW.title || '" (Subject: ' || COALESCE(v_subject_title, 'General') || '). Due date: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
                END IF;

                INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
                VALUES (
                    v_parent.user_id, v_notify_title, v_notify_message, 'info', false,
                    jsonb_build_object('type', 'assignment', 'assignment_id', NEW.id), NEW.institution_id, NOW()
                );
            END LOOP;
        END IF;

    -- Case 2: Subject enrolled students
    ELSIF NEW.subject_id IS NOT NULL THEN
        FOR v_student_id, v_student_user_id, v_student_name IN 
            SELECT s.id, s.user_id, u.full_name 
            FROM public.students s
            JOIN public.users u ON s.user_id = u.id
            JOIN public.enrollments e ON e.student_id = s.id
            WHERE e.subject_id = NEW.subject_id AND e.status = 'enrolled'
        LOOP
            IF v_is_due_date_update THEN
                v_notify_title := '⚠️ Assignment Due Date Changed: ' || NEW.title;
                v_notify_message := 'The due date for "' || NEW.title || '" has been updated to ' || to_char(NEW.due_date, 'YYYY-MM-DD');
            ELSE
                v_notify_title := '📝 New Assignment: ' || NEW.title;
                v_notify_message := 'A new assignment has been published for ' || COALESCE(v_subject_title, 'Subject') || '. Due date: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
            END IF;

            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
            VALUES (
                v_student_user_id, v_notify_title, v_notify_message, 'info', false,
                jsonb_build_object('type', 'assignment', 'assignment_id', NEW.id), NEW.institution_id, NOW()
            );

            FOR v_parent IN
                SELECT p.user_id 
                FROM public.parents p
                JOIN public.parent_students ps ON ps.parent_id = p.id
                WHERE ps.student_id = v_student_id AND p.institution_id = NEW.institution_id
            LOOP
                IF v_is_due_date_update THEN
                    v_notify_title := '⚠️ Assignment Due Date Changed for ' || v_student_name;
                    v_notify_message := 'The due date for ' || v_student_name || '''s assignment "' || NEW.title || '" has been updated to ' || to_char(NEW.due_date, 'YYYY-MM-DD');
                ELSE
                    v_notify_title := '📝 New Assignment for ' || v_student_name;
                    v_notify_message := v_student_name || ' has a new assignment: "' || NEW.title || '" (Subject: ' || COALESCE(v_subject_title, 'General') || '). Due date: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
                END IF;

                INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
                VALUES (
                    v_parent.user_id, v_notify_title, v_notify_message, 'info', false,
                    jsonb_build_object('type', 'assignment', 'assignment_id', NEW.id), NEW.institution_id, NOW()
                );
            END LOOP;
        END LOOP;

    -- Case 3: Class enrolled students
    ELSIF NEW.class_id IS NOT NULL THEN
        FOR v_student_id, v_student_user_id, v_student_name IN 
            SELECT s.id, s.user_id, u.full_name 
            FROM public.students s
            JOIN public.users u ON s.user_id = u.id
            JOIN public.class_enrollments ce ON ce.student_id = s.id
            WHERE ce.class_id = NEW.class_id
        LOOP
            IF v_is_due_date_update THEN
                v_notify_title := '⚠️ Assignment Due Date Changed: ' || NEW.title;
                v_notify_message := 'The due date for "' || NEW.title || '" has been updated to ' || to_char(NEW.due_date, 'YYYY-MM-DD');
            ELSE
                v_notify_title := '📝 New Assignment: ' || NEW.title;
                v_notify_message := 'A new assignment has been published for your class. Due date: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
            END IF;

            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
            VALUES (
                v_student_user_id, v_notify_title, v_notify_message, 'info', false,
                jsonb_build_object('type', 'assignment', 'assignment_id', NEW.id), NEW.institution_id, NOW()
            );

            FOR v_parent IN
                SELECT p.user_id 
                FROM public.parents p
                JOIN public.parent_students ps ON ps.parent_id = p.id
                WHERE ps.student_id = v_student_id AND p.institution_id = NEW.institution_id
            LOOP
                IF v_is_due_date_update THEN
                    v_notify_title := '⚠️ Assignment Due Date Changed for ' || v_student_name;
                    v_notify_message := 'The due date for ' || v_student_name || '''s assignment "' || NEW.title || '" has been updated to ' || to_char(NEW.due_date, 'YYYY-MM-DD');
                ELSE
                    v_notify_title := '📝 New Assignment for ' || v_student_name;
                    v_notify_message := v_student_name || ' has a new assignment: "' || NEW.title || '" (Subject: ' || COALESCE(v_subject_title, 'General') || '). Due date: ' || to_char(NEW.due_date, 'YYYY-MM-DD');
                END IF;

                INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
                VALUES (
                    v_parent.user_id, v_notify_title, v_notify_message, 'info', false,
                    jsonb_build_object('type', 'assignment', 'assignment_id', NEW.id), NEW.institution_id, NOW()
                );
            END LOOP;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger to assignments table for notifications
DROP TRIGGER IF EXISTS tr_notify_on_assignment_change ON public.assignments;
CREATE TRIGGER tr_notify_on_assignment_change
AFTER INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment_change();
