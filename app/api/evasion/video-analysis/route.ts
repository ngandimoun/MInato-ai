import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EVASION_PROMPTS } from "@/lib/prompts/evasion-prompts";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, question, videoUrl, currentTimestamp } = await request.json();

    if (!roomId || !question || !videoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user is in the room
    const { data: participant } = await supabase
      .from("evasion_room_participants")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Not a room participant" }, { status: 403 });
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Create the prompt based on the question
    let prompt = EVASION_PROMPTS.SYSTEM_PROMPT + "\n\n";
    
    if (currentTimestamp) {
      prompt += EVASION_PROMPTS.TIMESTAMP_QUESTION(currentTimestamp, question);
    } else {
      prompt += EVASION_PROMPTS.QUESTION_ANALYSIS(question);
    }

    // Generate content with the video
    const result = await model.generateContent([
      prompt,
      {
        fileData: {
          fileUri: videoUrl,
          mimeType: "video/youtube",
        },
      },
    ]);

    const response = await result.response;
    const aiResponse = response.text();

    console.log("🤖 AI Response generated:", aiResponse.substring(0, 100) + "...");

    // Send the AI response as a system message to the chat
    console.log("💬 Inserting AI response to chat with system user ID");
    const { error: messageError } = await supabase
      .from("evasion_chat_messages")
      .insert({
        room_id: roomId,
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        content: aiResponse,
        message_type: 'ai_response'
      });

    if (messageError) {
      console.error("❌ Error sending AI response to chat:", messageError);
      console.error("❌ Error details:", JSON.stringify(messageError, null, 2));
      
      // Fallback: try to insert as the current user with ai_response type
      console.log("🔄 Trying fallback: inserting as current user");
      const { error: fallbackError } = await supabase
        .from("evasion_chat_messages")
        .insert({
          room_id: roomId,
          user_id: user.id, // Use current user as fallback
          content: aiResponse,
          message_type: 'ai_response'
        });
      
      if (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
      } else {
        console.log("✅ AI response sent to chat via fallback");
      }
    } else {
      console.log("✅ AI response sent to chat successfully");
    }

    return NextResponse.json({ 
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error("Error in video analysis:", error);
    return NextResponse.json(
      { error: "Failed to analyze video" },
      { status: 500 }
    );
  }
} 