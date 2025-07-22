import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Master prompt for analysis
function getMasterPrompt(transcript: string): string {
  return `You are an elite audio content analyzer with expertise in understanding diverse audio formats including meetings, lectures, sports commentary, interviews, conversations, songs, podcasts, and more. Your task is to provide a comprehensive, intelligent analysis of the provided transcript.

TRANSCRIPT:
${transcript}

Please provide your analysis in the following JSON format:
{
  "content_type": "meeting|lecture|conversation|podcast|interview|sports_commentary|music|other",
  "summary_text": "A concise 2-3 sentence summary of the main content that captures key insights",
  "speakers": [
    {
      "speaker_id": "Speaker 1",
      "possible_name": "John" or null,
      "speaking_segments": [1, 3, 5],
      "role": "host|participant|lecturer|interviewer|interviewee|unknown",
      "key_contributions": ["Main point 1", "Main point 2"]
    }
  ],
  "key_themes_json": [
    {
      "theme": "Theme name",
      "importance": "high|medium|low",
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
      "priority": "high|medium|low",
      "transcript_segment_id": 1
    }
  ],
  "sentiment_analysis_json": [
    {
      "segment_id": 1,
      "sentiment": "positive|negative|neutral",
      "intensity": "high|medium|low"
    }
  ],
  "key_moments_json": [
    {
      "moment_type": "insight|decision|question|disagreement|agreement|joke|emotional_moment",
      "description": "Brief description of the key moment",
      "segment_id": 5,
      "importance": "high|medium|low"
    }
  ]
}

Guidelines:
- First identify the content type to adapt your analysis approach
- Detect and differentiate between different speakers, assigning consistent speaker_id values
- If possible, identify actual names of speakers from context clues in the transcript
- For lectures or educational content, highlight key learning points
- For conversations, focus on the narrative flow and interactions
- For sports commentary, note key events and moments
- For music or creative content, note themes and emotional elements
- Extract only concrete action items with clear tasks
- Identify sentiment for each transcript segment with appropriate intensity
- Group related content into structured notes
- Map themes to specific transcript segment IDs
- If no action items exist, return empty array
- Identify key moments that stand out in the recording
- Be precise and insightful in your analysis, prioritizing accuracy over verbosity`;
}

// Manually trigger processing for a specific recording
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Log du quota et du plan utilisateur
    console.log(`Analyse recording: user_id=${user.id}, plan_type=${user.plan_type}, trial_recordings_remaining=${user.trial_recordings_remaining}`);

    // Await params and get the recording ID
    const { id: recordingId } = await params;
    if (!recordingId) {
      return NextResponse.json(
        { error: "Recording ID is required" },
        { status: 400 }
      );
    }

    // Get the recording
    const { data: recording, error: fetchError } = await supabase
      .from("audio_recordings")
      .select("*")
      .eq("id", recordingId)
      .eq("user_id", user.id)
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
      const audioFile = new File([audioBlob], recording.file_path, { type: "audio/webm" });

      // Step 1: Transcribe the audio using gpt-4o-mini-transcribe
      console.log("Starting transcription with gpt-4o-mini-transcribe...");
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "gpt-4o-mini-transcribe",
        response_format: "json",
      });

      if (!transcriptionResponse.text) {
        throw new Error("Transcription failed - no text returned");
      }

      console.log("Transcription completed successfully");

      // Create transcript segments from the response
      let transcriptSegments = [];
      
      // Since gpt-4o-mini-transcribe doesn't provide detailed segments with the json format,
      // we'll split the text into sentences and estimate timing
      const sentences = transcriptionResponse.text.split(/[.!?]+/).filter(s => s.trim());
      const estimatedDuration = recording.duration_seconds || 60; // fallback duration
      transcriptSegments = sentences.map((sentence, index) => ({
        id: index + 1,
        start: (index * estimatedDuration) / sentences.length,
        end: ((index + 1) * estimatedDuration) / sentences.length,
        text: sentence.trim(),
      }));

      // Update recording with duration if available
      const audioDuration = (transcriptionResponse as any).duration || recording.duration_seconds;
      if (audioDuration && (!recording.duration_seconds || recording.duration_seconds === 0)) {
        await supabase
          .from("audio_recordings")
          .update({ duration_seconds: Math.ceil(audioDuration) })
          .eq("id", recordingId);
      }

      // Step 2: Analyze the transcript using GPT-4
      console.log("Starting analysis with GPT-4...");
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
          content_type: analysis.content_type || "other",
          speakers_json: analysis.speakers || [],
          key_themes_json: analysis.key_themes_json || [],
          structured_notes_json: analysis.structured_notes_json || {},
          action_items_json: analysis.action_items_json || [],
          sentiment_analysis_json: analysis.sentiment_analysis_json || [],
          key_moments_json: analysis.key_moments_json || []
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
        },
        toast: {
          title: "Processing Complete",
          description: "Your recording has been processed successfully. If you don't see the analysis, please click the Refresh Data button."
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