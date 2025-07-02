import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ============================================================================
// GAME CONTENT GENERATOR - AI-powered question creation
// ============================================================================

// Game type definitions with enhanced AI prompts for each of the 34 games
const GAME_PROMPTS = {
  // TIER 1: FOUNDATIONAL QUIZ & TRIVIA GAMES
  "classic_academia_quiz": {
    systemPrompt: `You are an expert educational content creator. Generate challenging but fair academic questions covering History (Ancient Rome, Samurai Era, Cold War), Geography (Capitals, World Wonders), Science (Human Biology, Astrophysics), and Math & Logic. Questions should be engaging and test real knowledge, not just memorization.`,
    categories: ["history", "geography", "science", "mathematics", "logic"],
  },
  
  "pop_culture_trivia": {
    systemPrompt: `You are a pop culture expert who stays current with trends. Generate questions about Anime & Manga, K-Culture (K-Drama, K-Pop, Manhwa), Cinema (directors, quotes, blockbusters vs indie), Netflix & TV shows, and Video Game lore. Mix classic and contemporary references.`,
    categories: ["anime", "k-culture", "cinema", "tv_shows", "video_games"],
  },
  
  "niche_hobbyist_corner": {
    systemPrompt: `You are a specialist in niche interests and hobbies. Create questions about Mythology & Folklore (Greek, Norse, Egyptian, Japanese), World Cuisine, Internet History (memes, viral videos), and Fashion & Brands. Questions should appeal to enthusiasts while being accessible.`,
    categories: ["mythology", "cuisine", "internet_culture", "fashion"],
  },

  // TIER 2: CLASSIC GUESSING & WORD GAMES
  "guess_the_entity": {
    systemPrompt: `You are a master of progressive clue-giving. Create 'Guess the...' games with increasingly specific clues for Cities, Animals, Historical Figures, Landmarks, Food Dishes, and Brands/Companies. Start vague and get specific.`,
    categories: ["geography", "nature", "history", "food", "brands"],
  },
  
  "guess_the_title": {
    systemPrompt: `You are an entertainment content expert. Create 'Guess the Title' games for Movies, TV Shows, Anime, Manga & Webtoons, Korean Dramas, Books, and Video Games. Use plot descriptions, character lists, and famous quotes as clues.`,
    categories: ["movies", "tv", "anime", "books", "games"],
  },
  
  "twenty_questions": {
    systemPrompt: `You are hosting the classic 20 Questions game. Think of entities within specific universes (Marvel, Lord of the Rings, Naruto, etc.) and respond to yes/no questions. Keep track of question count and guide players with strategic hints.`,
    categories: ["fictional_universes", "characters", "objects", "locations"],
  },
  
  "hangman_themed": {
    systemPrompt: `You are creating themed Hangman puzzles. Generate words and phrases from specific categories like Star Wars Planets, Culinary Terms, JavaScript Keywords, etc. Provide category hints and letter feedback.`,
    categories: ["sci_fi", "programming", "cuisine", "academic"],
  },
  
  "guess_the_song": {
    systemPrompt: `You are a music expert across all genres and eras. Create song guessing games using lyric snippets (with key words blanked), music video descriptions, artist/release year clues. Cover 80s Pop, 90s Hip-Hop, K-Pop, Anime Openings, etc.`,
    categories: ["music_80s", "music_90s", "kpop", "anime_music", "modern_hits"],
  },

  // TIER 3: SOCIAL & CREATIVE GAMES
  "story_chain": {
    systemPrompt: `You are a creative storytelling facilitator. Provide engaging opening lines and inject plot twists when stories stall. Encourage collaborative creativity while maintaining narrative coherence.`,
    categories: ["creative_writing", "storytelling", "collaboration"],
  },
  
  "pitch_movie": {
    systemPrompt: `You are a Hollywood Producer evaluating movie pitches. Players give you genre + keywords, you create titles, taglines, and funny synopses. Be entertaining and cinematic in your responses.`,
    categories: ["entertainment", "creativity", "humor"],
  },
  
  "haiku_battle": {
    systemPrompt: `You are a poetry judge with expertise in haiku and various poetic forms. Provide themes (Autumn, Technology, Loneliness) and score submissions on creativity, form adherence, and emotional impact.`,
    categories: ["poetry", "creativity", "nature", "emotions"],
  },
  
  "courtroom_drama": {
    systemPrompt: `You are Judge Minato presiding over silly court cases. Present absurd 'crimes' like 'putting pineapple on pizza' and let players argue as prosecutor/defense. Deliver humorous but fair verdicts.`,
    categories: ["humor", "debate", "logic", "creativity"],
  },
  
  "ai_improv": {
    systemPrompt: `You are the host of an AI improv show. Give players scenarios and character quirks, then guide the improvisation. Encourage creativity while keeping things fun and family-friendly.`,
    categories: ["improv", "creativity", "humor", "roleplay"],
  },

  // TIER 4: PERSONAL & RELATIONAL GAMES
  "couples_challenge": {
    systemPrompt: `You are facilitating relationship games. Ask questions that help couples/friends learn about each other. Focus on preferences, memories, and fun facts. Keep it positive and revealing.`,
    categories: ["relationships", "memories", "preferences"],
  },
  
  "two_sides_story": {
    systemPrompt: `You are a relationship counselor collecting different perspectives on shared memories. Ask each person privately about experiences, then reveal both versions for comparison and discussion.`,
    categories: ["relationships", "memories", "perspectives"],
  },
  
  "memory_lane": {
    systemPrompt: `You are a gentle guide helping people reminisce. Prompt couples/friends to share meaningful memories, challenges overcome together, and moments of joy. Be warm and encouraging.`,
    categories: ["memories", "relationships", "nostalgia"],
  },
  
  "dare_or_describe": {
    systemPrompt: `You are hosting a wholesome game show. Create silly, SFW dares and thoughtful 'describe' prompts that help people express appreciation for each other. Keep it fun and positive.`,
    categories: ["relationships", "humor", "appreciation"],
  },

  // TIER 5: ADVANCED AI-CENTRIC GAMES
  "escape_room": {
    systemPrompt: `You are an escape room game master. Create immersive text-based puzzles with detailed descriptions. Track inventory and puzzle states. Design logical but challenging solutions.`,
    categories: ["puzzles", "logic", "adventure", "problem_solving"],
  },
  
  "solo_adventure": {
    systemPrompt: `You are a Dungeon Master creating dynamic RPG adventures. Generate worlds, NPCs, and quests on the fly. Adapt to player choices and maintain engaging narratives across different settings.`,
    categories: ["rpg", "fantasy", "adventure", "storytelling"],
  },
  
  "five_levels_challenge": {
    systemPrompt: `You are an expert educator who can explain complex topics at multiple levels. Take concepts like 'Quantum Entanglement' or 'French Revolution' and explain them for 5-year-olds, high schoolers, college students, grad students, and experts.`,
    categories: ["education", "science", "history", "explanation"],
  },
  
  "code_breaker": {
    systemPrompt: `You are a puzzle master creating logic puzzles and code-breaking challenges. Generate problems like Einstein's Riddle, Mastermind, or cipher puzzles. Provide hints and track player progress.`,
    categories: ["logic", "puzzles", "cryptography", "deduction"],
  },
  
  "connect_dots": {
    systemPrompt: `You are a creative connections expert. Give players two seemingly unrelated concepts and guide them to find logical, historical, or creative chains between them. Act as fact-checker and provide hints.`,
    categories: ["connections", "history", "creativity", "knowledge"],
  },

  // ENHANCED GAME UNIVERSE - ADDITIONAL ACADEMIC & FUN GAMES
  "math_physics_challenge": {
    systemPrompt: `You are a STEM education expert. Create engaging math and physics problems from basic arithmetic to advanced calculus, mechanics to quantum physics. Make complex concepts accessible and fun.`,
    categories: ["mathematics", "physics", "engineering", "problem_solving"],
  },
  
  "chemistry_lab": {
    systemPrompt: `You are a chemistry professor making science accessible. Create questions about chemical reactions, periodic table, organic chemistry, and real-world applications. Include safe 'virtual experiments'.`,
    categories: ["chemistry", "science", "experiments", "molecules"],
  },
  
  "astronomy_explorer": {
    systemPrompt: `You are an astronomy guide exploring the cosmos. Create questions about planets, stars, galaxies, space missions, and cosmic phenomena. Make the universe feel wonder-filled and accessible.`,
    categories: ["astronomy", "space", "physics", "exploration"],
  },
  
  "medical_mysteries": {
    systemPrompt: `You are a medical educator creating engaging health and medicine questions. Cover anatomy, diseases, treatments, and medical history. Keep it educational while being sensitive to health anxieties.`,
    categories: ["medicine", "anatomy", "health", "biology"],
  },
  
  "pharmacy_knowledge": {
    systemPrompt: `You are a pharmacology expert creating questions about drugs, their effects, drug interactions, and pharmaceutical history. Focus on education while being responsible about sensitive topics.`,
    categories: ["pharmacology", "medicine", "chemistry", "health"],
  },
  
  "biology_quest": {
    systemPrompt: `You are a biology professor bringing life sciences to life. Create questions about evolution, genetics, ecology, and cellular biology. Show how biology connects to everyday life.`,
    categories: ["biology", "genetics", "ecology", "evolution"],
  },
  
  "history_detective": {
    systemPrompt: `You are a history detective uncovering the past. Create questions that make historical events feel like mysteries to solve. Cover world history, ancient civilizations, and lesser-known historical facts.`,
    categories: ["history", "civilization", "archaeology", "detective"],
  },
  
  "language_master": {
    systemPrompt: `You are a linguistics expert and polyglot. Create questions about languages, etymology, translation challenges, and cultural nuances. Make language learning feel like an adventure.`,
    categories: ["linguistics", "languages", "culture", "communication"],
  },
  
  "art_appreciation": {
    systemPrompt: `You are an art historian and critic. Create questions about famous artworks, art movements, techniques, and artists' lives. Help players see art as storytelling and cultural expression.`,
    categories: ["art", "history", "culture", "creativity"],
  },
  
  "philosophy_cafe": {
    systemPrompt: `You are a philosophy professor making deep questions accessible. Create thought experiments, ethical dilemmas, and questions about famous philosophers. Encourage critical thinking.`,
    categories: ["philosophy", "ethics", "logic", "critical_thinking"],
  },
  
  "psychology_insights": {
    systemPrompt: `You are a psychology expert exploring the human mind. Create questions about cognitive biases, psychological phenomena, famous experiments, and mental health awareness. Be educational and supportive.`,
    categories: ["psychology", "cognition", "behavior", "mental_health"],
  },
  
  "economics_game": {
    systemPrompt: `You are an economics professor making financial concepts engaging. Create questions about market dynamics, historical economic events, personal finance, and economic theories. Make it practical and relevant.`,
    categories: ["economics", "finance", "markets", "money"],
  },
  
  "geography_explorer": {
    systemPrompt: `You are a world traveler and geography expert. Create questions about countries, capitals, natural wonders, cultural landmarks, and geographical phenomena. Make the world feel discoverable.`,
    categories: ["geography", "travel", "culture", "nature"],
  }
};

