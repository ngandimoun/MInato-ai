"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Check, 
  Star, 
  Sparkles, 
  Crown, 
  Zap,
  Film,
  Image as ImageIcon,
  Mic,
  Users,
  MessageSquare,
  Headphones,
  ArrowRight,
  Shield,
  Twitter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MINATO_PLANS } from "@/lib/constants";
import { useAuth } from "@/context/auth-provider";
import { toast } from "@/components/ui/use-toast";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// ... (les données proFeatures et freeVsProComparison restent les mêmes)
const proFeatures = [
  {
    icon: MessageSquare,
    title: "Unlimited AI Chat",
    description: "Unlimited Minato AI conversations (also available in Free plan)",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: Zap,
    title: "Unlimited AI Leads",
    description: "Unlimited lead generation on creation hub (also available in Free plan)",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: ImageIcon,
    title: "AI Image Generation",
    description: "Create up to 30 stunning images per month with editing capabilities",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Film,
    title: "AI Video Generation", 
    description: "Generate up to 20 professional videos per month from images and text",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Headphones,
    title: "Extended Audio Recording",
    description: "Record and analyze up to 20 audio sessions monthly (vs 5 in Free)",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Users,
    title: "Multiplayer AI Games",
    description: "Play collaborative multiplayer AI games (Free plan: solo games only)",
    color: "from-orange-500 to-red-500"
  }
];

const freeVsProComparison = [
  {
    feature: "AI Chat",
    free: "Unlimited",
    pro: "Unlimited",
    icon: MessageSquare
  },
  {
    feature: "AI Leads Generation",
    free: "Unlimited",
    pro: "Unlimited", 
    icon: Zap
  },
  {
    feature: "Audio Recording & Analysis",
    free: "5 per month",
    pro: "20 per month",
    icon: Mic
  },
  {
    feature: "AI Games",
    free: "Solo only",
    pro: "Solo + Multiplayer",
    icon: Users
  },
  {
    feature: "Image Generation",
    free: "Not available",
    pro: "30 per month",
    icon: ImageIcon
  },
  {
    feature: "Video Generation",
    free: "Not available", 
    pro: "20 per month",
    icon: Film
  }
];


export function PlanUpgradeModal({ isOpen, onClose, className }: PlanUpgradeModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    // ... (votre logique reste la même)
    setIsProcessing(true);
    
    try {
      toast({
        title: "Redirecting to Minato...",
        description: "You'll be redirected to our Twitter/X page to contact us for your Pro upgrade.",
        duration: 3000,
      });
      
      setTimeout(() => {
        window.open('https://x.com/chrisngand14511?s=21', '_blank');
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* AJOUT: classes pour s'assurer que la modale n'est pas trop large sur mobile et utilise bien la hauteur dispo */}
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <h2>Upgrade to Pro Plan</h2>
        </DialogHeader>
        
        <div className="relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            // MODIFICATION: padding ajusté pour mobile
            className="text-center p-6 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-t-lg"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4 relative inline-block"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center relative">
                <Crown className="w-8 h-8 text-white" />
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
              </div>
            </motion.div>
            
            {/* MODIFICATION: Taille de police responsive */}
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Upgrade to Minato Pro
            </h1>
            {/* MODIFICATION: Taille de police responsive */}
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Unlock the full power of AI creativity and collaboration. Contact us for instant upgrade!
            </p>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 inline-flex items-center gap-2"
            >
              {/* MODIFICATION: Taille de police et padding responsive pour le badge */}
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg">
                <Crown className="w-4 h-4 mr-2" />
                $25/month
              </Badge>
            </motion.div>
          </motion.div>

          {/* AJOUT: padding général pour le contenu */}
          <div className="p-4 sm:p-6">
            {/* Pro Features Grid */}
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">
              ✨ Pro Features Included
            </h2>
            
            {/* MODIFICATION: Grille responsive sur 3 tailles (mobile, tablette, desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {proFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-transparent hover:border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r shrink-0", // AJOUT: shrink-0 pour éviter que l'icône ne se réduise
                          feature.color
                        )}>
                          <feature.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Separator className="my-8" />

            {/* Free vs Pro Comparison */}
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">
                📊 Free vs Pro Comparison
              </h2>
              
              {/* MODIFICATION MAJEURE: Le tableau est restructuré pour être responsive */}
              <div className="bg-muted/30 rounded-lg overflow-hidden border border-border/50">
                {/* En-tête pour les écrans larges (md et plus) */}
                <div className="hidden md:grid grid-cols-3 gap-4 p-4 bg-muted/50 font-semibold text-sm">
                  <div>Feature</div>
                  <div className="text-center">Free Plan</div>
                  <div className="text-center">Pro Plan</div>
                </div>
                
                {freeVsProComparison.map((item, index) => (
                  <motion.div
                    key={item.feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    // Sur mobile : flex-col. Sur desktop: grid.
                    className="p-4 border-b last:border-b-0 border-border/50 md:grid md:grid-cols-3 md:gap-4 items-center hover:bg-muted/20 transition-colors"
                  >
                    {/* Colonne 1: Feature */}
                    <div className="flex items-center gap-2 text-sm font-semibold md:font-normal mb-2 md:mb-0">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.feature}
                    </div>

                    {/* Sur mobile, on regroupe les plans "Free" et "Pro" */}
                    <div className="grid grid-cols-2 md:grid-cols-subgrid md:col-span-2 gap-4">
                        {/* Colonne 2: Free Plan */}
                        <div className="text-left md:text-center">
                          <div className="text-xs text-muted-foreground md:hidden mb-1">Free</div>
                          <div className="text-sm text-muted-foreground">{item.free}</div>
                        </div>

                        {/* Colonne 3: Pro Plan */}
                        <div className="text-left md:text-center">
                          <div className="text-xs text-muted-foreground md:hidden mb-1">Pro</div>
                          <div className="flex items-center justify-start md:justify-center gap-2">
                             <span className="text-sm font-medium text-purple-600">{item.pro}</span>
                             {item.free !== "Unlimited" && item.free !== item.pro && (
                                <Badge variant="secondary" className="hidden sm:inline-flex text-xs bg-green-100 text-green-700">
                                  Upgrade
                                </Badge>
                              )}
                          </div>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center space-y-4"
            >
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">🚀 Ready to Upgrade?</h3>
                <p className="text-muted-foreground mb-4">
                  Join thousands of creators already using Minato Pro to unlock their creative potential.
                </p>
                
                {/* MODIFICATION: Les boutons prennent toute la largeur sur mobile */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg px-8 py-3 w-full sm:w-auto"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <Twitter className="mr-2 h-4 w-4" />
                        Contact us on X/Twitter
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" onClick={onClose} size="lg" className="w-full sm:w-auto">
                    Maybe Later
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                💬 Message us on Twitter/X for instant Pro upgrade • 🔒 Secure manual processing • 📧 Cancel anytime
              </p>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}