import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from("audio_recordings")
      .select("user_id, file_path")
      .eq("id", params.id)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Check if user has access (either owns the recording or it's shared with them)
    if (recording.user_id !== session.user.id) {
      // Check if recording is shared with current user
      const { data: sharedData } = await supabase
        .from("shared_recordings")
        .select("id")
        .eq("recording_id", params.id)
        .eq("shared_with", session.user.id)
        .limit(1);

      if (!sharedData || sharedData.length === 0) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Get signed URL for the audio file
    const filePath = `${recording.user_id}/${recording.file_path}`;
    console.log(`Attempting to get signed URL for: ${filePath}`);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from("audio-recordings")
      .createSignedUrl(filePath, 60 * 5); // 5 minutes expiry

    if (signedUrlError || !signedUrlData) {
      console.error("Storage error:", signedUrlError);
      console.log("Recording data:", { user_id: recording.user_id, file_path: recording.file_path });
      return NextResponse.json(
        { error: `Failed to generate URL for audio file: ${signedUrlError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error("Error fetching audio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 