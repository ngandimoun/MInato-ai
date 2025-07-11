import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { LeadRedditTool } from '@/lib/tools/leads/LeadRedditTool';
import { LeadHackerNewsTool } from '@/lib/tools/leads/LeadHackerNewsTool';
import { LeadYouTubeTool } from '@/lib/tools/leads/LeadYouTubeTool';
import { LeadTikTokTool } from '@/lib/tools/leads/LeadTikTokTool';
import { LeadNewsTool } from '@/lib/tools/leads/LeadNewsTool';

interface LeadSearchRequest {
  search_prompt: string;
  platforms: string[];
  industry_focus?: string;
  target_audience?: string;
  urgency_filter?: "low" | "medium" | "high" | "urgent";
  limit?: number;
  search_config?: {
    subreddit_strategy?: "auto" | "specific";
    specific_subreddits?: string[];
    company_stage?: "startup" | "scaleup" | "enterprise" | "any";
    focus_areas?: string[];
  };
}

interface LeadSearchResponse {
  success: boolean;
  data?: {
    search_id: string;
    total_leads: number;
    leads_by_platform: Record<string, any[]>;
    summary: {
      average_lead_score: number;
      urgency_distribution: Record<string, number>;
      top_pain_points: string[];
      platform_performance: Record<string, {
        leads_found: number;
        average_score: number;
        success_rate: number;
      }>;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LeadSearchResponse>> {
  const logPrefix = "[AI-Leads-Search]";
  
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
    const body: LeadSearchRequest = await request.json();
    const {
      search_prompt,
      platforms,
      industry_focus,
      target_audience,
      urgency_filter,
      limit = 10,
      search_config = {}
    } = body;

    // Validate request
    if (!search_prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "Search prompt is required" },
        { status: 400 }
      );
    }

    if (!platforms?.length) {
      return NextResponse.json(
        { success: false, error: "At least one platform must be selected" },
        { status: 400 }
      );
    }

    logger.info(`${logPrefix} Starting lead search`, {
      userId: user.id,
      search_prompt,
      platforms,
      industry_focus,
      target_audience,
      urgency_filter,
      limit
    });

    // Create search record in database
    const { data: searchRecord, error: searchError } = await supabase
      .from('ai_lead_searches')
      .insert({
        user_id: user.id,
        title: `Lead Search: ${search_prompt.substring(0, 100)}`,
        description: search_prompt,
        platforms,
        search_prompt,
        industry_focus,
        target_audience,
        message_tone: 'professional',
        search_config,
        status: 'running'
      })
      .select()
      .single();

    if (searchError) {
      logger.error(`${logPrefix} Failed to create search record`, { error: searchError });
      return NextResponse.json(
        { success: false, error: "Failed to create search record" },
        { status: 500 }
      );
    }

    const searchId = searchRecord.id;
    const allLeads: any[] = [];
    const leadsByPlatform: Record<string, any[]> = {};
    const platformPerformance: Record<string, any> = {};

    // Execute searches on each platform
    for (const platform of platforms) {
      try {
        logger.info(`${logPrefix} Searching ${platform}`, { searchId, platform });
        
        let platformLeads: any[] = [];
        let platformResult: any = null;

        switch (platform) {
          case 'reddit':
            const redditTool = new LeadRedditTool();
            platformResult = await redditTool.execute({
              search_prompt,
              industry_focus,
              target_audience,
              urgency_filter,
              limit: Math.ceil(limit / platforms.length),
              subreddit_strategy: search_config.subreddit_strategy,
              specific_subreddits: search_config.specific_subreddits
            });
            
            if (platformResult.success && platformResult.data?.leads) {
              platformLeads = platformResult.data.leads;
            }
            break;

          case 'hackernews':
            const hnTool = new LeadHackerNewsTool();
            platformResult = await hnTool.execute({
              search_prompt,
              target_audience,
              company_stage: search_config.company_stage,
              urgency_filter,
              limit: Math.ceil(limit / platforms.length),
              focus_areas: search_config.focus_areas
            });
            
            if (platformResult.success && platformResult.data?.leads) {
              platformLeads = platformResult.data.leads;
            }
            break;

          case 'youtube':
            const youtubeTool = new LeadYouTubeTool();
            platformResult = await youtubeTool.execute({
              search_prompt,
              industry_focus,
              target_audience,
              limit: Math.ceil(limit / platforms.length)
            });
            
            if (platformResult.structuredData?.leads) {
              platformLeads = platformResult.structuredData.leads.map((lead: any) => ({
                source_url: lead.video_url,
                title: lead.title,
                content: lead.description,
                author: lead.channel_title,
                engagement_metrics: {
                  score: lead.engagement_potential,
                  comments: 0,
                  upvote_ratio: lead.engagement_potential / 100
                },
                lead_analysis: {
                  lead_score: lead.lead_score,
                  urgency_level: lead.urgency_level,
                  tags: lead.pain_points,
                  platform_insights: {
                    pain_points: lead.pain_points,
                    decision_maker_indicators: lead.decision_maker_indicators,
                    engagement_potential: lead.engagement_potential
                  }
                }
              }));
            }
            break;

          case 'tiktok':
            const tiktokTool = new LeadTikTokTool();
            platformResult = await tiktokTool.execute({
              search_prompt,
              industry_focus,
              target_audience,
              limit: Math.ceil(limit / platforms.length)
            });
            
            if (platformResult.structuredData?.leads) {
              platformLeads = platformResult.structuredData.leads.map((lead: any) => ({
                source_url: lead.url,
                title: lead.title,
                content: lead.description,
                author: lead.creator,
                engagement_metrics: {
                  score: lead.engagement_potential,
                  comments: 0,
                  upvote_ratio: lead.engagement_potential / 100
                },
                lead_analysis: {
                  lead_score: lead.lead_score,
                  urgency_level: lead.urgency_level,
                  tags: lead.pain_points,
                  platform_insights: {
                    pain_points: lead.pain_points,
                    decision_maker_indicators: lead.decision_maker_indicators,
                    engagement_potential: lead.engagement_potential
                  }
                }
              }));
            }
            break;

          case 'news':
            const newsTool = new LeadNewsTool();
            platformResult = await newsTool.execute({
              search_prompt,
              industry_focus,
              target_audience,
              category: industry_focus === 'technology' ? 'technology' : 'business',
              limit: Math.ceil(limit / platforms.length)
            });
            
            if (platformResult.structuredData?.leads) {
              platformLeads = platformResult.structuredData.leads.map((lead: any) => ({
                source_url: lead.url,
                title: lead.title,
                content: lead.description,
                author: lead.source_name,
                engagement_metrics: {
                  score: lead.engagement_potential,
                  comments: 0,
                  upvote_ratio: lead.engagement_potential / 100
                },
                lead_analysis: {
                  lead_score: lead.lead_score,
                  urgency_level: lead.urgency_level,
                  tags: lead.pain_points,
                  platform_insights: {
                    pain_points: lead.pain_points,
                    decision_maker_indicators: lead.decision_maker_indicators,
                    engagement_potential: lead.engagement_potential
                  }
                }
              }));
            }
            break;

          default:
            logger.warn(`${logPrefix} Unsupported platform: ${platform}`);
            continue;
        }

        // Store platform results
        leadsByPlatform[platform] = platformLeads;
        allLeads.push(...platformLeads);

        // Calculate platform performance
        platformPerformance[platform] = {
          leads_found: platformLeads.length,
          average_score: platformLeads.length > 0 
            ? Math.round(platformLeads.reduce((sum, lead) => sum + lead.lead_analysis.lead_score, 0) / platformLeads.length)
            : 0,
          success_rate: platformResult?.success ? 100 : 0
        };

        // Store leads in database
        if (platformLeads.length > 0) {
          const leadRecords = platformLeads.map(lead => ({
            search_id: searchId,
            user_id: user.id,
            platform,
            source_url: lead.source_url,
            title: lead.title,
            content: lead.content,
            author_info: { name: lead.author },
            engagement_metrics: lead.engagement_metrics,
            lead_score: lead.lead_analysis.lead_score,
            urgency_level: lead.lead_analysis.urgency_level,
            tags: lead.lead_analysis.tags,
            platform_insights: lead.lead_analysis.platform_insights
          }));

          const { error: insertError } = await supabase
            .from('ai_lead_results')
            .insert(leadRecords);

          if (insertError) {
            logger.error(`${logPrefix} Failed to insert ${platform} leads`, { error: insertError });
          }
        }

        logger.info(`${logPrefix} ${platform} search completed`, {
          searchId,
          platform,
          leads_found: platformLeads.length,
          average_score: platformPerformance[platform].average_score
        });

      } catch (error) {
        logger.error(`${logPrefix} Error searching ${platform}`, { error, searchId, platform });
        platformPerformance[platform] = {
          leads_found: 0,
          average_score: 0,
          success_rate: 0
        };
      }
    }

    // Calculate overall summary
    const summary = {
      average_lead_score: allLeads.length > 0 
        ? Math.round(allLeads.reduce((sum, lead) => sum + lead.lead_analysis.lead_score, 0) / allLeads.length)
        : 0,
      urgency_distribution: calculateUrgencyDistribution(allLeads),
      top_pain_points: extractTopPainPoints(allLeads),
      platform_performance: platformPerformance
    };

    // Update search record
    await supabase
      .from('ai_lead_searches')
      .update({
        status: 'completed',
        results_count: allLeads.length,
        last_search_at: new Date().toISOString()
      })
      .eq('id', searchId);

    logger.info(`${logPrefix} Lead search completed`, {
      searchId,
      total_leads: allLeads.length,
      platforms: Object.keys(leadsByPlatform),
      summary
    });

    return NextResponse.json({
      success: true,
      data: {
        search_id: searchId,
        total_leads: allLeads.length,
        leads_by_platform: leadsByPlatform,
        summary
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

function calculateUrgencyDistribution(leads: any[]): Record<string, number> {
  const distribution: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  leads.forEach(lead => {
    if (lead.lead_analysis?.urgency_level) {
      distribution[lead.lead_analysis.urgency_level]++;
    }
  });
  return distribution;
}

function extractTopPainPoints(leads: any[]): string[] {
  const painPoints: Record<string, number> = {};
  leads.forEach(lead => {
    if (lead.lead_analysis?.pain_points) {
      lead.lead_analysis.pain_points.forEach((point: string) => {
        painPoints[point] = (painPoints[point] || 0) + 1;
      });
    }
  });
  
  return Object.entries(painPoints)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([point]) => point);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logPrefix = "[AI-Leads-Search-GET]";
  
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

    // Get search history
    const { data: searches, error: searchError } = await supabase
      .from('ai_lead_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (searchError) {
      logger.error(`${logPrefix} Failed to fetch search history`, { error: searchError });
      return NextResponse.json(
        { success: false, error: "Failed to fetch search history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { searches }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Unexpected error`, { error: error.message });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 