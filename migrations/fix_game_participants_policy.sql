-- Fix infinite recursion in game_participants RLS policy
-- The issue is caused by the policy querying the same table it's protecting

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view game participants" ON public.game_participants;

-- Create a simplified policy that avoids circular references
-- Users can see participants if:
-- 1. They are the participant themselves, OR
-- 2. They are the host of the game session
CREATE POLICY "Users can view game participants" ON public.game_participants
    FOR SELECT USING (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.game_sessions_history 
            WHERE id = game_session_id 
            AND host_user_id::text = auth.uid()::text
        )
    );

-- Also update the insert policy to be consistent
DROP POLICY IF EXISTS "Users can insert game participants" ON public.game_participants;
CREATE POLICY "Users can insert game participants" ON public.game_participants
    FOR INSERT WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.game_sessions_history 
            WHERE id = game_session_id AND host_user_id::text = auth.uid()::text
        )
    );

-- Add an update policy for completeness
DROP POLICY IF EXISTS "Users can update game participants" ON public.game_participants;
CREATE POLICY "Users can update game participants" ON public.game_participants
    FOR UPDATE USING (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.game_sessions_history 
            WHERE id = game_session_id AND host_user_id::text = auth.uid()::text
        )
    ); 