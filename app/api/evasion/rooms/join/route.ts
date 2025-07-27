import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { room_code } = body;

    if (!room_code || room_code.trim().length === 0) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    // Find the room by code
    const { data: room, error: roomError } = await supabase
      .from("evasion_rooms")
      .select("*")
      .eq("room_code", room_code.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if room is full
    const { count: participantCount, error: countError } = await supabase
      .from("evasion_room_participants")
      .select("*", { count: "exact" })
      .eq("room_id", room.id)
      .eq("is_active", true);

    if (countError) {
      console.error("Error counting participants:", countError);
      return NextResponse.json({ error: "Failed to check room capacity" }, { status: 500 });
    }

    if (participantCount && participantCount >= room.max_participants) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    // Check if user is already in the room
    const { data: existingParticipant } = await supabase
      .from("evasion_room_participants")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .single();

    if (existingParticipant) {
      // User is already in the room, just return success
      return NextResponse.json({ 
        success: true,
        room: {
          id: room.id,
          name: room.name
        }
      });
    }

    // Add user as participant
    const { error: joinError } = await supabase
      .from("evasion_room_participants")
      .insert({
        room_id: room.id,
        user_id: user.id
      });

    if (joinError) {
      console.error("Error joining room:", joinError);
      return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      room: {
        id: room.id,
        name: room.name
      }
    });
  } catch (error) {
    console.error("Error in POST /api/evasion/rooms/join:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 