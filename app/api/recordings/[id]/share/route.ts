import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Share a recording with another user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params and get the recording ID
    const { id: recordingId } = await params;

    // Get recording to check ownership
    const { data: recording, error: recordingError } = await supabase
      .from("audio_recordings")
      .select("user_id")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (recording.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can share a recording" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Validate email or user_id
    if (!body.email && !body.user_id) {
      return NextResponse.json(
        { error: "Missing required field: either email or user_id must be provided" },
        { status: 400 }
      );
    }

    let userId = body.user_id;

    // If email is provided but not user_id, look up the user by email
    if (body.email && !userId) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", body.email)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found with provided email" },
          { status: 404 }
        );
      }

      userId = user.id;
    }

    // Don't allow sharing with self
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot share with yourself" },
        { status: 400 }
      );
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from("shared_recordings")
      .select("id")
      .eq("recording_id", recordingId)
      .eq("shared_with", userId)
      .limit(1);

    if (existingShare && existingShare.length > 0) {
      return NextResponse.json(
        { error: "Recording already shared with this user" },
        { status: 400 }
      );
    }

    // Create share
    const { data, error } = await supabase
      .from("shared_recordings")
      .insert({
        recording_id: recordingId,
        shared_by: session.user.id,
        shared_with: userId
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to share recording" },
        { status: 500 }
      );
    }

    // Update recording visibility to 'shared' if it's not already
    await supabase
      .from("audio_recordings")
      .update({ visibility: "shared" })
      .eq("id", recordingId)
      .eq("visibility", "private");

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error sharing recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// List users a recording is shared with
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params and get the recording ID
    const { id: recordingId } = await params;

    // Get recording to check ownership
    const { data: recording, error: recordingError } = await supabase
      .from("audio_recordings")
      .select("user_id")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (recording.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can view sharing details" },
        { status: 403 }
      );
    }

    // Get users this recording is shared with
    const { data, error } = await supabase
      .from("shared_recordings")
      .select(`
        id,
        created_at,
        user_profiles!shared_with (
          id,
          email,
          full_name
        )
      `)
      .eq("recording_id", recordingId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch shared users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shares: data });
  } catch (error) {
    console.error("Error listing shared users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Remove share
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params and get the recording ID
    const { id: recordingId } = await params;

    // Get recording to check ownership
    const { data: recording, error: recordingError } = await supabase
      .from("audio_recordings")
      .select("user_id")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (recording.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can manage sharing" },
        { status: 403 }
      );
    }

    // Parse request body to get the user_id to remove
    const body = await req.json();
    
    if (!body.user_id) {
      return NextResponse.json(
        { error: "Missing required field: user_id" },
        { status: 400 }
      );
    }

    // Delete the share
    const { error } = await supabase
      .from("shared_recordings")
      .delete()
      .eq("recording_id", recordingId)
      .eq("shared_with", body.user_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove share" },
        { status: 500 }
      );
    }

    // Check if any shares remain
    const { data: remainingShares, error: countError } = await supabase
      .from("shared_recordings")
      .select("id")
      .eq("recording_id", recordingId);

    if (countError) {
      // Don't fail the operation if we can't check remaining shares
      console.error("Error checking remaining shares:", countError);
    } else if (!remainingShares || remainingShares.length === 0) {
      // If no more shares exist, update recording visibility back to private
      await supabase
        .from("audio_recordings")
        .update({ visibility: "private" })
        .eq("id", recordingId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing share:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 