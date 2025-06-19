//livingdossier/app/api/refine-query/route.ts

//The "Front Door" for new queries

//refine the query of users before send to generate the living dossier 

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeAndRefineQuery } from '../../../lib/minato-brain';
import { config } from '../../../config/config';

// Initialize Supabase client for auth
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_KEY
);

/**
 * API endpoint to refine a user query
 * @param req The request object
 * @returns The response object
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { query, language } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }
    
    // Analyze and refine the query
    const result = await analyzeAndRefineQuery({
      query,
      userId: user.id,
      language,
      maxTokens: 300
    });
    
    // Return the refined query and analysis
    return NextResponse.json({
      success: true,
      originalQuery: query,
      refinedQuery: result.refinedQuery,
      analysis: result.analysis
    });
  } catch (error: any) {
    console.error('Error refining query:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 