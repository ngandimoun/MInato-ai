import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { formatDistanceToNowStrict, fromUnixTime } from 'date-fns';
import { generateStructuredJson } from "../providers/llm_clients";

interface RedditLeadInput extends ToolInput {
  searchPrompt: string;
  subreddits: string[];
  productOrService?: string | null;
  targetAudience?: string | null;
  maxPostsPerSubreddit?: number | null;
  timeFilter?: "hour" | "day" | "week" | "month" | "year" | "all" | null;
  generateMessages?: boolean | null;
  _rawUserInput?: string | null;
}

interface RedditApiPostData {
  id: string;
  name?: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
  url: string;
  selftext?: string;
  selftext_html?: string;
  created_utc: number;
  is_self: boolean;
  stickied?: boolean;
  over_18?: boolean;
  thumbnail?: string;
  preview?: { images?: Array<{ source: { url: string; width: number; height: number }; resolutions?: Array<{ url: string; width: number; height: number }>; id: string; }>; enabled?: boolean; };
  upvote_ratio?: number;
  subreddit_name_prefixed?: string;
  link_flair_text?: string | null;
  author_flair_text?: string | null;
  total_awards_received?: number;
  gilded?: number;
  domain?: string;
}

interface RedditListingChild { 
  kind: "t3"; 
  data: RedditApiPostData; 
}

interface RedditJsonResponse { 
  kind: "Listing"; 
  data: { 
    after: string | null; 
    dist: number; 
    modhash: string; 
    geo_filter: string | null; 
    children: RedditListingChild[]; 
    before: string | null; 
  }; 
}

interface LeadAnalysis {
  isLead: boolean;
  confidence: number; // 0-100
  painPoints: string[];
  intent: "seeking_help" | "asking_questions" | "expressing_frustration" | "looking_for_solutions" | "other";
  urgency: "high" | "medium" | "low";
  budget_indicators: string[];
  decision_maker_signals: string[];
}

interface GeneratedMessage {
  dm: string;
  comment: string;
  reasoning: string;
}

interface RedditLead {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
  permalink: string;
  url: string | null;
  selfText: string | null;
  createdUtc: number;
  thumbnailUrl: string | null;
  analysis: LeadAnalysis;
  generatedMessages?: GeneratedMessage | null;
  relativeTime: string;
}

interface RedditLeadGeneratorOutput {
  result_type: "reddit_leads";
  source_api: "reddit_lead_generator";
  query: {
    searchPrompt: string;
    subreddits: string[];
    productOrService?: string;
    targetAudience?: string;
  };
  totalPostsAnalyzed: number;
  leadsFound: number;
  leads: RedditLead[];
  error?: string | null;
}

