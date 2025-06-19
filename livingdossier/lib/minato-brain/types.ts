//livingdossier/lib/minato-brain/types.ts

/**
 * Types for the minato-brain
 */

import type { PlaybookTask } from './PlaybookGenerator';
import type { TaskResult } from './ExecutionEngine';
import type { SynthesisResult } from './SynthesisEngine';

/**
 * Request for analyzing a query
 */
export interface QueryAnalysisRequest {
  query: string;
  userId: string;
  language?: string;
  maxTokens?: number;
}

/**
 * Response from analyzing a query
 */
export interface QueryAnalysisResponse {
  dossierId: string;
  title: string;
  refinedQuery: string;
  analysis?: any;
}

/**
 * Request for generating a dossier
 */
export interface GenerateDossierRequest {
  dossierId: string;
  query: string;
  refinedQuery: string;
  userId: string;
  format?: 'streamlit' | 'nextjs' | 'pdf' | 'all';
  includeRawData?: boolean;
  maxTasks?: number;
}

/**
 * Response from generating a dossier
 */
export interface GenerateDossierResponse {
  dossierId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  spaUrl?: string;
  streamlitUrl?: string;
  error?: string;
}

export interface DossierStatus {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  spaUrl?: string;
  streamlitUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Context for executing a playbook
 */
export interface PlaybookExecutionContext {
  dossierId: string;
  userId: string;
  query: string;
  refinedQuery: string;
  playbook: PlaybookTask[];
  results: TaskResult[];
  currentTaskIndex: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  spaUrl?: string;
  streamlitUrl?: string;
  error?: string;
}

export type { PlaybookTask } from './PlaybookGenerator';
export type { TaskResult } from './ExecutionEngine';
export type { SynthesisResult } from './SynthesisEngine';

//The single source of truth for all data shapes