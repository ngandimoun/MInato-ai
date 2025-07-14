// FILE: lib/services/VideoIntelligenceNotificationService.ts
import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { logger } from "@/memory-framework/config";

/**
 * Service for managing video intelligence notifications and alerts
 */
export class VideoIntelligenceNotificationService {
  private supabase;
  private notificationChannels: Map<string, boolean> = new Map();
  
  constructor() {
    this.supabase = createClientComponentClient();
    logger.info("[VideoIntelligenceNotificationService] Initialized");
  }
  
  /**
   * Subscribe to real-time notifications for a specific video stream
   */
  public async subscribeToStreamAlerts(streamId: string, userId: string, onAlert: (alert: any) => void) {
    if (this.notificationChannels.has(streamId)) {
      logger.info(`[VideoIntelligenceNotificationService] Already subscribed to stream ${streamId}`);
      return;
    }
    
    try {
      // Subscribe to the channel for this specific stream
      const channel = this.supabase
        .channel(`video_intelligence_alerts:stream_id=eq.${streamId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_intelligence_alerts',
            filter: `stream_id=eq.${streamId}`,
          },
          (payload) => {
            logger.info(`[VideoIntelligenceNotificationService] New alert received for stream ${streamId}`);
            
            // Process the alert
            const alert = payload.new;
            
            // Show toast notification
            if (alert.priority === 'critical' || alert.priority === 'high') {
              toast.error(alert.title, {
                description: alert.message,
                duration: 10000, // 10 seconds for critical alerts
                action: {
                  label: "View",
                  onClick: () => onAlert(alert),
                }
              });
            } else if (alert.priority === 'medium') {
              toast.warning(alert.title, {
                description: alert.message,
                duration: 5000,
                action: {
                  label: "View",
                  onClick: () => onAlert(alert),
                }
              });
            } else {
              toast.info(alert.title, {
                description: alert.message,
                duration: 3000,
                action: {
                  label: "View",
                  onClick: () => onAlert(alert),
                }
              });
            }
            
            // Call the callback
            onAlert(alert);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info(`[VideoIntelligenceNotificationService] Successfully subscribed to alerts for stream ${streamId}`);
            this.notificationChannels.set(streamId, true);
          } else {
            logger.error(`[VideoIntelligenceNotificationService] Failed to subscribe to alerts for stream ${streamId}. Status: ${status}`);
          }
        });
        
      return () => {
        channel.unsubscribe();
        this.notificationChannels.delete(streamId);
        logger.info(`[VideoIntelligenceNotificationService] Unsubscribed from alerts for stream ${streamId}`);
      };
    } catch (error) {
      logger.error(`[VideoIntelligenceNotificationService] Error subscribing to alerts for stream ${streamId}:`, error);
      return () => {};
    }
  }
  
  /**
   * Subscribe to analysis completion notifications
   */
  public async subscribeToAnalysisCompletion(userId: string, onComplete: (analysis: any) => void) {
    try {
      // Subscribe to analysis completion events
      const channel = this.supabase
        .channel(`video_intelligence_analysis:user_id=eq.${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_intelligence_analysis',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            logger.info(`[VideoIntelligenceNotificationService] Analysis completed for user ${userId}`);
            
            // Process the analysis
            const analysis = payload.new;
            
            // Show toast notification
            if (analysis.risk_level === 'critical' || analysis.risk_level === 'high') {
              toast.error("Critical threat detected", {
                description: `A ${analysis.risk_level} risk level threat was detected in your video.`,
                duration: 10000,
                action: {
                  label: "View",
                  onClick: () => onComplete(analysis),
                }
              });
            } else {
              toast.success("Analysis complete", {
                description: "Your video analysis is now ready to view.",
                duration: 5000,
                action: {
                  label: "View",
                  onClick: () => onComplete(analysis),
                }
              });
            }
            
            // Call the callback
            onComplete(analysis);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info(`[VideoIntelligenceNotificationService] Successfully subscribed to analysis completion for user ${userId}`);
          } else {
            logger.error(`[VideoIntelligenceNotificationService] Failed to subscribe to analysis completion for user ${userId}. Status: ${status}`);
          }
        });
        
      return () => {
        channel.unsubscribe();
        logger.info(`[VideoIntelligenceNotificationService] Unsubscribed from analysis completion for user ${userId}`);
      };
    } catch (error) {
      logger.error(`[VideoIntelligenceNotificationService] Error subscribing to analysis completion for user ${userId}:`, error);
      return () => {};
    }
  }
  
  /**
   * Create a manual notification/toast
   */
  public showNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', action?: { label: string; onClick: () => void }) {
    switch (type) {
      case 'success':
        toast.success(title, {
          description: message,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
        break;
      case 'warning':
        toast.warning(title, {
          description: message,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
        break;
      case 'error':
        toast.error(title, {
          description: message,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
        break;
      case 'info':
      default:
        toast.info(title, {
          description: message,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
        break;
    }
  }
} 