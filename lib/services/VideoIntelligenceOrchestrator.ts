// FILE: lib/services/VideoIntelligenceOrchestrator.ts
import { logger } from "@/memory-framework/config";
import { VideoAnalysisService } from "./VideoAnalysisService";
import { TTSService } from "@/lib/providers/tts_service";
import { generateVisionCompletion } from "@/lib/providers/llm_clients";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { appConfig } from "@/lib/config";
import type { ChatMessage } from "@/lib/types";

export interface VideoIntelligenceAnalysisResult {
  id: string;
  stream_id: string;
  analysis_type: 'child_safety' | 'fall_detection' | 'intrusion_detection' | 'behavior_analysis' | 'general_surveillance';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  detected_objects: any[];
  detected_people: any[];
  danger_zones_violated: any[];
  scene_description: string;
  threat_analysis: string;
  recommended_actions: string[];
  frame_data?: any;
  frame_metadata: any;
  timestamp: string;
}

export interface VideoIntelligenceAlert {
  id: string;
  alert_type: 'critical_danger' | 'intruder_alert' | 'fall_detected' | 'child_safety' | 'behavior_anomaly' | 'zone_violation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  alert_data: any;
  timestamp: string;
}

export interface VideoIntelligenceSettings {
  enabled: boolean;
  analysis_sensitivity: 'low' | 'medium' | 'high';
  analysis_types: string[];
  frame_analysis_interval: number;
  voice_intervention_enabled: boolean;
  voice_intervention_messages: Record<string, string>;
  alert_preferences: any;
  notification_methods: string[];
  quiet_hours: any;
}

export interface VideoStream {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  stream_type: 'camera' | 'upload' | 'rtsp' | 'file';
  stream_url?: string;
  stream_config: any;
  status: 'active' | 'inactive' | 'error';
  location?: string;
  zone_definitions: any[];
}

export class VideoIntelligenceOrchestrator {
  private videoAnalysisService: VideoAnalysisService;
  private ttsService: TTSService;
  private supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>;

  constructor() {
    this.videoAnalysisService = new VideoAnalysisService();
    this.ttsService = new TTSService();
    this.supabaseAdmin = getSupabaseAdminClient();
    
    if (!this.supabaseAdmin) {
      throw new Error("Supabase admin client not available for VideoIntelligenceOrchestrator");
    }
  }

  /**
   * Analyze a video frame for threats and safety concerns
   */
  async analyzeFrame(
    frameBuffer: Buffer,
    streamId: string,
    userId: string,
    analysisType: VideoIntelligenceAnalysisResult['analysis_type'] = 'general_surveillance'
  ): Promise<VideoIntelligenceAnalysisResult> {
    const logPrefix = `[VideoIntelligence User:${userId.substring(0, 8)} Stream:${streamId.substring(0, 8)}]`;
    
    try {
      // Get stream info and settings
      const [stream, settings] = await Promise.all([
        this.getStream(streamId, userId),
        this.getUserSettings(userId)
      ]);

      if (!stream) {
        throw new Error("Stream not found");
      }

      // Generate analysis prompt based on type and settings
      const analysisPrompt = this.generateAnalysisPrompt(analysisType, stream, settings);
      
      // Analyze the frame using vision AI
      const visionResult = await this.analyzeFrameWithVision(
        frameBuffer,
        analysisPrompt,
        userId
      );

      // Process the analysis result
      const analysisResult = await this.processAnalysisResult(
        visionResult,
        streamId,
        userId,
        analysisType,
        stream
      );

      // Store analysis result
      await this.storeAnalysisResult(analysisResult);

      // Check if alert should be generated
      if (analysisResult.risk_level === 'high' || analysisResult.risk_level === 'critical') {
        await this.generateAlert(analysisResult, stream, settings);
      }

      logger.info(`${logPrefix} Frame analysis completed. Risk: ${analysisResult.risk_level}`);
      return analysisResult;

    } catch (error) {
      logger.error(`${logPrefix} Error analyzing frame:`, error);
      throw error;
    }
  }

