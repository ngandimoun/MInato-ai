import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isValidInvitationCode, isInvitationExpired } from '@/lib/utils/couple-therapy';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invitation_code } = body;

    if (!invitation_code || !isValidInvitationCode(invitation_code)) {
      return NextResponse.json({ error: 'Invalid invitation code format' }, { status: 400 });
    }

    // Find the session with this invitation code
    const { data: session, error: sessionError } = await supabase
      .from('couple_therapy_sessions')
      .select('*')
      .eq('invitation_code', invitation_code)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 });
    }

    // Check if the invitation is expired
    if (isInvitationExpired(session.invitation_expires_at)) {
      return NextResponse.json({ error: 'Invitation code has expired' }, { status: 400 });
    }

    // Check if the user is trying to join their own session
    if (session.creator_id === user.id) {
      return NextResponse.json({ error: 'You cannot join your own session' }, { status: 400 });
    }

    // Check if the session already has a partner
    if (session.partner_id) {
      return NextResponse.json({ error: 'This session already has a partner' }, { status: 400 });
    }

    // Check if the session is in the right status
    if (session.status !== 'waiting_for_partner') {
      return NextResponse.json({ error: 'This session is not accepting partners' }, { status: 400 });
    }

    // Update the session to add the partner
    const { data: updatedSession, error: updateError } = await supabase
      .from('couple_therapy_sessions')
      .update({
        partner_id: user.id,
        status: 'active',
        partner_joined_at: new Date().toISOString()
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating couple therapy session:', updateError);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }

    return NextResponse.json({
      session: updatedSession,
      message: 'Successfully joined the couple therapy session'
    });

  } catch (error) {
    console.error('Error in join couple therapy session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 