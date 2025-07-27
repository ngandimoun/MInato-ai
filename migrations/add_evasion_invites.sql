-- Add Evasion Room Invites
-- This migration adds support for inviting users to evasion rooms

-- Table for evasion room invites
CREATE TABLE IF NOT EXISTS public.evasion_room_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.evasion_rooms(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '1 hour'),
    
    -- Add unique constraint to prevent duplicate invites
    UNIQUE(room_id, host_user_id, invited_user_id)
);

-- Add RLS policies
ALTER TABLE public.evasion_room_invitations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see invites they've sent or received
CREATE POLICY "Users can view their own invites" ON public.evasion_room_invitations
    FOR SELECT
    USING (
        auth.uid() = host_user_id OR 
        auth.uid() = invited_user_id
    );

-- Policy to allow users to create invites for rooms they host
CREATE POLICY "Hosts can create invites" ON public.evasion_room_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evasion_rooms
            WHERE id = room_id
            AND host_user_id = auth.uid()
        )
    );

-- Policy to allow invited users to update their invite status
CREATE POLICY "Invited users can update invite status" ON public.evasion_room_invitations
    FOR UPDATE
    USING (
        auth.uid() = invited_user_id
    )
    WITH CHECK (
        auth.uid() = invited_user_id AND
        (NEW.status IN ('accepted', 'declined'))
    ); 