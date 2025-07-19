'use client'

import React, { useState, useEffect } from 'react';
import { 
  Palette, BarChart3, Wrench, Gamepad2, Mic, Brain,
  ImageIcon, VideoIcon, FileText, Bot, X 
} from "lucide-react";
import { MINATO_PRO_FEATURES } from '@/lib/constants';

interface MediaRendererProps {
  src?: string | null;
  alt?: string;
  className?: string;
  [key: string]: any;
}

interface LightboxProps {
  mediaUrl: string;
  onClose: () => void;
}

interface CarouselItem {
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  icon: React.ComponentType<any>;
}

interface InteractiveCarouselProps {
  items: CarouselItem[];
}

// ===================================================================
// COMPOSANT 1: MediaRenderer - Affiche intelligemment image ou vidéo
// ===================================================================
const MediaRenderer = ({ src, alt, className, ...props }: MediaRendererProps) => {
  // Détecte si l'URL est un fichier vidéo commun
  const isVideo = (url: string) => {
    return /\.(mp4|webm|mov)$/i.test(url);
  };

  if (!src) return null; // Ne rien afficher si la source est vide

  if (isVideo(src)) {
    return (
      <video
        className={className}
        src={src}
        autoPlay
        loop
        muted
        playsInline // Essentiel pour la lecture automatique sur les appareils mobiles
        {...props}
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  // Par défaut, affiche une image
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  );
};


// ===================================================================
// COMPOSANT 2: Lightbox - Utilise MediaRenderer pour le plein écran
// ===================================================================
const Lightbox = ({ mediaUrl, onClose }: LightboxProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-5 text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        onClick={onClose}
        aria-label="Close fullscreen view"
      >
        <X size={32} />
      </button>

      <div className="relative w-full max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <MediaRenderer
          src={mediaUrl}
          alt="Fullscreen view"
          className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          muted={false} // Réactive le son en plein écran
          controls    // Affiche les contrôles en plein écran
        />
      </div>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};


// ===================================================================
// COMPOSANT 3: InteractiveCarousel - Gère la logique du carrousel
// ===================================================================
const InteractiveCarousel = ({ items }: InteractiveCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animatedOptions, setAnimatedOptions] = useState<number[]>([]);
  const [lightboxMediaUrl, setLightboxMediaUrl] = useState<string | null>(null);

  const handleOptionClick = (index: number) => {
    if (index === activeIndex) {
      setLightboxMediaUrl(items[index].mediaUrl);
    } else {
      setActiveIndex(index);
    }
  };

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    items.forEach((_, i) => {
      const timer = setTimeout(() => {
        setAnimatedOptions(prev => [...prev, i]);
      }, 180 * i);
      timers.push(timer);
    });
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [items]);

  return (
    <>
      <div className="relative w-full h-full font-sans text-white"> 
        <div className="options flex flex-col md:flex-row w-full h-full items-stretch overflow-hidden">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="option group relative flex flex-col justify-end overflow-hidden transition-all duration-700 ease-in-out md:min-w-[60px] min-h-[60px]"
              style={{
                backgroundImage: `url('${item.thumbnailUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: 'pointer',
                flex: activeIndex === index ? '7 1 0%' : '1 1 0%',
                zIndex: activeIndex === index ? 10 : 1,
              }}
              onClick={() => handleOptionClick(index)}
            >
              <div className="shadow absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="label absolute left-0 right-0 bottom-5 flex items-center justify-start h-12 z-10 pointer-events-none px-4 gap-3 w-full">
                <div className="icon min-w-[44px] max-w-[44px] h-[44px] flex items-center justify-center rounded-full bg-[rgba(32,32,32,0.85)] backdrop-blur-[10px] shadow-lg border-2 border-[#444] flex-shrink-0">
                  <item.icon size={24} className="text-white" />
                </div>
                <div className={`info text-white whitespace-pre relative transition-opacity duration-500 ${activeIndex === index ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
                  <div className="main font-bold text-lg">{item.title}</div>
                  <div className="sub text-base text-gray-300">{item.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {lightboxMediaUrl && (
        <Lightbox mediaUrl={lightboxMediaUrl} onClose={() => setLightboxMediaUrl(null)} />
      )}
    </>
  );
};


// ===================================================================
// COMPOSANT 4: DetailedFeaturesSection - Le composant principal de la page
// ===================================================================
const DetailedFeaturesSection = () => {

  const features = [
    { 
      icon: Mic, 
      title: "Voice & Audio Intelligence", 
      description: "Real-time speech processing, meeting analysis, and intelligent audio insights with dynamic voice adaptation.", 
      mediaUrl: "/1.png", 
      gradientClass: "bg-gradient-to-br from-cyan-400 to-blue-600", 
      reverse: false 
    },
    { 
      icon: Brain, 
      title: "Memory & Personalization", 
      description: "Dual memory system with semantic search and graph database for contextual understanding and proactive assistance.", 
      mediaUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&crop=center",
      gradientClass: "bg-gradient-to-br from-purple-500 to-indigo-700", 
      reverse: true 
    },
    { 
      icon: Wrench, 
      title: "45+ Productivity Tools", 
      description: "Complete toolkit including search, calendar, reminders, lead generation, and business automation tools.", 
      mediaUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&h=400&fit=crop&crop=center",
      gradientClass: "bg-gradient-to-br from-orange-400 to-red-600", 
      reverse: false 
    },
    { 
      icon: Gamepad2, 
      title: "Gaming Platform", 
      description: "48 AI-powered games with multiplayer support, tournaments, adaptive difficulty, and AI coaching.", 
      mediaUrl: "/Friends.mp4",
      gradientClass: "bg-gradient-to-br from-lime-400 to-green-600", 
      reverse: true 
    },
    { 
      icon: Palette, 
      title: MINATO_PRO_FEATURES.creation.title, 
      description: "AI-powered image and video generation, content creation tools, and advanced editing capabilities.", 
      mediaUrl: null, // Pas de média ici, le carrousel a ses propres données
      gradientClass: "bg-gradient-to-br from-pink-500 to-rose-500", 
      reverse: false 
    },
    { 
      icon: BarChart3, 
      title: "Business Insights", 
      description: "Document analysis, financial analytics, and interactive dashboards for data-driven decisions.", 
      mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      gradientClass: "bg-gradient-to-br from-amber-400 to-yellow-600", 
      reverse: true 
    }
  ];

  const creationHubItems = [
    { title: "AI Image Generation", 
      description: "Create stunning visuals", 
      mediaUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80", 
      thumbnailUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80", 
      icon: ImageIcon 
    },
    { title: "Video Synthesis", 
      description: "Produce dynamic videos", 
      mediaUrl: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80", 
      thumbnailUrl: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80", 
      icon: VideoIcon 
    },
    { title: "Content Writing", 
      description: "Generate articles, scripts", 
      mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", 
      thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", 
      icon: FileText 
    },
    { title: "Creative AI Avatars", 
      description: "Design unique avatars", 
      mediaUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80", 
      thumbnailUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80", 
      icon: Bot 
    },
    { title: "Guided Adventure", 
      description: "Expert-led nature tours", 
      mediaUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80", 
      thumbnailUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80", 
      icon: Bot 
    },
  ];

  return (
    <section className="py-20 bg-gradient-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Everything You Need, Beautifully Integrated
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover the full power of Minato's comprehensive feature set
          </p>
        </div>

        <div className="space-y-20">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className={`grid lg:grid-cols-2 gap-12 items-center ${feature.reverse ? 'lg:grid-flow-col-dense' : ''}`}
            >
              <div className={`${feature.reverse ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${feature.gradientClass}`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{feature.title}</h3>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">{feature.description}</p>
                <div className="flex flex-wrap gap-2">
                  {feature.title.includes('Voice') && <><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Real-time Speech</span><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Meeting Analysis</span></>}
                  {feature.title.includes('Memory') && <><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Semantic Search</span><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Graph Database</span></>}
                  {feature.title.includes('Tools') && <><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Lead Generation</span><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Calendar Sync</span></>}
                  {feature.title.includes('Gaming') && <><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Multiplayer</span><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">AI Coaching</span></>}
                  {feature.title === MINATO_PRO_FEATURES.creation.title && <><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Image Generation</span><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Video Creation</span></>}
                  {feature.title.includes('Business') && <><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Analytics</span><span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">Python Engine</span></>}
                </div>
              </div>

              <div className={`${feature.reverse ? 'lg:col-start-1' : ''}`}>
                {feature.title === MINATO_PRO_FEATURES.creation.title ? (
                  <div className="w-full h-[450px] md:h-80 rounded-2xl shadow-card overflow-hidden">
                    <InteractiveCarousel items={creationHubItems} />
                  </div>
                ) : (
                  <div className="relative group w-full h-80 rounded-2xl shadow-card bg-black overflow-hidden">
                    <MediaRenderer 
                      src={feature.mediaUrl} 
                      alt={feature.title} 
                      className="w-full h-full object-contain aspect-auto group-hover:scale-105 transition-transform duration-300" 
                    />
                    {/* <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div> */}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DetailedFeaturesSection;