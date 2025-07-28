"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-provider";
import { Loader2 } from "lucide-react";
import { LoadingSequence } from "@/components/loading-sequence";
import Header from "@/components/landingpage/Header";
import HeroSection from "@/components/landingpage/HeroSection";
import GoogleLoginSection from "@/components/landingpage/GoogleLoginSection";
import CoreFeaturesSection from "@/components/landingpage/CoreFeaturesSection";
import DetailedFeaturesSection from "@/components/landingpage/DetailedFeaturesSection";
import UseCasesSection from "@/components/landingpage/UseCasesSection";
import StatsSection from "@/components/landingpage/StatsSection";
import Footer from "@/components/landingpage/Footer";
import { TestimonialsGridWithCenteredCarousel } from "@/components/landingpage/testimonials-grid-with-centered-carousel";
import { SmoothCursor } from "@/components/smooth-cursor";

const FullPageLoader = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
    <p className="text-lg text-muted-foreground">{message}</p>
  </div>
);

export default function LandingPage() {
  const { session, isLoading: isAuthLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSequenceLoading, setIsSequenceLoading] = useState(true);

  const demoSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSequenceLoading(false);
    }, 2500); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSequenceLoading && !isAuthLoading && session) {
      router.replace('/chat');
    }
  }, [session, isAuthLoading, isSequenceLoading, router]);

  const handleLoginClick = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Erreur lors de la connexion Google:", error);
    }
  };

  const handleScrollToDemo = () => {
    demoSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (isSequenceLoading) {
    return <LoadingSequence />;
  }

  if (isAuthLoading) {
    return <FullPageLoader message="Vérification de la session..." />;
  }

  if (session) {
    return <FullPageLoader message="Redirection en cours..." />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-r from-red-50 to-pink-50 manrope">
      <SmoothCursor />
      <div className="relative z-10 flex flex-col">
        <Header onLoginClick={handleLoginClick} />
        <main>
          <HeroSection onLoginClick={handleLoginClick} onWatchDemoClick={handleScrollToDemo} />
          <GoogleLoginSection ref={demoSectionRef} />
          <CoreFeaturesSection />
          <DetailedFeaturesSection />
          <UseCasesSection />
          <StatsSection />
          <TestimonialsGridWithCenteredCarousel />
        </main>
        <Footer />
      </div>
    </div>
  );
}