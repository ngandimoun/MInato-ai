'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-provider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Search, 
  Target, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Zap,
  ArrowRight,
  Play,
  Sparkles,
  BarChart3,
  Filter,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Star,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PLATFORM_CAPABILITIES, DEFAULT_LEAD_PROMPTS, INDUSTRY_CATEGORIES, type LeadPrompt } from '@/lib/tools/leads/lead-prompts';
import { toast } from 'sonner';

interface LeadSearch {
  id: string;
  title: string;
  platform: string;
  searchPrompt: string;
  targetAudience: string;
  productOrService: string;
  searchConfig: any;
  createdAt: string;
  updatedAt: string;
}

interface LeadResult {
  id: string;
  searchId: string;
  platformId: string;
  title: string;
  content: string;
  author: string;
  url: string;
  platformData: any;
  confidenceScore: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  intent: string;
  painPoints: string[];
  createdAt: string;
}

interface LeadMessage {
  id: string;
  leadResultId: string;
  messageType: 'dm' | 'comment' | 'reply';
  generatedMessage: string;
  reasoning: string;
  isUsed: boolean;
  createdAt: string;
}

const urgencyColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

const platformIcons = {
  reddit: '🔴',
  hackernews: '🧡',
  youtube: '🔴',
  news: '📰',
  websearch: '🔍',
  tiktok: '🎵'
};

