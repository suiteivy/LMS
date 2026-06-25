-- Add expiry support for announcements and related notifications
ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_announcements_expires_at
    ON public.announcements(expires_at);

-- Backfill existing announcements with a 3-day expiry window from creation
UPDATE public.announcements
SET expires_at = created_at + INTERVAL '3 days'
WHERE expires_at IS NULL;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at
    ON public.notifications(expires_at);

-- Backfill existing announcement notifications with expiry aligned to announcement records
UPDATE public.notifications n
SET expires_at = a.expires_at
FROM public.announcements a
WHERE n.expires_at IS NULL
  AND (n.data->>'announcement_id') = a.id::text
  AND n.institution_id = a.institution_id;

-- Recreate trigger to propagate announcement expiry into notifications
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
    IF NEW.subject_id IS NOT NULL THEN
        SELECT title INTO v_subject_title FROM public.subjects WHERE id = NEW.subject_id;
        v_notify_title := '📢 ' || COALESCE(v_subject_title, 'Subject') || ' Announcement: ' || NEW.title;
        v_notify_message := NEW.message;
    ELSE
        v_notify_title := '📢 General Notice: ' || NEW.title;
        v_notify_message := NEW.message;
    END IF;

    IF NEW.subject_id IS NOT NULL THEN
        FOR v_student IN
            SELECT DISTINCT s.user_id, s.id AS student_internal_id
            FROM public.students s
            LEFT JOIN public.enrollments e
                ON e.student_id = s.id
               AND e.subject_id = NEW.subject_id
               AND e.status = 'enrolled'
            LEFT JOIN public.class_enrollments ce
                ON ce.student_id = s.id
               AND ce.class_id = (SELECT class_id FROM public.subjects WHERE id = NEW.subject_id)
            WHERE s.institution_id = NEW.institution_id
              AND s.user_id IS NOT NULL
              AND (e.id IS NOT NULL OR ce.id IS NOT NULL)
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at, expires_at)
            VALUES (
                v_student.user_id,
                v_notify_title,
                v_notify_message,
                'info',
                false,
                jsonb_build_object('type', 'announcement', 'announcement_id', NEW.id, 'subject_id', NEW.subject_id),
                NEW.institution_id,
                NOW(),
                NEW.expires_at
            )
            ON CONFLICT DO NOTHING;

            FOR v_parent IN
                SELECT DISTINCT p.user_id
                FROM public.parents p
                JOIN public.parent_students ps ON ps.parent_id = p.id
                WHERE ps.student_id = v_student.student_internal_id
                  AND p.institution_id = NEW.institution_id
                  AND p.user_id IS NOT NULL
            LOOP
                INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at, expires_at)
                VALUES (
                    v_parent.user_id,
                    v_notify_title,
                    v_notify_message,
                    'info',
                    false,
                    jsonb_build_object('type', 'announcement', 'announcement_id', NEW.id, 'subject_id', NEW.subject_id),
                    NEW.institution_id,
                    NOW(),
                    NEW.expires_at
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    ELSE
        FOR v_user IN
            SELECT u.id
            FROM public.users u
            WHERE u.institution_id = NEW.institution_id
              AND (auth.uid() IS NULL OR u.id != auth.uid())
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at, expires_at)
            VALUES (
                v_user.id,
                v_notify_title,
                v_notify_message,
                'info',
                false,
                jsonb_build_object('type', 'general_notice', 'announcement_id', NEW.id),
                NEW.institution_id,
                NOW(),
                NEW.expires_at
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
