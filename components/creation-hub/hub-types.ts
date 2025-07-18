// Creation Hub Types - TypeScript definitions for image generation and multi-turn flows
import type { ChatMessage } from "@/lib/types";

// ===== Core Image Generation Types =====

export interface ImageGenerationRequest {
  prompt: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  compression?: number; // 0-100 for JPEG/WebP
  moderation?: 'auto' | 'low';
  user?: string;
  // Category-based generation
  categoryId?: string;
  formValues?: Record<string, any>;
}

export interface ImageGenerationResponse {
  id: string;
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
  metadata: {
    quality: string;
    size: string;
    format: string;
    background: string;
    compression?: number;
    model: string;
    generatedAt: Date;
  };
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  timestamp: Date;
  status: 'generating' | 'completed' | 'failed' | 'streaming';
  metadata?: {
    quality: string;
    size: string;
    format?: string;
    background?: string;
    compression?: number;
    model: string;
    duration?: number;
    error?: string;
    parameterReasoning?: string; // AI explanation for parameter choices
  };
  conversationId?: string;
  parentImageId?: string;
}

// ===== Multi-turn Conversation Types =====

export interface ImageConversation {
  id: string;
  title: string;
  images: GeneratedImage[];
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  status: 'active' | 'archived';
}

export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'image_generation';
  content: string;
  imageId?: string;
  timestamp: Date;
  metadata?: {
    prompt?: string;
    imageUrl?: string;
    error?: string;
  };
}

export interface MultiTurnRequest {
  conversationId?: string;
  prompt: string;
  previousImageId?: string;
  instructions?: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  compression?: number;
}

export interface MultiTurnResponse {
  conversationId: string;
  image: GeneratedImage;
  message: ConversationMessage;
  previousImages?: GeneratedImage[];
}

// ===== OpenAI Responses API Types =====

export interface ResponsesApiImageGeneration {
  type: 'image_generation';
  prompt: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  compression?: number;
  detail?: 'auto' | 'low' | 'high';
}

export interface ResponsesApiImageCall {
  type: 'image_generation_call';
  id: string;
  result: string; // Base64 encoded image
  metadata?: {
    prompt: string;
    revisedPrompt?: string;
    quality: string;
    size: string;
    format: string;
    background: string;
    compression?: number;
  };
}

export interface ResponsesApiStreamChunk {
  type: 'image_generation_delta';
  id: string;
  delta: {
    partial_image?: string; // Partial base64 data
    progress?: number; // 0-100
  };
}

// ===== Hub UI State Types =====

export interface HubUIState {
  activeTab: 'generate' | 'gallery' | 'history' | 'conversations';
  selectedImage: GeneratedImage | null;
  selectedConversation: ImageConversation | null;
  isGenerating: boolean;
  isStreaming: boolean;
  streamProgress?: number;
  currentPrompt: string;
  currentConversationId?: string;
  filters: {
    dateRange?: { start: Date; end: Date };
    quality?: string[];
    size?: string[];
    style?: string[];
    status?: string[];
  };
  sortBy: 'newest' | 'oldest' | 'prompt' | 'quality';
  viewMode: 'grid' | 'list' | 'masonry';
}

export interface HubSettings {
  defaultQuality: 'low' | 'medium' | 'high' | 'auto';
  defaultSize: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  defaultFormat: 'png' | 'jpeg' | 'webp';
  defaultBackground: 'transparent' | 'opaque' | 'auto';
  autoSave: boolean;
  streamingEnabled: boolean;
  showProgress: boolean;
  maxHistoryItems: number;
  compressionEnabled: boolean;
  watermarkEnabled: boolean;
}

// ===== Storage and Database Types =====

export interface ImageStorageMetadata {
  id: string;
  filename: string;
  originalUrl: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  bucket: string;
  path: string;
  uploadedAt: Date;
  userId: string;
}

export interface ImageDatabaseRecord {
  id: string;
  user_id: string;
  prompt: string;
  revised_prompt?: string;
  image_url: string;
  thumbnail_url?: string;
  quality: string;
  size: string;
  style: string;
  model: string;
  status: string;
  conversation_id?: string;
  parent_image_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationDatabaseRecord {
  id: string;
  user_id: string;
  title: string;
  status: string;
  image_count: number;
  last_activity: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ===== API Response Types =====

export interface HubApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    duration?: number;
  };
}

