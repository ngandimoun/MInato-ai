import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/evasion/invitations - Get invitations for the current user
export async function GET() {
  try {
    console.log("GET /api/evasion/invitations - Starting request");
    const supabase = await createServerSupabaseClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("Auth check result:", { user: user?.id, authError });
    
    if (authError || !user) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get invitations where the current user is invited
    console.log("Fetching invitations for user:", user.id);
    // First, try a simple query without joins
    console.log("Testing simple query first...");
    const simpleQuery = supabase
      .from("evasion_room_invitations")
      .select("*")
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
    
    const { data: simpleInvitations, error: simpleError } = await simpleQuery;
    console.log("Simple query result:", { simpleInvitations, simpleError });
    
    if (simpleError) {
      console.error("Simple query error:", simpleError);
      return NextResponse.json({ error: simpleError?.message || "Database error" }, { status: 500 });
    }
    
    // For now, let's use the simple query result and fetch room details separately
    console.log("Using simple query result for now...");
    const invitations = simpleInvitations;
    
    console.log("Invitations query result:", { invitations });

    // Format the response with basic data for now
    const formattedInvitations = (invitations || []).map((invitation: any) => ({
      id: invitation.id,
      room_id: invitation.room_id,
      room_name: "Loading...", // We'll need to fetch room details separately
      room_description: null,
      room_code: null,
      is_private: false,
      host_user_id: invitation.host_user_id,
      host_username: "Unknown Host", // We'll need to fetch user details separately
      host_avatar_url: null,
      status: invitation.status,
      created_at: invitation.invited_at,
      expires_at: invitation.expires_at,
    }));

    console.log("Final formatted invitations:", formattedInvitations);
    return NextResponse.json({ invitations: formattedInvitations });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/evasion/invitations - Respond to an invitation (accept/decline)
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { invitationId, action } = await request.json();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate action
    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'accept' or 'decline'" }, { status: 400 });
    }

    // Update the invitation status
    const { data: invitation, error } = await supabase
      .from("evasion_room_invitations")
      .update({
        status: action === "accept" ? "accepted" : "declined",
        responded_at: new Date().toISOString()
      })
      .eq("id", invitationId)
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      console.error("Error updating invitation:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found or already responded to" }, { status: 404 });
    }

    return NextResponse.json({ 
      invitation,
      message: `Invitation ${action}ed successfully`
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 