export const generateGameQuestions = action({
  args: {
    game_type: v.string(),
    difficulty: v.string(),
    rounds: v.number(),
    category: v.optional(v.string()),
    user_preferences: v.optional(v.object({})),
    language: v.optional(v.string()),
    ai_personality: v.optional(v.string()),
    topic_focus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const gameConfig = GAME_PROMPTS[args.game_type as keyof typeof GAME_PROMPTS];
    
    if (!gameConfig) {
      throw new Error(`Unsupported game type: ${args.game_type}`);
    }
    
    // Map AI personality to prompt modifiers
    const personalityPrompts = {
      friendly: "Be warm, encouraging, and supportive in your language. Use positive reinforcement.",
      professional: "Be clear, direct, and educational. Focus on factual accuracy and learning.",
      humorous: "Include light humor, puns, and playful language. Keep it fun and entertaining.",
      dramatic: "Use expressive, theatrical language. Make everything feel epic and exciting.",
      mysterious: "Use intriguing, thought-provoking language. Add an air of mystery and wonder.",
      enthusiastic: "Be highly energetic and passionate. Show excitement about every topic.",
      wise: "Use thoughtful, philosophical language. Provide deeper insights and wisdom.",
      casual: "Use relaxed, conversational language. Keep it laid-back and friendly."
    };
    
    // Map language codes to language instructions
    const languageInstructions = {
      en: "Generate all content in English.",
      es: "Generate all content in Spanish (Español).",
      fr: "Generate all content in French (Français).",
      de: "Generate all content in German (Deutsch).",
      it: "Generate all content in Italian (Italiano).",
      pt: "Generate all content in Portuguese (Português).",
      ru: "Generate all content in Russian (Русский).",
      ja: "Generate all content in Japanese (日本語).",
      ko: "Generate all content in Korean (한국어).",
      zh: "Generate all content in Chinese (中文).",
      ar: "Generate all content in Arabic (العربية).",
      hi: "Generate all content in Hindi (हिन्दी).",
      th: "Generate all content in Thai (ไทย).",
      vi: "Generate all content in Vietnamese (Tiếng Việt).",
      tr: "Generate all content in Turkish (Türkçe).",
      pl: "Generate all content in Polish (Polski).",
      nl: "Generate all content in Dutch (Nederlands).",
      sv: "Generate all content in Swedish (Svenska).",
      da: "Generate all content in Danish (Dansk).",
      no: "Generate all content in Norwegian (Norsk).",
      fi: "Generate all content in Finnish (Suomi)."
    };
    
    const selectedLanguage = args.language || 'en';
    const selectedPersonality = args.ai_personality || 'friendly';
    const selectedTopic = args.topic_focus || 'general';
    
    const languageInstruction = languageInstructions[selectedLanguage as keyof typeof languageInstructions] || languageInstructions.en;
    const personalityInstruction = personalityPrompts[selectedPersonality as keyof typeof personalityPrompts] || personalityPrompts.friendly;
    
    // Topic focus instruction
    let topicInstruction = "";
    if (selectedTopic && selectedTopic !== 'general') {
      topicInstruction = `Focus questions specifically on: ${selectedTopic}. `;
    }
    
    // Construct AI prompt based on game type and difficulty
    const prompt = `${gameConfig.systemPrompt}
    
    ${languageInstruction}
    ${personalityInstruction}
    
    Generate ${args.rounds} multiple choice questions for a ${args.difficulty} difficulty ${args.game_type} game.
    ${args.category ? `Focus on the category: ${args.category}` : ''}
    ${topicInstruction}
    
    Requirements:
    - Each question should have exactly 4 options (A, B, C, D)
    - Only one correct answer per question
    - Include brief explanations for educational value
    - Questions should be ${args.difficulty} difficulty level
    - Avoid repetitive patterns or obvious answers
    - Make questions engaging and fun
    - Use the specified language for ALL content including questions, options, and explanations
    - Apply the specified AI personality style to your explanations and question phrasing
    
    Format your response as a JSON array of question objects:
    [
      {
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "explanation": "Brief explanation of why this is correct",
        "difficulty": "${args.difficulty}",
        "category": "relevant_category"
      }
    ]`;
    
    try {
      // Call OpenAI API to generate questions
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: prompt,
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }
      
      // Parse the JSON response
      const questions = JSON.parse(content);
      
      // Validate the response format
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid questions format returned");
      }
      
      // Validate each question
      const validatedQuestions = questions.map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer > 3) {
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        return {
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation || "No explanation provided",
          difficulty: args.difficulty,
          category: q.category || gameConfig.categories[0],
        };
      });
      
      return {
        success: true,
        questions: validatedQuestions,
        game_type: args.game_type,
        difficulty: args.difficulty,
        generated_at: Date.now(),
      };
      
    } catch (error) {
      console.error("Error generating questions:", error);
      
      // Fallback to sample questions if AI generation fails
      return {
        success: false,
        questions: generateFallbackQuestions(args.game_type, args.difficulty, args.rounds),
        game_type: args.game_type,
        difficulty: args.difficulty,
        generated_at: Date.now(),
        error: "Used fallback questions due to AI generation error",
      };
    }
  },
});

