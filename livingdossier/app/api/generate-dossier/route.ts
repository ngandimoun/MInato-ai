//livingdossier/app/api/generate-dossier/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { analyzeAndRefineQuery, generateDossier } from '../../../lib/minato-brain';
import { createDossier } from '../../../services/database/living_dossier';
import { config } from '../../../config/config';

// Initialize Supabase client for auth
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_KEY
);

/**
 * API endpoint to generate a living dossier
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
    const { query } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }
    
    // Generate a unique ID for the dossier
    const dossierId = uuidv4();
    
    // Create the initial dossier record
    await createDossier({
      id: dossierId,
      user_id: user.id,
      query,
      status: 'pending',
      progress: 0
    });
    
    // Analyze and refine the query
    const { refinedQuery } = await analyzeAndRefineQuery({
      query,
      userId: user.id
    });
    
    // Generate the dossier asynchronously
    // Note: This doesn't block the response
    generateDossier({
      dossierId,
      query,
      refinedQuery,
      userId: user.id,
      format: 'all',
      includeRawData: true
    }).catch(error => {
      console.error('Error generating dossier:', error);
    });
    
    // Return the dossier ID immediately
    return NextResponse.json({
      success: true,
      dossierId,
      message: 'Dossier generation started',
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Error processing dossier generation request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * API endpoint to get the status of a dossier
 * @param req The request object
 * @returns The response object
 */
export async function GET(request: NextRequest) {
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
    
    // Get the dossier ID from the query parameters
    const url = new URL(request.url);
    const dossierId = url.searchParams.get('dossierId');
    
    if (!dossierId) {
      return NextResponse.json({ error: 'Missing dossierId' }, { status: 400 });
    }
    
    // Import the getDossierStatus function
    const { getDossierStatus } = await import('../../../lib/minato-brain');
    
    // Get the status of the dossier
    const status = await getDossierStatus(dossierId);
    
    // Return the status
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('Error getting dossier status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}