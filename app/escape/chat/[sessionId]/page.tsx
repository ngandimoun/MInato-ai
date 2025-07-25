"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import TherapyOrchestrator from '@/lib/core/therapy-orchestrator';
import { 
  Heart, 
  Send, 
  Volume2, 
  VolumeX, 
  AlertTriangle,
  ArrowLeft, 
  User, 
  Bot,
  Sparkles,
  MessageSquare,
  Clock,
  Wind,
  Waves,
  Phone,
  MessageCircle,
  Zap,
  SendHorizonal
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape";

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
  created_at: string;
  therapeutic_technique?: string;
  intervention_type?: string;
}

interface TherapySession {
  id: string;
  user_id: string;
  title: string;
  language: string;
  status: string;
  started_at: string;
  settings: {
    voice_enabled: boolean;
    auto_save: boolean;
    background_sounds: boolean;
    session_reminders: boolean;
  };
}

interface Exercise {
  type: 'breathing' | 'grounding' | 'cognitive-reframing';
  title: string;
  steps: string[];
  duration?: number;
}

// Crisis resources
const CRISIS_RESOURCES = [
  {
    name: "National Suicide Prevention Lifeline",
    phone: "988",
    description: "24/7 confidential support"
  },
  {
    name: "Crisis Text Line",
    phone: "Text HOME to 741741",
    description: "Free, 24/7 crisis support via text"
  },
  {
    name: "Emergency Services",
    phone: "911",
    description: "For immediate medical emergencies"
  }
];

