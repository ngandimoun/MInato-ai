// FILE: lib/services/evasion-orchestrator.ts

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";

export interface EvasionRoom {
  id: string;
  name: string;
  description?: string;
  host_user_id: string;
  current_video_url?: string;
  current_video_position: number;
  is_playing: boolean;
  max_participants: number;
  is_private: boolean;
  room_code: string;
  created_at: string;
  updated_at: string;
}

export interface EvasionParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  last_seen: string;
  is_active: boolean;
}

export interface EvasionChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'system' | 'video_action' | 'ai_response';
  created_at: string;
}

export interface EvasionVideoTranscript {
  id: string;
  room_id: string;
  video_url: string;
  video_id: string;
  transcript_json?: any;
  transcript_text?: string;
  analysis_cache?: any;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface VideoSyncEvent {
  room_id: string;
  action: 'play' | 'pause' | 'seek' | 'load';
  timestamp: number;
  position?: number;
  video_url?: string;
  user_id: string;
}

export class EvasionOrchestrator {
  private supabase: any;
  private isServerSide: boolean;

  constructor(isServerSide: boolean = false) {
    this.isServerSide = isServerSide;
    if (isServerSide) {
      // Server-side usage
      this.supabase = null; // Will be set when needed
    } else {
      // Client-side usage
      this.supabase = getBrowserSupabaseClient();
    }
  }

  private async getSupabaseClient() {
    if (this.isServerSide) {
      return await createServerSupabaseClient();
    }
    return this.supabase;
  }

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  async createRoom(params: {
    name: string;
    description?: string;
    is_private: boolean;
    max_participants: number;
    host_user_id: string;
  }): Promise<{ success: boolean; room?: EvasionRoom; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: room, error } = await supabase
        .from("evasion_rooms")
        .insert({
          name: params.name.trim(),
          description: params.description?.trim() || null,
          host_user_id: params.host_user_id,
          is_private: params.is_private,
          max_participants: params.max_participants,
          current_video_position: 0,
          is_playing: false
        })
        .select()
        .single();

      if (error) {
        logger.error("[EvasionOrchestrator] Error creating room:", error);
        return { success: false, error: "Failed to create room" };
      }

      // Add host as participant
      await this.addParticipant(room.id, params.host_user_id);

