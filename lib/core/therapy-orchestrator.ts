// ============================================================================
// FILE: lib/core/therapy-orchestrator.ts
// DESC: Orchestrates AI therapy sessions with realtime communication
// ============================================================================

import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { rawOpenAiClient as openai } from '@/lib/providers/llm_clients';
import { generateTherapyPrompt, generateSessionOpening, CRISIS_INTERVENTION } from '@/lib/prompts/therapy-prompts';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TherapySession {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  language: string;
  ai_personality: string;
  therapy_approach: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  started_at: string;
  settings: {
    voice_enabled: boolean;
    auto_save: boolean;
    background_sounds: boolean;
    session_reminders: boolean;
  };
}

interface TherapyMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  message_type: 'user' | 'ai' | 'system';
  content_type: 'text' | 'voice' | 'exercise' | 'insight';
  audio_url?: string;
  audio_duration_seconds?: number;
  transcript?: string;
  language: string;
  sentiment_score?: number;
  emotions_detected?: string[];
  therapeutic_technique?: string;
  intervention_type?: string;
  ai_model_used?: string;
  processing_time_ms?: number;
  created_at: string;
}

interface UserTherapyProfile {
  id: string;
  user_id: string;
  preferred_name: string;
  gender: string;
  preferred_language: string;
  therapy_goals: string[];
  communication_style: 'supportive' | 'direct' | 'exploratory' | 'solution-focused';
  session_preferences: {
    session_duration: number;
    reminder_enabled: boolean;
    voice_enabled: boolean;
    background_sounds: boolean;
  };
  privacy_settings: {
    save_conversations: boolean;
    anonymous_mode: boolean;
    data_retention_days: number;
  };
}

export class TherapyOrchestrator {
  private supabase;
  private channel: RealtimeChannel | null = null;
  private sessionId: string;
  private userId: string;
  private onMessageReceived?: (message: TherapyMessage) => void;
  private onSessionUpdated?: (session: TherapySession) => void;
  private isFirstSession: boolean = true;
  private crisisKeywords = [
    'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
    'self harm', 'cut myself', 'hurt myself', 'harm myself',
    'overdose', 'pills', 'jump off', 'hang myself'
  ];

  constructor(sessionId: string, userId: string) {
    this.supabase = getBrowserSupabaseClient();
    this.sessionId = sessionId;
    this.userId = userId;
  }

  // Initialize the therapy session
  async initialize() {
    try {
      // Load session data
      const session = await this.getSession();
      if (!session) {
        throw new Error('Session not found');
      }

      // Load user profile
      const profile = await this.getUserProfile();
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Check if this is the first session
      this.isFirstSession = await this.checkIfFirstSession();

      // Set up realtime subscription
      await this.setupRealtimeSubscription();

      // Send initial AI message if first session
      if (this.isFirstSession) {
        await this.sendInitialMessage(session, profile);
      }

      return { session, profile };
    } catch (error) {
      console.error('Error initializing therapy session:', error);
      throw error;
    }
  }

