'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Bot, User, Loader2, Video, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface VideoIntelligenceChatProps {
  streamId: string;
  streamName: string;
  streamStatus: string;
  onClose?: () => void;
}

export function VideoIntelligenceChat({ 
  streamId, 
  streamName, 
  streamStatus, 
  onClose 
}: VideoIntelligenceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load conversation history on component mount
  useEffect(() => {
    loadConversationHistory();
  }, [streamId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/video-intelligence/chat?stream_id=${streamId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.conversations || []);
      } else {
        throw new Error('Failed to load conversation history');
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/video-intelligence/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          stream_id: streamId,
          conversation_history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add AI response to messages
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev.slice(0, -1), tempUserMessage, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      
      // Remove the temporary user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 p-4 ${isUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-900/20'}`}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : 'bg-gray-600'
        }`}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {isUser ? 'You' : 'Minato AI'}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(message.created_at)}
            </span>
          </div>
          
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  };

  const suggestedQuestions = [
    "What did you detect in this video?",
    "Were there any security concerns?",
    "Tell me about the people in the video",
    "What objects were identified?",
    "What was the overall risk assessment?",
    "Were there any audio threats detected?",
    "What actions do you recommend?",
    "Can you explain the analysis results?"
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Video Intelligence Chat
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Video className="h-4 w-4" />
          <span className="truncate">{streamName}</span>
          <Badge className={getStatusColor(streamStatus)}>
            {streamStatus}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Messages Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 mb-4 border rounded-lg"
        >
          {isLoadingHistory ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-gray-600">Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto">
                <Bot className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Start a conversation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask me anything about your video analysis results
                </p>
              </div>
              
              {streamStatus === 'completed' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Try asking:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedQuestions.slice(0, 4).map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setInputMessage(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-900/20">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Minato AI</span>
                      <span className="text-xs text-gray-500">thinking...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Analyzing your video...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="space-y-3">
          {streamStatus !== 'completed' && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                {streamStatus === 'processing' 
                  ? 'Video is still being analyzed. You can ask questions, but results may be limited.'
                  : 'Video analysis not completed yet.'
                }
              </span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your video analysis..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {messages.length === 0 && streamStatus === 'completed' && (
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.slice(4).map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputMessage(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 