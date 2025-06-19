import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDossier } from '../../../../../services/database/living_dossier';
import { getDossierStatus } from '../../../../../lib/minato-brain';
import { config } from '../../../../../config/config';

// Initialize Supabase client for auth
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_KEY
);

/**
 * API endpoint to get the status of a specific dossier
 * @param req The request object
 * @param params The route parameters (dossierId)
 * @returns The response object containing the dossier status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { dossierId: string } }
) {
  try {
    // Get the dossier ID from the URL
    const { dossierId } = params;
    
    if (!dossierId || typeof dossierId !== 'string') {
      console.warn('Invalid dossier ID provided:', dossierId);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid dossier ID' 
      }, { status: 400 });
    }
    
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
    
    // Get the dossier from the database
    const dossier = await getDossier(dossierId);
    
    // Check if the dossier exists
    if (!dossier) {
      console.warn(`Dossier not found: ${dossierId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Dossier not found' 
      }, { status: 404 });
    }
    
    // Check if the dossier belongs to the user
    if (dossier.user_id !== user.id) {
      console.warn(`Unauthorized access attempt: User ${user.id} tried to access dossier ${dossierId} owned by ${dossier.user_id}`);
      return NextResponse.json({ 
        success: false, 
        error: 'You do not have permission to access this dossier' 
      }, { status: 403 });
    }
    
    // Get the dossier status from the minato-brain
    const status = await getDossierStatus(dossierId);
    
    // Return the status with proper metadata
    return NextResponse.json({
      success: true,
      id: dossierId,
      title: dossier.title,
      query: dossier.query,
      status: status.status,
      progress: dossier.progress || 0,
      nextjs_url: status.spaUrl,
      streamlit_url: status.streamlitUrl,
      error: status.error,
      created_at: dossier.created_at,
      updated_at: dossier.updated_at,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`Error getting dossier status for ${params.dossierId}:`, error);
    
    // Determine if this is a known error type
    if (error.name === 'DatabaseError') {
      return NextResponse.json({ 
        success: false, 
        error: 'Database error', 
        details: error.message 
      }, { status: 503 });
    }
    
    if (error.name === 'BrainError') {
      return NextResponse.json({ 
        success: false, 
        error: 'Processing error', 
        details: error.message 
      }, { status: 500 });
    }
    
    // Generic error response
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
} 