export default function AILeadsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [searchPrompt, setSearchPrompt] = useState('');
  const [productOrService, setProductOrService] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leadSearches, setLeadSearches] = useState<LeadSearch[]>([]);
  const [leadResults, setLeadResults] = useState<LeadResult[]>([]);
  const [leadMessages, setLeadMessages] = useState<LeadMessage[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<LeadPrompt | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      fetchLeadSearches();
    }
  }, [user]);

  const fetchLeadSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_lead_searches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeadSearches(data || []);
    } catch (error) {
      console.error('Error fetching lead searches:', error);
      toast.error('Failed to load search history');
    }
  };

  const fetchLeadResults = async (searchId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_lead_results')
        .select('*')
        .eq('search_id', searchId)
        .order('confidence_score', { ascending: false });
      
      if (error) throw error;
      setLeadResults(data || []);
    } catch (error) {
      console.error('Error fetching lead results:', error);
      toast.error('Failed to load lead results');
    }
  };

  const fetchLeadMessages = async (leadResultId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_lead_messages')
        .select('*')
        .eq('lead_result_id', leadResultId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeadMessages(data || []);
    } catch (error) {
      console.error('Error fetching lead messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSearch = async () => {
    if (!selectedPlatform || !searchPrompt || !productOrService || !targetAudience) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSearching(true);
    
    try {
      // Save search configuration
      const searchConfig = {
        platform: selectedPlatform,
        searchPrompt,
        productOrService,
        targetAudience,
        category: selectedCategory,
        timestamp: new Date().toISOString()
      };

      const { data: searchData, error: searchError } = await supabase
        .from('ai_lead_searches')
        .insert({
          title: `${selectedPlatform} - ${searchPrompt.substring(0, 50)}...`,
          platform: selectedPlatform,
          search_prompt: searchPrompt,
          target_audience: targetAudience,
          product_or_service: productOrService,
          search_config: searchConfig
        })
        .select()
        .single();

      if (searchError) throw searchError;

      // Execute lead search via API
      const response = await fetch('/api/ai-leads/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchId: searchData.id,
          platform: selectedPlatform,
          searchPrompt,
          productOrService,
          targetAudience,
          category: selectedCategory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute lead search');
      }

      const results = await response.json();
      
      toast.success(`Found ${results.leadsFound} potential leads!`);
      
      // Refresh data
      await fetchLeadSearches();
      if (results.leadsFound > 0) {
        await fetchLeadResults(searchData.id);
      }
      
      setActiveTab('results');
      
    } catch (error) {
      console.error('Error executing lead search:', error);
      toast.error('Failed to search for leads');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromptSelect = (prompt: LeadPrompt) => {
    setSelectedPrompt(prompt);
    setSelectedPlatform(prompt.platform);
    setSearchPrompt(prompt.searchPrompt);
    setSelectedCategory(prompt.category);
    if (prompt.targetAudience) {
      setTargetAudience(prompt.targetAudience);
    }
  };

  const copyMessage = async (message: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessageId(messageId);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const filteredPrompts = selectedCategory 
    ? DEFAULT_LEAD_PROMPTS.filter(prompt => prompt.category === selectedCategory)
    : DEFAULT_LEAD_PROMPTS;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Please sign in to access AI Leads
            </p>
            <Button className="w-full" onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Leads
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find high-quality leads across multiple platforms with AI-powered analysis and personalized message generation
          </p>
        </motion.div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            {/* Platform Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Choose Your Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(PLATFORM_CAPABILITIES).map(([key, platform]) => (
                      <motion.div
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPlatform === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPlatform(key)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{platform.icon}</span>
                          <h3 className="font-semibold">{platform.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {platform.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {platform.strengths.map((strength, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Search Configuration */}
            {selectedPlatform && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configure Your Search
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quick Templates */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Quick Templates</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filteredPrompts.slice(0, 6).map((prompt) => (
                          <Button
                            key={prompt.id}
                            variant={selectedPrompt?.id === prompt.id ? "default" : "outline"}
                            size="sm"
                            className="justify-start h-auto p-3"
                            onClick={() => handlePromptSelect(prompt)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{prompt.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {prompt.category}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRY_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Search Prompt */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Search Prompt <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        placeholder="Describe what kind of leads you're looking for..."
                        value={searchPrompt}
                        onChange={(e) => setSearchPrompt(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Product/Service */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Your Product/Service <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g., Website builder, Marketing automation tool..."
                        value={productOrService}
                        onChange={(e) => setProductOrService(e.target.value)}
                      />
                    </div>

                    {/* Target Audience */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Target Audience <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g., Small business owners, Developers, Content creators..."
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                      />
                    </div>

                    {/* Advanced Options */}
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="flex items-center gap-2"
                      >
                        <Filter className="w-4 h-4" />
                        Advanced Options
                        <ArrowRight className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} />
                      </Button>
                      
                      <AnimatePresence>
                        {showAdvancedOptions && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-4"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Time Filter</label>
                                <Select defaultValue="week">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="hour">Last Hour</SelectItem>
                                    <SelectItem value="day">Last Day</SelectItem>
                                    <SelectItem value="week">Last Week</SelectItem>
                                    <SelectItem value="month">Last Month</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Max Results</label>
                                <Select defaultValue="25">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="10">10 leads</SelectItem>
                                    <SelectItem value="25">25 leads</SelectItem>
                                    <SelectItem value="50">50 leads</SelectItem>
                                    <SelectItem value="100">100 leads</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Search Button */}
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !selectedPlatform || !searchPrompt || !productOrService || !targetAudience}
                      className="w-full h-12 text-lg"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Searching for leads...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5 mr-2" />
                          Find Leads
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Lead Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leadResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No leads found yet. Start a search to see results here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leadResults.map((lead) => (
                      <motion.div
                        key={lead.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{lead.title}</h3>
                            <p className="text-sm text-muted-foreground">by {lead.author}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={urgencyColors[lead.urgencyLevel]}>
                              {lead.urgencyLevel} urgency
                            </Badge>
                            <Badge variant="outline">
                              {lead.confidenceScore}% confidence
                            </Badge>
                          </div>
                        </div>
                        
                        {lead.content && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {lead.content.substring(0, 200)}...
                          </p>
                        )}
                        
                        {lead.painPoints.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Pain Points:</p>
                            <div className="flex flex-wrap gap-1">
                              {lead.painPoints.map((point, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {point}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchLeadMessages(lead.id)}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              View Messages
                            </Button>
                            {lead.url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(lead.url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View Original
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Generated Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leadMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No messages generated yet. Select a lead to view messages.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leadMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline">{message.messageType}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.generatedMessage, message.id)}
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-sm">{message.generatedMessage}</p>
                        </div>
                        
                        {message.reasoning && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Reasoning:</strong> {message.reasoning}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Search History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leadSearches.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No search history yet. Start your first search!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leadSearches.map((search) => (
                      <motion.div
                        key={search.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => fetchLeadResults(search.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{search.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {search.searchPrompt.substring(0, 100)}...
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{platformIcons[search.platform as keyof typeof platformIcons]}</span>
                            <Badge variant="outline">{search.platform}</Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            <strong>Target:</strong> {search.targetAudience}
                          </div>
                          <div>
                            {new Date(search.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 