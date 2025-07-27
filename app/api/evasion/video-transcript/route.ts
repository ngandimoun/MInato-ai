import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, videoUrl } = await request.json();

    if (!roomId || !videoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user is the room host
    const { data: room } = await supabase
      .from("evasion_rooms")
      .select("host_user_id")
      .eq("id", roomId)
      .single();

    if (!room || room.host_user_id !== user.id) {
      return NextResponse.json({ error: "Only room host can process videos" }, { status: 403 });
    }

    // Extract video ID
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Check if transcript already exists
    const { data: existing } = await supabase
      .from("evasion_video_transcripts")
      .select("*")
      .eq("room_id", roomId)
      .eq("video_id", videoId)
      .single();

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: "Transcript already exists",
        transcript: existing 
      });
    }

    // Create new transcript record
    const { data: transcript, error } = await supabase
      .from("evasion_video_transcripts")
      .insert({
        room_id: roomId,
        video_url: videoUrl,
        video_id: videoId,
        status: 'processing'
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating transcript:", error);
      return NextResponse.json({ error: "Failed to create transcript" }, { status: 500 });
    }

    // Start processing in background (this would integrate with Gemini API)
    // For now, we'll mark it as completed
    setTimeout(async () => {
      try {
        await supabase
          .from("evasion_video_transcripts")
          .update({
            status: 'completed',
            transcript_text: 'Video transcript processing completed. AI analysis is now available.'
          })
          .eq("id", transcript.id);
      } catch (updateError) {
        console.error("Error updating transcript:", updateError);
      }
    }, 1000);

    return NextResponse.json({ 
      success: true,
      message: "Video transcript processing started",
      transcript 
    });

  } catch (error) {
    console.error("Error in video transcript processing:", error);
    return NextResponse.json(
      { error: "Failed to process video transcript" },
      { status: 500 }
    );
  }
}

function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
} 