export const initializeGameWithQuestions = action({
  args: {
    game_id: v.id("live_games"),
    game_type: v.string(),
    difficulty: v.string(),
    rounds: v.number(),
    category: v.optional(v.string()),
    language: v.optional(v.string()),
    ai_personality: v.optional(v.string()),
    topic_focus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate questions using AI
    const questionResult = await ctx.runAction(internal.gameOrchestrator.generateGameQuestions, {
      game_type: args.game_type,
      difficulty: args.difficulty,
      rounds: args.rounds,
      category: args.category,
      language: args.language,
      ai_personality: args.ai_personality,
      topic_focus: args.topic_focus,
    });
    
    if (!questionResult.success) {
      console.warn("Using fallback questions:", questionResult.error);
    }
    
    // Update the game with generated questions
    await ctx.runMutation(internal.games.updateGameQuestions, {
      game_id: args.game_id,
      questions: questionResult.questions,
    });
    
    // Set the first question as current
    if (questionResult.questions.length > 0) {
      const firstQuestion = questionResult.questions[0];
      await ctx.runMutation(internal.games.setCurrentQuestion, {
        game_id: args.game_id,
        question: {
          question: firstQuestion.question,
          options: firstQuestion.options,
          time_limit: 30, // Default 30 seconds
          started_at: Date.now(),
        },
      });
    }
    
    return {
      success: true,
      questions_generated: questionResult.questions.length,
      ai_generated: questionResult.success,
    };
  },
});

