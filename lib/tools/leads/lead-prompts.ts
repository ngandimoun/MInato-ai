// FILE: lib/tools/leads/lead-prompts.ts
export interface LeadPromptTemplate {
  id: string;
  name: string;
  description: string;
  category: "search" | "message_generation" | "analysis";
  platform?: "reddit" | "hackernews" | "websearch" | "youtube" | "tiktok" | "general";
  industry?: string;
  template: string;
  variables: Record<string, string>;
  examples?: string[];
}

export interface LeadPromptCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  platforms: string[];
  capabilities: string[];
}

// Platform capabilities and characteristics
export const PLATFORM_CAPABILITIES = {
  reddit: {
    name: "Reddit",
    strengths: ["Community discussions", "Problem-solving", "Advice seeking", "Product feedback"],
    audience: "General consumers, professionals, enthusiasts",
    best_for: ["B2C leads", "Community-driven products", "Advice-based services"],
    lead_types: ["Problem seekers", "Community members", "Advice seekers"],
    engagement_style: "Conversational, helpful, community-focused"
  },
  hackernews: {
    name: "Hacker News",
    strengths: ["Tech discussions", "Startup news", "Technical problems", "Industry insights"],
    audience: "Developers, founders, tech professionals, investors",
    best_for: ["B2B tech leads", "Developer tools", "Startup services"],
    lead_types: ["Technical decision makers", "Startup founders", "Tech professionals"],
    engagement_style: "Technical, professional, solution-focused"
  },
  websearch: {
    name: "Web Search",
    strengths: ["Broad reach", "Recent content", "Diverse sources", "Trending topics"],
    audience: "Mixed audience across platforms",
    best_for: ["General market research", "Trend analysis", "Content discovery"],
    lead_types: ["Varied based on search terms"],
    engagement_style: "Depends on source platform"
  },
  youtube: {
    name: "YouTube",
    strengths: ["Video content", "Tutorials", "Reviews", "Educational content"],
    audience: "Content consumers, learners, researchers",
    best_for: ["Educational services", "Visual products", "Tutorial-based solutions"],
    lead_types: ["Content consumers", "Learners", "Researchers"],
    engagement_style: "Educational, visual, engaging"
  },
  tiktok: {
    name: "TikTok",
    strengths: ["Viral content", "Trends", "Young audience", "Creative content"],
    audience: "Gen Z, millennials, content creators",
    best_for: ["Consumer products", "Trend-based services", "Creative tools"],
    lead_types: ["Content creators", "Trend followers", "Young consumers"],
    engagement_style: "Creative, trendy, authentic"
  }
};

// Industry-specific prompt categories
export const INDUSTRY_CATEGORIES: LeadPromptCategory[] = [
  {
    id: "technology",
    name: "Technology",
    description: "Software, SaaS, developer tools, AI/ML, cybersecurity",
    color: "bg-blue-500",
    icon: "💻",
    platforms: ["hackernews", "reddit", "websearch"],
    capabilities: ["Technical lead scoring", "Developer pain point detection", "Tech stack analysis"]
  },
  {
    id: "startup",
    name: "Startups",
    description: "Early-stage companies, founders, entrepreneurship",
    color: "bg-purple-500",
    icon: "🚀",
    platforms: ["hackernews", "reddit", "websearch"],
    capabilities: ["Founder identification", "Funding stage detection", "Growth challenge analysis"]
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Online retail, dropshipping, marketplace sellers",
    color: "bg-green-500",
    icon: "🛒",
    platforms: ["reddit", "websearch", "youtube"],
    capabilities: ["Seller pain point detection", "Platform-specific challenges", "Growth opportunity analysis"]
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Digital marketing, content creation, advertising",
    color: "bg-pink-500",
    icon: "📈",
    platforms: ["reddit", "websearch", "youtube", "tiktok"],
    capabilities: ["Campaign challenge detection", "Channel-specific problems", "ROI optimization needs"]
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Medical technology, healthcare services, wellness",
    color: "bg-red-500",
    icon: "🏥",
    platforms: ["reddit", "websearch"],
    capabilities: ["Compliance-aware messaging", "Professional targeting", "Patient need analysis"]
  },
  {
    id: "finance",
    name: "Finance",
    description: "Fintech, investment, accounting, financial services",
    color: "bg-yellow-500",
    icon: "💰",
    platforms: ["hackernews", "reddit", "websearch"],
    capabilities: ["Financial pain point detection", "Regulatory compliance", "ROI-focused messaging"]
  },
  {
    id: "education",
    name: "Education",
    description: "EdTech, online learning, training, certification",
    color: "bg-indigo-500",
    icon: "📚",
    platforms: ["reddit", "websearch", "youtube"],
    capabilities: ["Learning challenge detection", "Skill gap analysis", "Educational outcome focus"]
  },
  {
    id: "general",
    name: "General Business",
    description: "Cross-industry, general business services, consulting",
    color: "bg-gray-500",
    icon: "🏢",
    platforms: ["reddit", "websearch", "hackernews"],
    capabilities: ["Universal pain point detection", "Business challenge analysis", "Decision maker identification"]
  }
];

