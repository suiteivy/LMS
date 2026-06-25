-- 1. Create trigger function for announcements insert
CREATE OR REPLACE FUNCTION public.notify_on_announcement_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_student RECORD;
    v_parent RECORD;
    v_user RECORD;
    v_subject_title TEXT;
    v_notify_title TEXT;
    v_notify_message TEXT;
BEGIN
    -- Determine the title and message
    IF NEW.subject_id IS NOT NULL THEN
        SELECT title INTO v_subject_title FROM public.subjects WHERE id = NEW.subject_id;
        v_notify_title := '📢 ' || COALESCE(v_subject_title, 'Subject') || ' Announcement: ' || NEW.title;
        v_notify_message := NEW.message;
    ELSE
        v_notify_title := '📢 General Notice: ' || NEW.title;
        v_notify_message := NEW.message;
    END IF;

    -- Case 1: Subject-specific announcement
    IF NEW.subject_id IS NOT NULL THEN
        -- Loop through enrolled students
        FOR v_student IN 
            SELECT s.user_id, s.id as student_internal_id 
            FROM public.students s
            JOIN public.enrollments e ON e.student_id = s.id
            WHERE e.subject_id = NEW.subject_id AND s.institution_id = NEW.institution_id
        LOOP
            -- Create notification for student
            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
            VALUES (
                v_student.user_id,
                v_notify_title,
                v_notify_message,
                'info',
                false,
                jsonb_build_object('type', 'announcement', 'announcement_id', NEW.id, 'subject_id', NEW.subject_id),
                NEW.institution_id,
                NOW()
            );

            -- Loop through parents of this student
            FOR v_parent IN
                SELECT p.user_id 
                FROM public.parents p
                JOIN public.parent_students ps ON ps.parent_id = p.id
                WHERE ps.student_id = v_student.student_internal_id AND p.institution_id = NEW.institution_id
            LOOP
                -- Create notification for parent
                INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
                VALUES (
                    v_parent.user_id,
                    v_notify_title,
                    v_notify_message,
                    'info',
                    false,
                    jsonb_build_object('type', 'announcement', 'announcement_id', NEW.id, 'subject_id', NEW.subject_id),
                    NEW.institution_id,
                    NOW()
                );
            END LOOP;
        END LOOP;
    ELSE
        -- Case 2: General announcement (subject_id is NULL)
        -- Notify all users in the institution except the creator
        FOR v_user IN 
            SELECT u.id 
            FROM public.users u
            WHERE u.institution_id = NEW.institution_id
              AND (auth.uid() IS NULL OR u.id != auth.uid())
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
            VALUES (
                v_user.id,
                v_notify_title,
                v_notify_message,
                'info',
                false,
                jsonb_build_object('type', 'general_notice', 'announcement_id', NEW.id),
                NEW.institution_id,
                NOW()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger to announcements table
DROP TRIGGER IF EXISTS tr_notify_on_announcement_insert ON public.announcements;
CREATE TRIGGER tr_notify_on_announcement_insert
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_on_announcement_insert();


-- 2. Create trigger function for messages insert
CREATE OR REPLACE FUNCTION public.notify_on_message_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    -- Get sender's full name
    SELECT full_name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;
    IF v_sender_name IS NULL THEN
        v_sender_name := 'Someone';
    END IF;

    -- Insert notification for the receiver
    INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
    VALUES (
        NEW.receiver_id,
        '✉️ New Message',
        'You received a new message from ' || v_sender_name || ': "' || NEW.subject || '"',
        'info',
        false,
        jsonb_build_object('type', 'message', 'message_id', NEW.id, 'sender_id', NEW.sender_id),
        NEW.institution_id,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bind trigger to messages table
DROP TRIGGER IF EXISTS tr_notify_on_message_insert ON public.messages;
CREATE TRIGGER tr_notify_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message_insert();

-- 3. Update announcements RLS policies to restrict write access to admins only
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements
FOR SELECT
USING (
    institution_id = public.get_current_user_institution_id()
    OR public.get_current_user_role() = 'master_admin'
);

CREATE POLICY "announcements_insert" ON public.announcements
FOR INSERT
WITH CHECK (
    (institution_id = public.get_current_user_institution_id() AND public.get_current_user_role() IN ('admin', 'master_admin'))
    OR public.get_current_user_role() = 'master_admin'
);

CREATE POLICY "announcements_update" ON public.announcements
FOR UPDATE
USING (
    (institution_id = public.get_current_user_institution_id() AND public.get_current_user_role() IN ('admin', 'master_admin'))
    OR public.get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = public.get_current_user_institution_id() AND public.get_current_user_role() IN ('admin', 'master_admin'))
    OR public.get_current_user_role() = 'master_admin'
);

CREATE POLICY "announcements_delete" ON public.announcements
FOR DELETE
USING (
    (institution_id = public.get_current_user_institution_id() AND public.get_current_user_role() IN ('admin', 'master_admin'))
    OR public.get_current_user_role() = 'master_admin'
);

-- 4. Remove announcements:write permission association from Teacher role
DELETE FROM public.role_permissions
WHERE permission_id IN (SELECT id FROM public.permissions WHERE name = 'announcements:write')
  AND role_id IN (SELECT id FROM public.roles WHERE name = 'Teacher');;
