import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDossier, updateDossier, deleteDossier } from '../../../../services/database/living_dossier';
import { config } from '../../../../config/config';

// Initialize Supabase client for auth
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_KEY
);

/**
 * API endpoint to get detailed information about a specific dossier
 * @param req The request object
 * @param params The route parameters (dossierId)
 * @returns The response object containing the dossier details
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
    
    // Return the dossier with proper metadata
    return NextResponse.json({
      success: true,
      dossier: {
        ...dossier,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error(`Error getting dossier ${params.dossierId}:`, error);
    
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

/**
 * API endpoint to update a specific dossier
 * @param req The request object
 * @param params The route parameters (dossierId)
 * @returns The response object containing the updated dossier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { dossierId: string } }
) {
  try {
    // Get the dossier ID from the URL
    const { dossierId } = params;
    
    if (!dossierId || typeof dossierId !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid dossier ID' 
      }, { status: 400 });
    }
    
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Missing or invalid authorization header' 
      }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed' 
      }, { status: 401 });
    }
    
    // Get the dossier from the database
    const existingDossier = await getDossier(dossierId);
    
    // Check if the dossier exists
    if (!existingDossier) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dossier not found' 
      }, { status: 404 });
    }
    
    // Check if the dossier belongs to the user
    if (existingDossier.user_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'You do not have permission to update this dossier' 
      }, { status: 403 });
    }
    
    // Get the update data from the request body
    const updateData = await request.json();
    
    // Update the dossier
    const updatedDossier = await updateDossier(dossierId, updateData);
    
    // Return the updated dossier
    return NextResponse.json({
      success: true,
      dossier: updatedDossier
    });
  } catch (error: any) {
    console.error(`Error updating dossier ${params.dossierId}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * API endpoint to delete a specific dossier
 * @param req The request object
 * @param params The route parameters (dossierId)
 * @returns The response object indicating success or failure
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { dossierId: string } }
) {
  try {
    // Get the dossier ID from the URL
    const { dossierId } = params;
    
    if (!dossierId || typeof dossierId !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid dossier ID' 
      }, { status: 400 });
    }
    
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Missing or invalid authorization header' 
      }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed' 
      }, { status: 401 });
    }
    
    // Get the dossier from the database
    const existingDossier = await getDossier(dossierId);
    
    // Check if the dossier exists
    if (!existingDossier) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dossier not found' 
      }, { status: 404 });
    }
    
    // Check if the dossier belongs to the user
    if (existingDossier.user_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'You do not have permission to delete this dossier' 
      }, { status: 403 });
    }
    
    // Delete the dossier
    const success = await deleteDossier(dossierId);
    
    if (!success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete dossier' 
      }, { status: 500 });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Dossier deleted successfully'
    });
  } catch (error: any) {
    console.error(`Error deleting dossier ${params.dossierId}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
} 