// Language-specific keywords for lead generation
export const LEAD_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  'en': ['problem', 'solution', 'help', 'struggling', 'need', 'advice', 'issue', 'challenge', 'difficulty'],
  'fr': ['problème', 'solution', 'aide', 'difficulté', 'besoin', 'conseil', 'problème', 'défi', 'galère'],
  'es': ['problema', 'solución', 'ayuda', 'dificultad', 'necesidad', 'consejo', 'problema', 'desafío', 'lucha'],
  'de': ['Problem', 'Lösung', 'Hilfe', 'Schwierigkeit', 'Bedarf', 'Rat', 'Problem', 'Herausforderung', 'Kampf'],
  'it': ['problema', 'soluzione', 'aiuto', 'difficoltà', 'bisogno', 'consiglio', 'problema', 'sfida', 'lotta'],
  'pt': ['problema', 'solução', 'ajuda', 'dificuldade', 'necessidade', 'conselho', 'problema', 'desafio', 'luta'],
  'ru': ['проблема', 'решение', 'помощь', 'трудность', 'нужда', 'совет', 'проблема', 'вызов', 'борьба'],
  'ja': ['問題', '解決', '助け', '困難', '必要', 'アドバイス', '問題', '挑戦', '苦労'],
  'zh': ['问题', '解决', '帮助', '困难', '需要', '建议', '问题', '挑战', '斗争'],
  'ko': ['문제', '해결', '도움', '어려움', '필요', '조언', '문제', '도전', '투쟁'],
  'ar': ['مشكلة', 'حل', 'مساعدة', 'صعوبة', 'حاجة', 'نصيحة', 'مشكلة', 'تحدي', 'كفاح'],
  'hi': ['समस्या', 'समाधान', 'मदद', 'कठिनाई', 'आवश्यकता', 'सलाह', 'समस्या', 'चुनौती', 'संघर्ष']
};

