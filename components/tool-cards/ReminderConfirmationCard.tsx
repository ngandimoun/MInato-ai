//components/tool-cards/ReminderConfirmationCard.tsx
'use client';

import React from 'react';
import { CheckCircle, Clock, Calendar, Tag, Flag, RefreshCw, Bell, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReminderConfirmationData {
  content: string;
  trigger_datetime_utc: string;
  recurrence_rule: string | null;
  category: string;
  priority: string;
  confirmation_message: string;
}

interface ReminderConfirmationCardProps {
  data: {
    result_type: string;
    source_api: string;
    content: string;
    trigger_datetime_utc: string;
    recurrence_rule: string | null;
    category: string;
    priority: string;
    confirmation_message: string;
  };
}

const ReminderConfirmationCard: React.FC<ReminderConfirmationCardProps> = ({ data }) => {
  const reminderDate = parseISO(data.trigger_datetime_utc);
  const formattedDate = format(reminderDate, 'MMMM d, yyyy');
  const formattedTime = format(reminderDate, 'h:mm a');
  const dayOfWeek = format(reminderDate, 'EEEE');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/80 text-white';
      case 'medium':
        return 'bg-yellow-500/80 text-white';
      case 'low':
        return 'bg-green-500/80 text-white';
      default:
        return 'bg-gray-500/80 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
        return <CheckCircle className="w-4 h-4" />;
      case 'habit':
        return <RefreshCw className="w-4 h-4" />;
      case 'medication':
        return <Bell className="w-4 h-4" />;
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      case 'goal':
        return <Flag className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'task':
        return 'text-blue-600 bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300';
      case 'habit':
        return 'text-purple-600 bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-300';
      case 'medication':
        return 'text-red-600 bg-red-100/80 dark:bg-red-900/30 dark:text-red-300';
      case 'appointment':
        return 'text-green-600 bg-green-100/80 dark:bg-green-900/30 dark:text-green-300';
      case 'goal':
        return 'text-yellow-600 bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'text-gray-600 bg-gray-100/80 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-xl overflow-hidden minato-glow relative"
    >
      {/* Card accent */}
      <span className="card-accent-left from-cyan-500/20 to-cyan-400/10" />
      <span className="card-accent-top from-cyan-500/20 to-cyan-400/10" />
      
      {/* Success Animation */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute -top-5 -right-5 w-20 h-20 bg-green-400/20 rounded-full"
      />
      
      {/* Header with Success Icon */}
      <div className="relative p-5 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="relative"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-cyan-400" />
              </div>
            </motion.div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Reminder Set!</h3>
              <p className="text-xs text-muted-foreground">Successfully scheduled</p>
            </div>
          </div>
          
          {/* Priority Badge */}
          <motion.div 
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "memory-chip text-[10px] font-medium uppercase tracking-wider",
              getPriorityColor(data.priority)
            )}
          >
            {data.priority}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 pt-3">
        {/* Reminder Content */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-4 p-3 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-sm rounded-lg border border-border/40"
        >
          <p className="text-foreground font-medium text-sm leading-relaxed">
            "{data.content}"
          </p>
        </motion.div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <motion.div 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center space-x-2 p-2.5 bg-white/30 dark:bg-neutral-900/30 rounded-lg"
          >
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-[10px] text-muted-foreground">Date</p>
              <p className="text-xs font-semibold text-foreground">{formattedDate}</p>
              <p className="text-[10px] text-muted-foreground">{dayOfWeek}</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center space-x-2 p-2.5 bg-white/30 dark:bg-neutral-900/30 rounded-lg"
          >
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-[10px] text-muted-foreground">Time</p>
              <p className="text-xs font-semibold text-foreground">{formattedTime}</p>
            </div>
          </motion.div>
        </div>

        {/* Category and Recurrence */}
        <div className="flex items-center justify-between">
          <motion.div 
            initial={{ x: -5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className={cn(
              "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs",
              getCategoryColor(data.category)
            )}
          >
            {getCategoryIcon(data.category)}
            <span className="font-medium capitalize">{data.category}</span>
          </motion.div>
          
          {data.recurrence_rule && (
            <motion.div 
              initial={{ x: 5, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center space-x-1.5 text-muted-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs">{data.recurrence_rule}</span>
            </motion.div>
          )}
        </div>

        {/* Motivational Message */}
        {data.confirmation_message.includes('💫') || data.confirmation_message.includes('🌟') || 
         data.confirmation_message.includes('✨') || data.confirmation_message.includes('🚀') || 
         data.confirmation_message.includes('💯') ? (
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-4 p-2.5 bg-gradient-to-r from-cyan-50/60 to-blue-50/60 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg"
          >
            <p className="text-xs text-foreground/90 font-medium text-center">
              {data.confirmation_message.split('\n\n')[1]}
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Bottom Decoration */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" 
      />
    </motion.div>
  );
};

export default ReminderConfirmationCard; 