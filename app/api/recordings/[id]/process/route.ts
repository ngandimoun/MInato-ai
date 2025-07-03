import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Master prompt for analysis
function getMasterPrompt(transcript: string): string {
  return `You are an expert audio content analyzer. Analyze the following transcript and provide a comprehensive analysis.

TRANSCRIPT:
${transcript}

Please provide your analysis in the following JSON format:
{
  "summary_text": "A concise 2-3 sentence summary of the main content",
  "key_themes_json": [
    {
      "theme": "Theme name",
      "transcript_segment_ids": [1, 2, 3]
    }
  ],
  "structured_notes_json": {
    "Topic 1": ["Note 1", "Note 2"],
    "Topic 2": ["Note 3", "Note 4"]
  },
  "action_items_json": [
    {
      "task": "Task description",
      "assigned_to": "Person name or 'Unspecified'",
      "due_date_iso": "2024-01-01T00:00:00Z or null",
      "transcript_segment_id": 1
    }
  ],
  "sentiment_analysis_json": [
    {
      "segment_id": 1,
      "sentiment": "positive",
      "score": 0.8
    }
  ]
}

Guidelines:
- Extract only concrete action items with clear tasks
- Identify sentiment for each transcript segment (positive/negative/neutral)
- Group related content into structured notes
- Map themes to specific transcript segment IDs
- If no action items exist, return empty array
- All sentiment scores should be between -1 and 1`;
}

// Manually trigger processing for a specific recording
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const recordingId = params.id;

    // Get the recording
    const { data: recording, error: fetchError } = await supabase
      .from("audio_recordings")
      .select("*")
      .eq("id", recordingId)
      .eq("user_id", user.id) // Use user.id instead of session.user.id
      .single();

    if (fetchError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (recording.status === "completed") {
      return NextResponse.json(
        { message: "Recording already processed" },
        { status: 200 }
      );
    }

    // Update status to processing
    await supabase
      .from("audio_recordings")
      .update({ status: "processing" })
      .eq("id", recordingId);

    try {
      // Get a signed URL to access the audio file
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from("audio-recordings")
        .createSignedUrl(`${recording.user_id}/${recording.file_path}`, 60 * 5); // 5 minutes expiry

      if (signedUrlError || !signedUrlData) {
        throw new Error("Failed to access audio file");
      }

      // Download the audio file
      const audioResponse = await fetch(signedUrlData.signedUrl);
      if (!audioResponse.ok) {
        throw new Error("Failed to download audio file");
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

      // Step 1: Transcribe the audio using OpenAI's Whisper
      const formData = new FormData();
      formData.append("file", audioBlob, recording.file_path);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "segment");

      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: new File([audioBlob], recording.file_path, { type: "audio/webm" }),
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      if (!transcriptionResponse.text) {
        throw new Error("Transcription failed - no text returned");
      }

      // Format transcript segments for analysis
      const transcriptSegments = transcriptionResponse.segments?.map((segment, index) => ({
        id: index + 1,
        start: segment.start,
        end: segment.end,
        text: segment.text,
      })) || [];

      // Update recording with duration if available
      if (transcriptionResponse.duration) {
        await supabase
          .from("audio_recordings")
          .update({ duration_seconds: Math.ceil(transcriptionResponse.duration) })
          .eq("id", recordingId);
      }

      // Step 2: Analyze the transcript using GPT-4
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: getMasterPrompt(transcriptionResponse.text),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const analysisContent = analysisResponse.choices[0]?.message?.content;
      if (!analysisContent) {
        throw new Error("Analysis failed - no content returned");
      }

      let analysis;
      try {
        analysis = JSON.parse(analysisContent);
      } catch (parseError) {
        throw new Error("Failed to parse analysis results");
      }

      // Step 3: Store results in the database
      const { error: analysisInsertError } = await supabase
        .from("analysis_results")
        .insert({
          recording_id: recordingId,
          transcript_text: transcriptionResponse.text,
          transcript_json: transcriptSegments,
          summary_text: analysis.summary_text || "No summary available",
          key_themes_json: analysis.key_themes_json || [],
          structured_notes_json: analysis.structured_notes_json || {},
          action_items_json: analysis.action_items_json || [],
          sentiment_analysis_json: analysis.sentiment_analysis_json || [],
        });

      if (analysisInsertError) {
        throw new Error(`Failed to store analysis results: ${analysisInsertError.message}`);
      }

      // Update recording status to completed
      await supabase
        .from("audio_recordings")
        .update({ status: "completed" })
        .eq("id", recordingId);

      return NextResponse.json({
        message: "Processing completed successfully",
        recordingId,
        analysis: {
          transcript_text: transcriptionResponse.text,
          summary: analysis.summary_text,
          segments_count: transcriptSegments.length,
        }
      });

    } catch (processingError) {
      console.error("Processing error:", processingError);
      
      // Update status to failed
      await supabase
        .from("audio_recordings")
        .update({ 
          status: "failed",
          error_message: processingError instanceof Error ? processingError.message : "Unknown error occurred"
        })
        .eq("id", recordingId);

      return NextResponse.json(
        { error: "Processing failed", details: processingError instanceof Error ? processingError.message : "Unknown error occurred" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in processing route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 