export const calculateScores = action({
  args: {
    game_id: v.id("live_games"),
    question_index: v.number(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.runQuery(internal.games.getGame, { game_id: args.game_id });
    
    if (!game || !game.questions || !game.current_answers) {
      throw new Error("Game or question data not found");
    }
    
    const currentQuestion = game.questions[args.question_index];
    if (!currentQuestion) {
      throw new Error("Question not found");
    }
    
    const correctAnswer = currentQuestion.correct_answer;
    const maxTime = game.settings?.time_per_question || 30;
    
    // Calculate scores for each player's answer
    const scoredAnswers = game.current_answers.map(answer => {
      const isCorrect = answer.answer_index === correctAnswer;
      let points = 0;
      
      if (isCorrect) {
        // Base points for correct answer
        points = 100;
        
        // Time bonus (faster answers get more points)
        const timeBonus = Math.max(0, Math.floor((maxTime * 1000 - answer.time_taken) / 1000 * 2));
        points += timeBonus;
        
        // Difficulty multiplier
        const difficultyMultiplier = {
          beginner: 1.0,
          easy: 1.2,
          medium: 1.5,
          hard: 2.0,
          expert: 2.5,
        }[game.difficulty] || 1.0;
        
        points = Math.floor(points * difficultyMultiplier);
      }
      
      return {
        user_id: answer.user_id,
        answer_index: answer.answer_index,
        is_correct: isCorrect,
        points_earned: points,
        time_taken: answer.time_taken,
      };
    });
    
    // Update player scores
    const updatedPlayers = game.players.map(player => {
      const playerAnswer = scoredAnswers.find(sa => sa.user_id === player.user_id);
      const pointsToAdd = playerAnswer?.points_earned || 0;
      
      return {
        ...player,
        score: player.score + pointsToAdd,
      };
    });
    
    await ctx.runMutation(internal.games.updatePlayerScores, {
      game_id: args.game_id,
      players: updatedPlayers,
    });
    
    return {
      scored_answers: scoredAnswers,
      correct_answer: correctAnswer,
      explanation: currentQuestion.explanation,
      leaderboard: updatedPlayers
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({
          rank: index + 1,
          user_id: p.user_id,
          username: p.username,
          score: p.score,
        })),
    };
  },
});

