import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

interface InvitationResponseRequest {
  invitation_id: string;
  response: 'accepted' | 'declined';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: InvitationResponseRequest = await request.json();
    const { invitation_id, response } = body;

    if (!invitation_id || !response || !['accepted', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: invitation_id and response (accepted/declined)' },
        { status: 400 }
      );
    }

    // Verify the invitation exists and belongs to this user
    const { data: invitation, error: inviteError } = await supabase
      .from('game_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already responded to' },
        { status: 404 }
      );
    }

    // Update the invitation status
    const { error: updateError } = await supabase
      .from('game_invitations')
      .update({
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitation_id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invitation' },
        { status: 500 }
      );
    }

    // If accepted, join the game room
    if (response === 'accepted') {
      try {
        // Get room details
        const { data: room, error: roomError } = await supabase
          .from('live_game_rooms')
          .select('*')
          .eq('id', invitation.room_id)
          .single();

        if (roomError || !room) {
          return NextResponse.json(
            { error: 'Game room not found' },
            { status: 404 }
          );
        }

        // Check if room is still accepting players
        if (room.status !== 'lobby') {
          return NextResponse.json(
            { error: 'Game room is no longer accepting players' },
            { status: 400 }
          );
        }

        // Check if room is full
        const { count: playerCount } = await supabase
          .from('live_game_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);

        if (playerCount && playerCount >= room.max_players) {
          return NextResponse.json(
            { error: 'Game room is full' },
            { status: 400 }
          );
        }

        // Get user profile for username
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, first_name, avatar_url')
          .eq('id', user.id)
          .single();

        const username = profile?.full_name || profile?.first_name || user.email?.split('@')[0] || 'Player';

        // Add player to the room
        const { error: joinError } = await supabase
          .from('live_game_players')
          .insert({
            room_id: room.id,
            user_id: user.id,
            username: username,
            avatar_url: profile?.avatar_url,
          });

        if (joinError) {
          console.error('Error joining game room:', joinError);
          return NextResponse.json(
            { error: 'Failed to join game room' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Invitation accepted and joined game room',
          room_id: room.id,
          room_code: room.room_code,
        });

      } catch (error) {
        console.error('Error joining game after accepting invitation:', error);
        return NextResponse.json(
          { error: 'Invitation accepted but failed to join game room' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${response}`,
    });

  } catch (error) {
    console.error('Error in invitation response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 