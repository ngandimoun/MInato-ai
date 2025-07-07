// Hub Orchestrator - Manages Creation Hub state and operations
import { 
  GeneratedImage, 
  ImageConversation, 
  ImageGenerationRequest,
  ImageGenerationResponse,
  MultiTurnRequest,
  MultiTurnResponse,
  HubUIState,
  HubSettings,
  HubError,
  ConversationMessage,
  GenerationStats,
  ImageStorageMetadata
} from './hub-types';
import { logger } from '@/memory-framework/config';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export class HubOrchestrator {
  private static instance: HubOrchestrator;
  private state: HubUIState;
  private settings: HubSettings;
  private conversations: Map<string, ImageConversation> = new Map();
  private images: Map<string, GeneratedImage> = new Map();
  private subscribers: Set<(state: HubUIState) => void> = new Set();

  private constructor() {
    logger.info('[Hub Orchestrator] Initializing Creation Hub...');
    
    // Initialize default state
    this.state = {
      activeTab: 'generate',
      selectedImage: null,
      selectedConversation: null,
      isGenerating: false,
      isStreaming: false,
      currentPrompt: '',
      filters: {},
      sortBy: 'newest',
      viewMode: 'grid'
    };

    // Initialize default settings
    this.settings = {
      defaultQuality: 'auto',
      defaultSize: 'auto',
      defaultFormat: 'png',
      defaultBackground: 'auto',
      autoSave: true,
      streamingEnabled: true,
      showProgress: true,
      maxHistoryItems: 100,
      compressionEnabled: false,
      watermarkEnabled: false
    };

    this.loadSettings();
    logger.info('[Hub Orchestrator] Initialized successfully');
  }

  public static getInstance(): HubOrchestrator {
    if (!HubOrchestrator.instance) {
      HubOrchestrator.instance = new HubOrchestrator();
    }
    return HubOrchestrator.instance;
  }

  // ===== State Management =====

  public getState(): HubUIState {
    return { ...this.state };
  }

  public setState(updates: Partial<HubUIState>): void {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }

  public subscribe(callback: (state: HubUIState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.getState()));
  }

  // ===== Settings Management =====

  public getSettings(): HubSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<HubSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    logger.info('[Hub Orchestrator] Settings updated', updates);
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('creation-hub-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
        logger.info('[Hub Orchestrator] Settings loaded from storage');
      }
    } catch (error) {
      logger.warn('[Hub Orchestrator] Failed to load settings', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('creation-hub-settings', JSON.stringify(this.settings));
    } catch (error) {
      logger.warn('[Hub Orchestrator] Failed to save settings', error);
    }
  }

  // ===== Image Generation =====

  public async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const requestId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('[Hub Orchestrator] Starting image generation with GPT Image 1', { requestId, prompt: request.prompt });

    // Create initial image record
    const newImage: GeneratedImage = {
      id: requestId,
      url: '',
      prompt: request.prompt,
      timestamp: new Date(),
      status: 'generating',
      metadata: {
        quality: request.quality || 'auto',
        size: request.size || 'auto',
        format: request.format || 'png',
        background: request.background || 'auto',
        compression: request.compression,
        model: 'gpt-image-1'
      }
    };

    // Update state
    this.images.set(requestId, newImage);
    this.setState({ isGenerating: true });

    try {
      const startTime = Date.now();

      // Call the API endpoint with GPT Image 1 parameters
      const response = await fetch('/api/creation-hub/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          quality: request.quality || 'auto',
          size: request.size || 'auto',
          format: request.format || 'png',
          background: request.background || 'auto',
          compression: request.compression,
          streaming: this.settings.streamingEnabled,
          user: request.user,
          categoryId: request.categoryId,
          formValues: request.formValues
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Generation failed');
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Update image with successful result
      const completedImage: GeneratedImage = {
        ...newImage,
        url: data.data.imageUrl,
        revisedPrompt: data.data.revisedPrompt,
        status: 'completed',
        metadata: {
          ...newImage.metadata!,
          duration,
          model: 'gpt-image-1'
        }
      };

      this.images.set(requestId, completedImage);

      // Auto-save if enabled
      if (this.settings.autoSave) {
        await this.saveImageToDatabase(completedImage);
      }

      logger.info('[Hub Orchestrator] Image generated successfully with GPT Image 1', { 
        requestId, 
        duration,
        imageUrl: data.data.imageUrl 
      });

      return completedImage;

    } catch (error) {
      logger.error('[Hub Orchestrator] Image generation failed', error);

      // Update image with error status
      const failedImage: GeneratedImage = {
        ...newImage,
        status: 'failed',
        metadata: {
          ...newImage.metadata!,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      this.images.set(requestId, failedImage);

      throw this.createHubError('GENERATION_FAILED', error instanceof Error ? error.message : 'Unknown error', true);
    } finally {
      this.setState({ isGenerating: false });
    }
  }

  // ===== Multi-turn Conversations =====

  public async startConversation(initialPrompt: string): Promise<ImageConversation> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversation: ImageConversation = {
      id: conversationId,
      title: this.generateConversationTitle(initialPrompt),
      images: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'current-user', // TODO: Get from auth context
      status: 'active'
    };

    this.conversations.set(conversationId, conversation);
    this.setState({ selectedConversation: conversation, currentConversationId: conversationId });

    logger.info('[Hub Orchestrator] Started new conversation', { conversationId, title: conversation.title });

    return conversation;
  }

  public async continueConversation(request: MultiTurnRequest): Promise<MultiTurnResponse> {
    const conversationId = request.conversationId;
    if (!conversationId) {
      throw this.createHubError('INVALID_PROMPT', 'Conversation ID required for multi-turn generation', false);
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw this.createHubError('INVALID_PROMPT', 'Conversation not found', false);
    }

    logger.info('[Hub Orchestrator] Continuing conversation', { conversationId, prompt: request.prompt });

    // Generate the image with conversation context
    const imageRequest: ImageGenerationRequest = {
      prompt: request.prompt,
      quality: request.quality,
      size: request.size as '1024x1024' | '256x256' | '512x512' | '1792x1024' | '1024x1792' | undefined,
      style: request.style
    };

    const newImage = await this.generateImage(imageRequest);
    newImage.conversationId = conversationId;
    newImage.parentImageId = request.previousImageId;

    // Add message to conversation
    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: request.prompt,
      imageId: newImage.id,
      timestamp: new Date(),
      metadata: {
        prompt: request.prompt,
        imageUrl: newImage.url
      }
    };

    // Update conversation
    conversation.images.push(newImage);
    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    this.conversations.set(conversationId, conversation);

    return {
      conversationId,
      image: newImage,
      message,
      previousImages: conversation.images.slice(0, -1)
    };
  }

  public getConversation(conversationId: string): ImageConversation | null {
    return this.conversations.get(conversationId) || null;
  }

  public getAllConversations(): ImageConversation[] {
    return Array.from(this.conversations.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  // ===== Image Management =====

  public getImage(imageId: string): GeneratedImage | null {
    return this.images.get(imageId) || null;
  }

  public getAllImages(): GeneratedImage[] {
    return Array.from(this.images.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  public getImagesByConversation(conversationId: string): GeneratedImage[] {
    return this.getAllImages().filter(img => img.conversationId === conversationId);
  }

  public deleteImage(imageId: string): void {
    const image = this.images.get(imageId);
    if (image) {
      this.images.delete(imageId);
      
      // Remove from conversation if applicable
      if (image.conversationId) {
        const conversation = this.conversations.get(image.conversationId);
        if (conversation) {
          conversation.images = conversation.images.filter(img => img.id !== imageId);
          conversation.messages = conversation.messages.filter(msg => msg.imageId !== imageId);
          conversation.updatedAt = new Date();
        }
      }

      logger.info('[Hub Orchestrator] Image deleted', { imageId });
    }
  }

  // ===== Storage Operations =====

  private async saveImageToDatabase(image: GeneratedImage): Promise<void> {
    try {
      const supabase = getBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('generated_images')
        .insert({
          id: image.id,
          prompt: image.prompt,
          revised_prompt: image.revisedPrompt,
          image_url: image.url,
          quality: image.metadata?.quality,
          size: image.metadata?.size,
          style: image.metadata?.style,
          model: image.metadata?.model,
          status: image.status,
          conversation_id: image.conversationId,
          parent_image_id: image.parentImageId,
          metadata: image.metadata,
          created_at: image.timestamp.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      logger.info('[Hub Orchestrator] Image saved to database', { imageId: image.id });
    } catch (error) {
      logger.error('[Hub Orchestrator] Failed to save image to database', error);
      throw this.createHubError('STORAGE_ERROR', 'Failed to save image', true);
    }
  }

  public async uploadImageToStorage(image: GeneratedImage): Promise<ImageStorageMetadata> {
    try {
      const supabase = getBrowserSupabaseClient();
      
      // Convert base64 or URL to blob
      const response = await fetch(image.url);
      const blob = await response.blob();
      
      const filename = `${image.id}.png`;
      const path = `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      const { data, error } = await supabase.storage
        .from('creation-hub')
        .upload(path, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('creation-hub')
        .getPublicUrl(path);

      const metadata: ImageStorageMetadata = {
        id: image.id,
        filename,
        originalUrl: publicUrl,
        size: blob.size,
        mimeType: blob.type,
        bucket: 'creation-hub',
        path,
        uploadedAt: new Date(),
        userId: 'current-user' // TODO: Get from auth context
      };

      logger.info('[Hub Orchestrator] Image uploaded to storage', { imageId: image.id, path });

      return metadata;
    } catch (error) {
      logger.error('[Hub Orchestrator] Failed to upload image to storage', error);
      throw this.createHubError('STORAGE_ERROR', 'Failed to upload image', true);
    }
  }

  // ===== Statistics =====

  public getGenerationStats(): GenerationStats {
    const images = this.getAllImages();
    const successful = images.filter(img => img.status === 'completed');
    const failed = images.filter(img => img.status === 'failed');

    const durations = successful
      .map(img => img.metadata?.duration)
      .filter(d => d !== undefined) as number[];

    const qualityCounts = this.countBy(successful, img => img.metadata?.quality || 'unknown');
    const sizeCounts = this.countBy(successful, img => img.metadata?.size || 'unknown');
    const styleCounts = this.countBy(successful, img => img.metadata?.style || 'unknown');

    return {
      totalImages: images.length,
      successfulGenerations: successful.length,
      failedGenerations: failed.length,
      averageGenerationTime: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0,
      mostUsedQuality: this.getMostFrequent(qualityCounts),
      mostUsedSize: this.getMostFrequent(sizeCounts),
      mostUsedStyle: this.getMostFrequent(styleCounts),
      totalTokensUsed: 0, // TODO: Track token usage
      storageUsed: 0, // TODO: Calculate storage usage
      lastGeneration: images.length > 0 ? images[0].timestamp : undefined
    };
  }

  // ===== Utility Methods =====

  private generateConversationTitle(initialPrompt: string): string {
    const words = initialPrompt.split(' ').slice(0, 4);
    return words.join(' ') + (words.length < initialPrompt.split(' ').length ? '...' : '');
  }

  private createHubError(code: HubError['code'], message: string, retryable: boolean): HubError {
    return {
      code,
      message,
      retryable,
      timestamp: new Date()
    };
  }

  private countBy<T>(array: T[], keyFn: (item: T) => string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getMostFrequent(counts: Record<string, number>): string {
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)?.[0] || 'unknown';
  }

  // ===== Cleanup =====

  public destroy(): void {
    this.subscribers.clear();
    this.conversations.clear();
    this.images.clear();
    logger.info('[Hub Orchestrator] Destroyed');
  }
}

// Export singleton instance
export const hubOrchestrator = HubOrchestrator.getInstance(); 