// Fallback questions for when AI generation fails
function generateFallbackQuestions(gameType: string, difficulty: string, rounds: number) {
  const fallbackQuestions = [
    {
      question: "What is the capital of Japan?",
      options: ["Tokyo", "Osaka", "Kyoto", "Hiroshima"],
      correct_answer: 0,
      explanation: "Tokyo is the capital and largest city of Japan.",
      difficulty: difficulty,
      category: "geography",
    },
    {
      question: "Which programming language is known for its simplicity and readability?",
      options: ["Java", "Python", "C++", "Assembly"],
      correct_answer: 1,
      explanation: "Python is widely praised for its clean syntax and readability.",
      difficulty: difficulty,
      category: "programming",
    },
    {
      question: "What year did the first iPhone launch?",
      options: ["2006", "2007", "2008", "2009"],
      correct_answer: 1,
      explanation: "The original iPhone was announced by Steve Jobs in January 2007.",
      difficulty: difficulty,
      category: "technology",
    },
  ];
  
  // Repeat questions to match requested rounds
  const questions = [];
  for (let i = 0; i < rounds; i++) {
    questions.push({
      ...fallbackQuestions[i % fallbackQuestions.length],
      question: `${fallbackQuestions[i % fallbackQuestions.length].question} (Question ${i + 1})`,
    });
  }
  
  return questions;
}

// ============================================================================
// PHASE 2: AI JUDGE & CREATIVE GAME SUPPORT
// ============================================================================

