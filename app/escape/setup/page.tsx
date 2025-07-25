"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-provider';
import { Header } from '@/components/header';
import { v4 as uuidv4 } from 'uuid';
import { 
  Heart, ArrowRight, ArrowLeft, Check, 
  UserCircle2, Globe, MessageSquare, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape";

// Language options
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ar', name: 'Arabic (العربية)' }
];

// Communication styles
const COMMUNICATION_STYLES = [
  { id: 'supportive', name: 'Supportive', description: 'Warm, encouraging, and validating approach' },
  { id: 'direct', name: 'Direct', description: 'Clear, straightforward, and honest feedback' },
  { id: 'exploratory', name: 'Exploratory', description: 'Curious, reflective, and insight-oriented' },
  { id: 'solution-focused', name: 'Solution-Focused', description: 'Practical, goal-oriented, and action-based' }
];

function TherapySetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>("escape");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [preferredName, setPreferredName] = useState('');
  const [gender, setGender] = useState('');
  const [language, setLanguage] = useState('en');
  const [communicationStyle, setCommunicationStyle] = useState('supportive');
  
  // Get category from URL params
  const categoryId = searchParams.get('category') || 'general-therapy';

  // Load existing profile and check for active sessions
  useEffect(() => {
    if (!user) return;
    
    loadExistingProfile();
    checkForActiveSessions();
  }, [user]);

  const checkForActiveSessions = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      const { data: sessions, error } = await supabase
        .from('therapy_sessions')
        .select('id, title, started_at')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking active sessions:', error);
        return;
      }

      // If there's an active session, redirect to it
      if (sessions && sessions.length > 0) {
        const latestSession = sessions[0];
        console.log('Found active session:', latestSession.id);
        router.push(`/escape/chat/${latestSession.id}`);
      }
    } catch (err) {
      console.error('Failed to check active sessions:', err);
    }
  };
  
  const loadExistingProfile = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('user_therapy_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading therapy profile:', error);
        return;
      }
      
      if (data) {
        setPreferredName(data.preferred_name || '');
        setGender(data.gender || '');
        setLanguage(data.preferred_language || 'en');
        setCommunicationStyle(data.communication_style || 'supportive');
      }
    } catch (err) {
      console.error('Failed to load therapy profile:', err);
    }
  };
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to continue.');
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const supabase = getBrowserSupabaseClient();
      
      // Save or update user therapy profile
      const profileData = {
        user_id: user.id,
        preferred_name: preferredName,
        gender,
        preferred_language: language,
        communication_style: communicationStyle,
        updated_at: new Date().toISOString()
      };
      
      // Try to save to database first
      try {
        const { error: profileError } = await supabase
          .from('user_therapy_profiles')
          .upsert(profileData, { onConflict: 'user_id' });
          
        if (profileError) {
          console.error('Error saving therapy profile:', profileError);
          // Continue with fallback - we'll save to localStorage
        }
      } catch (dbError) {
        console.error('Database error saving profile:', dbError);
        // Continue with fallback
      }
      
      // Save to localStorage as fallback
      localStorage.setItem('therapy_profile', JSON.stringify({
        ...profileData,
        saved_at: new Date().toISOString()
      }));
      
      // Check for existing active session first
      const { data: existingSessions, error: checkError } = await supabase
        .from('therapy_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('Error checking existing sessions:', checkError);
      }

      let sessionId;
      let sessionCreated = false;

      if (existingSessions && existingSessions.length > 0) {
        // Use existing session
        sessionId = existingSessions[0].id;
        sessionCreated = true;

        // Update the session with new preferences
        const { error: updateError } = await supabase
          .from('therapy_sessions')
          .update({
            language: language,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('Error updating existing session:', updateError);
        }
      } else {
        // Create a new session
        sessionId = uuidv4();
        try {
          const { error: sessionError } = await supabase
            .from('therapy_sessions')
            .insert({
              id: sessionId,
              user_id: user.id,
              category_id: categoryId,
              title: `${preferredName}'s Therapy Session`,
              session_type: 'general',
              status: 'active',
              language: language,
              started_at: new Date().toISOString(),
              ai_personality: 'empathetic',
              therapy_approach: 'cognitive-behavioral'
            });
            
          if (sessionError) {
            console.error('Error creating therapy session:', sessionError);
            // We'll use a temporary session ID
          } else {
            sessionCreated = true;
          }
        } catch (sessionDbError) {
          console.error('Database error creating session:', sessionDbError);
          // We'll use a temporary session ID
        }
      }
      
      // If session creation failed, use a temporary ID with a prefix
      const finalSessionId = sessionCreated ? sessionId : `temp-${sessionId}`;
      
      // Save temporary session info to localStorage
      if (!sessionCreated) {
        localStorage.setItem('temp_therapy_session', JSON.stringify({
          id: finalSessionId,
          user_id: user.id,
          category_id: categoryId,
          title: `${preferredName}'s Therapy Session`,
          language: language,
          communication_style: communicationStyle,
          started_at: new Date().toISOString()
        }));
      }
      
      // Navigate to the chat page
      router.push(`/escape/chat/${finalSessionId}`);
    } catch (err) {
      console.error('Error in setup process:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };
  
  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.6 } },
    exit: { opacity: 0, transition: { duration: 0.4 } }
  };
  
  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.4 } }
  };
  
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeIn"
      }
    })
  };
  
  // Progress indicator
  const ProgressIndicator = () => (
    <div className="flex justify-center mb-8">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`w-3 h-3 mx-1 rounded-full ${i === step ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-900'}`}
          animate={{
            scale: i === step ? [1, 1.2, 1] : 1,
            opacity: i === step ? 1 : 0.6
          }}
          transition={{
            duration: 0.5,
            repeat: i === step ? Infinity : 0,
            repeatType: "reverse"
          }}
        />
      ))}
    </div>
  );
  
  // Direction for animations
  const [direction, setDirection] = useState(0);
  
  const goToNextStep = () => {
    if (step < 4) {
      setDirection(1);
      setStep(step + 1);
    }
  };
  
  const goToPrevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };
  
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="container mx-auto px-4 pt-20 pb-16 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${20 + (i * 15)}%`,
                top: `${15 + (i * 10)}%`,
                opacity: 0.4,
                zIndex: 0
              }}
              animate={{
                y: [0, -15, 0],
                rotate: [0, i % 2 === 0 ? 5 : -5, 0],
              }}
              transition={{
                duration: 4 + (i * 0.5),
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <div className={`w-${3 + i} h-${3 + i} rounded-full bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-500 dark:to-indigo-500 blur-lg`} />
            </motion.div>
          ))}
        </div>
        
        <div className="relative z-10 w-full max-w-md mx-auto">
          <motion.div 
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ProgressIndicator />
            
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 && (
                  <motion.div
                    key="step1"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                        <UserCircle2 size={32} />
                      </div>
                      <h2 className="text-2xl font-medium text-slate-800 dark:text-white">What name would you like me to call you?</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">
                        This helps create a more personal connection
                      </p>
                    </div>
                    
                    <div>
                      <Input
                        type="text"
                        placeholder="Your preferred name"
                        value={preferredName}
                        onChange={(e) => setPreferredName(e.target.value)}
                        className="text-lg text-center py-6"
                        required
                      />
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        type="button" 
                        onClick={goToNextStep}
                        disabled={!preferredName.trim()}
                        className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {step === 2 && (
                  <motion.div
                    key="step2"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                        <Heart size={32} />
                      </div>
                      <h2 className="text-2xl font-medium text-slate-800 dark:text-white">How do you identify?</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">
                        This helps me better understand your perspective
                      </p>
                    </div>
                    
                    <RadioGroup value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-4">
                      <div>
                        <RadioGroupItem value="male" id="male" className="peer sr-only" />
                        <Label
                          htmlFor="male"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-100 hover:text-slate-900 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:bg-blue-900/30 [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          Male
                        </Label>
                      </div>
                      
                      <div>
                        <RadioGroupItem value="female" id="female" className="peer sr-only" />
                        <Label
                          htmlFor="female"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-100 hover:text-slate-900 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:bg-blue-900/30 [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          Female
                        </Label>
                      </div>
                      
                      <div>
                        <RadioGroupItem value="non-binary" id="non-binary" className="peer sr-only" />
                        <Label
                          htmlFor="non-binary"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-100 hover:text-slate-900 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:bg-blue-900/30 [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          Non-binary
                        </Label>
                      </div>
                      
                      <div>
                        <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" className="peer sr-only" />
                        <Label
                          htmlFor="prefer-not-to-say"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-100 hover:text-slate-900 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:bg-blue-900/30 [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          Prefer not to say
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    <div className="pt-4 flex justify-between">
                      <Button 
                        type="button" 
                        onClick={goToPrevStep}
                        variant="outline"
                        className="px-6"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>
                      
                      <Button 
                        type="button" 
                        onClick={goToNextStep}
                        disabled={!gender}
                        className="px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {step === 3 && (
                  <motion.div
                    key="step3"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                        <Globe size={32} />
                      </div>
                      <h2 className="text-2xl font-medium text-slate-800 dark:text-white">What language do you prefer?</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">
                        I'll communicate with you in this language
                      </p>
                    </div>
                    
                    <div>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="pt-4 flex justify-between">
                      <Button 
                        type="button" 
                        onClick={goToPrevStep}
                        variant="outline"
                        className="px-6"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>
                      
                      <Button 
                        type="button" 
                        onClick={goToNextStep}
                        disabled={!language}
                        className="px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {step === 4 && (
                  <motion.div
                    key="step4"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                        <MessageSquare size={32} />
                      </div>
                      <h2 className="text-2xl font-medium text-slate-800 dark:text-white">How would you like me to communicate?</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Choose the style that feels right for you
                      </p>
                    </div>
                    
                    <RadioGroup value={communicationStyle} onValueChange={setCommunicationStyle} className="grid grid-cols-1 gap-3">
                      {COMMUNICATION_STYLES.map((style) => (
                        <div key={style.id}>
                          <RadioGroupItem value={style.id} id={style.id} className="peer sr-only" />
                          <Label
                            htmlFor={style.id}
                            className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-100 hover:text-slate-900 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:bg-blue-900/30 [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <div className="font-medium">{style.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{style.description}</div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <div className="pt-4 flex justify-between">
                      <Button 
                        type="button" 
                        onClick={goToPrevStep}
                        variant="outline"
                        className="px-6"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                      </Button>
                      
                      <Button 
                        type="submit"
                        disabled={loading || !communicationStyle}
                        className="px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                            />
                            Starting...
                          </>
                        ) : (
                          <>
                            Begin Session
                            <Sparkles className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TherapySetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TherapySetupContent />
    </Suspense>
  );
} 