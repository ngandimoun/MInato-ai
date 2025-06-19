//livingdossier/services/database/knowledgeBase.ts

import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeItem {
  id: string;
  dossier_id: string;
  title: string;
  content: string;
  source: string;
  source_type: 'web' | 'api' | 'llm' | 'user' | 'tool';
  metadata?: any;
  created_at: string;
}

export interface KnowledgeItemCreationParams {
  dossier_id: string;
  title: string;
  content: string;
  source: string;
  source_type: 'web' | 'api' | 'llm' | 'user' | 'tool';
  metadata?: any;
}

/**
 * Add a knowledge item to the knowledge base
 * @param params The parameters for creating a new knowledge item
 * @returns The created knowledge item
 */
export async function addKnowledgeItem(params: KnowledgeItemCreationParams): Promise<KnowledgeItem> {
  try {
    const newItem: Omit<KnowledgeItem, 'id' | 'created_at'> = {
      dossier_id: params.dossier_id,
      title: params.title,
      content: params.content,
      source: params.source,
      source_type: params.source_type,
      metadata: params.metadata || {},
    };

    const { data, error } = await supabase
      .from('knowledge_items')
      .insert(newItem)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add knowledge item: ${error.message}`);
    }

    return data as KnowledgeItem;
  } catch (error: any) {
    console.error('Error adding knowledge item:', error);
    throw new Error(`Failed to add knowledge item: ${error.message}`);
  }
}

/**
 * Get all knowledge items for a dossier
 * @param dossierId The ID of the dossier
 * @returns The knowledge items
 */
export async function getDossierKnowledgeItems(dossierId: string): Promise<KnowledgeItem[]> {
  try {
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get knowledge items: ${error.message}`);
    }

    return data as KnowledgeItem[];
  } catch (error: any) {
    console.error('Error getting knowledge items:', error);
    throw new Error(`Failed to get knowledge items: ${error.message}`);
  }
}

/**
 * Delete a knowledge item
 * @param id The ID of the knowledge item to delete
 * @returns Success status
 */
export async function deleteKnowledgeItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('knowledge_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete knowledge item: ${error.message}`);
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting knowledge item:', error);
    throw new Error(`Failed to delete knowledge item: ${error.message}`);
  }
}

/**
 * Search knowledge items by content
 * @param query The search query
 * @param dossierId Optional dossier ID to limit the search
 * @returns The matching knowledge items
 */
export async function searchKnowledgeItems(query: string, dossierId?: string): Promise<KnowledgeItem[]> {
  try {
    let queryBuilder = supabase
      .from('knowledge_items')
      .select('*')
      .textSearch('content', query);
    
    if (dossierId) {
      queryBuilder = queryBuilder.eq('dossier_id', dossierId);
    }
    
    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search knowledge items: ${error.message}`);
    }

    return data as KnowledgeItem[];
  } catch (error: any) {
    console.error('Error searching knowledge items:', error);
    throw new Error(`Failed to search knowledge items: ${error.message}`);
  }
}

//All RAG-related functions (The "Librarian")