// FILE: app/page.tsx
// (Content from finalcodebase.txt - verified)
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-provider";
import { Button } from "@/components/ui/button";
import { Chrome, Loader2 } from 'lucide-react'; // Added Loader2
import { ModeToggle } from '@/components/mode-toggle';
import { motion } from 'framer-motion';
import { logger } from '@/memory-framework/config';

export default function LandingPage() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logger.debug(`[LandingPage Effect] isLoading: ${isLoading}, session: ${!!session}`);
    if (!isLoading && session) {
      logger.info("[LandingPage Effect] Session active, redirecting to /chat.");
      router.replace('/chat'); // Use replace to avoid back button returning here
    }
  }, [session, isLoading, router]);

  const handleLoginClick = async () => {
    // Add slight delay/loading state feedback for better UX
    // setIsLoading(true); // If useAuth provided a setter
    await signInWithGoogle();
    // setIsLoading(false);
  };

  // Loading state while checking session
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground p-4">
         <Loader2 className="h-12 w-12 animate-spin text-primary/70 mb-4" />
         <p className="text-lg text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  // Login page if no session
  if (!session) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground p-4 overflow-hidden">
          <div className="absolute top-4 right-4 z-10"> <ModeToggle /> </div>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center z-0" // Ensure content is behind header if needed
          >
             <motion.div
                 animate={{ scale: [1, 1.05, 1] }}
                 transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                 className="inline-block mb-4"
             >
                {/* You could place an SVG logo here */}
                <span className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-pink-500 bg-clip-text text-transparent block">
                     Minato
                </span>
             </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-4 sr-only">Minato AI</h1> {/* Keep for SEO/Accessibility */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              Your intelligent companion, always ready to chat, assist, and remember.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                  onClick={handleLoginClick}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300"
              >
                <Chrome className="mr-2 h-5 w-5" /> Login with Google
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.8, duration: 1 }}
             className="absolute bottom-6 text-center text-muted-foreground text-xs"
          >
            <p>© {new Date().getFullYear()} Minato AI. Your memories, secured.</p>
          </motion.div>
        </div>
    );
  }

  // Show loader while redirecting
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground p-4">
       <Loader2 className="h-12 w-12 animate-spin text-primary/70 mb-4" />
       <p className="text-lg text-muted-foreground">Redirecting to chat...</p>
    </div>
  );
}