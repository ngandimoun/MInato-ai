import { NextResponse } from "next/server";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { getServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/evasion/invite - Send invites to users
export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabaseClient();
    const { room_id, invited_user_ids } = await request.json();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is the room host
    const { data: room, error: roomError } = await supabase
      .from("evasion_rooms")
      .select("host_user_id")
      .eq("id", room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_user_id !== user.id) {
      return NextResponse.json({ error: "Only the host can send invites" }, { status: 403 });
    }

    // Create invites for each user
    const invites = invited_user_ids.map((invited_user_id: string) => ({
      room_id,
      host_user_id: user.id,
      invited_user_id,
    }));

    const { data: createdInvites, error: inviteError } = await supabase
      .from("evasion_room_invites")
      .insert(invites)
      .select();

    if (inviteError) {
      console.error("Error creating invites:", inviteError);
      return NextResponse.json({ error: "Failed to create invites" }, { status: 500 });
    }

    return NextResponse.json({ success: true, invites: createdInvites });
  } catch (error) {
    console.error("Error in invite endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/evasion/invite - Respond to an invite
export async function PUT(request: Request) {
  try {
    const supabase = await getServerSupabaseClient();
    const { invite_id, response } = await request.json();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the invite and verify the user is the invitee
    const { data: invite, error: inviteError } = await supabase
      .from("evasion_room_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.invited_user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to respond to this invite" }, { status: 403 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite has already been responded to" }, { status: 400 });
    }

    // Update the invite status
    const { data: updatedInvite, error: updateError } = await supabase
      .from("evasion_room_invites")
      .update({
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invite_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invite:", updateError);
      return NextResponse.json({ error: "Failed to update invite" }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite: updatedInvite });
  } catch (error) {
    console.error("Error in invite response endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/evasion/invite - Get user's invites
export async function GET(request: Request) {
  try {
    const supabase = await getServerSupabaseClient();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all pending invites for the user
    const { data: invites, error: inviteError } = await supabase
      .from("evasion_room_invites")
      .select(`
        *,
        evasion_rooms (
          id,
          name,
          description,
          room_code,
          max_participants
        ),
        host:host_user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq("invited_user_id", user.id)
      .eq("status", "pending");

    if (inviteError) {
      console.error("Error fetching invites:", inviteError);
      return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
    }

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("Error in get invites endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 