  // Get session data
  async getSession(): Promise<TherapySession | null> {
    try {
      const { data, error } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('id', this.sessionId)
        .eq('user_id', this.userId)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Get user therapy profile
  async getUserProfile(): Promise<UserTherapyProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_therapy_profiles')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Check if this is the user's first therapy session
  async checkIfFirstSession(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('therapy_messages')
        .select('id')
        .eq('session_id', this.sessionId)
        .eq('message_type', 'ai')
        .limit(1);

      if (error) {
        console.error('Error checking first session:', error);
        return true;
      }

      return data.length === 0;
    } catch (error) {
      console.error('Error checking first session:', error);
      return true;
    }
  }

  // Set up realtime subscription for the session
  async setupRealtimeSubscription() {
    try {
      // Subscribe to therapy messages for this session
      this.channel = this.supabase
        .channel(`therapy_session:${this.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'therapy_messages',
            filter: `session_id=eq.${this.sessionId}`
          },
          (payload) => {
            if (this.onMessageReceived) {
              this.onMessageReceived(payload.new as TherapyMessage);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'therapy_sessions',
            filter: `id=eq.${this.sessionId}`
          },
          (payload) => {
            if (this.onSessionUpdated) {
              this.onSessionUpdated(payload.new as TherapySession);
            }
          }
        )
        .subscribe();

      console.log('Realtime subscription established for therapy session');
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
    }
  }

  // Send initial AI welcome message
  async sendInitialMessage(session: TherapySession, profile: UserTherapyProfile) {
    try {
      const config = {
        communicationStyle: profile.communication_style,
        language: profile.preferred_language,
        preferredName: profile.preferred_name,
        gender: profile.gender,
        sessionType: session.therapy_approach,
        category: 'general-therapy' // Will be mapped from category_id
      };

      const openingMessage = generateSessionOpening(config, this.isFirstSession);
      
      await this.saveMessage({
        session_id: this.sessionId,
        user_id: this.userId,
        content: openingMessage,
        message_type: 'ai',
        content_type: 'text',
        language: profile.preferred_language,
        ai_model_used: 'gpt-4.1-mini-2025-04-14',
        therapeutic_technique: 'opening_greeting',
        intervention_type: 'welcome'
      });

    } catch (error) {
      console.error('Error sending initial message:', error);
    }
  }

  // Process user message and generate AI response
  async processUserMessage(userMessage: string, messageType: 'text' | 'voice' = 'text', audioUrl?: string, audioDuration?: number) {
    try {
      const startTime = Date.now();
      
      // Save user message
      const userMessageRecord = await this.saveMessage({
        session_id: this.sessionId,
        user_id: this.userId,
        content: userMessage,
        message_type: 'user',
        content_type: messageType,
        audio_url: audioUrl,
        audio_duration_seconds: audioDuration,
        transcript: messageType === 'voice' ? userMessage : undefined,
        language: await this.getSessionLanguage()
      });

      // Check for crisis keywords
      const needsCrisisIntervention = this.detectCrisisKeywords(userMessage);
      
      if (needsCrisisIntervention) {
        await this.handleCrisisIntervention(userMessage);
        return;
      }

      // Generate AI response
      const aiResponse = await this.generateAIResponse(userMessage);
      const processingTime = Date.now() - startTime;

      // Analyze sentiment and emotions (simplified)
      const sentimentScore = this.analyzeSentiment(userMessage);
      const emotions = this.detectEmotions(userMessage);

      // Save AI response
      await this.saveMessage({
        session_id: this.sessionId,
        user_id: this.userId,
        content: aiResponse,
        message_type: 'ai',
        content_type: 'text',
        language: await this.getSessionLanguage(),
        sentiment_score: sentimentScore,
        emotions_detected: emotions,
        ai_model_used: 'gpt-4.1-mini-2025-04-14',
        processing_time_ms: processingTime,
        therapeutic_technique: this.detectTherapeuticTechnique(aiResponse),
        intervention_type: this.detectInterventionType(aiResponse)
      });

      // Update session message count
      await this.updateSessionStats();

    } catch (error) {
      console.error('Error processing user message:', error);
      
      // Send error recovery message
      await this.saveMessage({
        session_id: this.sessionId,
        user_id: this.userId,
        content: "I'm having a technical difficulty right now. Let me take a moment to reconnect. Your wellbeing is important to me, so please continue sharing when you're ready.",
        message_type: 'ai',
        content_type: 'text',
        language: await this.getSessionLanguage(),
        therapeutic_technique: 'error_recovery'
      });
    }
  }

  // Generate AI response using the therapy prompts
  async generateAIResponse(userMessage: string): Promise<string> {
    try {
      const session = await this.getSession();
      const profile = await this.getUserProfile();
      
      if (!session || !profile) {
        throw new Error('Missing session or profile data');
      }

      // Get conversation history
      const history = await this.getConversationHistory(10); // Last 10 messages

      // Build conversation context
      const conversationContext = history.map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const config = {
        communicationStyle: profile.communication_style,
        language: profile.preferred_language,
        preferredName: profile.preferred_name,
        gender: profile.gender,
        sessionType: session.therapy_approach,
        category: 'general-therapy' // Will be mapped from category_id
      };

      const systemPrompt = generateTherapyPrompt(config);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationContext,
        { role: 'user', content: userMessage }
      ] as any[];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini-2025-04-14',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return completion.choices[0]?.message?.content || 
        "I want to make sure I give you the thoughtful response you deserve. Could you share a bit more about what you're experiencing?";

    } catch (error) {
      console.error('Error generating AI response:', error);
      return "I'm here to listen and support you. Sometimes I need a moment to process - could you tell me more about what's on your mind?";
    }
  }

  // Save message to database
  async saveMessage(messageData: Partial<TherapyMessage>): Promise<TherapyMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('therapy_messages')
        .insert([{
          ...messageData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }

  // Get conversation history
  async getConversationHistory(limit: number = 20): Promise<TherapyMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('therapy_messages')
        .select('*')
        .eq('session_id', this.sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      return data.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Crisis detection and intervention
  detectCrisisKeywords(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.crisisKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async handleCrisisIntervention(userMessage: string) {
    try {
      let interventionMessage = CRISIS_INTERVENTION.severe_distress;
      
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes('suicide') || lowerMessage.includes('kill myself') || lowerMessage.includes('want to die')) {
        interventionMessage = CRISIS_INTERVENTION.suicidal_ideation;
      } else if (lowerMessage.includes('self harm') || lowerMessage.includes('cut myself') || lowerMessage.includes('hurt myself')) {
        interventionMessage = CRISIS_INTERVENTION.self_harm;
      }

      await this.saveMessage({
        session_id: this.sessionId,
        user_id: this.userId,
        content: interventionMessage,
        message_type: 'ai',
        content_type: 'text',
        language: await this.getSessionLanguage(),
        therapeutic_technique: 'crisis_intervention',
        intervention_type: 'safety_protocol',
        is_flagged: true,
        flag_reason: 'crisis_intervention_triggered'
      });

      // Flag the session for review
      await this.flagSessionForReview('crisis_intervention');

    } catch (error) {
      console.error('Error handling crisis intervention:', error);
    }
  }

  // Helper methods
  async getSessionLanguage(): Promise<string> {
    try {
      const session = await this.getSession();
      return session?.language || 'en';
    } catch {
      return 'en';
    }
  }

  analyzeSentiment(message: string): number {
    // Simplified sentiment analysis - in production, use a proper service
    const positiveWords = ['happy', 'good', 'great', 'love', 'wonderful', 'amazing', 'better', 'hope'];
    const negativeWords = ['sad', 'angry', 'hate', 'terrible', 'awful', 'worse', 'depressed', 'anxious'];
    
    const words = message.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 0.7;
    if (negativeCount > positiveCount) return -0.7;
    return 0.0;
  }

  detectEmotions(message: string): string[] {
    // Simplified emotion detection
    const emotions: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('nervous')) emotions.push('anxiety');
    if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) emotions.push('sadness');
    if (lowerMessage.includes('angry') || lowerMessage.includes('mad') || lowerMessage.includes('frustrated')) emotions.push('anger');
    if (lowerMessage.includes('happy') || lowerMessage.includes('joy') || lowerMessage.includes('excited')) emotions.push('happiness');
    if (lowerMessage.includes('scared') || lowerMessage.includes('afraid') || lowerMessage.includes('fear')) emotions.push('fear');
    
    return emotions;
  }

  detectTherapeuticTechnique(response: string): string {
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('breathe') || lowerResponse.includes('breathing')) return 'breathing_exercise';
    if (lowerResponse.includes('what do you think') || lowerResponse.includes('how do you feel')) return 'reflective_questioning';
    if (lowerResponse.includes('that sounds') || lowerResponse.includes('i hear you')) return 'validation';
    if (lowerResponse.includes('try this') || lowerResponse.includes('exercise')) return 'behavioral_intervention';
    if (lowerResponse.includes('reframe') || lowerResponse.includes('another way to think')) return 'cognitive_restructuring';
    
    return 'supportive_listening';
  }

  detectInterventionType(response: string): string {
    const lowerResponse = response.toLowerCase();
    
    if (lowerResponse.includes('crisis') || lowerResponse.includes('emergency')) return 'crisis_intervention';
    if (lowerResponse.includes('exercise') || lowerResponse.includes('technique')) return 'therapeutic_exercise';
    if (lowerResponse.includes('insight') || lowerResponse.includes('realize')) return 'insight_facilitation';
    
    return 'emotional_support';
  }

  async updateSessionStats() {
    try {
      const { error } = await this.supabase.rpc('increment_session_message_count', {
        session_id: this.sessionId
      });

      if (error) {
        console.error('Error updating session stats:', error);
      }
    } catch (error) {
      console.error('Error updating session stats:', error);
    }
  }

  async flagSessionForReview(reason: string) {
    try {
      // In a production system, this would notify administrators
      console.log(`Session ${this.sessionId} flagged for review: ${reason}`);
    } catch (error) {
      console.error('Error flagging session:', error);
    }
  }

  // Event handlers
  setOnMessageReceived(handler: (message: TherapyMessage) => void) {
    this.onMessageReceived = handler;
  }

  setOnSessionUpdated(handler: (session: TherapySession) => void) {
    this.onSessionUpdated = handler;
  }

  // Cleanup
  async disconnect() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  // End session
  async endSession() {
    try {
      const { error } = await this.supabase
        .from('therapy_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', this.sessionId);

      if (error) {
        console.error('Error ending session:', error);
      }

      await this.disconnect();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }
}

export default TherapyOrchestrator; 