// Default prompt templates
export const DEFAULT_LEAD_PROMPTS: LeadPromptTemplate[] = [
  // Search Prompts - Reddit
  {
    id: "reddit-tech-search",
    name: "Reddit Tech Lead Search",
    description: "Find technical professionals and developers on Reddit",
    category: "search",
    platform: "reddit",
    industry: "technology",
    template: `Search for Reddit posts where users are discussing technical challenges related to: {{search_topic}}

Focus on finding posts where users:
- Express frustration with current technical solutions
- Ask for recommendations for {{solution_type}}
- Mention specific technical pain points
- Discuss implementation challenges
- Share experiences with {{technology_area}}

Target subreddits should include technical communities where professionals and decision-makers are active.

Look for indicators of technical authority such as:
- Detailed technical knowledge in posts
- Mentions of leading technical teams
- Discussion of architectural decisions
- References to company technical challenges`,
    variables: {
      search_topic: "Main technical topic or challenge",
      solution_type: "Type of solution they might need",
      technology_area: "Specific technology domain"
    },
    examples: [
      "Search for posts about API scalability challenges",
      "Find developers discussing database performance issues",
      "Look for posts about microservices migration problems"
    ]
  },
  {
    id: "reddit-startup-search",
    name: "Reddit Startup Lead Search",
    description: "Find startup founders and entrepreneurs on Reddit",
    category: "search",
    platform: "reddit",
    industry: "startup",
    template: `Search for Reddit posts from startup founders and entrepreneurs discussing: {{business_challenge}}

Target users who:
- Mention being founders, co-founders, or startup team members
- Discuss early-stage business challenges
- Ask for advice on {{specific_area}}
- Share experiences building or scaling {{business_type}}
- Express frustration with current {{problem_area}}

Focus on subreddits like:
- r/startups, r/entrepreneur, r/smallbusiness
- Industry-specific startup communities
- Business advice and growth-focused subreddits

Look for decision-maker indicators:
- "I'm the founder/CEO/CTO"
- "Our startup is struggling with..."
- "We're looking for solutions to..."
- "I need to decide on..."`,
    variables: {
      business_challenge: "Main business challenge or need",
      specific_area: "Specific area of business (marketing, tech, operations)",
      business_type: "Type of business or startup",
      problem_area: "Specific problem area they're facing"
    },
    examples: [
      "Find founders struggling with customer acquisition",
      "Look for startups needing technical infrastructure help",
      "Search for entrepreneurs discussing funding challenges"
    ]
  },

  // Search Prompts - HackerNews
  {
    id: "hackernews-founder-search",
    name: "HackerNews Founder Search",
    description: "Find startup founders and tech leaders on HackerNews",
    category: "search",
    platform: "hackernews",
    industry: "startup",
    template: `Search HackerNews for posts and comments from startup founders and tech leaders discussing: {{technical_challenge}}

Target content where users:
- Mention being founders, CTOs, or technical decision-makers
- Share experiences building or scaling technical systems
- Discuss architectural decisions and trade-offs
- Ask for advice on {{technology_decision}}
- Share lessons learned from {{implementation_area}}

Look for high-quality discussions with:
- Technical depth indicating senior-level expertise
- Business context showing decision-making authority
- Specific challenges that require {{solution_category}}
- Community engagement showing thought leadership

Focus on stories and comments that demonstrate:
- Technical leadership experience
- Startup or scale-up context
- Real-world implementation challenges
- Budget and resource considerations`,
    variables: {
      technical_challenge: "Technical challenge or domain",
      technology_decision: "Type of technology decision",
      implementation_area: "Area of technical implementation",
      solution_category: "Category of solution needed"
    },
    examples: [
      "Find CTOs discussing infrastructure scaling challenges",
      "Look for founders sharing technical architecture decisions",
      "Search for tech leaders discussing team building"
    ]
  },

  // Message Generation Prompts
  {
    id: "reddit-professional-outreach",
    name: "Reddit Professional Outreach",
    description: "Professional but conversational outreach for Reddit",
    category: "message_generation",
    platform: "reddit",
    template: `Write a helpful, professional message for a Reddit user who posted about {{lead_context}}.

Context Details:
- User: {{author_name}}
- Post: "{{post_title}}"
- Their situation: {{user_situation}}
- Relevant subreddit: r/{{subreddit}}
- Our solution: {{our_solution}}

Message Requirements:
1. Reference their specific post naturally (don't just copy the title)
2. Show genuine understanding of their problem
3. Offer immediate value or insight
4. Be conversational and community-appropriate
5. Include a soft call-to-action
6. Stay under 200 words
7. Match the tone of the subreddit community

Structure:
- Acknowledge their specific situation
- Provide a helpful insight or tip
- Briefly mention how we've helped others with similar challenges
- Offer to share more details if they're interested
- End with a question to encourage dialogue

Tone: {{message_tone}} but always helpful and non-salesy`,
    variables: {
      lead_context: "Context of what they posted about",
      author_name: "Reddit username",
      post_title: "Title of their post",
      user_situation: "Their current situation or challenge",
      subreddit: "Subreddit name",
      our_solution: "How we can help them",
      message_tone: "Tone (professional, casual, friendly, technical)"
    },
    examples: [
      "Response to a developer asking about API optimization",
      "Message to a startup founder discussing scaling challenges",
      "Outreach to someone seeking marketing advice"
    ]
  },
  {
    id: "hackernews-technical-outreach",
    name: "HackerNews Technical Outreach",
    description: "Technical, professional outreach for HackerNews community",
    category: "message_generation",
    platform: "hackernews",
    template: `Write a technical, professional message for a HackerNews user who posted about {{technical_topic}}.

Context Details:
- User: {{author_name}}
- Post/Comment: "{{content_title}}"
- Technical challenge: {{technical_challenge}}
- Our technical solution: {{our_solution}}
- Relevant technologies: {{tech_stack}}

Message Requirements:
1. Demonstrate technical understanding of their challenge
2. Reference specific technical details from their post
3. Provide technical insight or alternative perspective
4. Be concise and technically accurate
5. Respect HN community norms (no direct sales)
6. Focus on technical value and problem-solving
7. Stay under 150 words

Structure:
- Acknowledge the technical challenge they described
- Share a relevant technical insight or experience
- Mention how we've solved similar technical problems
- Offer to discuss technical details further
- Keep it professional and technically focused

Tone: Technical expert to technical expert, helpful and solution-oriented`,
    variables: {
      technical_topic: "Technical topic they discussed",
      author_name: "HN username",
      content_title: "Title of their post/comment",
      technical_challenge: "Specific technical challenge",
      our_solution: "Our technical solution approach",
      tech_stack: "Relevant technologies mentioned"
    },
    examples: [
      "Response to a CTO discussing database scaling",
      "Message to a founder sharing infrastructure challenges",
      "Outreach about API architecture decisions"
    ]
  },

  // Analysis Prompts
  {
    id: "lead-quality-analysis",
    name: "Lead Quality Analysis",
    description: "Comprehensive lead quality assessment",
    category: "analysis",
    template: `Analyze this lead for quality and potential based on the following criteria:

LEAD INFORMATION:
Platform: {{platform}}
Title: {{title}}
Content: {{content}}
Author: {{author}}
Engagement: {{engagement_metrics}}

ANALYSIS FRAMEWORK:

1. LEAD SCORE (0-100):
   - Decision-making authority indicators
   - Problem urgency and specificity
   - Budget/resource availability signals
   - Engagement and response likelihood

2. URGENCY ASSESSMENT:
   - Immediate need indicators
   - Timeline mentions
   - Problem severity language
   - Competitive pressure signs

3. PAIN POINT IDENTIFICATION:
   - Specific problems mentioned
   - Current solution limitations
   - Frustration indicators
   - Impact on business/goals

4. DECISION MAKER SIGNALS:
   - Authority language ("I decide", "we need")
   - Role indicators (founder, manager, lead)
   - Budget responsibility mentions
   - Team/company references

5. ENGAGEMENT POTENTIAL:
   - Communication style
   - Community participation
   - Response to others
   - Question asking behavior

6. PLATFORM-SPECIFIC INSIGHTS:
   - Community engagement quality
   - Author reputation/authority
   - Content quality and depth
   - Timing and relevance

Provide detailed analysis with specific examples from the content.`,
    variables: {
      platform: "Platform where lead was found",
      title: "Title of the post/content",
      content: "Main content or description",
      author: "Author information",
      engagement_metrics: "Engagement data (likes, comments, etc.)"
    }
  }
];

