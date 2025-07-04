"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain, 
  AlertCircle, 
  Sparkles,
  FileText,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  BarChart3,
  Star,
  Zap,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/memory-framework/config";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  documents_available: number;
  images_available: number;
  transactions_available: number;
  analyses_available: number;
}

export function InsightsChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    addMessage({
      id: 'welcome',
      role: 'assistant',
      content: "Hi there! 👋 I'm your AI insights assistant. I can help you understand your business data, analyze documents, and provide actionable recommendations. What would you like to explore today?",
      timestamp: new Date()
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    if (!messageToSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    addMessage(userMessage);
    setInput("");
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/insights/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          chat_history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      addMessage(assistantMessage);
      setContext(result.context);

    } catch (error: any) {
      logger.error('[InsightsChat] Error:', error);
      setError(error.message || 'Failed to send message');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again or rephrase your question. 🤔",
        timestamp: new Date()
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    sendMessage(suggestion);
  };

  const suggestedQuestions = [
    {
      icon: <BarChart3 className="h-4 w-4" />,
      text: "What insights can you provide from my documents?",
      category: "Analysis"
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      text: "How is my business performing financially?",
      category: "Finance"
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      text: "What are the key trends in my data?",
      category: "Trends"
    },
    {
      icon: <Camera className="h-4 w-4" />,
      text: "Analyze the charts and graphs in my images",
      category: "Visual Data"
    },
    {
      icon: <ImageIcon className="h-4 w-4" />,
      text: "Extract key metrics from uploaded visuals",
      category: "Image Analysis"
    },
    {
      icon: <Lightbulb className="h-4 w-4" />,
      text: "What recommendations do you have for improvement?",
      category: "Advice"
    },
    {
      icon: <FileText className="h-4 w-4" />,
      text: "Summarize my recent business activities",
      category: "Summary"
    },
    {
      icon: <Star className="h-4 w-4" />,
      text: "What are my biggest opportunities?",
      category: "Growth"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/30 rounded-xl border">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-6 border-b bg-background/50 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-lg border border-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Insights Assistant</h2>
            <p className="text-sm text-muted-foreground">Ask me anything about your business data</p>
          </div>
        </div>
        {context && (
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {context.documents_available}
            </Badge>
            {context.images_available > 0 && (
              <Badge variant="outline" className="gap-1">
                <ImageIcon className="h-3 w-3" />
                {context.images_available}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {context.transactions_available}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Brain className="h-3 w-3" />
              {context.analyses_available}
            </Badge>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === 'user' ? 'order-2' : 'order-1'
                }`}
              >
                <div
                  className={`relative p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto rounded-br-md'
                      : 'bg-card border shadow-sm rounded-bl-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded-full">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 p-1.5 bg-primary-foreground/20 rounded-full">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border shadow-sm p-4 rounded-2xl rounded-bl-md max-w-[85%]">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded-full">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {showSuggestions && messages.length <= 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  💡 Try asking me about:
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedQuestions.map((question, index) => (
                  <Card 
                    key={index}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 border-dashed border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30"
                    onClick={() => handleSuggestionClick(question.text)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                          {question.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="text-xs mb-2">
                            {question.category}
                          </Badge>
                          <p className="text-sm font-medium leading-relaxed">
                            {question.text}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-t">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t bg-background/50 backdrop-blur-sm rounded-b-xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your business data, insights, or recommendations..."
              disabled={loading}
              className="pr-12 py-3 text-sm border-border focus:border-primary rounded-xl bg-background"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            size="lg"
            className="px-6 gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Press Enter to send • Shift + Enter for new line
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by AI ✨
          </p>
        </div>
      </div>
    </div>
  );
} 