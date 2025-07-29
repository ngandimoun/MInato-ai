import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EVASION_PROMPTS } from "@/lib/prompts/evasion-prompts";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Add a GET endpoint for testing
export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing video analysis API configuration");
    
    const config = {
      hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
      googleApiKeyLength: process.env.GOOGLE_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
    
    console.log("🔧 Configuration:", config);
    
    // Test Gemini API connection if API key is available
    let geminiTest = null;
    if (process.env.GOOGLE_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Hello, this is a test.");
        const response = await result.response;
        geminiTest = {
          success: true,
          responseLength: response.text().length
        };
        console.log("✅ Gemini API test successful");
      } catch (geminiError: any) {
        geminiTest = {
          success: false,
          error: geminiError.message
        };
        console.error("❌ Gemini API test failed:", geminiError.message);
      }
    }
    
    return NextResponse.json({ 
      status: "ok", 
      config,
      geminiTest,
      message: "Video analysis API is running"
    });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    return NextResponse.json({ 
      status: "error", 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🎬 Video analysis API called");
    
    // Check if Google API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error("❌ GOOGLE_API_KEY not found in environment variables");
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, question, videoUrl, currentTimestamp } = await request.json();
    console.log("📝 Received request:", { roomId, question: question?.substring(0, 50), videoUrl, currentTimestamp });

    if (!roomId || !question || !videoUrl) {
      console.error("❌ Missing required fields:", { roomId: !!roomId, question: !!question, videoUrl: !!videoUrl });
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

    console.log("🤖 Calling Gemini API with prompt length:", prompt.length);
    console.log("🎬 Video URL:", videoUrl);

    // Generate content with the video
    let aiResponse: string;
    try {
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
      aiResponse = response.text();
      console.log("🤖 AI Response generated:", aiResponse.substring(0, 100) + "...");
    } catch (geminiError: any) {
      console.error("❌ Gemini API error:", geminiError);
      console.error("❌ Error details:", JSON.stringify(geminiError, null, 2));
      return NextResponse.json({ 
        error: "AI analysis failed", 
        details: geminiError.message || "Unknown error" 
      }, { status: 500 });
    }

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
    console.error("❌ Error in video analysis:", error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error("❌ Error name:", error.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
    }
    
    // Check if it's a Gemini API error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message;
      if (errorMessage.includes('API_KEY') || errorMessage.includes('authentication')) {
        console.error("❌ Authentication error - likely missing or invalid GOOGLE_API_KEY");
        return NextResponse.json(
          { error: "AI service authentication failed - please check configuration" },
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        console.error("❌ API quota exceeded");
        return NextResponse.json(
          { error: "AI service quota exceeded - please try again later" },
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('video') || errorMessage.includes('file')) {
        console.error("❌ Video processing error");
        return NextResponse.json(
          { error: "Video processing failed - please check the video URL" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to analyze video", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 