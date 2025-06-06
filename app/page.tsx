// FILE: app/page.tsx (Fusionné)
"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-provider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Chrome, Loader2 } from "lucide-react"; // Ajout de Chrome et Loader2
import { SmoothCursor } from "@/components/smooth-cursor"; // Assurez-vous que le chemin est correct
import { AnimatedTooltip } from "@/components/animated-tooltip"; // Assurez-vous que le chemin est correct
import { HeroHighlight } from "@/components/hero-highlight"; // Assurez-vous que le chemin est correct
import { ShineButton } from "@/components/shine-button"; // Assurez-vous que le chemin est correct
import { LoadingSequence } from "@/components/loading-sequence"; // Assurez-vous que le chemin est correct
import { AuthModal } from "@/components/auth-modal"; // Assurez-vous que le chemin est correct
import { logger } from '@/memory-framework/config'; // Assurez-vous que le chemin est correct
import { SplashCursor } from "@/components/magicui/splash-cursor";
// ModeToggle n'est pas utilisé dans le second design, mais pourrait être ajouté si besoin.

export default function LandingPage() {
  const { session, isLoading: isAuthLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [isSequenceLoading, setIsSequenceLoading] = useState(true); // Pour la LoadingSequence initiale
  const [isMuted, setIsMuted] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false); // Le modal du second design

  // 1. Gérer la fin de la séquence de chargement initiale
  useEffect(() => {
    logger.debug("[LandingPage Effect] Initializing landing page.");
    const timer = setTimeout(() => {
      setIsSequenceLoading(false);
      logger.debug("[LandingPage Effect] Initial loading sequence complete.");
    }, 2500); // Durée de LoadingSequence
    return () => clearTimeout(timer);
  }, []);

  // 2. Gérer la redirection basée sur la session une fois que tout est chargé
  useEffect(() => {
    logger.debug(`[LandingPage Effect - Auth] isSequenceLoading: ${isSequenceLoading}, isAuthLoading: ${isAuthLoading}, session: ${!!session}`);
    if (!isSequenceLoading && !isAuthLoading && session) {
      logger.info("[LandingPage Effect - Auth] Session active, redirecting to /chat.");
      router.replace('/chat');
    }
  }, [session, isAuthLoading, isSequenceLoading, router]);

  const handleLoginClick = async () => {
    logger.info("[LandingPage] Login button clicked. Attempting Google Sign-In.");
    // Option 1: Utiliser le AuthModal du second design pour encapsuler le signInWithGoogle
    // setShowAuthModal(true); // Si AuthModal gère lui-même l'appel à signInWithGoogle

    // Option 2: Appeler directement signInWithGoogle (plus direct si AuthModal n'est pas indispensable pour ce flux)
    try {
      await signInWithGoogle();
      // La redirection se fera via l'useEffect ci-dessus une fois la session détectée.
    } catch (error) {
      logger.error("[LandingPage] Error during Google Sign-In:", error);
      // Gérer l'erreur (par ex. afficher un toast)
    }
  };

  // Affiche la LoadingSequence initiale
  if (isSequenceLoading) {
    return <LoadingSequence />;
  }

  // Affiche le loader pendant la vérification de la session par useAuth (après LoadingSequence)
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030613] text-white p-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#00FFFF] mb-4" />
        <p className="text-lg">Verifying session...</p> {/* Texte adapté au design */}
      </div>
    );
  }

  // Affiche la landing page si pas de session (après LoadingSequence et vérification useAuth)
  if (!session) {
    return (
      <div className="min-h-screen bg-[#030613] relative overflow-hidden text-white"> {/* Assurez-vous que text-white est appliqué globalement */}
        <SmoothCursor />

        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-px h-32 bg-gradient-to-b from-transparent via-[#00FFFF] to-transparent animate-pulse" />
          <div className="absolute top-3/4 right-1/3 w-px h-24 bg-gradient-to-b from-transparent via-[#00FFFF] to-transparent animate-pulse delay-1000" />
          <div className="absolute bottom-1/4 left-1/2 w-px h-16 bg-gradient-to-b from-transparent via-[#00FFFF] to-transparent animate-pulse delay-2000" />
        </div>

        {/* Floating Japanese Characters */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/6 text-[#00FFFF] opacity-10 text-6xl font-light animate-float">光</div>
          <div className="absolute top-2/3 right-1/4 text-[#00FFFF] opacity-10 text-4xl font-light animate-float-delayed">電</div>
          <div className="absolute bottom-1/3 left-3/4 text-[#00FFFF] opacity-10 text-5xl font-light animate-float-slow">未</div>
        </div>

        {/* Header */}
        <header className="relative z-10 flex justify-between items-start p-8">
          <div className="flex items-center space-x-4">
            <div className="text-[#00FFFF] text-4xl font-bold geometric-kanji">湊</div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">Minato AI</h1>
              <p className="text-[#F0F0F0] text-sm tracking-wider mt-1 colourful-text">
                Your Ultra-Intelligent AI Companion
              </p>
              <p className="text-muted-foreground text-xs mt-1 japanese-subtitle">「未来ヲ接続」</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <AnimatedTooltip content="Access Minato instantly" subtext="即時アクセス">
              <Button
                variant="outline"
                className="hidden md:block border-[#D0D0E0] text-white transition-all duration-300 bg-[#2A2E40]"
                onClick={handleLoginClick} // Modifié pour appeler handleLoginClick
              >
                Continue with  {/* Espace insécable pour une meilleure césure */}
                <span className="text-sm ml-2"><span className="google-blue">G</span>
                  <span className="google-red">o</span>
                  <span className="google-yellow">o</span>
                  <span className="google-blue">g</span>
                  <span className="google-green">l</span>
                  <span className="google-red">e</span>でログイン</span>
              </Button>
            </AnimatedTooltip>

            <ShineButton onClick={handleLoginClick}> {/* Modifié pour appeler handleLoginClick */}
              Get Started
              <span className="text-xs opacity-0 hover:opacity-100 transition-opacity duration-300 ml-2">起動</span>
            </ShineButton>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] px-8"> {/* Ajustement de min-h pour le footer */}
          <div className="flex flex-col items-center justify-center mb-12">
            <HeroHighlight />

            <Button
              variant="outline"
              className="md:hidden mt-4 border-[#D0D0E0] text-white transition-all duration-300 bg-[#2A2E40]"
              onClick={handleLoginClick} // Modifié pour appeler handleLoginClick
            >
              Continue with  {/* Espace insécable pour une meilleure césure */}
              <span className="text-sm ml-2"><span className="google-blue">G</span>
                <span className="google-red">o</span>
                <span className="google-yellow">o</span>
                <span className="google-blue">g</span>
                <span className="google-green">l</span>
                <span className="google-red">e</span>でログイン</span>
            </Button>
          </div>
          <div className="relative max-w-2xl w-full">
            <div className="relative bg-[#2A2E40] rounded-lg border border-[#00FFFF]/30 overflow-hidden shadow-2xl">
              <div className="aspect-video bg-black relative group">
                {/* Remplacez le contenu actuel par l'iframe YouTube */}
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/5ouVWbW7SsM?autoplay=1&controls=1&loop=1&playlist=5ouVWbW7SsM"
                  title="Minato AI Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; controls; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                ></iframe>

                {/* Overlay pour les contrôles personnalisés */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/30">
                  {!isMuted && (
                    <div className="text-center">
                      <div className="w-24 h-24 border-2 border-[#00FFFF] rounded-full flex items-center justify-center mb-4 mx-auto group-hover:border-[#FF073A] transition-colors duration-300">
                        <Volume2 className="w-8 h-8 text-[#00FFFF]" />
                      </div>
                      <p className="text-[#D0D0E0] text-lg mb-2">Minato AI Demo</p>
                      <p className="text-[#AEB5C3] text-sm">Experience the future of AI companionship</p>
                    </div>
                  )}
                </div>

                <AnimatedTooltip content={isMuted ? "Activate Audio" : "Mute Audio"} subtext={isMuted ? "音声起動" : "ミュート"}>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 bg-[#2A2E40]/80 backdrop-blur-sm border border-[#D0D0E0] rounded-full p-3 hover:border-[#00FFFF] transition-all duration-300 group"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-[#D0D0E0] group-hover:text-[#00FFFF]" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-[#00FFFF]" />
                    )}
                  </button>
                </AnimatedTooltip>

                <div className="absolute top-4 left-4 flex space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="text-primary text-xs font-mono">ONLINE</div>
                </div>
                <div className="absolute top-4 right-4 text-[#AEB5C3] text-xs font-mono">全システム、オンライン</div>
              </div>

              <div className="bg-[#2A2E40] border-t border-[#D0D0E0]/20 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-[#D0D0E0] text-xs md:text-sm">Minato AI - Intelligence Reimagined</div>
                  <div className="text-[#AEB5C3] text-xs">知性の新境地</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-[#00FFFF] rounded-full animate-pulse"></div>
                  <div className="text-[#AEB5C3] text-xs font-mono">READY</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <div className="text-[#AEB5C3] text-xs md:text-sm mb-2">System Status</div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#00FFFF] rounded-full animate-pulse"></div>
                <span className="text-[#D0D0E0] text-xs">Neural Core: Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#00FFFF] rounded-full animate-pulse delay-500"></div>
                <span className="text-[#D0D0E0] text-xs">Learning Engine: Optimized</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#00FFFF] rounded-full animate-pulse delay-1000"></div>
                <span className="text-[#D0D0E0] text-xs">Connection: Stable</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer comme dans le premier fichier, adapté au style */}
        <footer className="relative z-10 text-center text-[#AEB5C3] text-xs py-6">
          <p>© {new Date().getFullYear()} Minato AI. Your memories, secured. 未来ヲ接続.</p>
        </footer>

        {/* Auth Modal (si vous décidez de le garder pour encapsuler le processus de connexion) */}
        {/* Si AuthModal appelle signInWithGoogle en interne, ajustez handleLoginClick */}
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </div>
    );
  }

  // Affiche le loader pendant la redirection vers /chat si session existe
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030613] text-white p-4">
      <Loader2 className="h-12 w-12 animate-spin text-[#00FFFF] mb-4" />
      <p className="text-lg">Redirecting to your session...</p> {/* Texte adapté au design */}
    </div>
  );
}