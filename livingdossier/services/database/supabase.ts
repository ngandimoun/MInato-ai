//livingdossier/services/database/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/config';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

/**
 * Get the current user from Supabase
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    return user;
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get a user by ID
 * @param userId The ID of the user to get
 * @returns The user or null if not found
 */
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
    
    return data;
  } catch (error: any) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}