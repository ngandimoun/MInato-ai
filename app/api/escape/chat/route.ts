import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rawOpenAiClient as openai } from '@/lib/providers/llm_clients';
import { generateTherapyPrompt, CRISIS_INTERVENTION } from '@/lib/prompts/therapy-prompts';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const { sessionId, message, messageType = 'text', audioUrl, audioDuration } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json({
        success: false,
        error: 'Session ID and message are required'
      }, { status: 400 });
    }

    console.log(`🧠 [Therapy Chat API] Processing message for session ${sessionId}`);

    // Get session and user profile
    const { data: session, error: sessionError } = await supabase
      .from('therapy_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found or access denied'
      }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_therapy_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'User therapy profile not found'
      }, { status: 404 });
    }

    // Save user message
    const userMessageData = {
      session_id: sessionId,
      user_id: user.id,
      content: message,
      message_type: 'user',
      content_type: messageType,
      audio_url: audioUrl,
      audio_duration_seconds: audioDuration,
      transcript: messageType === 'voice' ? message : undefined,
      language: session.language || 'en',
      created_at: new Date().toISOString()
    };

    const { data: userMessage, error: userMessageError } = await supabase
      .from('therapy_messages')
      .insert([userMessageData])
      .select()
      .single();

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save user message'
      }, { status: 500 });
    }

    // Check for crisis keywords
    const crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
      'self harm', 'cut myself', 'hurt myself', 'harm myself'
    ];
    
    const needsCrisisIntervention = crisisKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    let aiResponse = '';
    let therapeuticTechnique = 'supportive_listening';
    let interventionType = 'emotional_support';

    if (needsCrisisIntervention) {
      // Handle crisis intervention
      aiResponse = CRISIS_INTERVENTION.suicidal_ideation;
      therapeuticTechnique = 'crisis_intervention';
      interventionType = 'safety_protocol';
      
      console.log(`🚨 [Therapy Chat API] Crisis intervention triggered for session ${sessionId}`);
    } else {
      // Generate AI response using OpenAI
      try {
        // Get conversation history
        const { data: messageHistory, error: historyError } = await supabase
          .from('therapy_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyError) {
          console.error('Error fetching message history:', historyError);
        }

        const conversationHistory = (messageHistory || []).reverse().map((msg: any) => ({
          role: msg.message_type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        // Generate therapy prompt
        const config = {
          communicationStyle: profile.communication_style,
          language: profile.preferred_language,
          preferredName: profile.preferred_name,
          gender: profile.gender,
          sessionType: session.therapy_approach,
          category: 'general-therapy'
        };

        const systemPrompt = generateTherapyPrompt(config);

        const messages = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ] as any[];

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1-mini-2025-04-14',
          messages,
          temperature: 0.7,
          max_tokens: 500,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        });

        aiResponse = completion.choices[0]?.message?.content || 
          "I want to make sure I give you the thoughtful response you deserve. Could you share a bit more about what you're experiencing?";

        // Detect therapeutic technique and intervention type
        const lowerResponse = aiResponse.toLowerCase();
        if (lowerResponse.includes('breathe') || lowerResponse.includes('breathing')) {
          therapeuticTechnique = 'breathing_exercise';
        } else if (lowerResponse.includes('what do you think') || lowerResponse.includes('how do you feel')) {
          therapeuticTechnique = 'reflective_questioning';
        } else if (lowerResponse.includes('that sounds') || lowerResponse.includes('i hear you')) {
          therapeuticTechnique = 'validation';
        }

      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
        aiResponse = "I'm here to listen and support you. Sometimes I need a moment to process - could you tell me more about what's on your mind?";
      }
    }

    // Analyze sentiment (simplified)
    const sentimentScore = analyzeSentiment(message);
    const emotions = detectEmotions(message);

    // Save AI response
    const aiMessageData = {
      session_id: sessionId,
      user_id: user.id,
      content: aiResponse,
      message_type: 'ai',
      content_type: 'text',
      language: session.language || 'en',
      sentiment_score: sentimentScore,
      emotions_detected: emotions,
      therapeutic_technique: therapeuticTechnique,
      intervention_type: interventionType,
              ai_model_used: 'gpt-4.1-mini-2025-04-14',
      processing_time_ms: Date.now() - new Date(userMessage.created_at).getTime(),
      is_flagged: needsCrisisIntervention,
      flag_reason: needsCrisisIntervention ? 'crisis_intervention_triggered' : null,
      created_at: new Date().toISOString()
    };

    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('therapy_messages')
      .insert([aiMessageData])
      .select()
      .single();

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save AI response'
      }, { status: 500 });
    }

                    // Update session statistics
                await supabase
                  .from('therapy_sessions')
                  .update({
                    message_count: session.message_count + 2, // user + ai message
                    voice_message_count: messageType === 'voice' ? (session.voice_message_count || 0) + 1 : session.voice_message_count,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sessionId);

                // Save important interactions to memory (async, don't block response)
                setImmediate(async () => {
                  try {
                    // Save user insight if significant
                    if (userMessage && userMessage.content && isImportantUserInsight(userMessage.content)) {
                      await saveToMemory({
                        user_id: user.id,
                        content: `Therapy session insight: ${userMessage.content}`,
                        categories: ['therapy', 'user_insight', 'session'],
                        metadata: {
                          session_id: sessionId,
                          message_type: 'user',
                          therapeutic_context: true,
                          language: session.language
                        }
                      });
                    }

                    // Save AI therapeutic technique if noteworthy
                    if (aiMessage && therapeuticTechnique && therapeuticTechnique !== 'supportive_listening') {
                      await saveToMemory({
                        user_id: user.id,
                        content: `Applied therapeutic technique: ${therapeuticTechnique} - "${aiMessage.content.substring(0, 100)}..."`,
                        categories: ['therapy', 'technique', therapeuticTechnique],
                        metadata: {
                          session_id: sessionId,
                          message_type: 'ai',
                          therapeutic_technique: therapeuticTechnique,
                          intervention_type: interventionType,
                          language: session.language
                        }
                      });
                    }
                  } catch (memoryError) {
                    console.error('Background memory save failed:', memoryError);
                  }
                });

                console.log(`✅ [Therapy Chat API] Successfully processed message for session ${sessionId}`);

                return NextResponse.json({
                  success: true,
                  userMessage,
                  aiMessage,
                  needsCrisisIntervention
                });

  } catch (error: any) {
    console.error('[Therapy Chat API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process therapy message: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// Helper functions
function analyzeSentiment(message: string): number {
  const positiveWords = ['happy', 'good', 'great', 'love', 'wonderful', 'amazing', 'better', 'hope'];
  const negativeWords = ['sad', 'angry', 'hate', 'terrible', 'awful', 'worse', 'depressed', 'anxious'];
  
  const words = message.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;
  
  if (positiveCount > negativeCount) return 0.7;
  if (negativeCount > positiveCount) return -0.7;
  return 0.0;
}

function detectEmotions(message: string): string[] {
  const emotions: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('nervous')) emotions.push('anxiety');
  if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) emotions.push('sadness');
  if (lowerMessage.includes('angry') || lowerMessage.includes('mad') || lowerMessage.includes('frustrated')) emotions.push('anger');
  if (lowerMessage.includes('happy') || lowerMessage.includes('joy') || lowerMessage.includes('excited')) emotions.push('happiness');
  if (lowerMessage.includes('scared') || lowerMessage.includes('afraid') || lowerMessage.includes('fear')) emotions.push('fear');
  
  return emotions;
}

function isImportantUserInsight(content: string): boolean {
  const insightIndicators = [
    'i realize', 'i understand', 'i see that', 'i learned', 
    'i discovered', 'it makes sense', 'i feel like', 'i think',
    'breakthrough', 'clarity', 'insight', 'understand now',
    'makes sense now', 'i get it', 'aha', 'eureka'
  ];

  const lowerContent = content.toLowerCase();
  return insightIndicators.some(indicator => lowerContent.includes(indicator)) &&
         content.length > 20; // Ensure it's substantial
}

async function saveToMemory(entry: {
  user_id: string;
  content: string;
  categories: string[];
  metadata: any;
}): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Simple embedding placeholder - in production use OpenAI embeddings
    const embedding = new Array(1536).fill(0);

    const { error } = await (await supabase)
      .from('memories')
      .insert([{
        user_id: entry.user_id,
        content: entry.content,
        embedding: embedding,
        categories: entry.categories,
        metadata: entry.metadata,
        language: entry.metadata.language || 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating memory entry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving to memory:', error);
    return false;
  }
} 