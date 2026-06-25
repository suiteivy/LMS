-- Critical DM security hardening: enforce participant-only visibility at data layer

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_participants_select" ON public.conversations;
CREATE POLICY "conversations_participants_select"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "conversation_participants_self_select" ON public.conversation_participants;
CREATE POLICY "conversation_participants_self_select"
ON public.conversation_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.conversation_participants self_cp
    WHERE self_cp.conversation_id = conversation_participants.conversation_id
      AND self_cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_participants_select" ON public.messages;
CREATE POLICY "messages_participants_select"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
  )
  OR sender_id = auth.uid()
  OR receiver_id = auth.uid()
);

DROP POLICY IF EXISTS "message_edit_history_participants_select" ON public.message_edit_history;
CREATE POLICY "message_edit_history_participants_select"
ON public.message_edit_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversation_participants cp
      ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_edit_history.message_id
      AND cp.user_id = auth.uid()
  )
);
