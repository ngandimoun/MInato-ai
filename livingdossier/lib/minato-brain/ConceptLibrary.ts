/**
 * @file Dynamic Semantic Concept Library and Matcher
 * @description This file defines a more robust and dynamic structure for understanding user intent
 * across multiple languages and domains. It includes a scoring-based matcher to handle ambiguity.
 */

/**
 * Defines the structure for a dynamic semantic concept.
 * This is designed to be more flexible and powerful than simple keyword matching.
 */
export interface DynamicSemanticConcept {
  /** Unique identifier for the concept. */
  id: string;
  /** Human-readable name of the concept. */
  name: string;
  /** The domains or categories this concept belongs to (e.g., 'Business', 'Finance'). */
  domains: string[];
  /**
   * Multilingual keywords, phrases, and synonyms associated with this concept.
   * The key is the ISO 639-1 language code (e.g., 'en', 'fr').
   */
  terms: Record<string, string[]>;
  /**
   * Multilingual examples of questions a user might ask that trigger this concept.
   * Matching these provides a higher confidence score.
   */
  triggerQuestions: Record<string, string[]>;
  /**
   * Multilingual follow-up questions the system can ask to confirm the user's intent.
   */
  clarificationPrompts: Record<string, string[]>;
  /**
   * Multilingual keywords that, if present, should prevent this concept from matching.
   * Useful for avoiding false positives (e.g., "business trip" vs "business plan").
   */
  negativeKeywords: Record<string, string[]>;
  /** IDs of other concepts that are closely related. */
  relatedConcepts: string[];
}

/**
 * A potential match identified by the DynamicSemanticMatcher.
 */
export interface MatchedConcept {
  concept: DynamicSemanticConcept;
  score: number;
  clarificationPrompt: string;
}

// --- CONCEPT LIBRARY ---

