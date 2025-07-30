import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EVASION_PROMPTS, validateTimestamp } from "@/lib/prompts/evasion-prompts";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

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
    
    // Add context awareness for follow-up questions
    console.log("🔍 Checking for conversation history to provide context...");
    
    // Get conversation history for better context
    const { data: recentMessages } = await supabase
      .from("evasion_chat_messages")
      .select("content, user_id, message_type, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(10);
    
    // If we have conversation history, build a proper context
    if (recentMessages && recentMessages.length > 0) {
      console.log("🧠 Found conversation history to use as context");
      
      // Extract the last 3-4 turns of conversation (user + AI responses)
      // We'll build the conversation in chronological order
      const conversationHistory: {role: string, content: string}[] = [];
      const processedMessages = [...recentMessages].reverse().slice(0, 8); // Get up to 8 most recent messages in chronological order
      
      for (const msg of processedMessages) {
        if (msg.message_type === "ai_response") {
          conversationHistory.push({
            role: "assistant",
            content: msg.content.length > 800 ? msg.content.substring(0, 800) + "..." : msg.content
          });
        } else if (msg.message_type !== "system" && msg.content.toLowerCase() !== question.toLowerCase()) {
          conversationHistory.push({
            role: "user",
            content: msg.content
          });
        }
      }
      
      // Format the conversation history
      let formattedHistory = "";
      if (conversationHistory.length > 0) {
        formattedHistory = conversationHistory.map(msg => 
          `${msg.role === "user" ? "User" : "Minato AI"}: ${msg.content}`
        ).join("\n\n");
      }
      
      // Add a context section to the prompt with the conversation history
      prompt += `CONVERSATION CONTEXT:
The following is your recent conversation with the user about this video. This context is CRITICAL for understanding follow-up questions and maintaining continuity:

${formattedHistory}

IMPORTANT INSTRUCTIONS FOR FOLLOW-UP QUESTIONS:
1. The user's current question is a follow-up to this conversation
2. Reference specific details from your previous responses when answering
3. Maintain continuity by acknowledging what you've already discussed
4. If the user asks about something you mentioned before (like "luxury materials"), expand on that specific topic
5. Still focus primarily on what's visible in the video at the requested timestamp
6. Keep your tone consistent with your previous responses

`;
    }
    
    // Use Gemini's built-in language detection capabilities with improved robustness
    const detectLanguageWithGemini = async (text: string): Promise<string> => {
      try {
        // Check for common French phrases/patterns that might indicate French
        const frenchPatterns = ["cest", "en", "je", "tu", "vous", "nous", "bien", "jolie", "jaimerais", "cas", "totu"];
        const lowerText = text.toLowerCase();
        
        // Quick check for French before using the API
        let frenchScore = 0;
        for (const pattern of frenchPatterns) {
          if (lowerText.includes(pattern)) {
            frenchScore++;
          }
        }
        
        // If we have multiple French indicators, assume French
        if (frenchScore >= 3) {
          console.log("🔍 Detected French based on text patterns (score: " + frenchScore + ")");
          return "French";
        }
        
        // If not clearly French, use the model for detection
        const detectionPrompt = `Detect the language of this text and respond with ONLY the language name (e.g., "French", "Spanish", "English", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic", "Russian", etc.):

Text: "${text}"

Language:`;
        
        // Use the same model as the main analysis for consistency and reliability
        const detectionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const detectionResult = await detectionModel.generateContent(detectionPrompt);
        const detectedLanguage = detectionResult.response.text().trim();
        
        console.log("🔍 Gemini detected language:", detectedLanguage);
        return detectedLanguage;
      } catch (error) {
        console.error("❌ Language detection failed:", error);
        
        // Fallback language detection based on text patterns
        const frenchPatterns = ["cest", "en", "je", "tu", "vous", "nous", "bien", "jolie", "jaimerais", "cas", "totu"];
        const lowerText = text.toLowerCase();
        
        let frenchScore = 0;
        for (const pattern of frenchPatterns) {
          if (lowerText.includes(pattern)) {
            frenchScore++;
          }
        }
        
        if (frenchScore >= 2) {
          console.log("🔍 Fallback detected French based on text patterns");
          return "French";
        }
        
        return 'English'; // Default fallback
      }
    };
    
    const detectedLanguage = await detectLanguageWithGemini(question);
    
    // Handle timestamp validation and create appropriate prompt
    if (currentTimestamp) {
      const timestampValidation = validateTimestamp(currentTimestamp);
      if (timestampValidation.isValid && timestampValidation.normalized) {
        prompt += EVASION_PROMPTS.TIMESTAMP_QUESTION(timestampValidation.normalized, question, detectedLanguage);
      } else {
        // Invalid timestamp - provide helpful guidance
        prompt += `The user provided an invalid timestamp: "${currentTimestamp}". 

Instead of trying to analyze that specific moment, provide a helpful and conversational response that:
- Acknowledges their question about the video
- Explains how to use timestamps effectively (like "02:30" for 2 minutes 30 seconds)
- Offers to help them find what they're looking for
- Keeps the conversation engaging

User's question: "${question}"

Respond in ${detectedLanguage} and be encouraging!`;
      }
    } else {
      // No timestamp - general question analysis
      prompt += EVASION_PROMPTS.QUESTION_ANALYSIS(question, detectedLanguage);
      
      // Add language instruction for multilingual support
      prompt += `

LANGUAGE INSTRUCTIONS:
The user's current message appears to be in ${detectedLanguage}. Please respond in ${detectedLanguage}.
If you detect the user has switched languages from previous messages, adapt accordingly.`;
    }

    console.log("🤖 Calling Gemini API with prompt length:", prompt.length);
    console.log("🎬 Video URL:", videoUrl);
    console.log("🌍 Detected language:", detectedLanguage);

    // Create the Gemini request with video content
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
    const analysis = response.text();
    
    if (!analysis) {
      console.error("❌ Empty response from Gemini API");
      return NextResponse.json({ 
        error: "AI analysis failed", 
        message: "The AI was unable to analyze the video. Please try again." 
      }, { status: 500 });
    }

    console.log("✅ Gemini API response received, length:", analysis.length);

    // Send the AI response as a system message to the chat
    console.log("💾 Inserting AI response to database...");
    try {
      const { data: insertData, error: insertError } = await supabase.from("evasion_chat_messages").insert({
        room_id: roomId,
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        content: analysis,
        message_type: 'ai_response'
      }).select();

      if (insertError) {
        console.error("❌ Error saving AI response to database:", insertError);
        throw insertError;
      }

      console.log("✅ AI response successfully inserted to database:", insertData);
    } catch (dbError: any) {
      console.error("❌ Error saving AI response to database:", dbError);
      console.log("🔄 Trying fallback: inserting as current user...");
      
      // Fallback: Try to send as current user if system user fails
      const { data: fallbackData, error: fallbackError } = await supabase.from("evasion_chat_messages").insert({
        room_id: roomId,
        user_id: user.id, // Use current user as fallback
        content: analysis,
        message_type: 'ai_response'
      }).select();

      if (fallbackError) {
        console.error("❌ Fallback insertion also failed:", fallbackError);
        throw fallbackError;
      }

      console.log("✅ AI response inserted via fallback:", fallbackData);
    }

    console.log("🎉 Video analysis completed successfully");
    return NextResponse.json({ 
      success: true,
      response: analysis
    });

  } catch (error: any) {
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