'use client'
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion"
import { useEffect, useState } from "react";

interface HeroSectionProps {
  onLoginClick: () => void;
  onWatchDemoClick: () => void;
}

const scrollToGoogleLoginSection = () => {
  const element = document.getElementById('google-login-section');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};


const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}


const HeroSection = ({ onLoginClick, onWatchDemoClick }: HeroSectionProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])

  useEffect(() => {
    setIsVisible(true)
  }, [])


  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
      {/* Floating particles background */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 opacity-60"
      />
      <div className="absolute inset-0 overflow-hidden">
        <div className="floating-animation absolute top-20 left-10 w-4 h-4 bg-secondary/30 rounded-full"></div>
        <div className="floating-animation absolute top-40 right-20 w-6 h-6 bg-primary/20 rounded-full" style={{ animationDelay: '1s' }}></div>
        <div className="floating-animation absolute bottom-40 left-20 w-8 h-8 bg-gold/30 rounded-full" style={{ animationDelay: '2s' }}></div>
        <div className="floating-animation absolute top-60 right-10 w-3 h-3 bg-soft-green/40 rounded-full" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-red-100 to-pink-100 text-red-700 text-secondary-foreground text-sm font-medium mb-6 fade-in-up">
              <Sparkles className="w-4 h-4 mr-2" />
              Introducing Minato AI
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl plus-jakarta-sans-bold mb-6 fade-in-up stagger-1 bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent">
              Your AI Companion for{" "}
              <span className="text-transparent">
                Everything
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-4 fade-in-up stagger-2">
              Meet <span className="plus-jakarta-sans-semibold bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent">Minato (湊)</span>
              &nbsp;- Where productivity meets creativity in perfect harmony
            </p>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl fade-in-up stagger-3">
              Experience the future of AI assistance with&nbsp;
              <span className="bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent">45+ tools, voice intelligence, gaming, and insights</span>
              &nbsp;- all in one beautiful platform
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start fade-in-up stagger-4">
              <Button
                variant='outline'
                size="lg"
                className="text-secondary-foreground shadow-glow group"
                onClick={onLoginClick}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="group bg-secondary hover:bg-white"
                onClick={scrollToGoogleLoginSection}
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 fade-in-up stagger-4 bg-gradient-to-br from-red-400 to-pink-400 bg-clip-text text-transparent">
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold">45+</div>
                <div className="text-sm text-muted-foreground">AI Tools</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold">48</div>
                <div className="text-sm text-muted-foreground">AI Games</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold">98</div>
                <div className="text-sm text-muted-foreground">Languages</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold">Real-time</div>
                <div className="text-sm text-muted-foreground">Voice AI</div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative fade-in-up stagger-2">
            <div className="relative">
              <img
                src='/minato-hero.jpg'
                alt="Minato AI Interface"
                className="w-full h-auto rounded-2xl shadow-card"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl"></div>
            </div>

            {/* Floating elements around the image */}
            <div className="absolute -top-4 -right-4 p-3 floating-animation">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;