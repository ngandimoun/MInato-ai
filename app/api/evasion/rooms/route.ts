import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/evasion/rooms - Get all available rooms
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get rooms
    console.log("Fetching rooms from database...");
    const { data: rooms, error } = await supabase
      .from("evasion_rooms")
      .select("*")
      .order("created_at", { ascending: false });
    
    console.log("Rooms query result:", { rooms, error });

    if (error) {
      console.error("Error fetching rooms:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get participant counts for all rooms
    const roomIds = (rooms || []).map((room: any) => room.id);
    console.log("Room IDs for participant count:", roomIds);
    let participantCounts: { [key: string]: number } = {};
    
    if (roomIds.length > 0) {
      const { data: participantData, error: participantError } = await supabase
        .from("evasion_room_participants")
        .select("room_id")
        .in("room_id", roomIds);
      
      console.log("Participant data:", { participantData, participantError });
      
      if (!participantError && participantData) {
        participantCounts = participantData.reduce((acc: { [key: string]: number }, p: any) => {
          acc[p.room_id] = (acc[p.room_id] || 0) + 1;
          return acc;
        }, {});
      }
    }
    
    console.log("Final participant counts:", participantCounts);

    // Get host profiles for all rooms
    const hostUserIds = [...new Set((rooms || []).map((room: any) => room.host_user_id))];
    let hostProfiles: { [key: string]: any } = {};
    
    if (hostUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, full_name, avatar_url")
        .in("id", hostUserIds);
      
      if (!profilesError && profiles) {
        hostProfiles = profiles.reduce((acc: { [key: string]: any }, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    // Format the response
    const formattedRooms = (rooms || []).map((room: any) => {
      const hostProfile = hostProfiles[room.host_user_id];
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        host_user_id: room.host_user_id,
        host_username: hostProfile?.full_name || "Unknown",
        host_avatar_url: hostProfile?.avatar_url,
        current_video_url: room.current_video_url,
        participant_count: participantCounts[room.id] || 0,
        max_participants: room.max_participants,
        is_private: room.is_private,
        room_code: room.room_code,
        created_at: room.created_at,
        updated_at: room.updated_at,
      };
    });

    console.log("Final formatted rooms:", formattedRooms);
    return NextResponse.json({ rooms: formattedRooms });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/evasion/rooms - Create a new room
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { name, description, max_participants = 10, is_private = false } = await request.json();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    // Generate a unique room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create the room
    const { data: room, error: roomError } = await supabase
      .from("evasion_rooms")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        host_user_id: user.id,
        max_participants,
        is_private,
        room_code: roomCode,
      })
      .select()
      .single();

    if (roomError) {
      console.error("Error creating room:", roomError.message);
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      room,
      message: "Room created successfully"
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 