  /**
   * Generate analysis prompt based on type and context
   */
  private generateAnalysisPrompt(
    analysisType: VideoIntelligenceAnalysisResult['analysis_type'],
    stream: VideoStream,
    settings: VideoIntelligenceSettings
  ): string {
    const basePrompt = `You are Minato AI Video Intelligence, an expert security and safety monitor. Analyze this video frame for potential threats and safety concerns.

Location: ${stream.location || 'Unknown'}
Stream: ${stream.name}
Analysis Type: ${analysisType}
Sensitivity: ${settings.analysis_sensitivity}

Defined Danger Zones: ${JSON.stringify(stream.zone_definitions)}

`;

    switch (analysisType) {
      case 'child_safety':
        return basePrompt + `
CHILD SAFETY ANALYSIS:
- Detect children (estimated age under 12) in the frame
- Identify if children are in danger zones (balconies, pools, near hazardous objects)
- Check for unsupervised children in restricted areas
- Assess immediate physical dangers (climbing, reaching for dangerous objects)
- Evaluate need for voice intervention

Provide detailed analysis of:
1. Children detected (count, estimated age, location)
2. Danger zones violated
3. Immediate threats
4. Recommended actions (voice intervention, parent alert, emergency services)
5. Risk level assessment

Be extremely cautious with child safety - err on the side of caution.`;

      case 'fall_detection':
        return basePrompt + `
FALL DETECTION ANALYSIS:
- Detect people who have fallen or are in distress
- Identify people lying motionless on the floor (non-sleeping areas)
- Check for signs of medical emergency
- Assess person's posture and movement

Provide detailed analysis of:
1. People detected and their posture
2. Signs of distress or injury
3. Location assessment (bathroom, kitchen, stairs)
4. Urgency level
5. Recommended emergency response

Consider medical emergency protocols.`;

      case 'intrusion_detection':
        return basePrompt + `
INTRUSION DETECTION ANALYSIS:
- Detect unknown individuals in the area
- Identify suspicious behavior or unauthorized access
- Check for forced entry signs
- Assess threat level of detected persons

Provide detailed analysis of:
1. Unknown individuals detected
2. Suspicious activities or behaviors
3. Signs of forced entry or tampering
4. Threat assessment
5. Recommended security response

Focus on distinguishing between authorized and unauthorized individuals.`;

      case 'behavior_analysis':
        return basePrompt + `
BEHAVIOR ANALYSIS:
- Analyze human behavior patterns
- Detect aggressive or unusual behavior
- Identify potential conflicts or disturbances
- Assess social interactions

Provide detailed analysis of:
1. Behaviors observed
2. Interaction patterns
3. Anomalies or concerning activities
4. Context assessment
5. Intervention recommendations`;

      default:
        return basePrompt + `
GENERAL SURVEILLANCE:
- Detect all people and objects in the frame
- Identify any unusual or concerning activities
- Assess general safety and security
- Note any changes from normal patterns

Provide comprehensive analysis of the scene.`;
    }
  }

