-- Fix message notification trigger for conversation-mode sends where
-- messages.subject can be NULL. Prevent notifications.message NOT NULL failures.

CREATE OR REPLACE FUNCTION public.notify_on_message_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
    v_preview TEXT;
BEGIN
    SELECT full_name INTO v_sender_name
    FROM public.users
    WHERE id = NEW.sender_id;

    IF v_sender_name IS NULL THEN
        v_sender_name := 'Someone';
    END IF;

    v_preview := COALESCE(NULLIF(TRIM(NEW.subject), ''), NULLIF(TRIM(NEW.content), ''), 'New message');

    INSERT INTO public.notifications (user_id, title, message, type, is_read, data, institution_id, created_at)
    VALUES (
        NEW.receiver_id,
        '✉️ New Message',
        'You received a new message from ' || v_sender_name || ': "' || v_preview || '"',
        'info',
        false,
        jsonb_build_object('type', 'message', 'message_id', NEW.id, 'sender_id', NEW.sender_id),
        NEW.institution_id,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
