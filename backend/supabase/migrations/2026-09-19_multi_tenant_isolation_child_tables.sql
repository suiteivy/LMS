-- Migration: Multi-Tenant Isolation Child Tables
-- Adds direct institution_id to child tables that were previously only scoped via parent join
-- Date: 2026-09-19

DO $$
BEGIN
    -- 1. report_card_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'report_card_items' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.report_card_items ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE;
        
        -- Backfill from parent report_cards
        UPDATE public.report_card_items rci
        SET institution_id = rc.institution_id
        FROM public.report_cards rc
        WHERE rci.report_card_id = rc.id;

        CREATE INDEX IF NOT EXISTS idx_report_card_items_institution_id ON public.report_card_items(institution_id);
    END IF;

    -- 2. conversation_participants
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'conversation_participants' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.conversation_participants ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE;
        
        -- Backfill from parent conversations
        UPDATE public.conversation_participants cp
        SET institution_id = c.institution_id
        FROM public.conversations c
        WHERE cp.conversation_id = c.id;

        CREATE INDEX IF NOT EXISTS idx_conversation_participants_institution_id ON public.conversation_participants(institution_id);
    END IF;

    -- 3. ticket_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ticket_messages' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.ticket_messages ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE;
        
        -- Backfill from parent support_tickets
        UPDATE public.ticket_messages tm
        SET institution_id = st.institution_id
        FROM public.support_tickets st
        WHERE tm.ticket_id = st.id;

        CREATE INDEX IF NOT EXISTS idx_ticket_messages_institution_id ON public.ticket_messages(institution_id);
    END IF;

    -- 4. user_roles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.user_roles ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE;
        
        -- Backfill from parent roles
        UPDATE public.user_roles ur
        SET institution_id = r.institution_id
        FROM public.roles r
        WHERE ur.role_id = r.id;

        -- Fallback backfill from users if role was platform/global
        UPDATE public.user_roles ur
        SET institution_id = u.institution_id
        FROM public.users u
        WHERE ur.user_id = u.id AND ur.institution_id IS NULL;

        CREATE INDEX IF NOT EXISTS idx_user_roles_institution_id ON public.user_roles(institution_id);
    END IF;
END $$;