      logger.info(`[EvasionOrchestrator] Room created: ${room.id} by ${params.host_user_id}`);
      return { success: true, room };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in createRoom:", error);
      return { success: false, error: "Internal error" };
    }
  }

  async getRoomById(roomId: string): Promise<{ success: boolean; room?: EvasionRoom; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: room, error } = await supabase
        .from("evasion_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) {
        logger.error("[EvasionOrchestrator] Error fetching room:", error);
        return { success: false, error: "Room not found" };
      }

      return { success: true, room };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in getRoomById:", error);
      return { success: false, error: "Internal error" };
    }
  }

  async updateRoom(roomId: string, updates: Partial<EvasionRoom>): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from("evasion_rooms")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", roomId);

      if (error) {
        logger.error("[EvasionOrchestrator] Error updating room:", error);
        return { success: false, error: "Failed to update room" };
      }

      logger.info(`[EvasionOrchestrator] Room updated: ${roomId}`);
      return { success: true };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in updateRoom:", error);
      return { success: false, error: "Internal error" };
    }
  }

  // ============================================================================
  // PARTICIPANT MANAGEMENT
  // ============================================================================

  async addParticipant(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      // Check if user is already a participant
      const { data: existing } = await supabase
        .from("evasion_room_participants")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        // Reactivate if inactive
        if (!existing.is_active) {
          await supabase
            .from("evasion_room_participants")
            .update({ is_active: true, last_seen: new Date().toISOString() })
            .eq("id", existing.id);
        }
        return { success: true };
      }

      // Add new participant
      const { error } = await supabase
        .from("evasion_room_participants")
        .insert({
          room_id: roomId,
          user_id: userId,
          is_active: true,
          last_seen: new Date().toISOString()
        });

      if (error) {
        logger.error("[EvasionOrchestrator] Error adding participant:", error);
        return { success: false, error: "Failed to join room" };
      }

      logger.info(`[EvasionOrchestrator] Participant added: ${userId} to ${roomId}`);
      return { success: true };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in addParticipant:", error);
      return { success: false, error: "Internal error" };
    }
  }

  async removeParticipant(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from("evasion_room_participants")
        .update({ is_active: false })
        .eq("room_id", roomId)
        .eq("user_id", userId);

      if (error) {
        logger.error("[EvasionOrchestrator] Error removing participant:", error);
        return { success: false, error: "Failed to leave room" };
      }

      logger.info(`[EvasionOrchestrator] Participant removed: ${userId} from ${roomId}`);
      return { success: true };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in removeParticipant:", error);
      return { success: false, error: "Internal error" };
    }
  }

  // ============================================================================
  // VIDEO SYNCHRONIZATION
  // ============================================================================

  async syncVideoAction(event: VideoSyncEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      // Update room state based on action
      const updates: any = { updated_at: new Date().toISOString() };

      switch (event.action) {
        case 'play':
          updates.is_playing = true;
          updates.current_video_position = event.position || 0;
          break;
        case 'pause':
          updates.is_playing = false;
          updates.current_video_position = event.position || 0;
          break;
        case 'seek':
          updates.current_video_position = event.position || 0;
          break;
        case 'load':
          updates.current_video_url = event.video_url;
          updates.current_video_position = 0;
          updates.is_playing = false;
          break;
      }

      // Update room
      const { error: updateError } = await supabase
        .from("evasion_rooms")
        .update(updates)
        .eq("id", event.room_id);

      if (updateError) {
        logger.error("[EvasionOrchestrator] Error updating room for sync:", updateError);
        return { success: false, error: "Failed to sync video" };
      }

      // Send system message for significant actions
      if (event.action === 'load') {
        await this.sendSystemMessage(
          event.room_id,
          `Video loaded by user`,
          'video_action'
        );
      }

      logger.info(`[EvasionOrchestrator] Video sync: ${event.action} in room ${event.room_id}`);
      return { success: true };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in syncVideoAction:", error);
      return { success: false, error: "Internal error" };
    }
  }

  // ============================================================================
  // CHAT MANAGEMENT
  // ============================================================================

  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    messageType: 'text' | 'system' | 'video_action' = 'text'
  ): Promise<{ success: boolean; message?: EvasionChatMessage; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: message, error } = await supabase
        .from("evasion_chat_messages")
        .insert({
          room_id: roomId,
          user_id: userId,
          content: content.trim(),
          message_type: messageType
        })
        .select()
        .single();

      if (error) {
        logger.error("[EvasionOrchestrator] Error sending message:", error);
        return { success: false, error: "Failed to send message" };
      }

      return { success: true, message };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in sendMessage:", error);
      return { success: false, error: "Internal error" };
    }
  }

  async sendSystemMessage(
    roomId: string,
    content: string,
    messageType: 'system' | 'video_action' = 'system'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { error } = await supabase
        .from("evasion_chat_messages")
        .insert({
          room_id: roomId,
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          content,
          message_type: messageType
        });

      if (error) {
        logger.error("[EvasionOrchestrator] Error sending system message:", error);
        return { success: false, error: "Failed to send system message" };
      }

      return { success: true };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in sendSystemMessage:", error);
      return { success: false, error: "Internal error" };
    }
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToRoom(
    roomId: string,
    callbacks: {
      onMessage?: (message: EvasionChatMessage) => void;
      onRoomUpdate?: (room: Partial<EvasionRoom>) => void;
      onParticipantChange?: () => void;
      onVideoSync?: (event: VideoSyncEvent) => void;
    }
  ) {
    if (this.isServerSide) {
      logger.warn("[EvasionOrchestrator] Real-time subscriptions not available on server-side");
      return null;
    }

    const channel = this.supabase.channel(`evasion_room:${roomId}`);

    // Subscribe to new messages
    if (callbacks.onMessage) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "evasion_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          callbacks.onMessage!(payload.new);
        }
      );
    }

    // Subscribe to room updates
    if (callbacks.onRoomUpdate) {
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "evasion_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          callbacks.onRoomUpdate!(payload.new);
        }
      );
    }

    // Subscribe to participant changes
    if (callbacks.onParticipantChange) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evasion_room_participants",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          callbacks.onParticipantChange!();
        }
      );
    }

    channel.subscribe();
    return channel;
  }

  // ============================================================================
  // VIDEO TRANSCRIPT MANAGEMENT
  // ============================================================================

  async createVideoTranscript(roomId: string, videoUrl: string): Promise<{ success: boolean; transcript?: EvasionVideoTranscript; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();
      const videoId = this.extractYouTubeVideoId(videoUrl);
      
      if (!videoId) {
        return { success: false, error: "Invalid YouTube URL" };
      }

      // Check if transcript already exists
      const { data: existing } = await supabase
        .from("evasion_video_transcripts")
        .select("*")
        .eq("room_id", roomId)
        .eq("video_id", videoId)
        .single();

      if (existing) {
        return { success: true, transcript: existing };
      }

      // Create new transcript record
      const { data: transcript, error } = await supabase
        .from("evasion_video_transcripts")
        .insert({
          room_id: roomId,
          video_url: videoUrl,
          video_id: videoId,
          status: 'processing'
        })
        .select()
        .single();

      if (error) {
        logger.error("[EvasionOrchestrator] Error creating transcript:", error);
        return { success: false, error: "Failed to create transcript" };
      }

      // Start processing in background
      this.processVideoTranscript(transcript.id, videoUrl);

      return { success: true, transcript };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in createVideoTranscript:", error);
      return { success: false, error: "Internal error" };
    }
  }

  private async processVideoTranscript(transcriptId: string, videoUrl: string): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient();
      
      // This would integrate with Gemini API for video processing
      // For now, we'll mark it as completed
      const { error } = await supabase
        .from("evasion_video_transcripts")
        .update({
          status: 'completed',
          transcript_text: 'Video transcript processing will be implemented with Gemini API'
        })
        .eq("id", transcriptId);

      if (error) {
        logger.error("[EvasionOrchestrator] Error updating transcript:", error);
      }
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in processVideoTranscript:", error);
    }
  }

  async getVideoTranscript(roomId: string): Promise<{ success: boolean; transcript?: EvasionVideoTranscript; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: transcript, error } = await supabase
        .from("evasion_video_transcripts")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "completed")
        .single();

      if (error) {
        return { success: false, error: "Transcript not found" };
      }

      return { success: true, transcript };
    } catch (error) {
      logger.error("[EvasionOrchestrator] Error in getVideoTranscript:", error);
      return { success: false, error: "Internal error" };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  extractYouTubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  validateYouTubeUrl(url: string): boolean {
    return this.extractYouTubeVideoId(url) !== null;
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export singleton instance for client-side usage
export const evasionOrchestrator = new EvasionOrchestrator(false); 