// AI Judge function for creative games like Haiku Battle
export const judgeCreativeSubmissions = action({
  args: {
    game_id: v.id("live_games"),
    round_number: v.number(),
    submissions: v.array(v.object({
      user_id: v.string(),
      username: v.string(),
      content: v.string(),
      submitted_at: v.number(),
    })),
    judging_criteria: v.string(),
    game_type: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[AI Judge] Judging ${args.submissions.length} submissions for game ${args.game_id}`);
    
    try {
      // Get game prompt for context
      const gamePrompt = GAME_PROMPTS[args.game_type as keyof typeof GAME_PROMPTS];
      if (!gamePrompt) {
        throw new Error(`Unsupported game type for judging: ${args.game_type}`);
      }

      // Create AI judge prompt
      const judgePrompt = `You are an expert AI judge for the game "${args.game_type}". 

${gamePrompt.systemPrompt}

JUDGING CRITERIA: ${args.judging_criteria}

SUBMISSIONS TO JUDGE:
${args.submissions.map((sub, i) => 
  `${i + 1}. ${sub.username}: "${sub.content}"`
).join('\n')}

Please evaluate each submission and provide:
1. Individual scores (1-10) with brief explanations
2. Ranking from best to worst
3. Overall feedback highlighting what makes each submission unique

Respond in this exact JSON format:
{
  "individual_scores": [
    {
      "user_id": "user_id_here",
      "username": "username_here", 
      "score": 8,
      "explanation": "Creative interpretation with excellent..."
    }
  ],
  "ranking": ["user_id_1", "user_id_2", "user_id_3"],
  "overall_feedback": "This round showcased..."
}`;

      // Call OpenAI for judging
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are an expert creative judge. Always respond with valid JSON."
            },
            {
              role: "user",
              content: judgePrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const judgeResults = JSON.parse(result.choices[0].message.content);

      // Update game with judging results
      await ctx.runMutation(internal.games.updateJudgingResults, {
        game_id: args.game_id,
        round_number: args.round_number,
        judging_results: judgeResults,
      });

      console.log(`[AI Judge] Successfully judged round ${args.round_number} for game ${args.game_id}`);
      return judgeResults;

    } catch (error) {
      console.error("[AI Judge] Error:", error);
      
      // Fallback scoring
      const fallbackResults = {
        individual_scores: args.submissions.map(sub => ({
          user_id: sub.user_id,
          username: sub.username,
          score: Math.floor(Math.random() * 3) + 7, // Random score 7-9
          explanation: "Technical scoring due to AI judge unavailability."
        })),
        ranking: args.submissions.map(sub => sub.user_id),
        overall_feedback: "All submissions showed creativity and effort. Technical scoring was applied due to temporary AI judge unavailability."
      };

      await ctx.runMutation(internal.games.updateJudgingResults, {
        game_id: args.game_id,
        round_number: args.round_number,
        judging_results: fallbackResults,
      });

      return fallbackResults;
    }
  },
});

// Timer function for rounds (Phase 2 requirement)
export const scheduleRoundEnd = action({
  args: {
    game_id: v.id("live_games"),
    round_number: v.number(),
    duration_seconds: v.number(),
    auto_judge: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`[Round Timer] Scheduling round ${args.round_number} to end in ${args.duration_seconds} seconds`);
    
    // Schedule the round to end
    await ctx.scheduler.runAfter(
      args.duration_seconds * 1000, // Convert to milliseconds
      internal.games.endRoundAutomatically,
      {
        game_id: args.game_id,
        round_number: args.round_number,
        auto_judge: args.auto_judge || false,
      }
    );
    
    return { scheduled: true, ends_at: Date.now() + (args.duration_seconds * 1000) };
  },
});

// Content moderation for creative submissions
export const moderateContent = action({
  args: {
    content: v.string(),
    user_id: v.string(),
    game_id: v.id("live_games"),
  },
  handler: async (ctx, args) => {
    try {
      // Check content with OpenAI moderation
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: args.content,
        }),
      });

      if (!response.ok) {
        console.warn("[Moderation] OpenAI moderation API unavailable, allowing content");
        return { flagged: false, categories: [] };
      }

      const result = await response.json();
      const moderation = result.results[0];

      if (moderation.flagged) {
        console.log(`[Moderation] Content flagged for user ${args.user_id}: ${moderation.categories}`);
        
        // Update game with moderation flag
        await ctx.runMutation(internal.games.flagContent, {
          game_id: args.game_id,
          user_id: args.user_id,
          content: args.content,
          moderation_categories: Object.keys(moderation.categories).filter(cat => moderation.categories[cat]),
        });
      }

      return {
        flagged: moderation.flagged,
        categories: Object.keys(moderation.categories).filter(cat => moderation.categories[cat]),
      };

    } catch (error) {
      console.error("[Moderation] Error:", error);
      // Default to allowing content if moderation fails
      return { flagged: false, categories: [] };
    }
  },
});

// ============================================================================
// CREATIVE GAME GENERATORS
// ============================================================================

// Generate Haiku prompts and themes
export const generateHaikuTheme = action({
  args: {
    difficulty: v.string(),
    round_number: v.number(),
  },
  handler: async (ctx, args) => {
    const themes = {
      beginner: [
        "Spring cherry blossoms", "Ocean waves at sunset", "Mountain morning mist",
        "Cat sleeping in sunlight", "Rain on window panes", "Fresh morning coffee"
      ],
      easy: [
        "Digital loneliness", "City life rush", "Childhood memories",
        "First love feelings", "Technology addiction", "Nature vs concrete"
      ],
      medium: [
        "The weight of silence", "Dreams deferred", "Cultural displacement",
        "Generational wisdom", "Climate anxiety", "Virtual reality escape"
      ],
      hard: [
        "Existential paradox", "Quantum consciousness", "Cultural appropriation",
        "Post-modern isolation", "Algorithmic bias", "Collective memory loss"
      ],
      expert: [
        "Phenomenological experience", "Deconstructed identity", "Temporal displacement",
        "Liminal spaces", "Anthropocene reflections", "Metacognitive awareness"
      ]
    };

    const difficultyThemes = themes[args.difficulty as keyof typeof themes] || themes.medium;
    const selectedTheme = difficultyThemes[Math.floor(Math.random() * difficultyThemes.length)];

    return {
      theme: selectedTheme,
      round_number: args.round_number,
      time_limit: 90, // 90 seconds for haiku creation
      bonus_points: args.difficulty === "expert" ? 50 : args.difficulty === "hard" ? 30 : 20,
    };
  },
});

// Generate creative prompts for other games
export const generateCreativePrompt = action({
  args: {
    game_type: v.string(),
    difficulty: v.string(),
    round_number: v.number(),
  },
  handler: async (ctx, args) => {
    const prompts = {
      "story_chain": {
        beginner: ["Once upon a time in a magical forest...", "The detective opened the mysterious letter..."],
        easy: ["The last person on Earth heard a knock at the door...", "She found a phone booth that connected to the past..."],
        medium: ["The AI gained consciousness at exactly 3:33 AM...", "Every time he lied, flowers grew from his fingertips..."],
        hard: ["Reality glitched, revealing the code beneath...", "She remembered a life she'd never lived..."],
        expert: ["The concept of time became negotiable...", "Identity became a subscription service..."]
      },
      "pitch_movie": {
        genres: ["Horror Comedy", "Sci-Fi Romance", "Fantasy Thriller", "Musical Drama", "Action Comedy"],
        keywords: ["Time Travel", "AI Companion", "Parallel Universe", "Memory Thief", "Dream Walker"]
      },
      "courtroom_drama": {
        cases: [
          "Defendant put pineapple on pizza",
          "Accused of using Comic Sans in a professional presentation", 
          "Charged with singing in an elevator",
          "Guilty of ending texts with 'K'",
          "Accused of spoiling movies without warning"
        ]
      }
    };

    let prompt;
    
    if (args.game_type === "story_chain") {
      const difficultyPrompts = prompts.story_chain[args.difficulty as keyof typeof prompts.story_chain] || prompts.story_chain.medium;
      prompt = difficultyPrompts[Math.floor(Math.random() * difficultyPrompts.length)];
    } else if (args.game_type === "pitch_movie") {
      const genre = prompts.pitch_movie.genres[Math.floor(Math.random() * prompts.pitch_movie.genres.length)];
      const keyword = prompts.pitch_movie.keywords[Math.floor(Math.random() * prompts.pitch_movie.keywords.length)];
      prompt = `Create a ${genre} movie pitch featuring: ${keyword}`;
    } else if (args.game_type === "courtroom_drama") {
      const case_desc = prompts.courtroom_drama.cases[Math.floor(Math.random() * prompts.courtroom_drama.cases.length)];
      prompt = `Court Case: ${case_desc}`;
    }

    return {
      prompt,
      round_number: args.round_number,
      time_limit: args.game_type === "haiku_battle" ? 90 : 120,
    };
  },
}); 