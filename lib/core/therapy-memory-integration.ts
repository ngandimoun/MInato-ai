// ============================================================================
// FILE: lib/core/therapy-memory-integration.ts
// DESC: Enhanced therapy memory integration with emotional weather and progress tracking
// ============================================================================

import { getBrowserSupabaseClient } from '@/lib/supabase/client';

interface TherapyMemoryEntry {
  sessionId: string;
  userId: string;
  content: string;
  messageType: 'user' | 'ai';
  timestamp: string;
  language: string;
  therapeuticTechnique?: string;
  emotions?: string[];
  insights?: string[];
  moodRating?: number;
  energyLevel?: number;
  stressLevel?: number;
}

interface SessionMemory {
  sessionId: string;
  userId: string;
  sessionTitle: string;
  keyThemes: string[];
  insights: string[];
  progress: string;
  language: string;
  startTime: string;
  endTime?: string;
  moodBefore?: number;
  moodAfter?: number;
  breakthroughs: string[];
  techniquesUsed: string[];
  nextSteps: string[];
}

interface EmotionalWeatherEntry {
  id: string;
  userId: string;
  date: string;
  weather: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy';
  moodRating: number;
  energyLevel: number;
  stressLevel: number;
  gratitude?: string;
  challenges?: string[];
  wins?: string[];
  notes?: string;
  createdAt: string;
}

interface MemoryVaultEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: 'breakthrough' | 'strength' | 'wisdom' | 'growth' | 'achievement';
  tags: string[];
  sessionId?: string;
  isFavorite: boolean;
  createdAt: string;
  lastReviewedAt?: string;
}

interface ProgressMetrics {
  userId: string;
  period: 'week' | 'month' | 'quarter';
  averageMood: number;
  moodTrend: 'improving' | 'stable' | 'declining';
  sessionCount: number;
  techniquesLearned: string[];
  consistencyScore: number;
  milestonesAchieved: string[];
  areasOfGrowth: string[];
  strengthsIdentified: string[];
}

export class EnhancedTherapyMemoryIntegration {
  private supabase;

  constructor() {
    this.supabase = getBrowserSupabaseClient();
  }

