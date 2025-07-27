"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-provider';
import { Header } from '@/components/header';
import { useNavigation } from '@/context/navigation-context';
import { Sparkles, Waves, Wind, Heart, Shield, Sun, Users, Briefcase, Star, Cloud, Moon } from 'lucide-react';

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape" | "evasion";

export default function EscapePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isNavigating } = useNavigation();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("escape");
  
  // Fallback categories when database is not ready
  const fallbackCategories = [
    {
      id: 'general-therapy',
      name: 'General Therapy',
      description: 'Open conversation and emotional support',
      icon_name: 'heart',
      color_theme: 'blue',
      sort_order: 1
    },
    {
      id: 'anxiety-support',
      name: 'Anxiety Support',
      description: 'Managing anxiety and stress',
      icon_name: 'shield',
      color_theme: 'green',
      sort_order: 2
    },
    {
      id: 'depression-support',
      name: 'Depression Support',
      description: 'Coping with depression and low mood',
      icon_name: 'sun',
      color_theme: 'yellow',
      sort_order: 3
    },
    {
      id: 'relationship-guidance',
      name: 'Relationship Guidance',
      description: 'Improving relationships and communication',
      icon_name: 'users',
      color_theme: 'pink',
      sort_order: 4
    },
    {
      id: 'work-stress',
      name: 'Work Stress',
      description: 'Managing workplace stress and burnout',
      icon_name: 'briefcase',
      color_theme: 'purple',
      sort_order: 5
    },
    {
      id: 'self-esteem',
      name: 'Self-Esteem',
      description: 'Building confidence and self-worth',
      icon_name: 'star',
      color_theme: 'orange',
      sort_order: 6
    },
    {
      id: 'grief-support',
      name: 'Grief Support',
      description: 'Processing loss and grief',
      icon_name: 'cloud',
      color_theme: 'gray',
      sort_order: 7
    },
    {
      id: 'sleep-issues',
      name: 'Sleep Issues',
      description: 'Improving sleep and rest',
      icon_name: 'moon',
      color_theme: 'indigo',
      sort_order: 8
    },
    {
      id: 'couple-therapy',
      name: 'Couple Therapy',
      description: 'Create couple conversations and invite partners to participate',
      icon_name: 'users',
      color_theme: 'rose',
      sort_order: 9
    }
  ];

  useEffect(() => {
    async function loadTherapyCategories() {
      setIsLoading(true);
      try {
        const supabase = getBrowserSupabaseClient();
        const { data, error } = await supabase
          .from('therapy_categories')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (error) {
          console.error('Error loading therapy categories:', error);
          setCategories(fallbackCategories);
        } else {
          setCategories(data && data.length > 0 ? data : fallbackCategories);
        }
      } catch (err) {
        console.error('Failed to load therapy categories:', err);
        setCategories(fallbackCategories);
      } finally {
        setIsLoading(false);
      }
    }

    loadTherapyCategories();
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === 'couple-therapy') {
      router.push('/escape/couple-therapy');
    } else {
      router.push(`/escape/setup?category=${categoryId}`);
    }
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // Background gradient animation
  const backgroundVariants = {
    animate: {
      backgroundPosition: ['0% 0%', '100% 100%'],
      transition: {
        duration: 20,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'reverse' as const
      }
    }
  };

  // Text fade-in animation
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8,
        delay: 0.3,
        ease: 'easeOut'
      }
    }
  };

  // Button animation
  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        delay: 0.8,
        ease: 'easeOut'
      }
    },
    hover: { 
      scale: 1.05,
      boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
      transition: { 
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    tap: { 
      scale: 0.98,
      transition: { 
        duration: 0.1,
        ease: 'easeOut'
      }
    }
  };

  // Floating elements animation
  const floatingElementVariants = {
    animate: (i: number) => ({
      y: [0, -15, 0],
      rotate: [0, i % 2 === 0 ? 5 : -5, 0],
      transition: {
        duration: 4 + (i * 0.5),
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'reverse' as const
      }
    })
  };

  // Icon mapping
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'heart':
        return <Heart className="w-8 h-8" />;
      case 'shield':
        return <Shield className="w-8 h-8" />;
      case 'sun':
        return <Sun className="w-8 h-8" />;
      case 'users':
        return <Users className="w-8 h-8" />;
      case 'briefcase':
        return <Briefcase className="w-8 h-8" />;
      case 'star':
        return <Star className="w-8 h-8" />;
      case 'cloud':
        return <Cloud className="w-8 h-8" />;
      case 'moon':
        return <Moon className="w-8 h-8" />;
      case 'waves':
        return <Waves className="w-8 h-8" />;
      case 'wind':
        return <Wind className="w-8 h-8" />;
      default:
        return <Sparkles className="w-8 h-8" />;
    }
  };

  return (
    <>
      <Header currentView={currentView} onViewChange={handleViewChange} />
      
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
        variants={backgroundVariants}
        animate="animate"
        style={{
          backgroundSize: '200% 200%'
        }}
      >
        <div className="container mx-auto px-4 pt-20 pb-16 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
          {/* Decorative floating elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + (i * 15)}%`,
                  top: `${10 + (i * 12)}%`,
                  opacity: 0.5,
                  zIndex: 0
                }}
                variants={floatingElementVariants}
                animate="animate"
                custom={i}
              >
                <div className={`w-${4 + i} h-${4 + i} rounded-full bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-500 dark:to-indigo-500 blur-lg`} />
              </motion.div>
            ))}
          </div>
          
          <div className="relative z-10 max-w-3xl w-full text-center">
            {/* Welcome Text */}
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="mb-8"
            >
              <h1 className="text-4xl md:text-5xl font-light text-slate-800 dark:text-white mb-4">
                Welcome.
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-2">
                A private space to think and reflect.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Your conversations are end-to-end encrypted and for your eyes only.
              </p>
            </motion.div>
            
            {/* Begin Button */}
            <motion.div
              variants={buttonVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              whileTap="tap"
              className="mb-16"
            >
              <button 
                onClick={() => handleCategorySelect('general-therapy')}
                className="px-12 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-lg font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isLoading || isNavigating}
              >
                Begin
              </button>
            </motion.div>
            
            {/* Subtle category cards (only shown if more than one category exists) */}
            {categories.length > 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="w-full"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Or explore specific areas:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 + (index * 0.1), duration: 0.5 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-${category.color_theme || 'blue'}-100 dark:bg-${category.color_theme || 'blue'}-900/30 text-${category.color_theme || 'blue'}-500`}>
                        {getIcon(category.icon_name)}
                      </div>
                      <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {category.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
} 