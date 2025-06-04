import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { appConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  const logPrefix = "[API AIEnhanceDescription]";
  const cookieStore = cookies();

  try {
    // Authentication check
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError) {
      logger.error(`${logPrefix} Auth error:`, userError.message);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    if (!user?.id) {
      logger.warn(`${logPrefix} No authenticated user found.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Description enhancement request from user: ${userId.substring(0, 8)}...`);

    const body = await req.json();
    const { productName, currentDescription, price, currency } = body;

    if (!productName?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    // Get OpenAI API key from config
    const openaiApiKey = appConfig.openai?.apiKey;
    if (!openaiApiKey) {
      logger.error(`${logPrefix} OpenAI API key not configured`);
      return NextResponse.json({ error: "AI service not available" }, { status: 500 });
    }

    // Create the enhancement prompt
    const enhancementPrompt = `You are a skilled product marketing copywriter specializing in creating compelling product descriptions that drive sales. Your task is to enhance the given product description to make it more appealing, persuasive, and sales-oriented.

Product Details:
- Name: ${productName}
- Current Description: ${currentDescription || 'No description provided'}
- Price: ${price ? `${price} ${currency?.toUpperCase() || 'USD'}` : 'Not specified'}

Guidelines for enhancement:
1. Create a compelling, benefit-focused description
2. Use persuasive language that highlights value and benefits
3. Include emotional triggers and urgency where appropriate
4. Keep it concise but impactful (2-4 sentences ideal)
5. Focus on what the customer gains, not just features
6. Use active voice and strong action words
7. If no current description exists, create one from scratch based on the product name

Enhanced Description:`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: appConfig.openai?.chatModel || 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: 'You are an expert marketing copywriter who creates compelling product descriptions that convert browsers into buyers. Always respond with just the enhanced description, no additional text or formatting.'
          },
          {
            role: 'user',
            content: enhancementPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error(`${logPrefix} OpenAI API error:`, errorData);
      throw new Error('AI service temporarily unavailable');
    }

    const aiResponse = await response.json();
    const enhancedDescription = aiResponse.choices[0]?.message?.content?.trim();

    if (!enhancedDescription) {
      throw new Error('Failed to generate enhanced description');
    }

    logger.info(`${logPrefix} Description enhanced successfully for user ${userId.substring(0, 8)}`);

    return NextResponse.json({
      success: true,
      enhancedDescription,
      originalDescription: currentDescription
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error enhancing description:`, error);
    return NextResponse.json({ 
      error: error.message || "Failed to enhance description" 
    }, { status: 500 });
  }
} 