export const allConcepts: DynamicSemanticConcept[] = [
  // Business and Entrepreneurship
  {
    id: 'business_idea',
    name: 'Business Idea',
    domains: ['Business', 'Entrepreneurship'],
    terms: {
      en: ['business idea', 'startup idea', 'new product', 'business concept', 'venture', 'entrepreneurship', 'new business', 'startup concept'],
      fr: ['idée d\'entreprise', 'concept commercial', 'nouvelle entreprise', 'projet de startup'],
      es: ['idea de negocio', 'concepto empresarial', 'emprendimiento', 'nuevo proyecto'],
      zh: ['商业想法', '创业点子', '企业概念', '新产品'],
    },
    triggerQuestions: {
      en: ['i have an idea for a business', 'can you evaluate my startup idea', 'thinking of starting a company'],
      fr: ['j\'ai une idée pour une entreprise', 'évaluer mon idée de startup'],
      es: ['tengo una idea para un negocio', 'evaluar mi idea de startup'],
      zh: ['我有一个商业想法', '评估我的创业点子'],
    },
    clarificationPrompts: {
      en: ['It sounds like you have a new business idea. Are you looking for help with market analysis, competitor research, or building a business plan?'],
      fr: ['Il semble que vous ayez une nouvelle idée d\'entreprise. Cherchez-vous de l\'aide pour une analyse de marché, une recherche de concurrents ou l\'élaboration d\'un plan d\'affaires ?'],
      es: ['Parece que tienes una nueva idea de negocio. ¿Estás buscando ayuda con el análisis de mercado, la investigación de la competencia o la elaboración de un plan de negocio?'],
      zh: ['听起来您有一个新的商业想法。您是希望在市场分析、竞争对手研究还是制定商业计划方面寻求帮助？'],
    },
    negativeKeywords: {
      en: ['class', 'assignment', 'school project', 'homework'],
      fr: ['cours', 'devoir', 'projet scolaire'],
      es: ['clase', 'tarea', 'proyecto escolar'],
      zh: ['课程', '作业', '学校项目'],
    },
    relatedConcepts: ['market_analysis', 'competitor_analysis', 'business_model']
  },
  {
    id: 'market_analysis',
    name: 'Market Analysis',
    domains: ['Business', 'Marketing'],
    terms: {
      en: ['market analysis', 'market research', 'industry analysis', 'market opportunity', 'market size', 'market intelligence', 'market study', 'tam sam som'],
      fr: ['analyse de marché', 'étude de marché', 'recherche commerciale', 'opportunité de marché'],
      es: ['análisis de mercado', 'estudio de mercado', 'investigación de mercado', 'oportunidad de mercado'],
      zh: ['市场分析', '市场研究', '行业分析', '市场机会'],
    },
    triggerQuestions: {
      en: ['how big is the market for', 'what is the market size of', 'analyze the market opportunity for', 'should i enter this market'],
      fr: ['quelle est la taille du marché pour', 'analyser l\'opportunité de marché pour'],
      es: ['qué tan grande es el mercado de', 'analizar la oportunidad de mercado para'],
      zh: ['这个市场有多大', '分析市场机会'],
    },
    clarificationPrompts: {
      en: ['To perform a market analysis, could you specify the industry and geographical region you are interested in?'],
      fr: ['Pour effectuer une analyse de marché, pourriez-vous préciser le secteur et la région géographique qui vous intéressent ?'],
      es: ['Para realizar un análisis de mercado, ¿podría especificar la industria y la región geográfica que le interesan?'],
      zh: ['要进行市场分析，您能否具体说明您感兴趣的行业和地理区域？'],
    },
    negativeKeywords: {},
    relatedConcepts: ['business_idea', 'competitor_analysis', 'market_segmentation']
  },
  {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    domains: ['Business', 'Strategy'],
    terms: {
      en: ['competitor analysis', 'competitive landscape', 'competitive advantage', 'competition', 'moat', 'competitor research', 'look at my competitors'],
      fr: ['analyse concurrentielle', 'paysage concurrentiel', 'avantage concurrentiel', 'rechercher mes concurrents'],
      es: ['análisis de la competencia', 'ventaja competitiva', 'panorama competitivo', 'analizar mi competencia'],
      zh: ['竞争对手分析', '竞争优势', '竞争格局', '看看我的竞争对手'],
    },
    triggerQuestions: {
      en: ['who are my main competitors', 'analyze my competition', 'what are my competitors doing', 'compare me to my rivals'],
      fr: ['qui sont mes principaux concurrents', 'analysez ma concurrence'],
      es: ['quiénes son mis principales competidores', 'analiza mi competencia'],
      zh: ['我的主要竞争对手是谁', '分析我的竞争情况'],
    },
    clarificationPrompts: {
      en: ['I can help with a competitor analysis. Are you interested in their pricing, marketing strategies, product features, or customer reviews?'],
      fr: ['Je peux vous aider avec une analyse concurrentielle. Êtes-vous intéressé par leurs prix, leurs stratégies marketing, les caractéristiques de leurs produits ou les avis des clients ?'],
      es: ['Puedo ayudarle con un análisis de la competencia. ¿Está interesado en sus precios, estrategias de marketing, características de productos o reseñas de clientes?'],
      zh: ['我可以帮助您进行竞争对手分析。您对他们的定价、营销策略、产品功能还是客户评价感兴趣？'],
    },
    negativeKeywords: {},
    relatedConcepts: ['market_analysis', 'business_strategy', 'swot_analysis']
  },
  // Finance and Investment
  {
    id: 'investment_strategy',
    name: 'Investment Strategy',
    domains: ['Finance', 'Investment'],
    terms: {
      en: ['investment strategy', 'asset allocation', 'portfolio management', 'wealth management', 'investment plan', 'how to invest', 'investing'],
      fr: ['stratégie d\'investissement', 'allocation d\'actifs', 'gestion de portefeuille', 'comment investir'],
      es: ['estrategia de inversión', 'asignación de activos', 'gestión de cartera', 'cómo invertir'],
      zh: ['投资策略', '资产配置', '投资组合管理', '如何投资'],
    },
    triggerQuestions: {
      en: ['build an investment portfolio for me', 'how should I invest $10,000', 'what is a good investment strategy for my age'],
      fr: ['créez un portefeuille d\'investissement pour moi', 'comment devrais-je investir 10 000 €'],
      es: ['crea una cartera de inversiones para mí', '¿cómo debería invertir 10,000 $?'],
      zh: ['为我建立一个投资组合', '我应该如何投资一万美元'],
    },
    clarificationPrompts: {
      en: ['To create an investment strategy, I need to understand your risk tolerance (conservative, moderate, or aggressive) and your investment horizon. Could you share those details?'],
      fr: ['Pour créer une stratégie d\'investissement, je dois comprendre votre tolérance au risque (prudente, modérée ou agressive) et votre horizon de placement. Pourriez-vous partager ces détails ?'],
      es: ['Para crear una estrategia de inversión, necesito entender su tolerancia al riesgo (conservadora, moderada o agresiva) y su horizonte de inversión. ¿Podría compartir esos detalles?'],
      zh: ['为了制定投资策略，我需要了解您的风险承受能力（保守型、稳健型或进取型）和您的投资期限。您能分享这些细节吗？'],
    },
    negativeKeywords: {
      en: ['real estate', 'property'],
      fr: ['immobilier'],
      es: ['bienes raíces', 'inmobiliaria'],
      zh: ['房地产', '房产'],
    },
    relatedConcepts: ['financial_planning', 'risk_management', 'retirement_planning']
  },
  // Travel and Hospitality
  {
    id: 'travel_planning',
    name: 'Travel Planning',
    domains: ['Travel'],
    terms: {
        en: ['travel planning', 'trip planning', 'vacation', 'itinerary', 'travel destination', 'plan a trip', 'holiday'],
        fr: ['planification de voyage', 'itinéraire', 'destination de vacances', 'organiser un voyage'],
        es: ['planificación de viaje', 'itinerario', 'destino turístico', 'planear un viaje'],
        zh: ['旅行计划', '行程安排', '旅游目的地', '计划一次旅行'],
    },
    triggerQuestions: {
        en: ['plan a 7-day trip to Italy', 'create an itinerary for a family vacation', 'what should I do in Tokyo for 3 days'],
        fr: ['planifiez un voyage de 7 jours en Italie', 'créez un itinéraire pour des vacances en famille'],
        es: ['planifica un viaje de 7 días a Italia', 'crea un itinerario para unas vacaciones familiares'],
        zh: ['计划一次为期7天的意大利之旅', '为家庭度假创建一个行程'],
    },
    clarificationPrompts: {
        en: ['I can certainly help plan your trip! To create the best itinerary, could you tell me your budget, travel dates, and your main interests (e.g., history, food, adventure)?'],
        fr: ['Je peux certainement vous aider à planifier votre voyage ! Pour créer le meilleur itinéraire, pourriez-vous m\'indiquer votre budget, vos dates de voyage et vos principaux centres d\'intérêt (par exemple, histoire, gastronomie, aventure) ?'],
        es: ['¡Claro que puedo ayudar a planificar tu viaje! Para crear el mejor itinerario, ¿podrías decirme tu presupuesto, fechas de viaje y tus principales intereses (p. ej., historia, comida, aventura)?'],
        zh: ['我当然可以帮助您计划行程！为了创建最佳行程，您能告诉我您的预算、旅行日期和您的主要兴趣（例如历史、美食、探险）吗？'],
    },
    negativeKeywords: {
        en: ['business trip', 'work travel'],
        fr: ['voyage d\'affaires'],
        es: ['viaje de negocios'],
        zh: ['商务旅行', '出差'],
    },
    relatedConcepts: ['accommodation', 'activities', 'transportation']
  },
];


