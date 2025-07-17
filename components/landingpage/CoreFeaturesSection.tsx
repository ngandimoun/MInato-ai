'use client'

import { motion } from "framer-motion";
import { Brain, Mic, Database, Globe, Calendar, TrendingUp, Camera, Headphones, MessageCircle } from "lucide-react";

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

const CoreFeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "AI Brain",
      description: "Advanced AI models with structured planning, dynamic orchestration, and multilingual support for complex reasoning tasks."
    },
    {
      icon: Mic,
      title: "Voice & Audio",
      description: "Dual voice systems with real-time speech-to-speech, dynamic TTS adaptation, and intelligent audio analysis capabilities."
    },
    {
      icon: Database,
      title: "Smart Memory",
      description: "Dual memory system combining semantic search and graph database for contextual understanding and proactive assistance."
    }
  ];


  // Dans votre composant CoreFeaturesSection

const tools = [
  { 
    icon: Globe, 
    name: "Web Search", 
    category: "Information",
    gradientClasses: "from-blue-500 to-cyan-400" // Dégradé Océan
  },
  { 
    icon: Calendar, 
    name: "Google Calendar", 
    category: "Productivity",
    gradientClasses: "from-amber-500 to-orange-500" // Dégradé Lever de soleil
  },
  { 
    icon: TrendingUp, 
    name: "Lead Generation", 
    category: "Business",
    gradientClasses: "from-green-500 to-emerald-500" // Dégradé Croissance
  },
  { 
    icon: Camera, 
    name: "Image Creation", 
    category: "Creative",
    gradientClasses: "from-purple-500 to-pink-500" // Dégradé Créativité
  },
  { 
    icon: Headphones, 
    name: "Audio Analysis", 
    category: "Intelligence",
    gradientClasses: "from-indigo-500 to-violet-600" // Dégradé Profondeur
  },
  { 
    icon: MessageCircle, 
    name: "Smart Chat", 
    category: "Communication",
    gradientClasses: "from-sky-400 to-blue-400" // Dégradé Ciel
  },
];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Core AI Capabilities
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience next-generation AI with our three foundational pillars
          </p>
        </div>

        <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {tools.map((tool, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
                className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-red-200 transition-all duration-300 cursor-pointer"
              >
                <tool.icon className="w-8 h-8 text-red-600 mb-3 mx-auto" />
                <div className={`text-sm font-medium text-center bg-gradient-to-r ${tool.gradientClasses} bg-clip-text text-transparent`}>{tool.name}</div>
                <div className="text-xs text-gray-500 text-center mt-1">{tool.category}</div>
              </motion.div>
            ))}
          </motion.div>
      </div>
    </section>
  );
};

export default CoreFeaturesSection;