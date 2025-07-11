import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { generateStructuredJson } from '@/lib/providers/llm_clients';

interface MessageGenerationRequest {
  lead_result_id: string;
  message_type: "initial_outreach" | "follow_up" | "custom";
  tone?: "professional" | "casual" | "friendly" | "technical";
  custom_context?: string;
  our_solution?: string;
  call_to_action?: string;
}

interface MessageGenerationResponse {
  success: boolean;
  data?: {
    message_id: string;
    message_content: string;
    personalization_data: Record<string, any>;
    suggestions: string[];
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<MessageGenerationResponse>> {
  const logPrefix = "[AI-Leads-Message-Gen]";
  
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn(`${logPrefix} Unauthorized access attempt`);
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: MessageGenerationRequest = await request.json();
    const {
      lead_result_id,
      message_type,
      tone = "professional",
      custom_context,
      our_solution,
      call_to_action
    } = body;

    // Validate request
    if (!lead_result_id) {
      return NextResponse.json(
        { success: false, error: "Lead result ID is required" },
        { status: 400 }
      );
    }

    logger.info(`${logPrefix} Generating message`, {
      userId: user.id,
      lead_result_id,
      message_type,
      tone
    });

    // Get lead result data
    const { data: leadResult, error: leadError } = await supabase
      .from('ai_lead_results')
      .select('*')
      .eq('id', lead_result_id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !leadResult) {
      logger.error(`${logPrefix} Lead result not found`, { error: leadError, lead_result_id });
      return NextResponse.json(
        { success: false, error: "Lead result not found" },
        { status: 404 }
      );
    }

    // Generate personalized message
    const messageContent = await generatePersonalizedMessage(
      leadResult,
      message_type,
      tone,
      custom_context,
      our_solution,
      call_to_action
    );

    // Create personalization data
    const personalizationData = {
      lead_context: leadResult.title,
      platform: leadResult.platform,
      author_name: leadResult.author_info?.name || 'User',
      post_title: leadResult.title,
      pain_points: leadResult.platform_insights?.pain_points || [],
      urgency_level: leadResult.urgency_level,
      lead_score: leadResult.lead_score,
      tone,
      message_type,
      generation_timestamp: new Date().toISOString()
    };

    // Store message in database
    const { data: messageRecord, error: messageError } = await supabase
      .from('ai_lead_messages')
      .insert({
        lead_result_id,
        user_id: user.id,
        message_type,
        message_content: messageContent,
        personalization_data: personalizationData,
        tone,
        platform_optimized: true
      })
      .select()
      .single();

    if (messageError) {
      logger.error(`${logPrefix} Failed to save message`, { error: messageError });
      return NextResponse.json(
        { success: false, error: "Failed to save message" },
        { status: 500 }
      );
    }

    // Generate message suggestions
    const suggestions = await generateMessageSuggestions(leadResult, tone);

    logger.info(`${logPrefix} Message generated successfully`, {
      userId: user.id,
      message_id: messageRecord.id,
      lead_result_id,
      message_length: messageContent.length
    });

    return NextResponse.json({
      success: true,
      data: {
        message_id: messageRecord.id,
        message_content: messageContent,
        personalization_data: personalizationData,
        suggestions
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Unexpected error`, { error: error.message, stack: error.stack });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generatePersonalizedMessage(
  leadResult: any,
  messageType: string,
  tone: string,
  customContext?: string,
  ourSolution?: string,
  callToAction?: string
): Promise<string> {
  const platform = leadResult.platform;
  const platformSpecificGuidelines = getPlatformGuidelines(platform);
  
  const messagePrompt = `
You are an expert at writing personalized outreach messages for ${platform}. Generate a ${tone} ${messageType} message for this lead.

LEAD INFORMATION:
Platform: ${platform}
Title: ${leadResult.title}
Content: ${leadResult.content}
Author: ${leadResult.author_info?.name || 'User'}
Lead Score: ${leadResult.lead_score}/100
Urgency: ${leadResult.urgency_level}
Pain Points: ${JSON.stringify(leadResult.platform_insights?.pain_points || [])}
Tags: ${JSON.stringify(leadResult.tags || [])}

CONTEXT:
${customContext || 'Standard outreach message'}

OUR SOLUTION:
${ourSolution || 'We provide solutions that help with the challenges mentioned in their post'}

CALL TO ACTION:
${callToAction || 'Would you like to discuss how we can help with this?'}

PLATFORM GUIDELINES (${platform}):
${platformSpecificGuidelines}

MESSAGE REQUIREMENTS:
1. Reference their specific post/content naturally
2. Show genuine understanding of their problem
3. Offer immediate value or insight
4. Be ${tone} and authentic
5. Include the call-to-action naturally
6. Stay under 200 words for ${platform}
7. Match ${platform} community norms

TONE GUIDELINES:
- Professional: Formal, business-focused, expertise-driven
- Casual: Conversational, friendly, approachable
- Friendly: Warm, supportive, encouraging
- Technical: Detail-oriented, solution-focused, technical depth

Generate ONLY the message content, no additional text or formatting.
`;

  try {
    const result = await generateStructuredJson(
      messagePrompt,
      `${leadResult.title}\n\n${leadResult.content}`,
      { type: "string" },
      "PersonalizedMessage",
      [],
      "gpt-4o-mini"
    );

    if (typeof result === 'string') {
      return result;
    } else if (result && typeof result === 'object' && 'error' in result) {
      logger.error("[Message Generation] AI generation returned error", { error: result.error });
      return generateFallbackMessage(leadResult, messageType, tone);
    } else {
      return generateFallbackMessage(leadResult, messageType, tone);
    }
  } catch (error) {
    logger.error("[Message Generation] AI generation failed", { error });
    return generateFallbackMessage(leadResult, messageType, tone);
  }
}

function getPlatformGuidelines(platform: string): string {
  const guidelines = {
    reddit: `
- Be conversational and community-appropriate
- Don't be overly promotional
- Reference the subreddit context if relevant
- Use "I saw your post about..." to start naturally
- Offer helpful insights before mentioning solutions
- Ask questions to encourage dialogue
`,
    hackernews: `
- Be technically accurate and professional
- Focus on technical solutions and insights
- Respect the community's anti-spam norms
- Demonstrate technical expertise
- Be concise and to the point
- Avoid direct sales language
`,
    websearch: `
- Adapt to the source platform's style
- Be professional and helpful
- Focus on the specific context mentioned
- Provide immediate value
- Be respectful of the original content
`,
    default: `
- Be authentic and helpful
- Focus on providing value
- Respect platform norms
- Be concise and clear
- Encourage dialogue
`
  };

  return guidelines[platform as keyof typeof guidelines] || guidelines.default;
}

function generateFallbackMessage(leadResult: any, messageType: string, tone: string): string {
  const templates = {
    professional: `Hi ${leadResult.author_info?.name || 'there'},

I came across your post about ${leadResult.title} and found it really interesting. The challenges you mentioned around ${leadResult.platform_insights?.pain_points?.[0] || 'this topic'} are quite common in the industry.

I've worked with similar situations before and would be happy to share some insights that might be helpful. Would you be open to a brief discussion about potential solutions?

Best regards`,
    casual: `Hey ${leadResult.author_info?.name || 'there'}!

Saw your post about ${leadResult.title} - really resonated with me. I've dealt with similar ${leadResult.platform_insights?.pain_points?.[0] || 'challenges'} before and might have some ideas that could help.

Would love to chat about it if you're interested. Let me know!

Cheers`,
    friendly: `Hi ${leadResult.author_info?.name || 'there'}!

I hope you're doing well! I came across your post about ${leadResult.title} and wanted to reach out because I've helped others with similar challenges.

The ${leadResult.platform_insights?.pain_points?.[0] || 'situation'} you described is definitely something we can work through together. I'd be happy to share some strategies that have worked well for others.

Would you be interested in connecting to discuss this further?

Best wishes`,
    technical: `Hello ${leadResult.author_info?.name || 'there'},

I reviewed your post regarding ${leadResult.title} and the technical challenges you outlined. Based on the ${leadResult.platform_insights?.pain_points?.[0] || 'requirements'} you mentioned, I believe there are some technical approaches that could address your needs effectively.

I'd be happy to discuss the technical implementation details and share some solutions that have proven successful in similar scenarios.

Would you be available for a technical discussion on this topic?

Best regards`
  };

  return templates[tone as keyof typeof templates] || templates.professional;
}

async function generateMessageSuggestions(leadResult: any, tone: string): Promise<string[]> {
  const suggestions = [
    "Consider mentioning a specific benefit or outcome",
    "Add a relevant case study or example",
    "Include a question to encourage response",
    "Personalize with details from their post",
    "Offer a specific next step or resource"
  ];

  // Add platform-specific suggestions
  if (leadResult.platform === 'reddit') {
    suggestions.push("Reference the subreddit community");
    suggestions.push("Offer to continue the discussion in comments");
  } else if (leadResult.platform === 'hackernews') {
    suggestions.push("Include technical details or insights");
    suggestions.push("Reference industry trends or best practices");
  }

  return suggestions;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logPrefix = "[AI-Leads-Messages-GET]";
  
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const leadResultId = searchParams.get('lead_result_id');

    let query = supabase
      .from('ai_lead_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (leadResultId) {
      query = query.eq('lead_result_id', leadResultId);
    }

    const { data: messages, error: messagesError } = await query.limit(50);

    if (messagesError) {
      logger.error(`${logPrefix} Failed to fetch messages`, { error: messagesError });
      return NextResponse.json(
        { success: false, error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { messages }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Unexpected error`, { error: error.message });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 