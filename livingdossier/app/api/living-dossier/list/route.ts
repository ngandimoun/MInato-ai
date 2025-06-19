import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserDossiers } from '../../../../services/database/living_dossier';
import { config } from '../../../../config/config';

// Initialize Supabase client for auth
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_KEY
);

/**
 * API endpoint to list all dossiers for the authenticated user
 * @param req The request object
 * @returns The response object containing the user's dossiers
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Unauthorized access attempt: Missing or invalid authorization header');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Missing or invalid authorization header' 
      }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Authentication error:', authError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.warn('Unauthorized access attempt: User not found');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: User not found' 
      }, { status: 401 });
    }
    
    // Get the user's dossiers
    const dossiers = await getUserDossiers(user.id);
    
    // Return the dossiers with proper metadata
    return NextResponse.json({
      success: true,
      count: dossiers.length,
      dossiers,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error listing dossiers:', error);
    
    // Determine if this is a known error type
    if (error.name === 'DatabaseError') {
      return NextResponse.json({ 
        success: false, 
        error: 'Database error', 
        details: error.message 
      }, { status: 503 });
    }
    
    // Generic error response
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
} 