// Utility functions for prompt management
export function getPromptsByCategory(category: string): LeadPromptTemplate[] {
  return DEFAULT_LEAD_PROMPTS.filter(prompt => prompt.category === category);
}

export function getPromptsByPlatform(platform: string): LeadPromptTemplate[] {
  return DEFAULT_LEAD_PROMPTS.filter(prompt => prompt.platform === platform || prompt.platform === "general");
}

export function getPromptsByIndustry(industry: string): LeadPromptTemplate[] {
  return DEFAULT_LEAD_PROMPTS.filter(prompt => prompt.industry === industry || !prompt.industry);
}

export function interpolatePromptTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || `[${key}]`);
  });
  return result;
}

export function validatePromptVariables(template: string, providedVariables: Record<string, string>): string[] {
  const templateVariables = template.match(/{{(\w+)}}/g) || [];
  const requiredVariables = templateVariables.map(v => v.replace(/[{}]/g, ''));
  const missingVariables = requiredVariables.filter(v => !providedVariables[v]);
  return missingVariables;
}

export function getPromptSuggestions(searchTerm: string): LeadPromptTemplate[] {
  const searchLower = searchTerm.toLowerCase();
  return DEFAULT_LEAD_PROMPTS.filter(prompt =>
    prompt.name.toLowerCase().includes(searchLower) ||
    prompt.description.toLowerCase().includes(searchLower) ||
    prompt.industry?.toLowerCase().includes(searchLower) ||
    prompt.platform?.toLowerCase().includes(searchLower)
  );
} 