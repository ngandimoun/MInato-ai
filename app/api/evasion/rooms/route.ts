import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/evasion/rooms - Get available rooms based on user permissions
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Fetching rooms for user:", user.id.substring(0, 8));

    // Get rooms with proper filtering based on user permissions
    // Users can see:
    // 1. All public rooms (is_private = false)
    // 2. All rooms they created (host_user_id = user.id) - both public and private
    // 3. Private rooms they are invited to (participants table)
    
    // First, get public rooms and ALL rooms the user created (both public and private)
    const { data: publicAndCreatedRooms, error: publicError } = await supabase
      .from("evasion_rooms")
      .select("*")
      .or(`is_private.eq.false,host_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (publicError) {
      console.error("❌ Error fetching public/created rooms:", publicError.message);
      return NextResponse.json({ error: publicError.message }, { status: 500 });
    }

    // Then, get private rooms where the user is a participant (but not the host)
    const { data: participantRooms, error: participantError } = await supabase
      .from("evasion_room_participants")
      .select(`
        room_id,
        evasion_rooms(*)
      `)
      .eq("user_id", user.id);

    if (participantError) {
      console.error("❌ Error fetching participant rooms:", participantError.message);
      return NextResponse.json({ error: participantError.message }, { status: 500 });
    }

    // Combine and deduplicate rooms
    const allRooms = [
      ...(publicAndCreatedRooms || []),
      ...(participantRooms?.map((p: any) => p.evasion_rooms).filter(Boolean) || [])
    ];

    // Remove duplicates based on room ID, prioritizing rooms where user is host
    const uniqueRooms = allRooms.filter((room: any, index: number, self: any[]) => {
      const firstIndex = self.findIndex((r: any) => r.id === room.id);
      if (index === firstIndex) return true;
      
      // If this is a duplicate, keep the one where user is host
      const existingRoom = self[firstIndex];
      const currentIsHost = room.host_user_id === user.id;
      const existingIsHost = existingRoom.host_user_id === user.id;
      
      if (currentIsHost && !existingIsHost) {
        // Replace existing with current (current is host)
        self[firstIndex] = room;
        return false;
      }
      
      return false; // Remove duplicate
    });

    // Sort by creation date
    const rooms = uniqueRooms.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log("📋 Rooms query result:", { 
      totalRooms: rooms?.length || 0,
      publicAndCreated: publicAndCreatedRooms?.length || 0,
      participantRooms: participantRooms?.length || 0,
      uniqueRooms: uniqueRooms.length,
      userCreatedRooms: rooms.filter((r: any) => r.host_user_id === user.id).length
    });

    // Get participant counts for all rooms
    const roomIds = (rooms || []).map((room: any) => room.id);
    console.log("👥 Room IDs for participant count:", roomIds);
    let participantCounts: { [key: string]: number } = {};
    let userParticipantRooms: Set<string> = new Set();
    
    if (roomIds.length > 0) {
      const { data: participantData, error: participantError } = await supabase
        .from("evasion_room_participants")
        .select("room_id, user_id")
        .in("room_id", roomIds);
      
      console.log("👥 Participant data:", { 
        participantCount: participantData?.length || 0, 
        error: participantError?.message 
      });
      
      if (!participantError && participantData) {
        // Count participants per room
        participantCounts = participantData.reduce((acc: { [key: string]: number }, p: any) => {
          acc[p.room_id] = (acc[p.room_id] || 0) + 1;
          return acc;
        }, {});

        // Track rooms where current user is a participant
        participantData.forEach((p: any) => {
          if (p.user_id === user.id) {
            userParticipantRooms.add(p.room_id);
          }
        });
      }
    }
    
    console.log("📊 Final participant counts:", participantCounts);
    console.log("👤 User participant rooms:", Array.from(userParticipantRooms));

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

    // Format the response and add user-specific information
    const formattedRooms = (rooms || []).map((room: any) => {
      const hostProfile = hostProfiles[room.host_user_id];
      const isHost = room.host_user_id === user.id;
      const isParticipant = userParticipantRooms.has(room.id);
      
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
        // User-specific permissions
        user_permissions: {
          is_host: isHost,
          is_participant: isParticipant,
          can_join: (isHost || isParticipant) || 
                   (!room.is_private && (participantCounts[room.id] || 0) < room.max_participants),
          can_edit: isHost,
          can_load_video: isHost || isParticipant, // Only host and participants can load videos
        }
      };
    });

    console.log("✅ Final formatted rooms:", {
      totalRooms: formattedRooms.length,
      publicRooms: formattedRooms.filter((r: any) => !r.is_private).length,
      privateRooms: formattedRooms.filter((r: any) => r.is_private).length,
      userHostedRooms: formattedRooms.filter((r: any) => r.user_permissions.is_host).length,
      userParticipantRooms: formattedRooms.filter((r: any) => r.user_permissions.is_participant).length,
    });

    return NextResponse.json({ rooms: formattedRooms });
  } catch (error) {
    console.error("❌ Unexpected error:", error);
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

    console.log("🏗️ Creating room:", {
      name: name.trim(),
      is_private: is_private,
      host_user_id: user.id.substring(0, 8),
      room_code: roomCode
    });

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
      console.error("❌ Error creating room:", roomError.message);
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    // Automatically add the host as a participant
    const { error: participantError } = await supabase
      .from("evasion_room_participants")
      .insert({
        room_id: room.id,
        user_id: user.id,
        is_active: true,
      });

    if (participantError) {
      console.error("⚠️ Warning: Could not add host as participant:", participantError.message);
      // Don't fail the room creation, just log the warning
    } else {
      console.log("✅ Host added as participant to room:", room.id);
    }

    console.log("✅ Room created successfully:", room.id);

    return NextResponse.json({ 
      room,
      message: "Room created successfully"
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 