"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Search, 
  Users, 
  Target, 
  Sparkles,
  TrendingUp,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Filter,
  Calendar,
  BarChart3,
  Send,
  Plus,
  Settings,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/memory-framework/config";
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

interface LeadSearch {
  id: string;
  title: string;
  search_prompt: string;
  platforms: string[];
  industry_focus?: string;
  target_audience?: string;
  status: "pending" | "running" | "completed" | "failed";
  results_count: number;
  created_at: string;
  last_search_at?: string;
}

interface LeadResult {
  id: string;
  platform: string;
  title: string;
  content: string;
  author_info: { name: string };
  source_url: string;
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  tags: string[];
  platform_insights: {
    pain_points?: string[];
    decision_maker_indicators?: string[];
    engagement_potential?: number;
  };
  engagement_metrics: {
    score: number;
    comments: number;
    upvote_ratio?: number;
  };
  created_at: string;
  is_contacted: boolean;
  search?: {
    id: string;
    title: string;
    search_prompt: string;
    platforms: string[];
    industry_focus?: string;
    target_audience?: string;
    created_at: string;
  };
}

interface LeadMessage {
  id: string;
  lead_result_id: string;
  message_type: "initial_outreach" | "follow_up" | "custom";
  message_content: string;
  tone: "professional" | "casual" | "friendly" | "technical";
  is_sent: boolean;
  created_at: string;
}

const urgencyColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  urgent: 'bg-red-100 text-red-700 border-red-300'
};

const platformIcons = {
  reddit: { icon: '🔴', name: 'Reddit' },
  hackernews: { icon: '🧡', name: 'HackerNews' },
  youtube: { icon: '🔴', name: 'YouTube' },
  tiktok: { icon: '⚫', name: 'TikTok' },
  news: { icon: '📰', name: 'News' },
  websearch: { icon: '🔍', name: 'Web Search' }
};