  /**
   * Analyze frame using vision AI
   */
  private async analyzeFrameWithVision(
    frameBuffer: Buffer,
    prompt: string,
    userId: string
  ): Promise<any> {
    const base64Frame = frameBuffer.toString('base64');
    
    const visionMessages: ChatMessage[] = [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { 
          type: "input_image" as const, 
          image_url: `data:image/jpeg;base64,${base64Frame}`,
          detail: "high"
        }
      ]
    }];

    const result = await generateVisionCompletion(
      visionMessages,
      appConfig.openai.chatModel,
      appConfig.openai.maxVisionTokens,
      userId
    );

    if (result.error || !result.text) {
      throw new Error(`Vision analysis failed: ${result.error || 'No response'}`);
    }

    return result.text;
  }

  /**
   * Process analysis result and extract structured data
   */
  private async processAnalysisResult(
    visionResult: string,
    streamId: string,
    userId: string,
    analysisType: VideoIntelligenceAnalysisResult['analysis_type'],
    stream: VideoStream
  ): Promise<VideoIntelligenceAnalysisResult> {
    // Parse the vision result to extract structured information
    // This is a simplified version - in production, you'd use more sophisticated NLP
    
    const riskLevel = this.extractRiskLevel(visionResult);
    const detectedObjects = this.extractDetectedObjects(visionResult);
    const detectedPeople = this.extractDetectedPeople(visionResult);
    const threatAnalysis = this.extractThreatAnalysis(visionResult);
    const recommendedActions = this.extractRecommendedActions(visionResult);
    
    return {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stream_id: streamId,
      analysis_type: analysisType,
      risk_level: riskLevel,
      confidence_score: this.calculateConfidenceScore(visionResult),
      detected_objects: detectedObjects,
      detected_people: detectedPeople,
      danger_zones_violated: this.checkDangerZones(detectedPeople, stream.zone_definitions),
      scene_description: visionResult,
      threat_analysis: threatAnalysis,
      recommended_actions: recommendedActions,
      frame_metadata: {
        analysis_timestamp: new Date().toISOString(),
        stream_location: stream.location,
        analysis_model: appConfig.openai.chatModel
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract risk level from analysis text
   */
  private extractRiskLevel(analysisText: string): 'low' | 'medium' | 'high' | 'critical' {
    const text = analysisText.toLowerCase();
    
    if (text.includes('critical') || text.includes('emergency') || text.includes('immediate danger')) {
      return 'critical';
    }
    if (text.includes('high risk') || text.includes('urgent') || text.includes('dangerous')) {
      return 'high';
    }
    if (text.includes('medium risk') || text.includes('concerning') || text.includes('caution')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Extract detected objects from analysis
   */
  private extractDetectedObjects(analysisText: string): any[] {
    // Simplified object detection extraction
    const objects = [];
    const commonObjects = ['person', 'child', 'adult', 'car', 'door', 'window', 'stairs', 'pool', 'balcony'];
    
    for (const obj of commonObjects) {
      if (analysisText.toLowerCase().includes(obj)) {
        objects.push({
          type: obj,
          confidence: 0.8,
          detected_at: new Date().toISOString()
        });
      }
    }
    
    return objects;
  }

  /**
   * Extract detected people from analysis
   */
  private extractDetectedPeople(analysisText: string): any[] {
    const people = [];
    const text = analysisText.toLowerCase();
    
    // Simple person detection logic
    if (text.includes('child') || text.includes('children')) {
      people.push({
        type: 'child',
        estimated_age: 'under_12',
        location: 'detected',
        confidence: 0.85
      });
    }
    
    if (text.includes('adult') || text.includes('person')) {
      people.push({
        type: 'adult',
        estimated_age: 'adult',
        location: 'detected',
        confidence: 0.8
      });
    }
    
    return people;
  }

  /**
   * Extract threat analysis from vision result
   */
  private extractThreatAnalysis(analysisText: string): string {
    // Extract key threat information
    const lines = analysisText.split('\n');
    const threatLines = lines.filter(line => 
      line.toLowerCase().includes('threat') || 
      line.toLowerCase().includes('danger') || 
      line.toLowerCase().includes('risk')
    );
    
    return threatLines.join(' ') || 'No specific threats identified';
  }

  /**
   * Extract recommended actions
   */
  private extractRecommendedActions(analysisText: string): string[] {
    const actions = [];
    const text = analysisText.toLowerCase();
    
    if (text.includes('voice intervention') || text.includes('speak to')) {
      actions.push('voice_intervention');
    }
    if (text.includes('parent alert') || text.includes('notify parent')) {
      actions.push('parent_alert');
    }
    if (text.includes('emergency') || text.includes('call authorities')) {
      actions.push('emergency_services');
    }
    if (text.includes('monitor') || text.includes('continue watching')) {
      actions.push('continue_monitoring');
    }
    
    return actions;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(analysisText: string): number {
    // Simple confidence calculation based on text analysis
    const text = analysisText.toLowerCase();
    let score = 0.5; // Base score
    
    if (text.includes('clearly') || text.includes('obvious')) score += 0.3;
    if (text.includes('appears') || text.includes('seems')) score += 0.1;
    if (text.includes('uncertain') || text.includes('unclear')) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if detected people are in danger zones
   */
  private checkDangerZones(detectedPeople: any[], zoneDefinitions: any[]): any[] {
    const violations = [];
    
    // Simplified zone checking - in production, this would use actual coordinate analysis
    for (const person of detectedPeople) {
      for (const zone of zoneDefinitions) {
        if (zone.type === 'danger' && person.type === 'child') {
          violations.push({
            zone_id: zone.id,
            zone_name: zone.name,
            person_type: person.type,
            severity: 'high'
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Store analysis result in database
   */
  private async storeAnalysisResult(result: VideoIntelligenceAnalysisResult): Promise<void> {
    if (!this.supabaseAdmin) return;

    const { error } = await this.supabaseAdmin
      .from('video_intelligence_analysis')
      .insert({
        stream_id: result.stream_id,
        user_id: result.stream_id, // This should be extracted from stream
        frame_timestamp: result.timestamp,
        analysis_type: result.analysis_type,
        detected_objects: result.detected_objects,
        detected_people: result.detected_people,
        danger_zones_violated: result.danger_zones_violated,
        risk_level: result.risk_level,
        confidence_score: result.confidence_score,
        scene_description: result.scene_description,
        threat_analysis: result.threat_analysis,
        recommended_actions: result.recommended_actions,
        frame_metadata: result.frame_metadata
      });

    if (error) {
      logger.error('[VideoIntelligence] Error storing analysis result:', error);
    }
  }

  /**
   * Generate alert based on analysis result
   */
  private async generateAlert(
    result: VideoIntelligenceAnalysisResult,
    stream: VideoStream,
    settings: VideoIntelligenceSettings
  ): Promise<void> {
    if (!this.supabaseAdmin) return;

    const alert = this.createAlert(result, stream);
    
    // Store alert in database
    const { error } = await this.supabaseAdmin
      .from('video_intelligence_alerts')
      .insert({
        stream_id: result.stream_id,
        analysis_id: result.id,
        user_id: stream.user_id,
        alert_type: alert.alert_type,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        alert_data: alert.alert_data
      });

    if (error) {
      logger.error('[VideoIntelligence] Error storing alert:', error);
      return;
    }

    // Send notifications
    await this.sendNotifications(alert, stream, settings);

    // Voice intervention if enabled
    if (settings.voice_intervention_enabled && result.recommended_actions.includes('voice_intervention')) {
      await this.triggerVoiceIntervention(result, stream, settings);
    }
  }

  /**
   * Create alert object from analysis result
   */
  private createAlert(result: VideoIntelligenceAnalysisResult, stream: VideoStream): VideoIntelligenceAlert {
    let alertType: VideoIntelligenceAlert['alert_type'] = 'behavior_anomaly';
    let title = 'Security Alert';
    let message = 'Unusual activity detected';

    switch (result.analysis_type) {
      case 'child_safety':
        alertType = 'child_safety';
        title = 'CHILD SAFETY ALERT';
        message = `Child detected in danger zone at ${stream.location || stream.name}`;
        break;
      case 'fall_detection':
        alertType = 'fall_detected';
        title = 'FALL DETECTED';
        message = `Person down detected at ${stream.location || stream.name}`;
        break;
      case 'intrusion_detection':
        alertType = 'intruder_alert';
        title = 'INTRUSION ALERT';
        message = `Unknown individual detected at ${stream.location || stream.name}`;
        break;
    }

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert_type: alertType,
      priority: result.risk_level as VideoIntelligenceAlert['priority'],
      title,
      message,
      alert_data: {
        analysis_result: result,
        stream_info: stream,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send notifications for alert
   */
  private async sendNotifications(
    alert: VideoIntelligenceAlert,
    stream: VideoStream,
    settings: VideoIntelligenceSettings
  ): Promise<void> {
    // Implementation for push notifications, SMS, email, etc.
    logger.info(`[VideoIntelligence] Alert generated: ${alert.title} - ${alert.message}`);
    
    // TODO: Implement actual notification sending
    // - Push notifications
    // - SMS alerts
    // - Email notifications
    // - Integration with external services
  }

  /**
   * Trigger voice intervention
   */
  private async triggerVoiceIntervention(
    result: VideoIntelligenceAnalysisResult,
    stream: VideoStream,
    settings: VideoIntelligenceSettings
  ): Promise<void> {
    try {
      let voiceMessage = settings.voice_intervention_messages[result.analysis_type];
      
      if (!voiceMessage) {
        // Default voice messages
        switch (result.analysis_type) {
          case 'child_safety':
            voiceMessage = "Please step away from the dangerous area. A parent has been notified.";
            break;
          case 'intrusion_detection':
            voiceMessage = "You are being recorded. Please identify yourself or leave the premises.";
            break;
          default:
            voiceMessage = "Please be aware that this area is under surveillance.";
        }
      }

      // Generate TTS audio
      const ttsResult = await this.ttsService.generateAndStoreSpeech(
        voiceMessage,
        stream.user_id,
        'alloy', // Use a firm but calm voice
        null, // No custom instructions
        'mp3' // Format
      );

      if (ttsResult.url) {
        // TODO: Play audio through connected speakers/devices
        logger.info(`[VideoIntelligence] Voice intervention triggered: ${voiceMessage}`);
      }

    } catch (error) {
      logger.error('[VideoIntelligence] Error triggering voice intervention:', error);
    }
  }

  /**
   * Get stream information
   */
  private async getStream(streamId: string, userId: string): Promise<VideoStream | null> {
    if (!this.supabaseAdmin) return null;

    const { data, error } = await this.supabaseAdmin
      .from('video_intelligence_streams')
      .select('*')
      .eq('id', streamId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      logger.error('[VideoIntelligence] Error fetching stream:', error);
      return null;
    }

    return data as VideoStream;
  }

  /**
   * Get user settings
   */
  private async getUserSettings(userId: string): Promise<VideoIntelligenceSettings> {
    if (!this.supabaseAdmin) {
      return this.getDefaultSettings();
    }

    const { data, error } = await this.supabaseAdmin
      .from('video_intelligence_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return this.getDefaultSettings();
    }

    return data as VideoIntelligenceSettings;
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): VideoIntelligenceSettings {
    return {
      enabled: true,
      analysis_sensitivity: 'medium',
      analysis_types: ['child_safety', 'fall_detection', 'intrusion_detection'],
      frame_analysis_interval: 5,
      voice_intervention_enabled: true,
      voice_intervention_messages: {},
      alert_preferences: {},
      notification_methods: ['push'],
      quiet_hours: {}
    };
  }

  /**
   * Get user alerts
   */
  async getUserAlerts(userId: string, limit: number = 50): Promise<VideoIntelligenceAlert[]> {
    if (!this.supabaseAdmin) return [];

    const { data, error } = await this.supabaseAdmin
      .from('video_intelligence_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[VideoIntelligence] Error fetching alerts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    userId: string,
    status: 'acknowledged' | 'resolved' | 'dismissed'
  ): Promise<boolean> {
    if (!this.supabaseAdmin) return false;

    const updateData: any = { status };
    
    if (status === 'acknowledged') {
      updateData.acknowledged_at = new Date().toISOString();
    } else if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await this.supabaseAdmin
      .from('video_intelligence_alerts')
      .update(updateData)
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      logger.error('[VideoIntelligence] Error updating alert status:', error);
      return false;
    }

    return true;
  }

  /**
   * Process uploaded video for intelligence analysis
   */
  async processUploadedVideo(
    streamId: string, 
    videoUrl: string, 
    scenario: string
  ): Promise<void> {
    try {
      logger.info(`Starting comprehensive video processing for stream ${streamId}`);
      
      // Update stream status to processing
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('video_intelligence_streams')
          .update({ status: 'processing' })
          .eq('id', streamId);
      }

      // Import VideoProcessingService dynamically to avoid circular dependencies
      const { VideoProcessingService } = await import('./VideoProcessingService');
      const videoProcessor = new VideoProcessingService();

      // Get user ID from stream
      if (!this.supabaseAdmin) {
        throw new Error('Database connection not available');
      }

      const { data: streamData } = await this.supabaseAdmin
        .from('video_intelligence_streams')
        .select('user_id')
        .eq('id', streamId)
        .single();

      if (!streamData) {
        throw new Error('Stream not found');
      }

      // Process video with comprehensive frame and audio analysis
      const result = await videoProcessor.processUploadedVideo(
        streamId,
        videoUrl,
        streamData.user_id,
        scenario
      );

      if (result.success) {
        // Update stream status to completed with processing stats
        if (this.supabaseAdmin) {
          await this.supabaseAdmin
            .from('video_intelligence_streams')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString(),
              metadata: {
                frames_analyzed: result.frames_analyzed,
                audio_analyzed: result.audio_analyzed,
                total_analysis_results: result.total_analysis_results,
                processing_time: result.processing_time
              }
            })
            .eq('id', streamId);
        }

        logger.info(`Comprehensive video processing completed for stream ${streamId}. Frames: ${result.frames_analyzed}, Audio: ${result.audio_analyzed}, Time: ${result.processing_time}ms`);
      } else {
        throw new Error(result.error || 'Video processing failed');
      }
      
    } catch (error) {
      logger.error(`Error processing uploaded video for stream ${streamId}:`, error);
      
      // Update stream status to error
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('video_intelligence_streams')
          .update({ status: 'error' })
          .eq('id', streamId);
      }
    }
  }
} 