// --- DYNAMIC MATCHER ENGINE ---

/**
 * A sophisticated engine to match user input against a library of semantic concepts.
 * It uses a scoring system to find the most likely intent.
 */
export class DynamicSemanticMatcher {
  private concepts: DynamicSemanticConcept[];
  private defaultLanguage: string;

  /**
   * Initializes the matcher with a library of concepts.
   * @param concepts An array of DynamicSemanticConcept objects.
   * @param defaultLanguage The default language code to use if none is provided.
   */
  constructor(concepts: DynamicSemanticConcept[], defaultLanguage: string = 'en') {
    this.concepts = concepts;
    this.defaultLanguage = defaultLanguage;
  }

  /**
   * Normalizes text for matching by converting to lowercase and trimming whitespace.
   * @param text The input text.
   * @returns The normalized text.
   */
  private normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  /**
   * Matches a user's input text against the concept library.
   * @param inputText The text provided by the user.
   * @param language The ISO 639-1 language code of the input text.
   * @returns A sorted array of MatchedConcept objects, from highest to lowest score.
   */
  public match(inputText: string, language: string = this.defaultLanguage): MatchedConcept[] {
    const normalizedInput = this.normalize(inputText);
    const results: Omit<MatchedConcept, 'clarificationPrompt'>[] = [];

    for (const concept of this.concepts) {
      let score = 0;
      const termsLang = concept.terms[language] || concept.terms[this.defaultLanguage] || [];
      const questionsLang = concept.triggerQuestions[language] || concept.triggerQuestions[this.defaultLanguage] || [];
      const negativeLang = concept.negativeKeywords[language] || concept.negativeKeywords[this.defaultLanguage] || [];

      // 1. Negative Keyword Check (Disqualification)
      if (negativeLang.some(neg => normalizedInput.includes(this.normalize(neg)))) {
        score = -999; // Disqualify immediately
        results.push({ concept, score });
        continue;
      }
      
      // 2. Trigger Question Matching (High Score)
      for (const question of questionsLang) {
        if (normalizedInput.includes(this.normalize(question))) {
          score += 20;
        }
      }

      // 3. Term Matching (Standard Score)
      for (const term of termsLang) {
        if (normalizedInput.includes(this.normalize(term))) {
          score += 10;
        }
      }

      if (score > 0) {
        results.push({ concept, score });
      }
    }

    // Sort by score (descending) and add the appropriate clarification prompt
    const finalResults: MatchedConcept[] = results
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(match => {
            const promptsArray = match.concept.clarificationPrompts[language] || match.concept.clarificationPrompts[this.defaultLanguage] || [];
            return {
                ...match,
                clarificationPrompt: promptsArray.length > 0 ? promptsArray[0] : ''
            };
        });
        
    return finalResults;
  }
}

