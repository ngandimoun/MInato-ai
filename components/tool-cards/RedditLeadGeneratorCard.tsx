"use client";

import React, { useState } from "react";
import { RedditLeadGeneratorOutput, RedditLead } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  ThumbsUp, 
  ExternalLink, 
  CalendarClock, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Eye, 
  Users, 
  Zap, 
  MessageCircle, 
  Mail, 
  Copy, 
  CheckCircle,
  Star,
  BarChart3,
  Brain,
  Clock,
  DollarSign,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface RedditLeadGeneratorCardProps { 
  data: RedditLeadGeneratorOutput; 
}

const LeadItem: React.FC<{lead: RedditLead, index: number}> = ({ lead, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "from-green-500 to-emerald-500";
    if (confidence >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'high': return "bg-red-500/10 text-red-600 border-red-500/20";
      case 'medium': return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case 'low': return "bg-green-500/10 text-green-600 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getIntentIcon = (intent: string) => {
    switch(intent) {
      case 'seeking_help': return <Target size={14} className="text-blue-500" />;
      case 'asking_questions': return <MessageCircle size={14} className="text-green-500" />;
      case 'expressing_frustration': return <AlertCircle size={14} className="text-red-500" />;
      case 'looking_for_solutions': return <Brain size={14} className="text-purple-500" />;
      default: return <Eye size={14} className="text-gray-500" />;
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300",
        "bg-gradient-to-br from-background/80 to-background/40 dark:from-background/90 dark:to-background/60",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
        "hover:scale-[1.01] hover:-translate-y-1"
      )}>
        {/* Gradient background overlay on hover */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300"
          animate={{ opacity: isHovered ? 1 : 0 }}
        />

        <div className="relative z-10 space-y-4">
          {/* Header: Title, Author, Confidence */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <motion.a
                  href={lead.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
                  title={lead.title}
                  whileHover={{ x: 2 }}
                >
                  {lead.title}
                </motion.a>
                <div className="flex items-center gap-2 mt-1">
                  <motion.span
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
                    whileHover={{ scale: 1.05 }}
                  >
                    u/{lead.author}
                  </motion.span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">r/{lead.subreddit}</span>
                </div>
              </div>

              {/* Confidence Score */}
              <motion.div
                className="flex-shrink-0"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={cn(
                  "relative w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-sm",
                  "bg-gradient-to-br shadow-lg",
                  getConfidenceColor(lead.analysis.confidence)
                )}>
                  <div className="absolute inset-0 rounded-xl bg-white/20 backdrop-blur-sm" />
                  <div className="relative z-10 flex flex-col items-center">
                    <Star size={12} />
                    <span className="text-xs">{lead.analysis.confidence}%</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className={getUrgencyColor(lead.analysis.urgency)}>
                <Clock size={10} className="mr-1" />
                {lead.analysis.urgency} urgency
              </Badge>
              
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                {getIntentIcon(lead.analysis.intent)}
                <span className="ml-1">{lead.analysis.intent.replace('_', ' ')}</span>
              </Badge>

              <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                <CalendarClock size={10} className="mr-1" />
                {lead.relativeTime}
              </Badge>

              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                <ThumbsUp size={10} className="mr-1" />
                {lead.score}
              </Badge>

              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                <MessageSquare size={10} className="mr-1" />
                {lead.numComments}
              </Badge>
            </div>
          </div>

          {/* Pain Points */}
          {lead.analysis.painPoints.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500" />
                Pain Points
              </h4>
              <div className="flex flex-wrap gap-1">
                {lead.analysis.painPoints.map((point, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-red-500/5 text-red-600 border-red-500/20">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Budget & Decision Maker Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lead.analysis.budget_indicators.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <DollarSign size={14} className="text-green-500" />
                  Budget Signals
                </h4>
                <div className="space-y-1">
                  {lead.analysis.budget_indicators.map((indicator, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground bg-green-500/5 p-2 rounded border border-green-500/20">
                      {indicator}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lead.analysis.decision_maker_signals.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-500" />
                  Decision Maker Signals
                </h4>
                <div className="space-y-1">
                  {lead.analysis.decision_maker_signals.map((signal, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground bg-blue-500/5 p-2 rounded border border-blue-500/20">
                      {signal}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Post Content */}
          {lead.selfText && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Post Content</h4>
              <motion.div
                className={cn(
                  "text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border",
                  !isExpanded && "line-clamp-3"
                )}
                layout
              >
                {lead.selfText}
              </motion.div>
              {lead.selfText.length > 150 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 text-xs text-primary hover:text-primary/80"
                >
                  {isExpanded ? "Show Less" : "Read More"}
                </Button>
              )}
            </div>
          )}

          {/* Generated Messages */}
          {lead.generatedMessages && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" />
                AI-Generated Messages
              </h4>
              
              <Tabs defaultValue="dm" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dm" className="text-xs">
                    <Mail size={12} className="mr-1" />
                    Direct Message
                  </TabsTrigger>
                  <TabsTrigger value="comment" className="text-xs">
                    <MessageCircle size={12} className="mr-1" />
                    Public Comment
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="dm" className="space-y-2">
                  <div className="relative">
                    <div className="text-sm text-foreground bg-blue-500/5 p-3 rounded-lg border border-blue-500/20">
                      {lead.generatedMessages.dm}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(lead.generatedMessages!.dm, "DM")}
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      {copiedField === "DM" ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="comment" className="space-y-2">
                  <div className="relative">
                    <div className="text-sm text-foreground bg-green-500/5 p-3 rounded-lg border border-green-500/20">
                      {lead.generatedMessages.comment}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(lead.generatedMessages!.comment, "Comment")}
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      {copiedField === "Comment" ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                    <strong>Strategy:</strong> {lead.generatedMessages.reasoning}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <motion.a
              href={lead.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink size={14} className="mr-2" />
                View Post
              </Button>
            </motion.a>
            
            <motion.a
              href={`https://reddit.com/user/${lead.author}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="outline" size="sm" className="w-full">
                <Users size={14} className="mr-2" />
                View Profile
              </Button>
            </motion.a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export function RedditLeadGeneratorCard({ data }: RedditLeadGeneratorCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No lead generation data available.</p>;

  const leadIcon = (
    <motion.div
      whileHover={{ rotate: 5, scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Target className="text-blue-500" size={24} />
    </motion.div>
  );

  const avgConfidence = data.leads.length > 0 
    ? Math.round(data.leads.reduce((sum, lead) => sum + lead.analysis.confidence, 0) / data.leads.length)
    : 0;

  const urgencyDistribution = data.leads.reduce((acc, lead) => {
    acc[lead.analysis.urgency] = (acc[lead.analysis.urgency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "w-full relative overflow-hidden",
        "bg-gradient-to-br from-background to-background/80",
        "backdrop-blur-sm border-border/50",
        "shadow-lg dark:shadow-primary/5"
      )}>
        {/* Header */}
        <CardHeader className="relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <div className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-xl">
              {leadIcon}
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Reddit Lead Generation
              </span>
            </CardTitle>
            <CardDescription className="text-base mt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" />
                  <span>
                    Analyzed {data.totalPostsAnalyzed} posts • Found {data.leadsFound} qualified leads
                  </span>
                </div>
                
                {data.leadsFound > 0 && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <TrendingUp size={12} className="mr-1" />
                      {avgConfidence}% avg confidence
                    </Badge>
                    
                    {Object.entries(urgencyDistribution).map(([urgency, count]) => (
                      <Badge key={urgency} variant="outline" className="text-xs">
                        {count} {urgency} urgency
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {data.error && (
            <motion.div 
              className="flex items-center gap-3 text-destructive text-sm p-4 mx-6 mb-4 bg-destructive/10 rounded-xl border border-destructive/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={20}/> 
              <div>
                <p className="font-semibold">Error in Lead Generation</p>
                <p className="text-xs opacity-80">{data.error}</p>
              </div>
            </motion.div>
          )}
          
          {!data.error && data.leads && data.leads.length > 0 ? (
            <ScrollArea className="h-[800px] px-6">
              <div className="space-y-4 pb-6">
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                  <strong>Search Criteria:</strong> {data.query.searchPrompt}
                  {data.query.productOrService && (
                    <>
                      <br />
                      <strong>Product/Service:</strong> {data.query.productOrService}
                    </>
                  )}
                  {data.query.targetAudience && (
                    <>
                      <br />
                      <strong>Target Audience:</strong> {data.query.targetAudience}
                    </>
                  )}
                  <br />
                  <strong>Subreddits:</strong> {data.query.subreddits.join(", ")}
                </div>
                
                <div className="space-y-3">
                  {data.leads.map((lead, index) => (
                    <LeadItem key={lead.id} lead={lead} index={index} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : (
            !data.error && (
              <div className="text-center py-12 px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="mx-auto text-muted-foreground/50 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <p className="text-muted-foreground">No qualified leads found matching your criteria</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your search prompt or targeting different subreddits</p>
                </motion.div>
              </div>
            )
          )}
        </CardContent>

        {data.leads && data.leads.length > 0 && (
          <CardFooter className="text-xs text-muted-foreground justify-center pt-4 border-t border-border/50 bg-muted/30">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2"
            >
              <Brain size={12} />
              AI-powered lead analysis with personalized messaging
            </motion.p>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
} 