export interface GenerationApiRequest {
  prompt: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  compression?: number;
  moderation?: 'auto' | 'low';
  conversationId?: string;
  previousImageId?: string;
  instructions?: string;
  streaming?: boolean;
  categoryId?: string;
  formValues?: Record<string, any>;
}

export interface GenerationApiResponse extends HubApiResponse<GeneratedImage> {
  image: GeneratedImage;
  conversationId?: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
    imageTokens: number;
  };
}

// ===== Error Types =====

export interface HubError {
  code: 'GENERATION_FAILED' | 'INVALID_PROMPT' | 'QUOTA_EXCEEDED' | 'STORAGE_ERROR' | 'NETWORK_ERROR' | 'AUTH_ERROR';
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
}

export interface GenerationError extends HubError {
  prompt?: string;
  requestId?: string;
  modelUsed?: string;
}

// ===== Utility Types =====

export interface PromptSuggestion {
  id: string;
  text: string;
  category: 'artistic' | 'photographic' | 'abstract' | 'character' | 'landscape' | 'object' | 'concept';
  tags: string[];
  popularity: number;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptPrefix: string;
  promptSuffix: string;
  defaultQuality: 'low' | 'medium' | 'high' | 'auto';
  defaultSize: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  defaultFormat: 'png' | 'jpeg' | 'webp';
  defaultBackground: 'transparent' | 'opaque' | 'auto';
  preview?: string;
  category: string;
  tags: string[];
}

export interface GenerationStats {
  totalImages: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageGenerationTime: number;
  mostUsedQuality: string;
  mostUsedSize: string;
  mostUsedStyle: string;
  totalTokensUsed: number;
  storageUsed: number;
  lastGeneration?: Date;
}

// ===== Hook Types =====

export interface UseImageGenerationOptions {
  conversationId?: string;
  onSuccess?: (image: GeneratedImage) => void;
  onError?: (error: HubError) => void;
  onProgress?: (progress: number) => void;
  streaming?: boolean;
  onUpgradeRequired?: (error: {
    code: string;
    feature: string;
    currentUsage?: number;
    maxQuota?: number;
  }) => void;
}

export interface UseImageGenerationReturn {
  generate: (request: ImageGenerationRequest) => Promise<GeneratedImage>;
  isGenerating: boolean;
  progress: number;
  error: HubError | null;
  cancel: () => void;
}

export interface UseConversationOptions {
  conversationId?: string;
  autoSave?: boolean;
}

export interface UseConversationReturn {
  conversation: ImageConversation | null;
  images: GeneratedImage[];
  messages: ConversationMessage[];
  addImage: (image: GeneratedImage) => void;
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void;
  updateImage: (imageId: string, updates: Partial<GeneratedImage>) => void;
  deleteImage: (imageId: string) => void;
  saveConversation: () => Promise<void>;
  loading: boolean;
  error: HubError | null;
}

// ===== Category-based Generation Types =====

import type { 
  ImageCategory, 
  CategoryFormValues, 
  CategoryGenerationRequest,
  CategoryInfo,
  FormField,
  CategoryForm
} from './category-types';

export interface CategoryImageGenerationRequest extends ImageGenerationRequest {
  categoryId: ImageCategory;
  formValues: CategoryFormValues;
  referenceImages?: File[];
  visionDescription?: string;
  enhancedPrompt?: string;
}

export interface CategoryGeneratedImage extends GeneratedImage {
  categoryId: ImageCategory;
  formValues: CategoryFormValues;
  referenceImages?: string[]; // URLs to stored reference images
  visionAnalysis?: string;
  enhancedPrompt?: string;
}

export interface CategoryConversation extends ImageConversation {
  categoryId: ImageCategory;
  formContext: CategoryFormValues;
}

// Update HubUIState to include category selection
export interface CategoryHubUIState extends Omit<HubUIState, 'activeTab'> {
  activeTab: 'generate' | 'gallery' | 'history' | 'conversations';
  selectedCategory: ImageCategory | null;
  categoryFormValues: CategoryFormValues;
  showCategorySelector: boolean;
  formErrors: Record<string, string>;
}

// ===== Export all types =====
export type {
  // Re-export for convenience
  ChatMessage,
  // Category types
  ImageCategory,
  CategoryFormValues,
  CategoryGenerationRequest,
  CategoryInfo,
  FormField,
  CategoryForm
}; 