/**
 * Maps tasks to semantic concepts based on their triggers
 * @param tasks List of tasks to map
 * @param concepts List of semantic concepts to map to
 * @returns A record mapping task IDs to arrays of concept IDs
 */
export function buildTaskConceptMappings(tasks: any[], concepts: DynamicSemanticConcept[]): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  
  // For each task, find matching concepts based on keyword overlap
  for (const task of tasks) {
    if (!task.id || !task.triggers) continue;
    
    const taskKeywords = task.triggers.map((t: any) => t.keyword.toLowerCase());
    const matchedConcepts: string[] = [];
    
    // Find concepts with overlapping keywords
    for (const concept of concepts) {
      // Collect all terms from all languages
      const allConceptTerms: string[] = [];
      Object.values(concept.terms).forEach(terms => {
        terms.forEach(term => allConceptTerms.push(term.toLowerCase()));
      });
      
      // Check if any task keyword matches any concept term
      const hasMatch = taskKeywords.some((keyword: string) => 
        allConceptTerms.some(term => 
          term.includes(keyword) || keyword.includes(term)
        )
      );
      
      if (hasMatch) {
        matchedConcepts.push(concept.id);
      }
    }
    
    if (matchedConcepts.length > 0) {
      mappings[task.id] = matchedConcepts;
    }
  }
  
  return mappings;
}

// --- DEMONSTRATION OF USAGE ---

function demonstrateMatcher() {
  console.log('--- Dynamic Semantic Matcher Demonstration ---');

  const matcher = new DynamicSemanticMatcher(allConcepts, 'en');

  const userInputs = [
    { text: 'I have an idea for a new business that sells eco-friendly packaging.', lang: 'en' },
    { text: 'Quiero analizar la competencia para mi nuevo café en Madrid.', lang: 'es' },
    { text: 'Comment devrais-je investir 5000€ pour ma retraite?', lang: 'fr' },
    { text: 'Plan a romantic 5-day trip to Paris for me and my partner.', lang: 'en' },
    { text: 'I need to plan my business trip to Berlin next month.', lang: 'en' },
    { text: '这个运动鞋的市场有多大？', lang: 'zh' },
  ];

  userInputs.forEach(({ text, lang }, index) => {
    console.log(`\n[${index + 1}] User Input (${lang}): "${text}"`);
    const matches = matcher.match(text, lang);

    if (matches.length > 0) {
      console.log('✅ Top Match Found:');
      const topMatch = matches[0];
      console.log(`   - Concept: ${topMatch.concept.name} (ID: ${topMatch.concept.id})`);
      console.log(`   - Score: ${topMatch.score}`);
      console.log(`   - Suggested Clarification: "${topMatch.clarificationPrompt}"`);
      
      if(matches.length > 1) {
          console.log('   - Other possible matches:', matches.slice(1).map(m => `${m.concept.name} (Score: ${m.score})`).join(', '));
      }
    } else {
      console.log('❌ No confident match found.');
    }
  });
}

// To run the demonstration, you would call this function.
demonstrateMatcher();