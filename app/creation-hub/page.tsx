//app/creation-hub/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { CreationHubPanel } from "@/components/creation-hub/creation-hub-panel";
import { CreationHubLoading } from "@/components/creation-hub/creation-hub-loading";
import { logger } from '@/memory-framework/config';
import { useNavigation } from "@/context/navigation-context";
import { Suspense } from "react";
import { Palette, Sparkles, Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define view type to match Header component
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

// Floating particles component for enhanced visual effects
const FloatingParticles = () => {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 4 + 3,
    color: ['from-purple-400/30', 'from-pink-400/30', 'from-blue-400/30', 'from-indigo-400/30'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 h-full overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full bg-gradient-to-r ${particle.color} to-transparent blur-sm`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, -15, 0],
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Enhanced gradient background component
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-blue-50/50 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-blue-900/20"
        animate={{
          background: [
            "linear-gradient(135deg, rgb(147 51 234 / 0.1) 0%, rgb(236 72 153 / 0.05) 50%, rgb(59 130 246 / 0.1) 100%)",
            "linear-gradient(135deg, rgb(236 72 153 / 0.1) 0%, rgb(59 130 246 / 0.05) 50%, rgb(147 51 234 / 0.1) 100%)",
            "linear-gradient(135deg, rgb(59 130 246 / 0.1) 0%, rgb(147 51 234 / 0.05) 50%, rgb(236 72 153 / 0.1) 100%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
    </div>
  );
};

// Loading component with motion effects
const EnhancedLoading = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground />
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <Palette className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h2
          className="text-xl font-semibold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Loading Creation Hub...
        </motion.h2>
        <motion.div
          className="flex items-center justify-center gap-2 text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
          <span>Preparing your creative workspace</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default function CreationHubPageWrapper() {
  return (
    <Suspense fallback={<EnhancedLoading />}>
      <CreationHubPage />
    </Suspense>
  );
}

function CreationHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigateWithLoading } = useNavigation();
  const [isClient, setIsClient] = useState(false);

  // Set up client-side rendering check
  useEffect(() => {
    setIsClient(true);
    logger.info('[Creation Hub Page] Page mounted');
  }, []);

  // Handle view changes from header navigation
  const handleViewChange = (view: View) => {
    logger.info('[Creation Hub Page] View change requested', { view });

    switch (view) {
      case "chat":
        navigateWithLoading("/chat", "Loading chat...");
        break;
      case "memory":
        navigateWithLoading("/chat?view=memory", "Loading memory...");
        break;
      case "settings":
        navigateWithLoading("/chat?view=settings", "Loading settings...");
        break;
      case "dashboard":
        navigateWithLoading("/dashboard", "Loading dashboard...");
        break;
      case "games":
        navigateWithLoading("/games", "Loading games...");
        break;
      case "listening":
        navigateWithLoading("/listening", "Loading listening...");
        break;
      case "insights":
        navigateWithLoading("/insights", "Loading insights...");
        break;
      case "creation-hub":
        // Already on creation hub, no navigation needed
        break;
      default:
        logger.warn('[Creation Hub Page] Unknown view requested', { view });
        break;
    }
  };

  // Handle panel close - navigate back to chat
  const handlePanelClose = () => {
    logger.info('[Creation Hub Page] Panel close requested');
    navigateWithLoading("/chat", "Loading chat...");
  };

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return <EnhancedLoading />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
    <AnimatedBackground />
    <FloatingParticles />
    
    <Header currentView="creation-hub" onViewChange={handleViewChange} />
    
    <main className="pt-14 relative z-10">
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CreationHubPanel onClose={handlePanelClose} />
        </motion.div>
      </div>
    </main>
  </div>
  );
} 