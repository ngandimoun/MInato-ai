"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { useAuth } from '@/context/auth-provider';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { 
  Moon, 
  Star, 
  Cloud, 
  Wind, 
  Heart, 
  ArrowLeft,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface WindDownEntry {
  id: string;
  userId: string;
  date: string;
  releaseText: string;
  gratitude?: string;
  tomorrowIntention?: string;
  completedAt: string;
}

export default function WindDownPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("escape");
  const [step, setStep] = useState(1);
  const [releaseText, setReleaseText] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [tomorrowIntention, setTomorrowIntention] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [todaysEntry, setTodaysEntry] = useState<WindDownEntry | null>(null);

  // Check if user has already done wind-down today
  useEffect(() => {
    if (user) {
      checkTodaysWindDown();
    }
  }, [user]);

  const checkTodaysWindDown = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('wind_down_entries')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error checking wind-down entry:', error);
        return;
      }

      if (data) {
        setTodaysEntry(data);
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Failed to check wind-down entry:', error);
    }
  };

  const handleRelease = async () => {
    if (!releaseText.trim()) return;

    setIsReleasing(true);

    // Simulate the text dissolving
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsReleasing(false);
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      await saveWindDownEntry();
    }
  };

  const saveWindDownEntry = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];
      
      const entry = {
        user_id: user?.id,
        date: today,
        release_text: releaseText,
        gratitude: gratitude,
        tomorrow_intention: tomorrowIntention,
        completed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('wind_down_entries')
        .insert([entry]);

      if (error) {
        console.error('Error saving wind-down entry:', error);
        // Save to localStorage as fallback
        const existingEntries = JSON.parse(localStorage.getItem('wind_down_entries') || '[]');
        existingEntries.push(entry);
        localStorage.setItem('wind_down_entries', JSON.stringify(existingEntries));
      }

      setIsComplete(true);
    } catch (error) {
      console.error('Failed to save wind-down entry:', error);
    }
  };

  const resetWindDown = () => {
    setStep(1);
    setReleaseText('');
    setGratitude('');
    setTomorrowIntention('');
    setIsComplete(false);
    setTodaysEntry(null);
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 1 } },
    exit: { opacity: 0, transition: { duration: 0.5 } }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      transition: {
        duration: 0.8,
        ease: "easeIn"
      }
    })
  };

  const dissolveVariants = {
    initial: { opacity: 1, scale: 1 },
    dissolving: {
      opacity: [1, 0.8, 0.5, 0.2, 0],
      scale: [1, 1.02, 1.05, 1.08, 1.1],
      y: [0, -10, -20, -30, -50],
      transition: {
        duration: 3,
        ease: "easeOut"
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md mx-4 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-center">
              <Moon className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Wind-Down Sanctuary</h2>
              <p className="text-blue-200 mb-4">
                Please sign in to access your private wind-down space.
              </p>
              <Button onClick={() => router.push('/escape')} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Return to Escape
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      {/* Floating stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
          >
            <Star className="w-1 h-1 text-blue-300" fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 pt-20 pb-16 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/escape')}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="p-4 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm border border-white/20"
            >
              <Moon className="w-8 h-8 text-blue-300" />
            </motion.div>
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
            Evening Wind-Down
          </h1>
          <p className="text-blue-200 text-lg">
            Let's put the day to rest together
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="w-full max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
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
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-400/20 backdrop-blur-sm border border-green-300/30 flex items-center justify-center"
                >
                  <CheckCircle className="w-12 h-12 text-green-300" />
                </motion.div>
                
                <h2 className="text-2xl font-medium text-white mb-4">
                  Well done
                </h2>
                <p className="text-blue-200 mb-6 leading-relaxed">
                  You've completed your evening wind-down ritual. 
                  Your thoughts have been released, and you're ready for peaceful rest.
                </p>
                
                {todaysEntry && (
                  <div className="text-left mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <p className="text-sm text-blue-300 mb-2">Today you released:</p>
                    <p className="text-white/80 italic">"{todaysEntry.releaseText}"</p>
                    {todaysEntry.gratitude && (
                      <>
                        <p className="text-sm text-blue-300 mt-3 mb-2">Grateful for:</p>
                        <p className="text-white/80">"{todaysEntry.gratitude}"</p>
                      </>
                    )}
                  </div>
                )}
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => router.push('/escape')} 
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  >
                    Return to Sanctuary
                  </Button>
                  <Button 
                    onClick={resetWindDown} 
                    variant="outline" 
                    className="w-full border-white/30 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start New Wind-Down
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`step-${step}`}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl"
              >
                {step === 1 && (
                  <div className="text-center space-y-6">
                    <motion.div
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-400/20 to-orange-400/20 backdrop-blur-sm border border-red-300/30 flex items-center justify-center"
                    >
                      <Cloud className="w-8 h-8 text-red-300" />
                    </motion.div>
                    
                    <div>
                      <h3 className="text-xl font-medium text-white mb-3">
                        Release what's weighing on you
                      </h3>
                      <p className="text-blue-200 mb-6">
                        Write down one thing you can let go of from today. 
                        Watch it dissolve and drift away.
                      </p>
                    </div>
                    
                    <div className="relative">
                      <motion.div
                        variants={dissolveVariants}
                        initial="initial"
                        animate={isReleasing ? "dissolving" : "initial"}
                      >
                        <Textarea
                          value={releaseText}
                          onChange={(e) => setReleaseText(e.target.value)}
                          placeholder="I want to let go of..."
                          className="w-full min-h-[120px] bg-white/5 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:border-blue-400/50 rounded-xl"
                          disabled={isReleasing}
                        />
                      </motion.div>
                      
                      {isReleasing && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="text-center">
                            <motion.div
                              animate={{ 
                                rotate: 360,
                                scale: [1, 1.2, 1]
                              }}
                              transition={{ 
                                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                                scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                              }}
                              className="w-12 h-12 mx-auto mb-2"
                            >
                              <Wind className="w-full h-full text-blue-300" />
                            </motion.div>
                            <p className="text-blue-200 text-sm">Letting go...</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleRelease}
                      disabled={!releaseText.trim() || isReleasing}
                      className="w-full bg-gradient-to-r from-red-500/80 to-orange-500/80 hover:from-red-600/80 hover:to-orange-600/80 backdrop-blur-sm"
                    >
                      {isReleasing ? 'Releasing...' : 'Release and Let Go'}
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="text-center space-y-6">
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
                      className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-400/20 backdrop-blur-sm border border-yellow-300/30 flex items-center justify-center"
                    >
                      <Heart className="w-8 h-8 text-yellow-300" />
                    </motion.div>
                    
                    <div>
                      <h3 className="text-xl font-medium text-white mb-3">
                        What are you grateful for?
                      </h3>
                      <p className="text-blue-200 mb-6">
                        End your day with appreciation. 
                        Name one thing that brought you joy or peace today.
                      </p>
                    </div>
                    
                    <Textarea
                      value={gratitude}
                      onChange={(e) => setGratitude(e.target.value)}
                      placeholder="Today I'm grateful for..."
                      className="w-full min-h-[120px] bg-white/5 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:border-yellow-400/50 rounded-xl"
                    />
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setStep(1)}
                        variant="outline"
                        className="flex-1 border-white/30 text-white hover:bg-white/10"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={() => setStep(3)}
                        className="flex-1 bg-gradient-to-r from-yellow-500/80 to-amber-500/80 hover:from-yellow-600/80 hover:to-amber-600/80 backdrop-blur-sm"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="text-center space-y-6">
                    <motion.div
                      animate={{ 
                        y: [0, -8, 0],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ 
                        duration: 2.5, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 backdrop-blur-sm border border-blue-300/30 flex items-center justify-center"
                    >
                      <Star className="w-8 h-8 text-blue-300" fill="currentColor" />
                    </motion.div>
                    
                    <div>
                      <h3 className="text-xl font-medium text-white mb-3">
                        Set tomorrow's intention
                      </h3>
                      <p className="text-blue-200 mb-6">
                        Plant a seed for tomorrow. 
                        What would you like to focus on or achieve?
                      </p>
                    </div>
                    
                    <Textarea
                      value={tomorrowIntention}
                      onChange={(e) => setTomorrowIntention(e.target.value)}
                      placeholder="Tomorrow I intend to..."
                      className="w-full min-h-[120px] bg-white/5 backdrop-blur-sm border-white/20 text-white placeholder-white/50 focus:border-blue-400/50 rounded-xl"
                    />
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setStep(2)}
                        variant="outline"
                        className="flex-1 border-white/30 text-white hover:bg-white/10"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={saveWindDownEntry}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        Complete Wind-Down
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
} 