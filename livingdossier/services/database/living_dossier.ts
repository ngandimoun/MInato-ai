//livingdossier/services/database/living_dossier.ts
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/config';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || config.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || config.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface LivingDossier {
  id: string;
  user_id: string;
  title?: string;
  query: string;
  refined_query?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  playbook?: any[];
  results?: any[];
  streamlit_url?: string;
  nextjs_url?: string;
  pdf_url?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
  collaborators?: string[];
  annotations?: any[];
  version?: number;
  last_updated_by?: string;
}

export interface DossierCreationParams {
  title: string;
  user_id: string;
  query: string;
  refined_query?: string;
}

/**
 * Create a new living dossier
 * @param dossier The dossier to create
 * @returns The created dossier
 */
export async function createDossier(dossier: Omit<LivingDossier, 'created_at' | 'updated_at'>): Promise<LivingDossier> {
  const { data, error } = await supabase
    .from('living_dossiers')
    .insert(dossier)
    .select()
    .single();

  if (error) {
    console.error('Error creating dossier:', error);
    throw new Error(`Failed to create dossier: ${error.message}`);
  }

  return data;
}

/**
 * Get a living dossier by ID
 * @param id The ID of the dossier
 * @returns The dossier
 */
export async function getDossier(id: string): Promise<LivingDossier | null> {
  const { data, error } = await supabase
    .from('living_dossiers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // PGRST116 is the error code for "no rows returned"
      return null;
    }
    console.error('Error getting dossier:', error);
    throw new Error(`Failed to get dossier: ${error.message}`);
  }

  return data;
}

/**
 * Update a living dossier
 * @param id The ID of the dossier
 * @param dossier The dossier updates
 * @returns The updated dossier
 */
export async function updateDossier(
  id: string,
  dossier: Partial<Omit<LivingDossier, 'id' | 'created_at' | 'updated_at'>>
): Promise<LivingDossier> {
  // Increment the version number
  const currentDossier = await getDossier(id);
  const version = currentDossier?.version ? currentDossier.version + 1 : 1;
  
  const { data, error } = await supabase
    .from('living_dossiers')
    .update({ ...dossier, version })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating dossier:', error);
    throw new Error(`Failed to update dossier: ${error.message}`);
  }

  return data;
}

/**
 * Delete a living dossier
 * @param id The ID of the dossier
 * @returns True if the dossier was deleted
 */
export async function deleteDossier(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('living_dossiers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting dossier:', error);
    throw new Error(`Failed to delete dossier: ${error.message}`);
  }

  return true;
}

/**
 * Get all living dossiers for a user
 * @param userId The ID of the user
 * @returns The dossiers
 */
export async function getUserDossiers(userId: string): Promise<LivingDossier[]> {
  const { data, error } = await supabase
    .from('living_dossiers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting user dossiers:', error);
    throw new Error(`Failed to get user dossiers: ${error.message}`);
  }

  return data || [];
}

/**
 * Add a collaborator to a dossier
 * @param dossierId The ID of the dossier
 * @param userId The ID of the user to add as a collaborator
 * @returns The updated dossier
 */
export async function addCollaborator(dossierId: string, userId: string): Promise<LivingDossier> {
  // Get the current dossier
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    throw new Error('Dossier not found');
  }
  
  // Add the collaborator if they're not already in the list
  const collaborators = dossier.collaborators || [];
  if (!collaborators.includes(userId)) {
    collaborators.push(userId);
  }
  
  // Update the dossier
  return await updateDossier(dossierId, { 
    collaborators,
    last_updated_by: userId
  });
}

/**
 * Remove a collaborator from a dossier
 * @param dossierId The ID of the dossier
 * @param userId The ID of the user to remove as a collaborator
 * @returns The updated dossier
 */
export async function removeCollaborator(dossierId: string, userId: string): Promise<LivingDossier> {
  // Get the current dossier
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    throw new Error('Dossier not found');
  }
  
  // Remove the collaborator if they're in the list
  const collaborators = dossier.collaborators || [];
  const updatedCollaborators = collaborators.filter(id => id !== userId);
  
  // Update the dossier
  return await updateDossier(dossierId, { 
    collaborators: updatedCollaborators,
    last_updated_by: userId
  });
}

/**
 * Add an annotation to a dossier
 * @param dossierId The ID of the dossier
 * @param annotation The annotation to add
 * @param userId The ID of the user adding the annotation
 * @returns The updated dossier
 */
export async function addAnnotation(
  dossierId: string,
  annotation: {
    text: string;
    position: { x: number; y: number } | { elementId: string };
    type: 'text' | 'highlight' | 'comment';
  },
  userId: string
): Promise<LivingDossier> {
  // Get the current dossier
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    throw new Error('Dossier not found');
  }
  
  // Add the annotation
  const annotations = dossier.annotations || [];
  annotations.push({
    ...annotation,
    id: `annotation_${Date.now()}`,
    userId,
    createdAt: new Date().toISOString()
  });
  
  // Update the dossier
  return await updateDossier(dossierId, { 
    annotations,
    last_updated_by: userId
  });
}

/**
 * Remove an annotation from a dossier
 * @param dossierId The ID of the dossier
 * @param annotationId The ID of the annotation to remove
 * @param userId The ID of the user removing the annotation
 * @returns The updated dossier
 */
export async function removeAnnotation(
  dossierId: string,
  annotationId: string,
  userId: string
): Promise<LivingDossier> {
  // Get the current dossier
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    throw new Error('Dossier not found');
  }
  
  // Remove the annotation
  const annotations = dossier.annotations || [];
  const updatedAnnotations = annotations.filter(a => a.id !== annotationId);
  
  // Update the dossier
  return await updateDossier(dossierId, { 
    annotations: updatedAnnotations,
    last_updated_by: userId
  });
}

// Map of active realtime channels
const activeChannels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to realtime updates for a dossier
 * @param dossierId The ID of the dossier
 * @param callback The callback to call when the dossier is updated
 * @returns A function to unsubscribe
 */
export function subscribeToDossierUpdates(
  dossierId: string,
  callback: (dossier: LivingDossier) => void
): () => void {
  // Check if we already have a channel for this dossier
  if (activeChannels.has(dossierId)) {
    const channel = activeChannels.get(dossierId)!;
    
    // Add the callback to the channel
    channel.on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'living_dossiers',
      filter: `id=eq.${dossierId}`
    }, payload => {
      callback(payload.new as LivingDossier);
    });
    
    return () => {
      // Remove the callback from the channel
      channel.unsubscribe();
      activeChannels.delete(dossierId);
    };
  }
  
  // Create a new channel
  const channel = supabase.channel(`dossier_${dossierId}`);
  
  // Subscribe to changes
  channel
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'living_dossiers',
      filter: `id=eq.${dossierId}`
    }, payload => {
      callback(payload.new as LivingDossier);
    })
    .subscribe();
  
  // Store the channel
  activeChannels.set(dossierId, channel);
  
  // Return a function to unsubscribe
  return () => {
    channel.unsubscribe();
    activeChannels.delete(dossierId);
  };
}