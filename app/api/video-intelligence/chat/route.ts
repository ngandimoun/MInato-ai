import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateResponseWithIntent } from '@/lib/providers/llm_clients';
import { logger } from '@/memory-framework/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, stream_id, conversation_history } = await request.json();

    if (!message || !stream_id) {
      return NextResponse.json({ error: 'Message and stream_id are required' }, { status: 400 });
    }

    // Get video stream information
    const { data: streamData, error: streamError } = await supabase
      .from('video_intelligence_streams')
      .select('*')
      .eq('id', stream_id)
      .eq('user_id', user.id)
      .single();

    if (streamError || !streamData) {
      return NextResponse.json({ error: 'Video stream not found' }, { status: 404 });
    }

    // Get analysis results for this stream
    const { data: analysisResults, error: analysisError } = await supabase
      .from('video_intelligence_analysis')
      .select('*')
      .eq('stream_id', stream_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (analysisError) {
      logger.error('Error fetching analysis results:', analysisError);
      return NextResponse.json({ error: 'Failed to fetch analysis results' }, { status: 500 });
    }

    // Prepare context for the AI
    const videoContext = prepareVideoContext(streamData, analysisResults || []);
    
    // Generate AI response
    const aiResponse = await generateVideoIntelligenceResponse(
      message,
      videoContext,
      conversation_history || []
    );

    // Store the conversation in the database
    await storeConversation(supabase, user.id, stream_id, message, aiResponse);

    return NextResponse.json({
      response: aiResponse,
      stream_info: {
        name: streamData.name,
        scenario: streamData.scenario,
        status: streamData.status,
        created_at: streamData.created_at
      }
    });

  } catch (error) {
    logger.error('Video intelligence chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('stream_id');

    if (!streamId) {
      return NextResponse.json({ error: 'stream_id is required' }, { status: 400 });
    }

    // Get conversation history
    const { data: conversations, error } = await supabase
      .from('video_intelligence_conversations')
      .select('*')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching conversation history:', error);
      return NextResponse.json({ error: 'Failed to fetch conversation history' }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });

  } catch (error) {
    logger.error('Error fetching video intelligence conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function prepareVideoContext(streamData: any, analysisResults: any[]): string {
  const comprehensiveReport = analysisResults.find(r => r.analysis_type === 'comprehensive_report');
  const frameAnalyses = analysisResults.filter(r => r.analysis_type !== 'comprehensive_report' && r.analysis_type !== 'audio_analysis');
  const audioAnalysis = analysisResults.find(r => r.analysis_type === 'audio_analysis');

  let context = `Video Intelligence Analysis Context:

Video Information:
- Name: ${streamData.name}
- Scenario: ${streamData.scenario}
- Status: ${streamData.status}
- Upload Date: ${streamData.created_at}
- Type: ${streamData.type}
- Description: ${streamData.description || 'No description'}

`;

  if (comprehensiveReport) {
    const summary = comprehensiveReport.frame_metadata?.summary;
    if (summary) {
      context += `Comprehensive Analysis Summary:
- Overall Risk Level: ${comprehensiveReport.risk_level}
- Video Duration: ${summary.video_duration}s
- Frames Analyzed: ${summary.frame_count}
- High Risk Frames: ${summary.high_risk_frames}
- Medium Risk Frames: ${summary.medium_risk_frames}
- Total Objects Detected: ${summary.total_objects_detected}
- Total People Detected: ${summary.total_people_detected}
- Danger Zone Violations: ${summary.danger_zones_violated}
- Audio Analyzed: ${summary.audio_analyzed ? 'Yes' : 'No'}
- Audio Sentiment: ${summary.audio_sentiment}
- Audio Transcript: ${summary.audio_transcript}

Overall Assessment: ${comprehensiveReport.threat_analysis}

Recommended Actions:
${comprehensiveReport.recommended_actions?.map((action: string) => `- ${action}`).join('\n') || 'No specific actions recommended'}

`;
    }
  }

  if (frameAnalyses.length > 0) {
    context += `Frame Analysis Results (${frameAnalyses.length} frames):
`;
    frameAnalyses.slice(0, 5).forEach((frame, index) => {
      context += `
Frame ${index + 1}:
- Risk Level: ${frame.risk_level}
- Confidence: ${Math.round(frame.confidence_score * 100)}%
- Scene: ${frame.scene_description}
- Threat Analysis: ${frame.threat_analysis}
- Objects Detected: ${frame.detected_objects?.length || 0}
- People Detected: ${frame.detected_people?.length || 0}
`;
    });

    if (frameAnalyses.length > 5) {
      context += `\n... and ${frameAnalyses.length - 5} more frames analyzed\n`;
    }
  }

  if (audioAnalysis) {
    context += `
Audio Analysis:
- Transcript: ${audioAnalysis.scene_description}
- Analysis: ${audioAnalysis.threat_analysis}
- Metadata: ${JSON.stringify(audioAnalysis.frame_metadata, null, 2)}
`;
  }

  return context;
}

async function generateVideoIntelligenceResponse(
  userMessage: string,
  videoContext: string,
  conversationHistory: any[]
): Promise<string> {
  const systemPrompt = `You are Minato AI, an expert video intelligence analyst. You help users understand their video analysis results and provide insights about security, safety, and surveillance footage.

You have access to comprehensive video analysis data including:
- Frame-by-frame visual analysis
- Audio transcript and sentiment analysis
- Object and people detection results
- Risk assessments and threat analysis
- Danger zone violations
- Recommended actions

Guidelines:
1. Be conversational and helpful
2. Provide specific insights based on the analysis data
3. Explain technical findings in user-friendly terms
4. Highlight important security or safety concerns
5. Suggest actionable next steps when appropriate
6. Reference specific frames, timestamps, or detected objects when relevant
7. If asked about something not in the analysis, explain what was actually detected

Video Analysis Context:
${videoContext}

Previous Conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Respond as Minato AI, focusing on the video intelligence analysis results.`;

  try {
    const response = await generateResponseWithIntent(
      systemPrompt,
      userMessage,
      conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    );

    if ('error' in response) {
      throw new Error(response.error);
    }

    return response.responseText;
  } catch (error) {
    logger.error('Error generating video intelligence response:', error);
    return "I apologize, but I'm having trouble analyzing your video right now. Please try again in a moment.";
  }
}

async function storeConversation(
  supabase: any,
  userId: string,
  streamId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    // Store user message
    await supabase
      .from('video_intelligence_conversations')
      .insert({
        user_id: userId,
        stream_id: streamId,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      });

    // Store AI response
    await supabase
      .from('video_intelligence_conversations')
      .insert({
        user_id: userId,
        stream_id: streamId,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    logger.error('Error storing video intelligence conversation:', error);
  }
} 