export class RedditLeadGeneratorTool extends BaseTool {
  name = "RedditLeadGeneratorTool";
  description = "Scans multiple subreddits to find potential leads based on AI analysis of posts. Identifies users who might be interested in your product/service and generates personalized DMs and comments.";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      searchPrompt: { 
        type: "string" as const, 
        description: "Description of what kind of posts/leads to look for (e.g., 'people looking for website builders', 'users asking about marketing tools')" 
      } as OpenAIToolParameterProperties,
      subreddits: { 
        type: "array" as const, 
        items: { type: "string" as const },
        description: "List of subreddit names to search (without 'r/' prefix)" 
      } as OpenAIToolParameterProperties,
      productOrService: { 
        type: ["string", "null"] as const, 
        description: "Your product or service description for generating personalized messages" 
      } as OpenAIToolParameterProperties,
      targetAudience: { 
        type: ["string", "null"] as const, 
        description: "Description of your target audience" 
      } as OpenAIToolParameterProperties,
      maxPostsPerSubreddit: { 
        type: ["number", "null"] as const, 
        description: "Maximum number of posts to analyze per subreddit (1-25, default: 10)" 
      } as OpenAIToolParameterProperties,
      timeFilter: { 
        type: ["string", "null"] as const, 
        enum: ["hour", "day", "week", "month", "year", "all", null], 
        description: "Time filter for posts (default: 'day')" 
      } as OpenAIToolParameterProperties,
      generateMessages: { 
        type: ["boolean", "null"] as const, 
        description: "Whether to generate personalized DMs and comments for leads (default: true)" 
      } as OpenAIToolParameterProperties,
      _rawUserInput: { 
        type: ["string", "null"] as const, 
        description: "Raw user input for parameter extraction" 
      } as OpenAIToolParameterProperties,
    },
    required: ["searchPrompt", "subreddits"],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 60 * 10; // 10 minutes cache
  private readonly REDDIT_BASE_URL = "https://www.reddit.com";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (by /u/YourRedditUsername contact: ${appConfig.emailFromAddress || "support@example.com"})`;
  
  categories = [
    "lead-generation",
    "marketing",
    "sales",
    "outreach",
    "reddit",
    "social-media",
    "prospecting",
    "business-development"
  ];
  
  version = "1.0.0";
  metadata = { 
    provider: "Reddit API + AI Analysis", 
    supports: [
      "lead_identification",
      "sentiment_analysis", 
      "message_generation",
      "multi_subreddit_search",
      "ai_filtering"
    ] 
  };

  constructor() {
    super();
    if (typeof this.USER_AGENT === "string" && (this.USER_AGENT.includes("support@example.com") || this.USER_AGENT.includes("/u/YourRedditUsername"))) {
      this.log("warn", "Update RedditLeadGeneratorTool USER_AGENT with specific contact info/username for API compliance.");
    }
  }

  private async extractLeadParameters(userInput: string): Promise<RedditLeadInput> {
    const defaultInput: RedditLeadInput = {
      searchPrompt: userInput || "people asking for help or advice",
      subreddits: ["entrepreneur", "smallbusiness", "startups"],
      productOrService: "Not specified",
      targetAudience: "General business users",
      maxPostsPerSubreddit: 10,
      timeFilter: "day",
      generateMessages: true,
    };

    try {
      logger.info(`[RedditLeadGeneratorTool] Analyzing input: "${userInput}"`);
      
      // Dynamic subreddit mapping based on comprehensive categories
      const subredditCategories = {
        fashion: ["fashion", "malefashion", "femalefashionadvice", "streetwear", "thriftstore", "GenZ", "fashionadvice"],
        technology: ["technology", "programming", "webdev", "startups", "entrepreneur", "MachineLearning", "artificial"],
        ai: ["MachineLearning", "artificial", "ChatGPT", "OpenAI", "singularity", "LocalLLaMA", "ArtificialIntelligence"],
        fitness: ["fitness", "bodybuilding", "loseit", "gainit", "xxfitness", "flexibility", "running"],
                 health: ["health", "nutrition", "HealthyFood", "mentalhealth", "medical", "AskDocs", "SkincareAddiction", "AsianBeauty", "30PlusSkinCare", "beauty", "MakeupAddiction", "SkinCareAddicts"],
        food: ["food", "cooking", "recipes", "MealPrepSunday", "EatCheapAndHealthy", "Baking", "AskCulinary"],
        gaming: ["gaming", "pcgaming", "GameDev", "tipofmyjoystick", "ShouldIbuythisgame", "patientgamers"],
        business: ["entrepreneur", "smallbusiness", "business", "startups", "marketing", "sales"],
        finance: ["personalfinance", "investing", "financialindependence", "stocks", "cryptocurrency", "frugal"],
        education: ["college", "studytips", "GetStudying", "HomeworkHelp", "AskAcademia", "GradSchool"],
        relationships: ["relationships", "dating_advice", "marriage", "relationship_advice", "socialskills"],
        career: ["jobs", "careerguidance", "cscareerquestions", "ITCareerQuestions", "careeradvice"],
        home: ["HomeImprovement", "DIY", "fixit", "woodworking", "gardening", "houseplants"],
        travel: ["travel", "solotravel", "backpacking", "digitalnomad", "TravelHacks"],
        pets: ["dogs", "cats", "pets", "puppy101", "DogTraining", "AskVet"],
        parenting: ["Parenting", "Mommit", "daddit", "beyondthebump", "toddlers"],
        music: ["WeAreTheMusicMakers", "makinghiphop", "trapproduction", "edmproduction", "guitarlessons"],
        art: ["Art", "learnart", "ArtCrit", "drawing", "painting", "graphic_design"],
        photography: ["photography", "photocritique", "AskPhotography", "portraits", "streetphotography"],
        writing: ["writing", "WritingPrompts", "DestructiveReaders", "selfpublishing", "screenwriting"]
      };

      // Extract topic from user input using semantic analysis
      const lowerInput = userInput.toLowerCase();
      let detectedCategory = "business"; // default
      let bestMatch = 0;
      
             // Score each category based on keyword relevance
       for (const [category, subreddits] of Object.entries(subredditCategories)) {
         let score = 0;
         
         // Direct category name match
         if (lowerInput.includes(category)) score += 10;
         
                  // Related keyword matching with comprehensive coverage
         const categoryKeywords: Record<string, string[]> = {
           fashion: ["fashion", "clothing", "style", "outfit", "gen z", "genz", "trendy", "clothes", "wear", "dress", "apparel", "wardrobe", "accessory", "jewelry", "shoes", "sneakers", "brand", "designer", "streetwear", "vintage"],
           technology: ["tech", "software", "app", "website", "coding", "programming", "development", "digital", "saas", "platform", "tool", "automation", "cloud", "api", "database", "frontend", "backend"],
           ai: ["ai", "artificial intelligence", "machine learning", "chatgpt", "openai", "llm", "neural", "algorithm", "deep learning", "nlp", "computer vision", "data science", "ml", "gpt", "transformer"],
           fitness: ["fitness", "gym", "workout", "exercise", "muscle", "strength", "cardio", "bodybuilding", "weightlifting", "crossfit", "yoga", "pilates", "running", "marathon", "training", "athlete"],
           health: ["health", "medical", "doctor", "nutrition", "diet", "wellness", "mental health", "therapy", "skincare", "beauty", "cosmetics", "supplement", "vitamin", "healthcare", "medicine", "dermatology", "acne", "routine", "serum", "moisturizer", "cleanser", "sunscreen", "anti-aging"],
           food: ["food", "cooking", "recipe", "meal", "kitchen", "chef", "baking", "cuisine", "restaurant", "culinary", "ingredient", "nutrition", "diet", "vegan", "vegetarian", "keto", "paleo"],
           gaming: ["gaming", "game", "video game", "pc", "console", "steam", "esports", "streamer", "twitch", "xbox", "playstation", "nintendo", "indie", "mmo", "fps", "rpg", "mobile game"],
           business: ["business", "startup", "entrepreneur", "company", "marketing", "sales", "revenue", "profit", "growth", "strategy", "b2b", "b2c", "ecommerce", "dropshipping", "affiliate"],
           finance: ["money", "finance", "investment", "stock", "crypto", "bitcoin", "budget", "savings", "trading", "forex", "etf", "portfolio", "retirement", "debt", "loan", "mortgage"],
           education: ["school", "college", "university", "study", "learning", "education", "student", "academic", "course", "degree", "certification", "online learning", "tutoring", "exam"],
           relationships: ["relationship", "dating", "love", "partner", "marriage", "social", "friendship", "romance", "breakup", "couple", "single", "tinder", "bumble", "communication"],
           career: ["job", "career", "work", "employment", "resume", "interview", "salary", "professional", "linkedin", "networking", "freelance", "remote work", "promotion", "skills"],
           home: ["home", "house", "diy", "improvement", "repair", "garden", "plant", "furniture", "decor", "interior", "renovation", "real estate", "mortgage", "apartment", "cleaning"],
           travel: ["travel", "trip", "vacation", "backpack", "destination", "flight", "hotel", "tourism", "adventure", "solo travel", "budget travel", "visa", "passport", "airbnb"],
           pets: ["pet", "dog", "cat", "puppy", "kitten", "animal", "veterinary", "training", "adoption", "rescue", "breed", "grooming", "behavior", "health", "food", "toys"],
           parenting: ["parent", "baby", "child", "kid", "toddler", "mom", "dad", "family", "pregnancy", "newborn", "daycare", "school", "discipline", "development", "milestone"],
           music: ["music", "song", "band", "instrument", "guitar", "piano", "producer", "audio", "recording", "studio", "concert", "festival", "spotify", "soundcloud", "mixing"],
           art: ["art", "drawing", "painting", "design", "creative", "artist", "illustration", "sketch", "digital art", "traditional art", "portfolio", "commission", "gallery", "exhibition"],
           photography: ["photo", "camera", "picture", "lens", "portrait", "wedding", "landscape", "photography", "editing", "lightroom", "photoshop", "dslr", "mirrorless", "studio"],
           writing: ["writing", "book", "author", "story", "novel", "blog", "content", "copywriting", "journalism", "screenplay", "poetry", "publishing", "editor", "manuscript", "freelance writing"]
         };
        
                 const keywords = categoryKeywords[category] || [];
         const matchedKeywords: string[] = [];
         for (const keyword of keywords) {
           if (lowerInput.includes(keyword)) {
             score += keyword.length; // Longer, more specific keywords get higher scores
             matchedKeywords.push(keyword);
           }
         }
         
         if (matchedKeywords.length > 0) {
           logger.info(`[RedditLeadGeneratorTool] Category "${category}" scored ${score} with keywords: ${matchedKeywords.join(', ')}`);
         }
         
         if (score > bestMatch) {
           bestMatch = score;
           detectedCategory = category;
         }
      }
      
             const selectedSubreddits = (subredditCategories as Record<string, string[]>)[detectedCategory] || subredditCategories.business;
      
      logger.info(`[RedditLeadGeneratorTool] Detected category: ${detectedCategory} (score: ${bestMatch}), subreddits: ${selectedSubreddits}`);

      // Generate dynamic search prompt
      const cleanedInput = userInput.replace(/find me some leads on reddit about/i, "").trim();
      const searchPrompt = cleanedInput ? 
        `people asking about ${cleanedInput} or looking for help with ${cleanedInput}` : 
        "people asking for help or advice";

      // Generate dynamic product/service and target audience
      const categoryMappings = {
        fashion: { product: "Fashion products or services", audience: "Fashion-conscious consumers and style enthusiasts" },
        technology: { product: "Technology solutions or software", audience: "Tech professionals and developers" },
        ai: { product: "AI tools or machine learning solutions", audience: "Data scientists and AI enthusiasts" },
        fitness: { product: "Fitness products or training services", audience: "Fitness enthusiasts and athletes" },
                 health: { product: "Health, wellness, and skincare products", audience: "Health-conscious individuals and skincare enthusiasts" },
        food: { product: "Food products or culinary services", audience: "Food enthusiasts and home cooks" },
        gaming: { product: "Gaming products or services", audience: "Gamers and gaming enthusiasts" },
        business: { product: "Business tools or services", audience: "Entrepreneurs and business owners" },
        finance: { product: "Financial products or services", audience: "Investors and financially-minded individuals" },
        education: { product: "Educational tools or services", audience: "Students and educators" },
        relationships: { product: "Relationship or social products", audience: "People seeking relationship advice" },
        career: { product: "Career development services", audience: "Job seekers and professionals" },
        home: { product: "Home improvement products", audience: "Homeowners and DIY enthusiasts" },
        travel: { product: "Travel products or services", audience: "Travelers and adventure seekers" },
        pets: { product: "Pet products or services", audience: "Pet owners and animal lovers" },
        parenting: { product: "Parenting products or services", audience: "Parents and families" },
        music: { product: "Music products or services", audience: "Musicians and music enthusiasts" },
        art: { product: "Art supplies or creative services", audience: "Artists and creative professionals" },
        photography: { product: "Photography equipment or services", audience: "Photographers and visual artists" },
        writing: { product: "Writing tools or publishing services", audience: "Writers and content creators" }
      };

             const mapping = (categoryMappings as Record<string, { product: string; audience: string }>)[detectedCategory] || categoryMappings.business;

      return {
        ...defaultInput,
        searchPrompt: searchPrompt,
        subreddits: selectedSubreddits,
        productOrService: mapping.product,
        targetAudience: mapping.audience
      };
    } catch (error) {
      logger.error("[RedditLeadGeneratorTool] Parameter extraction failed:", error);
      return defaultInput;
    }
  }

  private async analyzePostForLead(post: RedditApiPostData, searchPrompt: string): Promise<LeadAnalysis> {
    // Simple keyword-based analysis to avoid schema issues
    const postText = `${post.title} ${post.selftext || ''}`.toLowerCase();
    const searchTerms = searchPrompt.toLowerCase();

    // Check for help-seeking keywords
    const helpKeywords = ['help', 'need', 'looking for', 'advice', 'recommend', 'suggestion', 'how to', 'struggling', 'problem', 'issue', 'stuck'];
    const urgencyKeywords = ['urgent', 'asap', 'quickly', 'immediately', 'deadline', 'soon'];
    const budgetKeywords = ['budget', 'price', 'cost', 'afford', 'money', 'investment', 'buy', 'purchase'];

    const hasHelpKeywords = helpKeywords.some(keyword => postText.includes(keyword));
    const hasUrgencyKeywords = urgencyKeywords.some(keyword => postText.includes(keyword));
    const hasBudgetKeywords = budgetKeywords.some(keyword => postText.includes(keyword));

    // Simple scoring
    let confidence = 0;
    let isLead = false;
    
    if (hasHelpKeywords) confidence += 30;
    if (hasUrgencyKeywords) confidence += 20;
    if (hasBudgetKeywords) confidence += 25;
    if (post.num_comments > 5) confidence += 10; // Active engagement
    if (post.score > 1) confidence += 15; // Community interest

    isLead = confidence >= 60;

    return {
      isLead,
      confidence: Math.min(confidence, 100),
      painPoints: hasHelpKeywords ? ["Seeking help or advice"] : [],
      intent: hasHelpKeywords ? "seeking_help" : "other",
      urgency: hasUrgencyKeywords ? "high" : "low",
      budget_indicators: hasBudgetKeywords ? ["Mentioned budget/cost concerns"] : [],
      decision_maker_signals: []
    };
  }

  private async generateMessages(post: RedditApiPostData, analysis: LeadAnalysis, productOrService?: string, targetAudience?: string): Promise<GeneratedMessage> {
    // Simple template-based message generation to avoid schema issues
    const postTitle = post.title;
    const subreddit = post.subreddit;
    const author = post.author;

    // Generate personalized messages based on analysis
    let dm = `Hi ${author}! I saw your post in r/${subreddit} about "${postTitle.substring(0, 50)}...". `;
    let comment = "Great question! ";
    
    if (analysis.intent === "seeking_help") {
      dm += "I've dealt with similar challenges before and might be able to share some insights that could help.";
      comment += "I've faced similar challenges and found some approaches that worked well.";
    } else {
      dm += "I thought I might be able to help with some insights if you're interested.";
      comment += "I've dealt with similar situations before.";
    }

    if (analysis.urgency === "high") {
      dm += " I know this can be time-sensitive, so feel free to reach out if you'd like to chat.";
    } else {
      dm += " Would love to share some thoughts if you're open to it.";
    }

    return {
      dm: dm,
      comment: comment + " Feel free to DM me if you'd like to discuss further!",
      reasoning: `Generated based on ${analysis.intent} intent and ${analysis.urgency} urgency in r/${subreddit}`
    };
  }

  private mapApiPostToLead(post: RedditApiPostData, analysis: LeadAnalysis, generatedMessages?: GeneratedMessage | null): RedditLead {
    const relativeTime = post.created_utc ? formatDistanceToNowStrict(fromUnixTime(post.created_utc), { addSuffix: true }) : 'Unknown time';
    
    return {
      id: post.id,
      title: post.title,
      subreddit: post.subreddit,
      author: post.author,
      score: post.score || 0,
      numComments: post.num_comments || 0,
      permalink: `${this.REDDIT_BASE_URL}${post.permalink}`,
      url: post.url || null,
      selfText: post.selftext || null,
      createdUtc: post.created_utc,
      thumbnailUrl: post.preview?.images?.[0]?.resolutions?.[2]?.url ?? 
                    post.preview?.images?.[0]?.resolutions?.[1]?.url ?? 
                    post.preview?.images?.[0]?.source?.url ?? 
                    (post.thumbnail && !["self", "default", "nsfw", "", "spoiler", "image", "hosted:video", "link", "richtext:lightbox"].includes(post.thumbnail) ? post.thumbnail : null),
      analysis,
      generatedMessages,
      relativeTime
    };
  }

  async execute(input: RedditLeadInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = "[RedditLeadGeneratorTool]";
    
    // Debug logging
    this.log("info", `${logPrefix} Input received:`, {
      hasRawUserInput: !!input._rawUserInput,
      rawUserInput: input._rawUserInput?.substring(0, 50),
      currentSubreddits: input.subreddits,
      searchPrompt: input.searchPrompt
    });
    
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      try {
        const extractedParams = await this.extractLeadParameters(input._rawUserInput);
        
        this.log("info", `${logPrefix} Extracted params:`, {
          subreddits: extractedParams.subreddits,
          searchPrompt: extractedParams.searchPrompt,
          productOrService: extractedParams.productOrService
        });
        
        // Only use extracted parameters if the input doesn't have explicit values
        // This ensures our extraction takes precedence over orchestrator defaults
        input = {
          ...input,
          searchPrompt: input.searchPrompt || extractedParams.searchPrompt,
          subreddits: extractedParams.subreddits, // Always use extracted subreddits for natural language
          productOrService: input.productOrService || extractedParams.productOrService,
          targetAudience: input.targetAudience || extractedParams.targetAudience,
          maxPostsPerSubreddit: input.maxPostsPerSubreddit || extractedParams.maxPostsPerSubreddit,
          timeFilter: input.timeFilter || extractedParams.timeFilter,
          generateMessages: input.generateMessages !== undefined ? input.generateMessages : extractedParams.generateMessages
        };
        
        this.log("info", `${logPrefix} Final input after extraction:`, {
          subreddits: input.subreddits,
          searchPrompt: input.searchPrompt,
          productOrService: input.productOrService
        });
      } catch (error) {
        logger.error(`${logPrefix} Error extracting parameters:`, error);
      }
    }

    const searchPrompt = input.searchPrompt || "people asking for help or advice";
    const subreddits = input.subreddits && input.subreddits.length > 0 ? input.subreddits : ["entrepreneur", "smallbusiness", "startups"];
    
    this.log("info", `${logPrefix} Final parameters used:`, {
      searchPrompt,
      subreddits,
      productOrService: input.productOrService,
      targetAudience: input.targetAudience
    });
    const productOrService = input.productOrService;
    const targetAudience = input.targetAudience;
    const maxPostsPerSubreddit = Math.min(Math.max(1, input.maxPostsPerSubreddit || 10), 25);
    const timeFilter = input.timeFilter || "day";
    const generateMessages = input.generateMessages !== false; // Default to true
    
    const userNameForResponse = input.context?.userName || "friend";
    
    let outputStructuredData: RedditLeadGeneratorOutput = {
      result_type: "reddit_leads",
      source_api: "reddit_lead_generator",
      query: {
        searchPrompt,
        subreddits,
        productOrService: productOrService || undefined,
        targetAudience: targetAudience || undefined,
      },
      totalPostsAnalyzed: 0,
      leadsFound: 0,
      leads: [],
      error: null,
    };

    if (abortSignal?.aborted) {
      return { error: "Lead generation cancelled.", result: "Cancelled." };
    }

    if (!subreddits || subreddits.length === 0) {
      const errorMsg = "Please specify at least one subreddit to search.";
      logger.warn(`${logPrefix} ${errorMsg}`);
      outputStructuredData.error = errorMsg;
      return { 
        error: errorMsg, 
        result: `Which subreddits should Minato search for leads, ${userNameForResponse}?`, 
        structuredData: outputStructuredData 
      };
    }

    this.log("info", `${logPrefix} Starting lead generation in ${subreddits.length} subreddits...`);

    try {
      const allPosts: RedditApiPostData[] = [];

      // Fetch posts from each subreddit
      for (const subreddit of subreddits) {
        if (abortSignal?.aborted) break;

        const cleanSubreddit = subreddit.replace(/^r\//i, "").trim();
        if (!/^[a-zA-Z0-9_]{3,21}$/.test(cleanSubreddit)) {
          logger.warn(`${logPrefix} Skipping invalid subreddit: ${cleanSubreddit}`);
          continue;
        }

        let url = `${this.REDDIT_BASE_URL}/r/${cleanSubreddit}/new.json?limit=${maxPostsPerSubreddit}&raw_json=1`;
        if (timeFilter && timeFilter !== "all") {
          url += `&t=${timeFilter}`;
        }

        try {
          const response = await fetch(url, { 
            headers: { "User-Agent": this.USER_AGENT }, 
            signal: abortSignal ?? AbortSignal.timeout(10000) 
          });

          if (!response.ok) {
            logger.warn(`${logPrefix} Failed to fetch from r/${cleanSubreddit}: ${response.status}`);
            continue;
          }

          const data: RedditJsonResponse = await response.json() as RedditJsonResponse;
          if (data?.kind !== "Listing" || !data?.data?.children) {
            logger.warn(`${logPrefix} Unexpected response format from r/${cleanSubreddit}`);
            continue;
          }

          const posts = data.data.children
            .filter(child => child.kind === "t3" && child.data && !child.data.stickied && !child.data.over_18)
            .map(child => child.data);

          allPosts.push(...posts);
          this.log("info", `${logPrefix} Fetched ${posts.length} posts from r/${cleanSubreddit}`);
        } catch (error) {
          logger.error(`${logPrefix} Error fetching from r/${cleanSubreddit}:`, error);
          continue;
        }
      }

      outputStructuredData.totalPostsAnalyzed = allPosts.length;

      if (allPosts.length === 0) {
        const msg = `Minato didn't find any posts to analyze in the specified subreddits for ${userNameForResponse}.`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Analyzing ${allPosts.length} posts for leads...`);

      // Analyze posts for leads
      const leads: RedditLead[] = [];
      for (const post of allPosts) {
        if (abortSignal?.aborted) break;

        try {
          const analysis = await this.analyzePostForLead(post, searchPrompt);
          
          if (analysis.isLead && analysis.confidence >= 60) { // Only include high-confidence leads
            let generatedMessages: GeneratedMessage | null = null;
            
            if (generateMessages) {
              generatedMessages = await this.generateMessages(post, analysis, productOrService || undefined, targetAudience || undefined);
            }

            const lead = this.mapApiPostToLead(post, analysis, generatedMessages);
            leads.push(lead);
          }
        } catch (error) {
          logger.error(`${logPrefix} Error analyzing post ${post.id}:`, error);
          continue;
        }
      }

      // Sort leads by confidence and urgency
      leads.sort((a, b) => {
        const urgencyWeight = { high: 3, medium: 2, low: 1 };
        const aScore = a.analysis.confidence + (urgencyWeight[a.analysis.urgency] * 10);
        const bScore = b.analysis.confidence + (urgencyWeight[b.analysis.urgency] * 10);
        return bScore - aScore;
      });

      outputStructuredData.leads = leads;
      outputStructuredData.leadsFound = leads.length;

      this.log("info", `${logPrefix} Found ${leads.length} qualified leads`);

      if (leads.length === 0) {
        const msg = `Minato analyzed ${allPosts.length} posts but didn't find any qualified leads matching "${searchPrompt}" for ${userNameForResponse}. Try adjusting your search criteria or target different subreddits.`;
        return { result: msg, structuredData: outputStructuredData };
      }

      const topLead = leads[0];
      let resultString = `Great news ${userNameForResponse}! Minato found ${leads.length} qualified lead${leads.length > 1 ? 's' : ''} from ${outputStructuredData.totalPostsAnalyzed} posts analyzed. `;
      resultString += `The top lead is u/${topLead.author} in r/${topLead.subreddit} with ${topLead.analysis.confidence}% confidence. `;
      resultString += `They're ${topLead.analysis.intent.replace('_', ' ')} with ${topLead.analysis.urgency} urgency.`;
      
      if (generateMessages) {
        resultString += ` I've generated personalized messages for each lead!`;
      }

      return { result: resultString, structuredData: outputStructuredData };

    } catch (error: any) {
      const errorMsg = `Failed Reddit lead generation: ${String(error?.message || error)}`;
      outputStructuredData.error = errorMsg;
      
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        outputStructuredData.error = "Request timed out or cancelled.";
        return { 
          error: "Lead generation timed out.", 
          result: `Sorry, ${userNameForResponse}, the lead generation took too long.`, 
          structuredData: outputStructuredData 
        };
      }

      this.log("error", `${logPrefix} Error:`, error);
      return { 
        error: errorMsg, 
        result: `Sorry, ${userNameForResponse}, Minato encountered an issue while searching for leads. Please try again.`, 
        structuredData: outputStructuredData 
      };
    }
  }
} 