  /**
   * Saves emotional weather entry for daily check-ins
   */
  async saveEmotionalWeather(entry: Omit<EmotionalWeatherEntry, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const weatherEntry = {
        ...entry,
        id: `weather-${Date.now()}-${entry.userId}`,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('emotional_weather')
        .insert([weatherEntry]);

      if (error) {
        console.error('Error saving emotional weather:', error);
        // Fallback to localStorage
        const existingWeather = JSON.parse(localStorage.getItem('emotional_weather') || '[]');
        existingWeather.push(weatherEntry);
        localStorage.setItem('emotional_weather', JSON.stringify(existingWeather));
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error saving emotional weather:', error);
      return false;
    }
  }

  /**
   * Gets emotional weather history for visualization
   */
  async getEmotionalWeatherHistory(userId: string, days: number = 30): Promise<EmotionalWeatherEntry[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('emotional_weather')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching emotional weather:', error);
        // Fallback to localStorage
        const localWeather = JSON.parse(localStorage.getItem('emotional_weather') || '[]');
        return localWeather.filter((entry: any) => 
          entry.userId === userId && 
          new Date(entry.date) >= startDate
        );
      }

      return data || [];
    } catch (error) {
      console.error('Error getting emotional weather history:', error);
      return [];
    }
  }

  /**
   * Adds entry to memory vault
   */
  async addToMemoryVault(entry: Omit<MemoryVaultEntry, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const vaultEntry = {
        ...entry,
        id: `vault-${Date.now()}-${entry.userId}`,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('memory_vault')
        .insert([vaultEntry]);

      if (error) {
        console.error('Error adding to memory vault:', error);
        // Fallback to localStorage
        const existingVault = JSON.parse(localStorage.getItem('memory_vault') || '[]');
        existingVault.push(vaultEntry);
        localStorage.setItem('memory_vault', JSON.stringify(existingVault));
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error adding to memory vault:', error);
      return false;
    }
  }

  /**
   * Gets memory vault entries
   */
  async getMemoryVault(userId: string, category?: string): Promise<MemoryVaultEntry[]> {
    try {
      let query = this.supabase
        .from('memory_vault')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching memory vault:', error);
        // Fallback to localStorage
        const localVault = JSON.parse(localStorage.getItem('memory_vault') || '[]');
        return localVault.filter((entry: any) => 
          entry.userId === userId && 
          (!category || entry.category === category)
        );
      }

      return data || [];
    } catch (error) {
      console.error('Error getting memory vault:', error);
      return [];
    }
  }

  /**
   * Calculates progress metrics
   */
  async calculateProgressMetrics(userId: string, period: 'week' | 'month' | 'quarter'): Promise<ProgressMetrics | null> {
    try {
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Get emotional weather data
      const weatherData = await this.getEmotionalWeatherHistory(userId, periodDays);
      
      // Get session data
      const { data: sessions, error: sessionError } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', startDate.toISOString());

      if (sessionError) {
        console.error('Error fetching sessions for metrics:', sessionError);
      }

      // Calculate metrics
      const moodRatings = weatherData.map(w => w.moodRating).filter(Boolean);
      const averageMood = moodRatings.length > 0 
        ? moodRatings.reduce((sum, rating) => sum + rating, 0) / moodRatings.length 
        : 0;

      // Calculate mood trend
      const recentMoods = moodRatings.slice(-7); // Last week
      const olderMoods = moodRatings.slice(0, -7);
      const recentAvg = recentMoods.length > 0 ? recentMoods.reduce((sum, rating) => sum + rating, 0) / recentMoods.length : 0;
      const olderAvg = olderMoods.length > 0 ? olderMoods.reduce((sum, rating) => sum + rating, 0) / olderMoods.length : 0;
      
      let moodTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentAvg > olderAvg + 0.5) moodTrend = 'improving';
      else if (recentAvg < olderAvg - 0.5) moodTrend = 'declining';

      // Get techniques used
      const { data: messages } = await this.supabase
        .from('therapy_messages')
        .select('therapeutic_technique')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .not('therapeutic_technique', 'is', null);

      const techniquesLearned = [...new Set((messages || []).map((m: any) => m.therapeutic_technique).filter(Boolean))] as string[];

      // Calculate consistency score (sessions per expected sessions)
      const expectedSessions = Math.ceil(periodDays / 7); // Assuming weekly sessions
      const actualSessions = sessions?.length || 0;
      const consistencyScore = Math.min(100, (actualSessions / expectedSessions) * 100);

      return {
        userId,
        period,
        averageMood,
        moodTrend,
        sessionCount: actualSessions,
        techniquesLearned,
        consistencyScore,
        milestonesAchieved: await this.getMilestonesAchieved(userId, periodDays),
        areasOfGrowth: await this.getAreasOfGrowth(userId, periodDays),
        strengthsIdentified: await this.getStrengthsIdentified(userId, periodDays)
      };

    } catch (error) {
      console.error('Error calculating progress metrics:', error);
      return null;
    }
  }

  /**
   * Gets session summary with insights
   */
  async getSessionSummary(sessionId: string, userId: string): Promise<SessionMemory | null> {
    try {
      // Get session data
      const { data: session } = await this.supabase
        .from('therapy_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (!session) return null;

      // Get messages from the session
      const { data: messages } = await this.supabase
        .from('therapy_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // Extract insights and themes
      const insights = this.extractInsights(messages || []);
      const keyThemes = this.extractThemes(messages || []);
      const techniquesUsed = [...new Set((messages || []).map((m: any) => m.therapeutic_technique).filter(Boolean))] as string[];
      const breakthroughs = this.extractBreakthroughs(messages || []);

      return {
        sessionId,
        userId,
        sessionTitle: session.title,
        keyThemes,
        insights,
        progress: this.generateProgressSummary(insights, techniquesUsed),
        language: session.language,
        startTime: session.started_at,
        endTime: session.ended_at,
        breakthroughs,
        techniquesUsed,
        nextSteps: this.generateNextSteps(insights, keyThemes)
      };

    } catch (error) {
      console.error('Error getting session summary:', error);
      return null;
    }
  }

  /**
   * Saves a therapy message with enhanced metadata
   */
  async saveMessageToMemory(entry: TherapyMemoryEntry): Promise<boolean> {
    try {
      // Create memory entry for significant content
      if (entry.messageType === 'ai' && entry.insights && entry.insights.length > 0) {
        for (const insight of entry.insights) {
          await this.createMemoryEntry({
            user_id: entry.userId,
            content: `Therapeutic insight: ${insight}`,
            categories: ['therapy', 'insight', entry.therapeuticTechnique || 'general'],
            metadata: {
              session_id: entry.sessionId,
              message_type: entry.messageType,
              language: entry.language,
              timestamp: entry.timestamp,
              therapeutic_technique: entry.therapeuticTechnique,
              emotions: entry.emotions,
              mood_rating: entry.moodRating,
              energy_level: entry.energyLevel,
              stress_level: entry.stressLevel
            }
          });
        }
      }

      // Save user breakthroughs
      if (entry.messageType === 'user' && this.isImportantUserInsight(entry.content)) {
        await this.createMemoryEntry({
          user_id: entry.userId,
          content: `User breakthrough: ${entry.content}`,
          categories: ['therapy', 'user_insight', 'breakthrough'],
          metadata: {
            session_id: entry.sessionId,
            message_type: entry.messageType,
            language: entry.language,
            timestamp: entry.timestamp,
            emotions: entry.emotions,
            mood_rating: entry.moodRating
          }
        });

        // Also add to memory vault
        await this.addToMemoryVault({
          userId: entry.userId,
          title: 'Personal Breakthrough',
          content: entry.content,
          category: 'breakthrough',
          tags: ['insight', 'growth'],
          sessionId: entry.sessionId,
          isFavorite: false
        });
      }

      return true;
    } catch (error) {
      console.error('Error saving message to memory:', error);
      return false;
    }
  }

  /**
   * Retrieves therapy-related memories for context
   */
  async getTherapyMemoryContext(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .contains('categories', ['therapy'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching therapy memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting therapy memory context:', error);
      return [];
    }
  }

  /**
   * Updates therapy progress in memory
   */
  async updateTherapyProgress(userId: string, sessionId: string, progressData: {
    moodImprovement?: number;
    copingSkillsLearned?: string[];
    behavioralChanges?: string[];
    insights?: string[];
  }): Promise<boolean> {
    try {
      const progressContent = `Therapy progress update: 
${progressData.moodImprovement ? `Mood improvement: ${progressData.moodImprovement}/10` : ''}
${progressData.copingSkillsLearned ? `New coping skills: ${progressData.copingSkillsLearned.join(', ')}` : ''}
${progressData.behavioralChanges ? `Behavioral changes: ${progressData.behavioralChanges.join(', ')}` : ''}
${progressData.insights ? `Key insights: ${progressData.insights.join('; ')}` : ''}`;

      await this.createMemoryEntry({
        user_id: userId,
        content: progressContent,
        categories: ['therapy', 'progress', 'milestone'],
        metadata: {
          session_id: sessionId,
          progress_data: progressData,
          timestamp: new Date().toISOString()
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating therapy progress:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private extractInsights(messages: any[]): string[] {
    const insights: string[] = [];
    
    messages.forEach((message: any) => {
      if (message.message_type === 'ai' && message.therapeutic_technique) {
        // Extract key insights from AI responses
        const content = message.content.toLowerCase();
        if (content.includes('it sounds like') || content.includes('what i\'m hearing') || content.includes('it seems')) {
          insights.push(message.content.split('.')[0] + '.');
        }
      }
      
      if (message.message_type === 'user' && this.isImportantUserInsight(message.content)) {
        insights.push(`User realized: ${message.content.substring(0, 100)}...`);
      }
    });

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private extractThemes(messages: any[]): string[] {
    const themes = new Set<string>();
    
    messages.forEach((message: any) => {
      const content = message.content.toLowerCase();
      
      // Common therapy themes
      if (content.includes('anxiet') || content.includes('worry') || content.includes('fear')) themes.add('anxiety');
      if (content.includes('depress') || content.includes('sad') || content.includes('down')) themes.add('depression');
      if (content.includes('stress') || content.includes('overwhelm')) themes.add('stress');
      if (content.includes('relationship') || content.includes('family') || content.includes('friend')) themes.add('relationships');
      if (content.includes('work') || content.includes('job') || content.includes('career')) themes.add('work');
      if (content.includes('confidence') || content.includes('self-esteem') || content.includes('worth')) themes.add('self-esteem');
      if (content.includes('goal') || content.includes('future') || content.includes('plan')) themes.add('goal-setting');
      if (content.includes('past') || content.includes('trauma') || content.includes('memory')) themes.add('past-experiences');
    });

    return Array.from(themes);
  }

  private extractBreakthroughs(messages: any[]): string[] {
    const breakthroughs: string[] = [];
    
    messages.forEach((message: any) => {
      if (message.message_type === 'user') {
        const content = message.content.toLowerCase();
        const breakthroughIndicators = [
          'i realize', 'i understand now', 'it makes sense', 'i see that',
          'i never thought', 'that\'s interesting', 'aha', 'breakthrough',
          'i get it now', 'this helps me understand'
        ];
        
        if (breakthroughIndicators.some(indicator => content.includes(indicator))) {
          breakthroughs.push(message.content);
        }
      }
    });

    return breakthroughs;
  }

  private generateProgressSummary(insights: string[], techniques: string[]): string {
    let summary = "Progress made in this session: ";
    
    if (insights.length > 0) {
      summary += `Gained ${insights.length} new insight${insights.length > 1 ? 's' : ''}. `;
    }
    
    if (techniques.length > 0) {
      summary += `Practiced ${techniques.join(', ')} technique${techniques.length > 1 ? 's' : ''}. `;
    }
    
    return summary;
  }

  private generateNextSteps(insights: string[], themes: string[]): string[] {
    const nextSteps: string[] = [];
    
    if (themes.includes('anxiety')) {
      nextSteps.push('Continue practicing breathing exercises daily');
      nextSteps.push('Notice anxiety triggers and write them down');
    }
    
    if (themes.includes('stress')) {
      nextSteps.push('Implement stress management techniques learned');
      nextSteps.push('Set boundaries to reduce overwhelming commitments');
    }
    
    if (themes.includes('relationships')) {
      nextSteps.push('Practice communication skills with loved ones');
      nextSteps.push('Reflect on relationship patterns discussed');
    }
    
    if (insights.length > 0) {
      nextSteps.push('Journal about the insights gained in this session');
    }
    
    return nextSteps.slice(0, 3); // Limit to 3 action items
  }

  private async getMilestonesAchieved(userId: string, days: number): Promise<string[]> {
    // This would check for specific achievements like:
    // - First session completed
    // - Consistent weekly sessions
    // - Mood improvement streaks
    // - Technique mastery
    
    const milestones: string[] = [];
    
    // Check session consistency
    const { data: sessions } = await this.supabase
      .from('therapy_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .gte('started_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (sessions && sessions.length >= 4) {
      milestones.push('Consistent weekly sessions');
    }
    
    if (sessions && sessions.length >= 1) {
      milestones.push('Active engagement in therapy');
    }

    return milestones;
  }

  private async getAreasOfGrowth(userId: string, days: number): Promise<string[]> {
    const { data: messages } = await this.supabase
      .from('therapy_messages')
      .select('therapeutic_technique')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .not('therapeutic_technique', 'is', null);

    const techniques = [...new Set((messages || []).map((m: any) => m.therapeutic_technique))];
    const growthAreas = techniques.map((technique: any) => `Developing ${technique} skills`);
    
    return growthAreas;
  }

  private async getStrengthsIdentified(userId: string, days: number): Promise<string[]> {
    // This would analyze positive patterns and achievements
    return [
      'Self-awareness and reflection',
      'Willingness to try new approaches',
      'Commitment to personal growth'
    ];
  }

  private async createMemoryEntry(entry: {
    user_id: string;
    content: string;
    categories: string[];
    metadata: any;
  }): Promise<boolean> {
    try {
      // Generate embedding for the content (simplified)
      const embedding = await this.generateEmbedding(entry.content);

      const { error } = await this.supabase
        .from('memories')
        .insert([{
          user_id: entry.user_id,
          content: entry.content,
          embedding: embedding,
          categories: entry.categories,
          metadata: entry.metadata,
          language: entry.metadata.language || 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error creating memory entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating memory entry:', error);
      return false;
    }
  }

  private async generateEmbedding(content: string): Promise<number[]> {
    try {
      // This is a simplified embedding - in production, use OpenAI embeddings API
      const words = content.toLowerCase().split(/\s+/);
      const embedding = new Array(1536).fill(0);

      // Simple hash-based embedding
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const hash = this.hashString(word);
        embedding[hash % 1536] += 1;
      }

      // Normalize
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
    } catch (error) {
      console.error('Error generating embedding:', error);
      return new Array(1536).fill(0);
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isImportantUserInsight(content: string): boolean {
    const insightIndicators = [
      'i realize', 'i understand', 'i see that', 'i learned',
      'i discovered', 'it makes sense', 'i feel like', 'i think',
      'breakthrough', 'clarity', 'insight', 'understand now',
      'makes sense now', 'i get it', 'aha', 'eureka',
      'i never thought', 'this helps me', 'now i see'
    ];

    const lowerContent = content.toLowerCase();
    return insightIndicators.some(indicator => lowerContent.includes(indicator)) &&
           content.length > 20; // Ensure it's substantial
  }

  /**
   * Gets conversation history with memory context
   */
  async getEnrichedConversationHistory(sessionId: string, userId: string): Promise<{
    messages: any[];
    relatedMemories: any[];
    sessionInsights: string[];
  }> {
    try {
      // Get conversation messages
      const { data: messages, error: messagesError } = await this.supabase
        .from('therapy_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return { messages: [], relatedMemories: [], sessionInsights: [] };
      }

      // Get related memories
      const relatedMemories = await this.getTherapyMemoryContext(userId, 5);

      // Extract insights from messages
      const sessionInsights = messages
        ?.filter(msg => msg.message_type === 'ai' && msg.therapeutic_technique)
        .map(msg => msg.therapeutic_technique)
        .filter((technique, index, arr) => arr.indexOf(technique) === index) || [];

      return {
        messages: messages || [],
        relatedMemories,
        sessionInsights
      };
    } catch (error) {
      console.error('Error getting enriched conversation history:', error);
      return { messages: [], relatedMemories: [], sessionInsights: [] };
    }
  }
}

export default EnhancedTherapyMemoryIntegration; 