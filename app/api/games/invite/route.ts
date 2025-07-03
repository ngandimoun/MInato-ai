import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

interface GameInviteRequest {
  room_id: string;
  invited_user_ids: string[];
  message?: string;
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

    const body: GameInviteRequest = await request.json();
    const { room_id, invited_user_ids, message } = body;

    if (!room_id || !invited_user_ids || invited_user_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id and invited_user_ids' },
        { status: 400 }
      );
    }

    // Verify the room exists and user is the host
    const { data: room, error: roomError } = await supabase
      .from('live_game_rooms')
      .select('id, host_user_id, game_type_id, topic, max_players, room_code')
      .eq('id', room_id)
      .eq('host_user_id', user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Game room not found or you are not the host' },
        { status: 404 }
      );
    }

    // Get game type info
    const { data: gameType, error: gameTypeError } = await supabase
      .from('game_types')
      .select('display_name, icon_name, estimated_duration_minutes')
      .eq('id', room.game_type_id)
      .single();

    if (gameTypeError) {
      console.error('Error fetching game type:', gameTypeError);
    }

    // Get host profile
    const { data: hostProfile, error: hostError } = await supabase
      .from('user_profiles')
      .select('full_name, first_name, avatar_url')
      .eq('id', user.id)
      .single();

    const hostName = hostProfile?.full_name || hostProfile?.first_name || user.email?.split('@')[0] || 'Anonymous';

    // Get usernames for invited users
    const { data: invitedProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, first_name')
      .in('id', invited_user_ids);

    if (profilesError) {
      console.error('Error fetching invited user profiles:', profilesError);
    }

    // Create invitations
    const invitations = invited_user_ids.map(invited_user_id => {
      const profile = invitedProfiles?.find((p: any) => p.id === invited_user_id);
      const username = profile?.full_name || profile?.first_name || 'Anonymous';
      
      return {
        room_id: room_id,
        host_user_id: user.id,
        invited_user_id,
        invited_username: username,
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };
    });

    const { data: createdInvitations, error: inviteError } = await supabase
      .from('game_invitations')
      .insert(invitations)
      .select();

    if (inviteError) {
      console.error('Error creating invitations:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitations' },
        { status: 500 }
      );
    }

    // Send notifications to invited users
    try {
      const notifications = invited_user_ids.map(invited_user_id => ({
        user_id: invited_user_id,
        type: 'game_invitation',
        title: 'Game Invitation',
        message: `${hostName} invited you to play ${gameType?.display_name || 'a game'}!`,
        data: {
          room_id,
          room_code: room.room_code,
          host_user_id: user.id,
          host_name: hostName,
          game_type: gameType?.display_name || 'Game',
          game_icon: gameType?.icon_name || '🎮',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        read: false,
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the invitation if notification fails
    }

    return NextResponse.json({
      success: true,
      invitations: createdInvitations,
      message: `Successfully sent ${invited_user_ids.length} invitation(s)`
    });

  } catch (error) {
    console.error('Error in game invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 