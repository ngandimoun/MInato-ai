import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Get recording details
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

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from("audio_recordings")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    if (recording.user_id !== session.user.id) {
      // Check if recording is shared with current user
      const { data: sharedData } = await supabase
        .from("shared_recordings")
        .select("id")
        .eq("recording_id", recordingId)
        .eq("shared_with", session.user.id)
        .limit(1);

      if (!sharedData || sharedData.length === 0) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Get analysis data if available
    const { data: analysis } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("recording_id", recordingId)
      .maybeSingle();

    return NextResponse.json({
      recording,
      analysis,
    });
  } catch (error) {
    console.error("Error fetching recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update recording details
export async function PATCH(
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
        { error: "Only the owner can update a recording" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const allowedFields = ["title", "description", "visibility"];
    
    // Filter to only allowed fields
    const updates = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as Record<string, any>);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update recording
    const { data, error } = await supabase
      .from("audio_recordings")
      .update(updates)
      .eq("id", recordingId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error updating recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete recording
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

    // Get recording to check ownership and get file path
    const { data: recording, error: recordingError } = await supabase
      .from("audio_recordings")
      .select("user_id, file_path")
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
        { error: "Only the owner can delete a recording" },
        { status: 403 }
      );
    }

    // Delete file from storage
    const { error: storageError } = await supabase
      .storage
      .from("audio-recordings")
      .remove([`${session.user.id}/${recording.file_path}`]);

    if (storageError) {
      console.error("Error removing file:", storageError);
      // Continue with deleting database records even if file deletion fails
    }

    // Delete recording (analysis_results will be deleted via cascade)
    const { error } = await supabase
      .from("audio_recordings")
      .delete()
      .eq("id", recordingId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 