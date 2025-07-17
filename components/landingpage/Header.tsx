'use client'
import { Button } from "@/components/ui/button";
import { AnimatedTooltip } from "../animated-tooltip";
// MODIFICATION: Les icônes Menu, X et le hook useState ne sont plus nécessaires
// import { Menu, X } from "lucide-react";
// import { useState } from "react";

interface HeaderProps {
  onLoginClick: () => void;
}

const Header = ({ onLoginClick }: HeaderProps) => {
  // MODIFICATION: La gestion d'état pour le menu est entièrement supprimée
  // const [isMenuOpen, setIsMenuOpen] = useState(false);
  // const toggleMenu = () => { ... };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 glass-card border-0 border-b border-white/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo (reste inchangé) */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              湊
            </div>
            <h1 className="text-white text-xl font-bold tracking-tight flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent">Minato</span>
            <span className="text-xs tracking-wider mt-1 bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent">
                Your Ultra-Intelligent AI Companion
              </span>
            </h1>
          </div>

          {/* Desktop Navigation (s'affiche uniquement sur grand écran) */}
          <div className="flex items-center space-x-4">
            <AnimatedTooltip content="Access Minato instantly" subtext="即時アクセス">
              <Button
                variant="outline"
                className="hidden md:block border-[#D0D0E0] text-white transition-all duration-300 bg-[#2A2E40]"
                onClick={onLoginClick} // Modifié pour appeler handleLoginClick
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
            </div>

          {/* MODIFICATION: Le bouton du menu mobile et le panneau déroulant ont été complètement supprimés */}
          
        </div>
      </div>
    </header>
  );
};

export default Header;