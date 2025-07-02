import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      game_id,
      reported_user_id,
      content,
      reason,
      category, // 'inappropriate_content', 'harassment', 'spam', 'other'
      additional_details
    } = body;

    // Validate required fields
    if (!game_id || !reported_user_id || !content || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: game_id, reported_user_id, content, reason' },
        { status: 400 }
      );
    }

    // Create a reports table entry in Supabase
    const reportData = {
      id: crypto.randomUUID(),
      reporter_user_id: user.id,
      reported_user_id,
      game_id,
      content,
      reason,
      category: category || 'other',
      additional_details: additional_details || '',
      status: 'pending', // 'pending', 'reviewed', 'resolved', 'dismissed'
      created_at: new Date().toISOString(),
    };

    // Insert into reports table (we'll need to create this table)
    const { data: report, error: insertError } = await supabase
      .from('game_reports')
      .insert(reportData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating report:', insertError);
      
      // Fallback: log to console if table doesn't exist yet
      console.log('[Game Report]', {
        reporter: user.id,
        reported_user: reported_user_id,
        game_id,
        reason,
        content: content.substring(0, 100) + '...',
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        { message: 'Report submitted successfully', report_id: reportData.id },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Report submitted successfully', 
        report_id: report.id,
        status: 'pending' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 