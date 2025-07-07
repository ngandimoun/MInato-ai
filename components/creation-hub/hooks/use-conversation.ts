import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/memory-framework/config';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import type {
  ImageConversation,
  GeneratedImage,
  ConversationMessage,
  HubError,
  UseConversationOptions,
  UseConversationReturn
} from '../hub-types';

export function useConversation(options: UseConversationOptions = {}): UseConversationReturn {
  const [conversation, setConversation] = useState<ImageConversation | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HubError | null>(null);

  const { conversationId, autoSave = true } = options;

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // Clear state when no conversation ID
      setConversation(null);
      setImages([]);
      setMessages([]);
      setError(null);
    }
  }, [conversationId]);

  const loadConversation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      logger.info('[useConversation] Loading conversation', { conversationId: id });

      const supabase = getBrowserSupabaseClient();

      // Load conversation data
      const { data: conversationData, error: conversationError } = await supabase
        .from('image_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (conversationError) {
        throw new Error(`Failed to load conversation: ${conversationError.message}`);
      }

      // Load images for this conversation
      const { data: imagesData, error: imagesError } = await supabase
        .from('generated_images')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (imagesError) {
        logger.warn('[useConversation] Failed to load images', { error: imagesError });
      }

      // Load messages for this conversation
      const { data: messagesData, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        logger.warn('[useConversation] Failed to load messages', { error: messagesError });
      }

      // Transform data to match our types
      const loadedConversation: ImageConversation = {
        id: conversationData.id,
        title: conversationData.title,
        images: imagesData?.map(transformImageRecord) || [],
        messages: messagesData?.map(transformMessageRecord) || [],
        createdAt: new Date(conversationData.created_at),
        updatedAt: new Date(conversationData.updated_at),
        userId: conversationData.user_id,
        status: conversationData.status
      };

      setConversation(loadedConversation);
      setImages(loadedConversation.images);
      setMessages(loadedConversation.messages);

      logger.info('[useConversation] Conversation loaded successfully', { 
        conversationId: id,
        imageCount: loadedConversation.images.length,
        messageCount: loadedConversation.messages.length
      });

    } catch (err) {
      const hubError = createConversationError(err, 'STORAGE_ERROR');
      setError(hubError);
      
      logger.error('[useConversation] Failed to load conversation', { 
        conversationId: id, 
        error: hubError.message 
      });

      toast({
        title: "Failed to Load Conversation",
        description: hubError.message,
        variant: "destructive",
      });

    } finally {
      setLoading(false);
    }
  }, []);

  const addImage = useCallback((image: GeneratedImage) => {
    setImages(prev => {
      const updated = [...prev, image];
      
      // Update conversation state
      if (conversation) {
        const updatedConversation = {
          ...conversation,
          images: updated,
          updatedAt: new Date()
        };
        setConversation(updatedConversation);
      }
      
      return updated;
    });

    logger.info('[useConversation] Image added to conversation', { 
      conversationId: conversation?.id,
      imageId: image.id 
    });
  }, [conversation]);

  const addMessage = useCallback((messageData: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const newMessage: ConversationMessage = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      
      // Update conversation state
      if (conversation) {
        const updatedConversation = {
          ...conversation,
          messages: updated,
          updatedAt: new Date()
        };
        setConversation(updatedConversation);
      }
      
      return updated;
    });

    logger.info('[useConversation] Message added to conversation', { 
      conversationId: conversation?.id,
      messageId: newMessage.id,
      type: messageData.type
    });

    // Auto-save if enabled
    if (autoSave && conversation) {
      saveMessage(newMessage);
    }
  }, [conversation, autoSave]);

  const updateImage = useCallback((imageId: string, updates: Partial<GeneratedImage>) => {
    setImages(prev => {
      const updated = prev.map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      );
      
      // Update conversation state
      if (conversation) {
        const updatedConversation = {
          ...conversation,
          images: updated,
          updatedAt: new Date()
        };
        setConversation(updatedConversation);
      }
      
      return updated;
    });

    logger.info('[useConversation] Image updated in conversation', { 
      conversationId: conversation?.id,
      imageId,
      updates: Object.keys(updates)
    });
  }, [conversation]);

  const deleteImage = useCallback((imageId: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      
      // Update conversation state
      if (conversation) {
        const updatedConversation = {
          ...conversation,
          images: updated,
          updatedAt: new Date()
        };
        setConversation(updatedConversation);
      }
      
      return updated;
    });

    // Also remove related messages
    setMessages(prev => prev.filter(msg => msg.imageId !== imageId));

    logger.info('[useConversation] Image deleted from conversation', { 
      conversationId: conversation?.id,
      imageId
    });

    // Auto-save if enabled
    if (autoSave && conversation) {
      deleteImageFromDatabase(imageId);
    }
  }, [conversation, autoSave]);

  const saveConversation = useCallback(async (): Promise<void> => {
    if (!conversation) {
      throw new Error('No conversation to save');
    }

    setLoading(true);
    setError(null);

    try {
      logger.info('[useConversation] Saving conversation', { 
        conversationId: conversation.id 
      });

      // Update conversation metadata
      const supabase = getBrowserSupabaseClient();
      const { error: conversationError } = await supabase
        .from('image_conversations')
        .upsert({
          id: conversation.id,
          user_id: conversation.userId,
          title: conversation.title,
          status: conversation.status,
          image_count: images.length,
          last_activity: new Date().toISOString(),
          metadata: {},
          updated_at: new Date().toISOString()
        });

      if (conversationError) {
        throw new Error(`Failed to save conversation: ${conversationError.message}`);
      }

      logger.info('[useConversation] Conversation saved successfully', { 
        conversationId: conversation.id
      });

      toast({
        title: "Conversation Saved",
        description: "Your conversation has been saved successfully.",
      });

    } catch (err) {
      const hubError = createConversationError(err, 'STORAGE_ERROR');
      setError(hubError);
      
      logger.error('[useConversation] Failed to save conversation', { 
        conversationId: conversation.id, 
        error: hubError.message 
      });

      toast({
        title: "Failed to Save Conversation",
        description: hubError.message,
        variant: "destructive",
      });

      throw hubError;

    } finally {
      setLoading(false);
    }
  }, [conversation, images]);

  // Helper function to save a message to the database
  const saveMessage = useCallback(async (message: ConversationMessage) => {
    if (!conversation) return;

    try {
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          id: message.id,
          conversation_id: conversation.id,
          user_id: conversation.userId,
          type: message.type,
          content: message.content,
          image_id: message.imageId || null,
          metadata: message.metadata || {},
          created_at: message.timestamp.toISOString()
        });

      if (error) {
        logger.warn('[useConversation] Failed to save message', { 
          messageId: message.id, 
          error 
        });
      }
    } catch (err) {
      logger.warn('[useConversation] Error saving message', { 
        messageId: message.id, 
        error: err 
      });
    }
  }, [conversation]);

  // Helper function to delete an image from the database
  const deleteImageFromDatabase = useCallback(async (imageId: string) => {
    try {
      const supabase = getBrowserSupabaseClient();
      
      // Delete from generated_images table
      const { error: imageError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId);

      if (imageError) {
        logger.warn('[useConversation] Failed to delete image from database', { 
          imageId, 
          error: imageError 
        });
      }

      // Delete related messages
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .delete()
        .eq('image_id', imageId);

      if (messageError) {
        logger.warn('[useConversation] Failed to delete related messages', { 
          imageId, 
          error: messageError 
        });
      }
    } catch (err) {
      logger.warn('[useConversation] Error deleting image from database', { 
        imageId, 
        error: err 
      });
    }
  }, []);

  return {
    conversation,
    images,
    messages,
    addImage,
    addMessage,
    updateImage,
    deleteImage,
    saveConversation,
    loading,
    error
  };
}

// Helper function to transform database image record to our type
function transformImageRecord(record: any): GeneratedImage {
  return {
    id: record.id,
    url: record.image_url,
    prompt: record.prompt,
    revisedPrompt: record.revised_prompt,
    timestamp: new Date(record.created_at),
    status: record.status,
    metadata: {
      quality: record.quality,
      size: record.size,
      style: record.style,
      model: record.model,
      ...(record.metadata || {})
    },
    conversationId: record.conversation_id,
    parentImageId: record.parent_image_id
  };
}

// Helper function to transform database message record to our type
function transformMessageRecord(record: any): ConversationMessage {
  return {
    id: record.id,
    type: record.type,
    content: record.content,
    imageId: record.image_id,
    timestamp: new Date(record.created_at),
    metadata: record.metadata || {}
  };
}

// Helper function to create standardized HubError for conversation operations
function createConversationError(err: unknown, defaultCode: HubError['code']): HubError {
  if (err instanceof Error) {
    return {
      code: defaultCode,
      message: err.message,
      retryable: true,
      timestamp: new Date()
    };
  }

  return {
    code: defaultCode,
    message: 'An unknown error occurred',
    retryable: true,
    timestamp: new Date()
  };
} 