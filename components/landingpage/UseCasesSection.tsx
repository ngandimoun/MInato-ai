'use client'
import { 
  User, 
  TrendingUp, 
  Palette, 
  GraduationCap, 
  MessageSquare, 
  Search, 
  PenTool, 
  Calendar 
} from "lucide-react";

const UseCasesSection = () => {
  // Dans votre composant UseCasesSection

const useCases = [
  {
    icon: User,
    title: "Personal Assistant",
    description: "Manage daily schedules, set smart reminders, and stay organized",
    iconGradient: "bg-gradient-to-br from-sky-400 to-blue-600",
    titleGradient: "from-sky-500 to-blue-700"
  },
  {
    icon: TrendingUp,
    title: "Business Growth",
    description: "Generate leads, analyze markets, and automate business processes",
    iconGradient: "bg-gradient-to-br from-emerald-400 to-green-600",
    titleGradient: "from-emerald-500 to-green-700"
  },
  {
    icon: Palette,
    title: "Content Creation",
    description: "Create images, videos, and marketing content with AI assistance",
    iconGradient: "bg-gradient-to-br from-pink-500 to-purple-600",
    titleGradient: "from-pink-600 to-purple-700"
  },
  {
    icon: GraduationCap,
    title: "Learning & Gaming",
    description: "Interactive AI games, educational content, and skill development",
    iconGradient: "bg-gradient-to-br from-amber-400 to-orange-500",
    titleGradient: "from-amber-500 to-orange-600"
  },
  {
    icon: MessageSquare,
    title: "Meeting Analysis",
    description: "Transcribe, summarize, and extract insights from meetings",
    iconGradient: "bg-gradient-to-br from-indigo-400 to-violet-600",
    titleGradient: "from-indigo-500 to-violet-700"
  },
  {
    icon: Search,
    title: "Market Research",
    description: "Analyze trends, competitor data, and customer feedback",
    iconGradient: "bg-gradient-to-br from-cyan-400 to-teal-600",
    titleGradient: "from-cyan-500 to-teal-700"
  },
  {
    icon: PenTool,
    title: "Creative Writing",
    description: "Brainstorm ideas, co-write content, and enhance creativity",
    iconGradient: "bg-gradient-to-br from-rose-400 to-red-600",
    titleGradient: "from-rose-500 to-red-700"
  },
  {
    icon: Calendar,
    title: "Event Planning",
    description: "Coordinate events, manage invitations, and track RSVPs",
    iconGradient: "bg-gradient-to-br from-fuchsia-500 to-pink-600",
    titleGradient: "from-fuchsia-600 to-pink-700"
  }
];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            Endless Possibilities
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how Minato adapts to your unique needs and workflows
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <div 
              key={useCase.title}
              className={`glass-card p-6 text-center group hover:shadow-soft transition-all duration-300 fade-in-up stagger-${(index % 4) + 1}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${useCase.iconGradient}`}>
                <useCase.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 bg-gradient-to-r ${useCase.titleGradient} bg-clip-text text-transparent`}>
                {useCase.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;