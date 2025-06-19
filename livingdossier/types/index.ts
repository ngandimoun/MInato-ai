import { Insight } from '../services/insights/InsightsEngine';

/**
 * Main data structure for a Living Dossier
 */
export interface DossierData {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: UserInfo;
  collaborators?: UserInfo[];
  status: DossierStatus;
  content: DossierContent;
  insights?: Insight[];
  metadata: DossierMetadata;
  version: number;
  tags?: string[];
}

/**
 * Status of a dossier
 */
export type DossierStatus = 
  | 'draft'
  | 'published'
  | 'archived'
  | 'generating'
  | 'error';

/**
 * Information about a user
 */
export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

/**
 * Content of a dossier
 */
export interface DossierContent {
  sections: DossierSection[];
  datasets: Dataset[];
  visualizations: Visualization[];
}

/**
 * A section in a dossier
 */
export interface DossierSection {
  id: string;
  title: string;
  type: 'text' | 'visualization' | 'data' | 'insights' | 'mixed';
  content: any;
  order: number;
}

/**
 * A dataset in a dossier
 */
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  data: any;
  schema?: DatasetSchema;
  source?: DataSource;
  lastUpdated: string;
}

/**
 * Schema for a dataset
 */
export interface DatasetSchema {
  fields: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    description?: string;
    format?: string;
  }[];
}

/**
 * Source of a dataset
 */
export interface DataSource {
  type: 'api' | 'file' | 'database' | 'manual' | 'generated';
  url?: string;
  query?: string;
  refreshInterval?: number; // in seconds
}

/**
 * A visualization in a dossier
 */
export interface Visualization {
  id: string;
  title: string;
  description?: string;
  type: string;
  config: any;
  datasetIds: string[];
  width?: number;
  height?: number;
  interactive: boolean;
}

/**
 * Metadata for a dossier
 */
export interface DossierMetadata {
  domain?: string;
  purpose?: string;
  audience?: string;
  shareSettings?: ShareSettings;
  exportFormats?: string[];
  generationInfo?: {
    prompt?: string;
    model?: string;
    duration?: number;
  };
  customFields?: Record<string, any>;
}

/**
 * Share settings for a dossier
 */
export interface ShareSettings {
  visibility: 'private' | 'shared' | 'public';
  allowComments: boolean;
  allowEdits: boolean;
  password?: string;
  expiresAt?: string;
  sharedWith?: UserInfo[];
}

/**
 * Comment on a dossier
 */
export interface DossierComment {
  id: string;
  dossierId: string;
  user: UserInfo;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  sectionId?: string;
  resolved?: boolean;
  reactions?: {
    type: string;
    count: number;
    users: string[];
  }[];
}

/**
 * A version of a dossier
 */
export interface DossierVersion {
  id: string;
  dossierId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: UserInfo;
  changeDescription?: string;
  snapshot: DossierData;
}

/**
 * A collaboration session
 */
export interface CollaborationSession {
  id: string;
  dossierId: string;
  startedAt: string;
  activeUsers: UserInfo[];
  cursors: {
    userId: string;
    position: {
      sectionId: string;
      offset?: number;
    };
    lastUpdated: string;
  }[];
}

/**
 * A user action in a dossier
 */
export interface UserAction {
  id: string;
  dossierId: string;
  user: UserInfo;
  actionType: 'view' | 'edit' | 'comment' | 'share' | 'export';
  timestamp: string;
  details?: any;
}

/**
 * Options for generating a dossier
 */
export interface DossierGenerationOptions {
  query: string;
  domain?: string;
  purpose?: string;
  audience?: string;
  format?: 'standard' | 'executive' | 'detailed' | 'visual';
  includeInsights?: boolean;
  maxLength?: number;
  preferredVisualizations?: string[];
  dataSources?: DataSource[];
}

/**
 * Response from a dossier generation request
 */
export interface DossierGenerationResponse {
  dossierId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number; // in seconds
  progress?: number; // 0-100
  error?: string;
}

/**
 * Options for exporting a dossier
 */
export interface DossierExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'json' | 'pptx';
  includeVisualizations: boolean;
  includeDatasets: boolean;
  includeInsights: boolean;
  theme?: string;
  customCss?: string;
}

/**
 * Progress of a dossier generation
 */
export interface DossierGenerationProgress {
  dossierId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number; // in seconds
  startedAt: string;
  updatedAt: string;
}

/**
 * Notification related to a dossier
 */
export interface DossierNotification {
  id: string;
  dossierId: string;
  type: 'mention' | 'comment' | 'share' | 'update' | 'completion';
  message: string;
  createdAt: string;
  read: boolean;
  user?: UserInfo;
  actionUrl?: string;
} 