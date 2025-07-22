import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Parse request body
    const body = await req.json();
    const { conversationHistory, userQuestion, language } = body;
    
    if (!userQuestion) {
      return NextResponse.json(
        { error: "Missing required field: userQuestion" },
        { status: 400 }
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

    // Get analysis data
    const { data: analysis, error: analysisError } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("recording_id", recordingId)
      .maybeSingle();

    if (analysisError || !analysis || !analysis.transcript_json) {
      return NextResponse.json(
        { error: "Analysis not available for this recording" },
        { status: 404 }
      );
    }

    // Format the transcript into a string with timestamps and speaker labels
    const transcriptJson = analysis.transcript_json;
    let formattedTranscript = "";
    
    if (Array.isArray(transcriptJson)) {
      formattedTranscript = transcriptJson.map((segment: any, index: number) => {
        const timestamp = segment.start ? `[${formatTimestamp(segment.start)}]` : '';
        const speaker = segment.speaker ? `Speaker ${segment.speaker}: ` : '';
        return `${timestamp} ${speaker}${segment.text} (segment_id: ${index})`;
      }).join("\n");
    }

    // Create the reasoning prompt
    const languageInstruction = language && language !== "en" 
      ? `\n7. IMPORTANT: Respond in ${getLanguageName(language)}. The user has selected ${getLanguageName(language)} as their preferred language.`
      : "";
      
    const reasoningPrompt = `
    You are Minato AI, an intelligent assistant analyzing audio conversations.
    
    Your task is to answer questions about the conversation transcript provided below.
    
    Guidelines:
    1. Answer questions based ONLY on the provided transcript.
    2. When referring to specific parts of the conversation, cite your sources using [1], [2], etc.
    3. Include the exact timestamp and segment_id in your citations.
    4. If the question cannot be answered from the transcript, politely say so.
    5. Keep your answers concise but comprehensive.
    6. Format your response as a JSON object with "answer" and "citations" fields.${languageInstruction}
    
    Context:
    """
    ${formattedTranscript}
    """
    
    Conversation History:
    """
    ${JSON.stringify(conversationHistory || [])}
    """
    
    User Question: ${userQuestion}
    
    Respond with a JSON object in this format:
    {
      "answer": "Your answer with citation markers like [1], [2]${language && language !== "en" ? ` (in ${getLanguageName(language)})` : ""}",
      "citations": [
        {
          "text": "The exact text from the transcript you're citing",
          "timestamp": "MM:SS",
          "segment_id": 0
        }
      ]
    }
    `;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: reasoningPrompt }],
      response_format: { type: 'json_object' }
    });

    // Parse and return the JSON response
    const content = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content || '{"answer": "Sorry, I could not process your question.", "citations": []}');

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("Error processing chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to format timestamps
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to get language name
function getLanguageName(languageCode: string): string {
  const languageMap: { [key: string]: string } = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
  };
  return languageMap[languageCode] || languageCode;
} 