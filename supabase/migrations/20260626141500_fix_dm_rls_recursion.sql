-- Fix recursive RLS evaluation on conversation_participants.
-- The prior policy referenced conversation_participants inside itself,
-- which can trigger "infinite recursion detected in policy" when queried
-- via PostgREST / Supabase client.

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_participants_self_select" ON public.conversation_participants;

CREATE POLICY "conversation_participants_self_select"
ON public.conversation_participants
FOR SELECT
USING (
  user_id = auth.uid()
);
