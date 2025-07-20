"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Sparkles, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'
import { cn } from '@/lib/utils'

interface PlanStatusFloatingProps {
  className?: string
}

export function PlanStatusFloating({ className }: PlanStatusFloatingProps) {
  const { subscriptionStatus, loading } = useSubscription()
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')

  // Use a ref for the timeout to prevent re-creation on each render
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getMessage = useCallback(() => {
    if (!subscriptionStatus) return ''
    
    if (subscriptionStatus.is_trial) {
      return `Trial Period: ${subscriptionStatus.days_remaining} days remaining.`
    } else if (subscriptionStatus.is_pro) {
      return `You are a Pro member. Thank you!`
    } else if (subscriptionStatus.is_expired) {
      return `Your subscription has expired.`
    }
    
    return ''
  }, [subscriptionStatus])

  // Update the message whenever the subscription status changes
  useEffect(() => {
    const message = getMessage()
    setCurrentMessage(message)
  }, [getMessage, subscriptionStatus])


  // Simplified click logic to toggle the view
  const handleToggle = () => {
    setIsExpanded(prev => !prev)

    // If opening, set an auto-close timer for 8 seconds
    if (!isExpanded) {
      // Clear any existing timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setIsExpanded(false)
      }, 8000)
    } else {
      // If closing manually, cancel the auto-close timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }

  // Clean up the timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (loading || !subscriptionStatus || !currentMessage) {
    return null
  }

  const getIcon = () => {
    if (subscriptionStatus.is_trial) return <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
    if (subscriptionStatus.is_pro) return <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
    if (subscriptionStatus.is_expired) return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
  }

  const getThemeClasses = () => {
    if (subscriptionStatus.is_trial) return 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
    if (subscriptionStatus.is_pro) return 'bg-purple-100 dark:bg-purple-900/50 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
    if (subscriptionStatus.is_expired) return 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
    return 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
  }

  return (
    // Main container using flex to align the message and button
    <div className={cn("fixed bottom-4 right-4 z-50 flex items-center gap-2", className)}>
      
      {/* The message panel that appears and disappears */}
      <AnimatePresence>
        {isExpanded && (
          // Animate the width for a slide-out effect from the right
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto', transition: { type: 'spring', stiffness: 100, damping: 20 } }}
            exit={{ opacity: 0, width: 0 }}
            // Styles to ensure the width animation works correctly
            className={cn(
              "overflow-hidden whitespace-nowrap rounded-lg shadow-lg border",
              getThemeClasses()
            )}
          >
            {/* Inner container for padding, so it's not affected by width: 0 */}
            <div className="flex items-center gap-3 px-4 py-3">
              {getIcon()}
              <span className="text-sm font-medium">
                {currentMessage}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* The permanent button is now the chevron */}
      <motion.button
        onClick={handleToggle}
        // Animate the chevron's rotation
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "w-10 h-10 rounded-full shadow-sm border flex items-center justify-center cursor-pointer flex-shrink-0",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
          getThemeClasses(),
          "hover:shadow-xl active:scale-95 hover:scale-105"
        )}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Close notification" : "Open notification"}
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>
    </div>
  )
}