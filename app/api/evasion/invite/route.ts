import { NextResponse } from "next/server";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/evasion/invite - Send invites to users
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { room_id, invited_user_ids } = await request.json();

    console.log("🎯 Invite request received:", {
      room_id,
      invited_user_ids,
      invited_count: invited_user_ids?.length || 0
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id.substring(0, 8));

    // Verify the user is the room host
    const { data: room, error: roomError } = await supabase
      .from("evasion_rooms")
      .select("host_user_id, name, room_code")
      .eq("id", room_id)
      .single();

    if (roomError || !room) {
      console.error("❌ Room not found:", { room_id, error: roomError });
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    console.log("✅ Room found:", {
      room_id,
      room_name: room.name,
      room_code: room.room_code,
      host_user_id: room.host_user_id.substring(0, 8),
      current_user_id: user.id.substring(0, 8)
    });

    if (room.host_user_id !== user.id) {
      console.error("❌ User is not the host:", {
        room_host: room.host_user_id.substring(0, 8),
        current_user: user.id.substring(0, 8)
      });
      return NextResponse.json({ error: "Only the host can send invites" }, { status: 403 });
    }

    // Validate invited_user_ids
    if (!invited_user_ids || !Array.isArray(invited_user_ids) || invited_user_ids.length === 0) {
      console.error("❌ Invalid invited_user_ids:", invited_user_ids);
      return NextResponse.json({ error: "Invalid invited_user_ids" }, { status: 400 });
    }

    // Validate UUID format for invited_user_ids
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidUuids = invited_user_ids.filter(id => !uuidRegex.test(id));
    
    if (invalidUuids.length > 0) {
      console.error("❌ Invalid UUID format:", invalidUuids);
      return NextResponse.json({ 
        error: "Invalid user ID format", 
        invalid_user_ids: invalidUuids 
      }, { status: 400 });
    }

    console.log("✅ All invited user IDs have valid UUID format:", {
      valid_uuids: invited_user_ids.length,
      invited_users: invited_user_ids
    });

    // Create invites for each user
    const invites = invited_user_ids.map((invited_user_id: string) => ({
      room_id,
      host_user_id: user.id,
      invited_user_id,
    }));

    console.log("📝 Creating invites:", {
      room_id,
      host_user_id: user.id.substring(0, 8),
      invite_count: invites.length,
      invites: invites.map(inv => ({
        room_id: inv.room_id,
        host_user_id: inv.host_user_id.substring(0, 8),
        invited_user_id: inv.invited_user_id.substring(0, 8)
      }))
    });

    // First, let's check if we can read from the table (RLS test)
    const { data: testRead, error: readError } = await supabase
      .from("evasion_room_invites")
      .select("id")
      .limit(1);

    console.log("🔍 RLS Read test:", {
      can_read: !readError,
      read_error: readError,
      test_data: testRead
    });

    // Try to insert one invite at a time to isolate the problem
    const createdInvites = [];
    const failedInvites = [];

    for (const invite of invites) {
      console.log("📝 Attempting to create invite:", {
        room_id: invite.room_id,
        host_user_id: invite.host_user_id.substring(0, 8),
        invited_user_id: invite.invited_user_id.substring(0, 8)
      });

      const { data: createdInvite, error: singleInviteError } = await supabase
        .from("evasion_room_invites")
        .insert(invite)
        .select()
        .single();

      if (singleInviteError) {
        console.error("❌ Failed to create single invite:", {
          invite: invite,
          error: singleInviteError,
          error_message: singleInviteError.message,
          error_details: singleInviteError.details,
          error_hint: singleInviteError.hint,
          error_code: singleInviteError.code
        });
        failedInvites.push({ invite, error: singleInviteError });
      } else {
        console.log("✅ Single invite created successfully:", createdInvite);
        createdInvites.push(createdInvite);
      }
    }

    if (failedInvites.length > 0) {
      console.error("❌ Some invites failed to create:", {
        total_attempted: invites.length,
        successful: createdInvites.length,
        failed: failedInvites.length,
        failed_invites: failedInvites
      });
      
      return NextResponse.json({ 
        error: "Some invites failed to create",
        successful_count: createdInvites.length,
        failed_count: failedInvites.length,
        failed_invites: failedInvites.map(f => ({
          invited_user_id: f.invite.invited_user_id,
          error: f.error.message,
          code: f.error.code
        }))
      }, { status: 500 });
    }

    console.log("✅ All invites created successfully:", {
      created_count: createdInvites.length,
      invites: createdInvites
    });

    return NextResponse.json({ success: true, invites: createdInvites });
  } catch (error) {
    console.error("❌ Unexpected error in invite endpoint:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/evasion/invite - Respond to an invite
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { invite_id, response } = await request.json();

    console.log("🎯 Invite response request:", {
      invite_id,
      response
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication error in PUT:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated for response:", user.id.substring(0, 8));

    // Get the invite and verify the user is the invitee
    const { data: invite, error: inviteError } = await supabase
      .from("evasion_room_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      console.error("❌ Invite not found:", { invite_id, error: inviteError });
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    console.log("✅ Invite found:", {
      invite_id,
      host_user_id: invite.host_user_id.substring(0, 8),
      invited_user_id: invite.invited_user_id.substring(0, 8),
      current_user_id: user.id.substring(0, 8),
      status: invite.status
    });

    if (invite.invited_user_id !== user.id) {
      console.error("❌ User not authorized to respond:", {
        invite_invited_user: invite.invited_user_id.substring(0, 8),
        current_user: user.id.substring(0, 8)
      });
      return NextResponse.json({ error: "Not authorized to respond to this invite" }, { status: 403 });
    }

    if (invite.status !== "pending") {
      console.error("❌ Invite already responded:", { status: invite.status });
      return NextResponse.json({ error: "Invite has already been responded to" }, { status: 400 });
    }

    console.log("📝 Updating invite status:", {
      invite_id,
      old_status: invite.status,
      new_status: response
    });

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
      console.error("❌ Error updating invite:", {
        error: updateError,
        error_message: updateError.message,
        error_details: updateError.details,
        error_hint: updateError.hint,
        error_code: updateError.code
      });
      return NextResponse.json({ 
        error: "Failed to update invite",
        details: updateError.message,
        code: updateError.code
      }, { status: 500 });
    }

    console.log("✅ Invite updated successfully:", {
      invite_id,
      new_status: updatedInvite.status,
      responded_at: updatedInvite.responded_at
    });

    return NextResponse.json({ success: true, invite: updatedInvite });
  } catch (error) {
    console.error("❌ Unexpected error in invite response endpoint:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/evasion/invite - Get user's invites
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    console.log("🎯 Getting user invites");

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication error in GET:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated for invites:", user.id.substring(0, 8));

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
      console.error("❌ Error fetching invites:", {
        error: inviteError,
        error_message: inviteError.message,
        error_details: inviteError.details,
        error_hint: inviteError.hint,
        error_code: inviteError.code
      });
      return NextResponse.json({ 
        error: "Failed to fetch invites",
        details: inviteError.message,
        code: inviteError.code
      }, { status: 500 });
    }

    console.log("✅ Invites fetched successfully:", {
      user_id: user.id.substring(0, 8),
      invite_count: invites?.length || 0,
      invites: invites?.map((inv: { id: any; evasion_rooms: { name: any; room_code: any; }; host: { email: any; }; status: any; }) => ({
        id: inv.id,
        room_name: inv.evasion_rooms?.name,
        room_code: inv.evasion_rooms?.room_code,
        host_email: inv.host?.email,
        status: inv.status
      }))
    });

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("❌ Unexpected error in get invites endpoint:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 