export function AILeadsInterface() {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchPrompt, setSearchPrompt] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['reddit']);
  const [industryFocus, setIndustryFocus] = useState('all');
  const [targetAudience, setTargetAudience] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [lastSearchResults, setLastSearchResults] = useState<boolean>(false);
  const [currentSearchResults, setCurrentSearchResults] = useState<LeadResult[]>([]);
  const { handleSubscriptionError } = useSubscriptionGuard();
  
  // Data states
  const [leadSearches, setLeadSearches] = useState<LeadSearch[]>([]);
  const [leadResults, setLeadResults] = useState<LeadResult[]>([]);
  const [leadMessages, setLeadMessages] = useState<LeadMessage[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadResult | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<{[key: string]: LeadResult[]}>({});
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const supabase = getBrowserSupabaseClient();

  // Computed values for filtering
  const filteredLeads = leadResults.filter(lead => {
    // Urgency filter
    if (urgencyFilter !== 'all' && lead.urgency_level !== urgencyFilter) {
      return false;
    }
    
    // Score filter
    if (scoreFilter !== 'all') {
      const score = lead.lead_score;
      switch (scoreFilter) {
        case '90+':
          if (score < 90) return false;
          break;
        case '80+':
          if (score < 80) return false;
          break;
        case '70+':
          if (score < 70) return false;
          break;
        case '60+':
          if (score < 60) return false;
          break;
      }
    }
    
    return true;
  });

  // Load data on component mount
  useEffect(() => {
    loadLeadSearches();
    loadLeadResults();
    loadLeadMessages();
  }, []);

  const loadLeadSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_lead_searches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setLeadSearches(data || []);
    } catch (error) {
      logger.error('[AILeads] Failed to load searches:', error);
    }
  };

  const loadLeadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_lead_results')
        .select(`
          *,
          search:ai_lead_searches!inner(
            id,
            title,
            search_prompt,
            platforms,
            industry_focus,
            target_audience,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLeadResults(data || []);
      
      // Group results by search for history view
      const grouped = (data || []).reduce((acc: {[key: string]: LeadResult[]}, lead: LeadResult) => {
        const searchId = lead.search?.id || 'unknown';
        if (!acc[searchId]) {
          acc[searchId] = [];
        }
        acc[searchId].push(lead);
        return acc;
      }, {} as {[key: string]: LeadResult[]});
      
      setSearchHistory(grouped);
    } catch (error) {
      logger.error('[AILeads] Failed to load results:', error);
    }
  };

  const loadLeadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_lead_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setLeadMessages(data || []);
    } catch (error) {
      logger.error('[AILeads] Failed to load messages:', error);
    }
  };

  const loadCurrentSearchResults = async () => {
    try {
      // Get the most recent search for this user
      const { data: recentSearch, error: searchError } = await supabase
        .from('ai_lead_searches')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (searchError || !recentSearch) {
        setCurrentSearchResults([]);
        return;
      }

      // Get results for this search
      const { data, error } = await supabase
        .from('ai_lead_results')
        .select(`
          *,
          search:ai_lead_searches!inner(
            id,
            title,
            search_prompt,
            platforms,
            industry_focus,
            target_audience,
            created_at
          )
        `)
        .eq('search_id', recentSearch.id)
        .order('lead_score', { ascending: false });
      
      if (error) throw error;
      setCurrentSearchResults(data || []);
    } catch (error) {
      logger.error('[AILeads] Failed to load current search results:', error);
      setCurrentSearchResults([]);
    }
  };

  const handleSearch = async () => {
    if (!searchPrompt.trim() || selectedPlatforms.length === 0) {
      toast({
        title: "Invalid Search",
        description: "Please provide a search prompt and select at least one platform",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setSearchProgress(0);

    try {
      const response = await fetch('/api/ai-leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_prompt: searchPrompt,
          platforms: selectedPlatforms,
          industry_focus: industryFocus === 'all' ? undefined : industryFocus,
          target_audience: targetAudience || undefined,
          urgency_filter: urgencyFilter as any,
          limit: 20
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle subscription errors
        if (handleSubscriptionError(errorData)) {
          throw new Error('Subscription required');
        }
        
        throw new Error('Search failed');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Search Completed!",
          description: `Found ${result.data.total_leads} potential leads`,
        });
        
        // Refresh data and load current search results
        await loadLeadSearches();
        await loadCurrentSearchResults();
        setLastSearchResults(true);
        // Don't switch tabs - keep user in Discovery to see results
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      logger.error('[AILeads] Search failed:', error);
      toast({
        title: "Search Failed",
        description: "An error occurred while searching for leads",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setSearchProgress(0);
    }
  };

  const handleGenerateMessage = async (lead: LeadResult, messageType: string = 'initial_outreach') => {
    setGeneratingMessage(true);
    
    try {
      const response = await fetch('/api/ai-leads/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_result_id: lead.id,
          message_type: messageType,
          tone: 'professional'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle subscription errors
        if (handleSubscriptionError(errorData)) {
          throw new Error('Subscription required');
        }
        
        throw new Error('Message generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Message Generated!",
          description: "Your personalized message is ready",
        });
        
        await loadLeadMessages();
      } else {
        throw new Error(result.error || 'Message generation failed');
      }
    } catch (error) {
      logger.error('[AILeads] Message generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate personalized message",
        variant: "destructive"
      });
    } finally {
      setGeneratingMessage(false);
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy message to clipboard",
        variant: "destructive"
      });
    }
  };

  const getLeadMessagesForResult = (leadId: string) => {
    return leadMessages.filter(msg => msg.lead_result_id === leadId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="discover" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Discover</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Results</span>
                {leadResults.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {leadResults.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Messages</span>
                {leadMessages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {leadMessages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="discover" className="mt-0 h-full">
              <ScrollArea className="h-full p-4">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-4">
                      <Search className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Find Your Perfect Leads</h2>
                    <p className="text-muted-foreground mb-6">
                      Use AI to discover and analyze potential customers across multiple platforms
                    </p>
                  </div>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Search Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="search-prompt">What type of leads are you looking for?</Label>
                        <Textarea
                          id="search-prompt"
                          placeholder="e.g., 'Small business owners struggling with website performance and looking for optimization solutions'"
                          value={searchPrompt}
                          onChange={(e) => setSearchPrompt(e.target.value)}
                          className="min-h-[100px]"
                          disabled={isSearching}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Industry Focus (Optional)</Label>
                          <Select value={industryFocus} onValueChange={setIndustryFocus} disabled={isSearching}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Industry</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="ecommerce">E-commerce</SelectItem>
                              <SelectItem value="saas">SaaS</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="realestate">Real Estate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Target Audience (Optional)</Label>
                          <Input
                            placeholder="e.g., 'decision makers', 'founders', 'CTOs'"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            disabled={isSearching}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Platforms to Search</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(platformIcons).map(([platform, { icon, name }]) => (
                            <div key={platform} className="flex items-center space-x-2">
                              <Checkbox
                                id={platform}
                                checked={selectedPlatforms.includes(platform)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPlatforms([...selectedPlatforms, platform]);
                                  } else {
                                    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                                  }
                                }}
                                disabled={isSearching}
                              />
                              <Label htmlFor={platform} className="flex items-center gap-2 cursor-pointer">
                                <span>{icon}</span>
                                {name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Urgency Level</Label>
                        <Select value={urgencyFilter} onValueChange={setUrgencyFilter} disabled={isSearching}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {isSearching && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Searching platforms...</span>
                            <span className="text-sm text-muted-foreground">{Math.round(searchProgress)}%</span>
                          </div>
                          <Progress value={searchProgress} className="h-2" />
                        </div>
                      )}

                      <Button 
                        onClick={handleSearch} 
                        disabled={isSearching || !searchPrompt.trim() || selectedPlatforms.length === 0}
                        className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Find Leads
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Current Search Results */}
                  {currentSearchResults.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold text-green-900 dark:text-green-100">Search Results Found!</h3>
                          </div>
                          <Button onClick={() => setActiveTab('results')} variant="outline" size="sm">
                            <Target className="h-4 w-4 mr-2" />
                            View All
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-green-800 dark:text-green-200">Query:</span>
                            <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded border text-gray-700 dark:text-gray-300">
                              "{currentSearchResults[0]?.search?.search_prompt}"
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-3">
                            <div>
                              <div className="text-lg font-bold text-green-600">{currentSearchResults.length}</div>
                              <div className="text-xs text-muted-foreground">Total Leads</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-blue-600">{currentSearchResults.filter(l => l.lead_score >= 80).length}</div>
                              <div className="text-xs text-muted-foreground">High Quality</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-600">{currentSearchResults.filter(l => l.urgency_level === 'urgent' || l.urgency_level === 'high').length}</div>
                              <div className="text-xs text-muted-foreground">Urgent</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-600">{Math.round(currentSearchResults.reduce((sum, lead) => sum + lead.lead_score, 0) / currentSearchResults.length) || 0}</div>
                              <div className="text-xs text-muted-foreground">Avg Score</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Results Preview */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Top Leads Preview</h4>
                          <Badge variant="secondary">{currentSearchResults.length} total</Badge>
                        </div>
                        
                        {currentSearchResults.slice(0, 3).map((lead, index) => (
                          <Card key={lead.id} className="glass-card hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {platformIcons[lead.platform as keyof typeof platformIcons]?.icon || '🔍'}
                                  </span>
                                  <Badge variant="outline" className={cn("text-xs", urgencyColors[lead.urgency_level])}>
                                    {lead.urgency_level}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    Score: {lead.lead_score}/100
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    #{index + 1}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => window.open(lead.source_url, '_blank')}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    onClick={() => handleGenerateMessage(lead)}
                                    disabled={generatingMessage}
                                    size="sm"
                                  >
                                    {generatingMessage ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                    )}
                                    Message
                                  </Button>
                                </div>
                              </div>
                              
                              <h4 className="font-medium mb-2 line-clamp-2">{lead.title}</h4>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lead.content}</p>
                              
                              {/* Why This Lead Matches */}
                              {lead.platform_insights.pain_points && lead.platform_insights.pain_points.length > 0 && (
                                <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                                  <div className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">
                                    🎯 Why this matches:
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {lead.platform_insights.pain_points.slice(0, 2).map((point, pointIndex) => (
                                      <Badge key={pointIndex} variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                        {point}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>by {lead.author_info.name}</span>
                                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {currentSearchResults.length > 3 && (
                          <Button 
                            onClick={() => setActiveTab('results')} 
                            variant="outline" 
                            className="w-full"
                          >
                            View All {currentSearchResults.length} Leads
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="results" className="mt-0 h-full">
              <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Search History</h3>
                    <Button onClick={loadLeadResults} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {Object.keys(searchHistory).length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No search history yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start by searching for leads in the Discover tab
                      </p>
                      <Button onClick={() => setActiveTab('discover')} variant="outline">
                        <Search className="mr-2 h-4 w-4" />
                        Start Searching
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(searchHistory)
                        .sort(([,a], [,b]) => new Date(b[0]?.search?.created_at || '').getTime() - new Date(a[0]?.search?.created_at || '').getTime())
                        .map(([searchId, results]) => {
                          const searchData = results[0]?.search;
                          if (!searchData) return null;
                          
                          return (
                            <Card key={searchId} className="glass-card">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Search className="h-5 w-5 text-blue-600" />
                                      <h4 className="font-semibold">Search Results</h4>
                                      <Badge variant="secondary" className="text-xs">
                                        {results.length} leads
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium text-blue-800 dark:text-blue-200">Query:</span>
                                        <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded border text-gray-700 dark:text-gray-300">
                                          "{searchData.search_prompt}"
                                        </span>
                                      </div>
                                      
                                      <div className="flex flex-wrap gap-2 text-sm">
                                        <span className="font-medium text-blue-800 dark:text-blue-200">Platforms:</span>
                                        {searchData.platforms.map(platform => (
                                          <Badge key={platform} variant="secondary" className="text-xs">
                                            {platformIcons[platform as keyof typeof platformIcons]?.icon} {platformIcons[platform as keyof typeof platformIcons]?.name}
                                          </Badge>
                                        ))}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-medium text-blue-800 dark:text-blue-200">Date:</span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                          {new Date(searchData.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                      <div className="text-lg font-bold text-blue-600">{results.length}</div>
                                      <div className="text-xs text-muted-foreground">Total</div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold text-green-600">{results.filter(l => l.lead_score >= 80).length}</div>
                                      <div className="text-xs text-muted-foreground">High Quality</div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold text-orange-600">{results.filter(l => l.urgency_level === 'urgent' || l.urgency_level === 'high').length}</div>
                                      <div className="text-xs text-muted-foreground">Urgent</div>
                                    </div>
                                    <div>
                                      <div className="text-lg font-bold text-purple-600">{Math.round(results.reduce((sum, lead) => sum + lead.lead_score, 0) / results.length) || 0}</div>
                                      <div className="text-xs text-muted-foreground">Avg Score</div>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="space-y-3">
                                  {results
                                    .sort((a, b) => b.lead_score - a.lead_score)
                                    .map((lead, index) => (
                                    <Card key={lead.id} className="border-l-4 border-l-blue-500 bg-muted/30">
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                              {platformIcons[lead.platform as keyof typeof platformIcons]?.icon || '🔍'}
                                            </span>
                                            <Badge variant="outline" className={cn("text-xs", urgencyColors[lead.urgency_level])}>
                                              {lead.urgency_level}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                              Score: {lead.lead_score}/100
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              #{index + 1}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              onClick={() => window.open(lead.source_url, '_blank')}
                                              variant="outline"
                                              size="sm"
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              View
                                            </Button>
                                            <Button
                                              onClick={() => handleGenerateMessage(lead)}
                                              disabled={generatingMessage}
                                              size="sm"
                                            >
                                              {generatingMessage ? (
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                              ) : (
                                                <MessageSquare className="h-3 w-3 mr-1" />
                                              )}
                                              Message
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        <h4 className="font-medium mb-2 line-clamp-2">{lead.title}</h4>
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lead.content}</p>
                                        
                                        {/* Why This Lead Matches */}
                                        {lead.platform_insights.pain_points && lead.platform_insights.pain_points.length > 0 && (
                                          <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                                            <div className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">
                                              🎯 Why this matches your search:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {lead.platform_insights.pain_points.slice(0, 3).map((point, pointIndex) => (
                                                <Badge key={pointIndex} variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                                  {point}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>by {lead.author_info.name}</span>
                                          <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="messages" className="mt-0 h-full">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Messages</h3>
                    <Button onClick={loadLeadMessages} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {leadMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No messages generated yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Generate personalized messages from your lead results
                      </p>
                      <Button onClick={() => setActiveTab('results')} variant="outline">
                        <Target className="mr-2 h-4 w-4" />
                        View Results
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {leadMessages.map((message) => (
                        <Card key={message.id} className="glass-card">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {message.message_type.replace('_', ' ')}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {message.tone}
                                </Badge>
                                {message.is_sent && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    Sent
                                  </Badge>
                                )}
                              </div>
                              <Button
                                onClick={() => copyToClipboard(message.message_content, message.id)}
                                variant="outline"
                                size="sm"
                              >
                                {copiedMessageId === message.id ? (
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                Copy
                              </Button>
                            </div>
                            
                            <div className="bg-muted/30 rounded-lg p-3 mb-3">
                              <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              Generated on {new Date(message.created_at).toLocaleDateString()}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 h-full">
              <ScrollArea className="h-full p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Lead Analytics</h3>
                    <p className="text-muted-foreground">
                      Track your lead generation performance and insights
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {leadResults.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Leads</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-500 mb-1">
                          {leadResults.filter(l => l.lead_score >= 80).length}
                        </div>
                        <div className="text-sm text-muted-foreground">High Quality</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-500 mb-1">
                          {leadResults.filter(l => l.urgency_level === 'urgent' || l.urgency_level === 'high').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Urgent Leads</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="glass-card">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-500 mb-1">
                          {leadMessages.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Messages Generated</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 text-center">
                    <BarChart3 className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Advanced Analytics Coming Soon</h3>
                    <p className="text-muted-foreground">
                      Detailed performance metrics, conversion tracking, and ROI analysis will be available soon.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
} 