export default function TherapyChatPage() {
  const [currentView, setCurrentView] = useState<View>("escape");
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  // State
  const [messages, setMessages] = useState<TherapyMessage[]>([]);
  const [session, setSession] = useState<TherapySession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [backgroundSounds, setBackgroundSounds] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [exerciseStep, setExerciseStep] = useState(0);
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const orchestratorRef = useRef<TherapyOrchestrator | null>(null);

  // Initialize therapy session
  useEffect(() => {
    if (user && sessionId) {
      initializeSession();
    }
  }, [user, sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Background sounds
  useEffect(() => {
    if (backgroundSounds) {
      // Add subtle ambient sounds (placeholder for now)
      console.log('Starting ambient sounds...');
    } else {
      console.log('Stopping ambient sounds...');
    }
  }, [backgroundSounds]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      
      // Check if this is a temporary session
      const isTempSession = sessionId.startsWith('temp-');
      
      if (isTempSession) {
        // For temp sessions, create a basic session object
        const tempSession: TherapySession = {
          id: sessionId,
          user_id: user?.id || '',
          title: 'Therapy Session',
          language: 'en',
          status: 'active',
          started_at: new Date().toISOString(),
          settings: {
            voice_enabled: true,
            auto_save: true,
            background_sounds: false,
            session_reminders: true
          }
        };
        setSession(tempSession);
        
        // Add welcome message for first-time users
        const welcomeMessage: TherapyMessage = {
          id: `welcome-${Date.now()}`,
          session_id: sessionId,
          user_id: 'ai',
          content: "Hello. I'm here to listen. To start, just tell me a little about what's on your mind today.",
          message_type: 'ai',
          content_type: 'text',
          language: 'en',
          created_at: new Date().toISOString(),
          therapeutic_technique: 'opening_greeting'
        };
        setMessages([welcomeMessage]);
        
        console.log('Using temporary session mode');
      } else {
        // Try to initialize with orchestrator for real sessions
        try {
          orchestratorRef.current = new TherapyOrchestrator(sessionId, user?.id || '');
          
          // Set up event handlers
          orchestratorRef.current.setOnMessageReceived((message) => {
            setMessages(prev => [...prev, message]);
            setIsTyping(false);
          });

          orchestratorRef.current.setOnSessionUpdated((updatedSession) => {
            setSession(updatedSession);
          });

          // Initialize session
          const { session: sessionData } = await orchestratorRef.current.initialize();
          setSession(sessionData);

          // Load conversation history
          const history = await orchestratorRef.current.getConversationHistory();
          setMessages(history);
        } catch (orchestratorError) {
          console.warn('Orchestrator failed, using fallback mode:', orchestratorError);
          // Fallback to temp session mode
          const tempSession: TherapySession = {
            id: sessionId,
            user_id: user?.id || '',
            title: 'Therapy Session',
            language: 'en',
            status: 'active',
            started_at: new Date().toISOString(),
            settings: {
              voice_enabled: true,
              auto_save: true,
              background_sounds: false,
              session_reminders: true
            }
          };
          setSession(tempSession);
        }
      }

    } catch (error) {
      console.error('Error initializing session:', error);
      router.push('/escape');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isSending) return;

    // Check for duplicate message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 
        lastMessage.message_type === 'user' && 
        lastMessage.content === trimmedMessage) {
      console.log('Preventing duplicate message send');
      return;
    }

    // Check for crisis keywords
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself', 'self-harm', 'not worth living'];
    const containsCrisisKeyword = crisisKeywords.some(keyword => 
      inputMessage.toLowerCase().includes(keyword)
    );

    if (containsCrisisKeyword) {
      setShowCrisisDialog(true);
      return;
    }

    await sendUnifiedMessage(inputMessage.trim(), 'text');
  };

  const sendUnifiedMessage = async (content: string, contentType: 'text' | 'voice', audioUrl?: string, audioDuration?: number) => {
    if (isSending) return;

    setIsSending(true);
    setIsTyping(true);
    
    // Create temp message ID for cleanup
    const tempMessageId = `temp-${Date.now()}`;
    
    try {
      if (contentType === 'text') {
        setInputMessage('');
      }
      
      // Add user message to UI immediately with optimistic updates
      const tempUserMessage: TherapyMessage = {
        id: tempMessageId,
        session_id: sessionId,
        user_id: user?.id || '',
        content: content,
        message_type: 'user',
        content_type: contentType,
        audio_url: audioUrl,
        audio_duration_seconds: audioDuration,
        transcript: contentType === 'voice' ? content : undefined,
        language: session?.language || 'en',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send to unified API
      const response = await fetch('/api/escape/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: content,
          messageType: contentType,
          audioUrl,
          audioDuration
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Replace temp message with real messages from database
        setMessages(prev => {
          // Remove temp message and any potential duplicates
          const filtered = prev.filter(msg => 
            msg.id !== tempMessageId && 
            msg.id !== result.userMessage.id && 
            msg.id !== result.aiMessage.id
          );
          return [...filtered, result.userMessage, result.aiMessage];
        });

        // Check if AI suggests an exercise
        const aiContent = result.aiMessage.content.toLowerCase();
        if (aiContent.includes('breathing exercise') || aiContent.includes('let\'s try breathing')) {
          setTimeout(() => {
            startBreathingExercise();
          }, 2000);
        } else if (aiContent.includes('grounding') || aiContent.includes('look around')) {
          setTimeout(() => {
            startGroundingExercise();
          }, 2000);
        } else if (aiContent.includes('reframe') || aiContent.includes('think about this differently')) {
          setTimeout(() => {
            startCognitiveReframing();
          }, 2000);
        }
      } else {
        console.error('Failed to send message:', result.error);
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  // Exercise functions
  const startBreathingExercise = () => {
    const exercise: Exercise = {
      type: 'breathing',
      title: '4-7-8 Breathing',
      steps: [
        'Place your tongue against the roof of your mouth',
        'Breathe in through your nose for 4 counts',
        'Hold your breath for 7 counts',
        'Exhale through your mouth for 8 counts',
        'Repeat 3 more times'
      ],
      duration: 60
    };
    setCurrentExercise(exercise);
    setExerciseStep(0);
  };

  const startGroundingExercise = () => {
    const exercise: Exercise = {
      type: 'grounding',
      title: '5-4-3-2-1 Grounding',
      steps: [
        'Name 5 things you can see around you',
        'Name 4 things you can touch',
        'Name 3 things you can hear',
        'Name 2 things you can smell',
        'Name 1 thing you can taste'
      ]
    };
    setCurrentExercise(exercise);
    setExerciseStep(0);
  };

  const startCognitiveReframing = () => {
    const exercise: Exercise = {
      type: 'cognitive-reframing',
      title: 'Thought Reframing',
      steps: [
        'What is the negative thought you\'re having?',
        'What evidence supports this thought?',
        'What evidence contradicts this thought?',
        'What would you tell a friend in this situation?',
        'Create a more balanced, realistic thought'
      ]
    };
    setCurrentExercise(exercise);
    setExerciseStep(0);
  };

  const nextExerciseStep = () => {
    if (currentExercise && exerciseStep < currentExercise.steps.length - 1) {
      setExerciseStep(exerciseStep + 1);
    } else {
      setCurrentExercise(null);
      setExerciseStep(0);
    }
  };

  const endSession = async () => {
    if (orchestratorRef.current) {
      await orchestratorRef.current.endSession();
    }
    router.push('/escape');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-slate-600 dark:text-slate-300">Preparing your sanctuary...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md mx-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Session not found</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                This therapy session could not be found or you don't have access to it.
              </p>
              <Button onClick={() => router.push('/escape')} className="bg-gradient-to-r from-blue-500 to-indigo-500">
                Return to Escape
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      {/* Crisis Dialog */}
      <AlertDialog open={showCrisisDialog} onOpenChange={setShowCrisisDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              You're not alone
            </AlertDialogTitle>
            <AlertDialogDescription>
              It looks like you need more support than I can offer right now. Please connect with one of these resources immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            {CRISIS_RESOURCES.map((resource, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{resource.name}</p>
                    <p className="text-xs text-muted-foreground">{resource.description}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => window.open(`tel:${resource.phone}`, '_self')}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCrisisDialog(false)}>
              Continue Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exercise Overlay */}
      <AnimatePresence>
        {currentExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCurrentExercise(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl mx-4"
            >
              {currentExercise.type === 'breathing' ? (
                <div className="text-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center"
                  >
                    <Wind className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                  </motion.div>
                  <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">{currentExercise.title}</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                      {currentExercise.steps[exerciseStep]}
                    </p>
                    <div className="flex justify-center gap-2">
                      {currentExercise.steps.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index === exerciseStep ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <Button onClick={nextExerciseStep} className="w-full">
                      {exerciseStep === currentExercise.steps.length - 1 ? 'Complete' : 'Next'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                    <Waves className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">{currentExercise.title}</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                      {currentExercise.steps[exerciseStep]}
                    </p>
                    <Button onClick={nextExerciseStep} className="w-full">
                      {exerciseStep === currentExercise.steps.length - 1 ? 'Complete' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col overflow-hidden pt-16 sm:pt-20">
        {/* Session Header - Fixed */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="px-2 sm:px-4 py-3 sm:py-4 border-b border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm flex-shrink-0"
        >
          <div className="container max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/escape')}
                className="flex items-center gap-1 sm:gap-2 hover:bg-white/20 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-medium text-base sm:text-lg text-slate-800 dark:text-white truncate">{session.title}</h1>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="hidden sm:inline">{formatTime(session.started_at)}</span>
                      <span className="sm:hidden">{new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {session.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Crisis/Help Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCrisisDialog(true)}
                className="border-red-200 hover:bg-red-50 text-red-600 p-2 sm:px-3"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Help</span>
              </Button>
              
              <Button 
                variant={backgroundSounds ? "default" : "outline"} 
                size="sm"
                onClick={() => setBackgroundSounds(!backgroundSounds)}
                className="hover:bg-white/20 p-2 sm:px-3"
              >
                {backgroundSounds ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={endSession} className="hover:bg-white/20 p-2 sm:px-3">
                <span className="hidden sm:inline">End</span>
                <span className="sm:hidden">X</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Messages Container - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-6 space-y-3 sm:space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`flex gap-4 ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.message_type === 'ai' && (
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          delay: index * 0.2
                        }}
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    
                    <div className={`max-w-[90vw] sm:max-w-2xl ${message.message_type === 'user' ? 'order-first' : ''}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-2xl p-3 sm:p-6 ${
                          message.message_type === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white ml-6 sm:ml-12 shadow-lg' 
                            : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-md border border-white/20 hover:shadow-lg transition-shadow duration-200'
                        }`}
                      >

                        
                                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                            {message.content.split('\n\n').map((paragraph, index) => {
                              // Check if it's a numbered list item
                              if (paragraph.match(/^\d+\.\s+\*\*.*\*\*/)) {
                                return (
                                  <div key={index} className="mb-3">
                                    <div className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-sm">
                                        {paragraph.match(/^\d+/)?.[0] || '1'}
                                      </span>
                                      <div className="flex-1">
                                        {paragraph.replace(/^\d+\.\s+/, '').split('**').map((part, i) => (
                                          i % 2 === 1 ? 
                                            <strong key={i} className="font-medium text-blue-600 dark:text-blue-400">{part}</strong> : 
                                            <span key={i}>{part}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              // Check if it's a bullet point
                              else if (paragraph.startsWith('•')) {
                                return (
                                  <div key={index} className="flex items-start gap-3 mb-3 pl-4">
                                    <span className="text-blue-500">•</span>
                                    <div>{paragraph.slice(2)}</div>
                                  </div>
                                );
                              }
                              // Regular paragraph with bold text support
                              else {
                                return (
                                  <p key={index} className="mb-3 last:mb-0">
                                    {paragraph.split('**').map((part, i) => (
                                      i % 2 === 1 ? 
                                        <strong key={i} className="font-medium text-blue-600 dark:text-blue-400">{part}</strong> : 
                                        <span key={i}>{part}</span>
                                    ))}
                                  </p>
                                );
                              }
                            })}
                          </div>
                        
                        <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-white/20">
                          <div className="flex items-center gap-1 sm:gap-2">
                            {message.therapeutic_technique && (
                              <Badge variant="outline" className="text-xs border-white/30">
                                <span className="hidden sm:inline">{message.therapeutic_technique}</span>
                                <span className="sm:hidden">{message.therapeutic_technique.split('_')[0]}</span>
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs opacity-70">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                    
                    {message.message_type === 'user' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Thoughtful Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 justify-start"
                >
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-sm border border-white/20">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Listening...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
        
        {/* Input Area - Fixed */}
        <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-2 sm:p-6 border-t border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm flex-shrink-0"
            >
              <div className="w-full max-w-4xl mx-auto">
              {/* Processing indicator */}
              <AnimatePresence>
                {isSending && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="mb-4 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                      />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Sending your message...
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share what's on your mind..."
                  className="min-h-[50px] sm:min-h-[80px] max-h-[100px] sm:max-h-[160px] resize-none pr-12 rounded-2xl border-2 border-white/30 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:border-blue-400/50 transition-all duration-300 text-sm sm:text-base"
                  disabled={isSending}
                />
                
                {/* Send button inside textarea */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute bottom-2 right-2"
                >
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-2 border-blue-400/50 shadow-lg"
                  >
                    {isSending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <SendHorizonal className="w-3 h-3" />
                    )}
                  </Button>
                </motion.div>
                
                {/* Character indicator for longer messages */}
                {inputMessage.length > 100 && (
                  <div className="absolute bottom-2 right-12 text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg">
                    {inputMessage.length}
                  </div>
                )}
              </div>
            </div>
            </motion.div>
        </main>
    </div>
  );
}