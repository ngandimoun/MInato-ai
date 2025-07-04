import { GameType, GameLibraryItem, GAME_ICONS } from './types/games';

// Static game data for all 34 AI Encarta games
export const GAME_DATA: GameLibraryItem[] = [
  // TIER 1: FOUNDATIONAL QUIZ & TRIVIA GAMES
  {
    id: 'classic_academia_quiz',
    name: 'classic_academia_quiz',
    display_name: 'Classic Academia Quiz',
    description: 'Test your knowledge in History, Geography, Science, and Mathematics. From Ancient Rome to Astrophysics.',
    category: 'trivia',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 15,
    icon_name: 'GraduationCap',
    color_theme: 'blue',
    difficulty_levels: ['beginner', 'easy', 'medium', 'hard', 'expert'],
    is_popular: true,
  },
  {
    id: 'pop_culture_trivia',
    name: 'pop_culture_trivia',
    display_name: 'Pop Culture Trivia',
    description: 'Anime, K-Pop, Netflix shows, and viral trends. Stay current with entertainment and internet culture.',
    category: 'trivia',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 12,
    icon_name: 'Tv',
    color_theme: 'purple',
    difficulty_levels: ['easy', 'medium', 'hard'],
    is_popular: true,
  },
  {
    id: 'niche_hobbyist_corner',
    name: 'niche_hobbyist_corner',
    display_name: 'Niche Hobbyist Corner',
    description: 'Mythology, World Cuisine, Internet History, and Fashion. Deep dives into specialized interests.',
    category: 'trivia',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 18,
    icon_name: 'Users',
    color_theme: 'green',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },

  // TIER 2: CLASSIC GUESSING & WORD GAMES
  {
    id: 'guess_the_entity',
    name: 'guess_the_entity',
    display_name: 'Guess the Entity',
    description: 'Progressive clues lead you to Cities, Animals, Historical Figures, and more. Can you guess with fewer hints?',
    category: 'puzzle',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 10,
    icon_name: 'Eye',
    color_theme: 'orange',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'guess_the_title',
    name: 'guess_the_title',
    display_name: 'Guess the Title',
    description: 'Movies, TV Shows, Anime, Books, and Games. Identify titles from plots, quotes, and character lists.',
    category: 'puzzle',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 15,
    icon_name: 'Film',
    color_theme: 'red',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'twenty_questions',
    name: 'twenty_questions',
    display_name: '20 Questions: Universe Edition',
    description: 'The classic game with a twist. Guess characters, objects, and locations from specific fictional universes.',
    category: 'puzzle',
    min_players: 1,
    max_players: 4,
    estimated_duration_minutes: 8,
    icon_name: 'HelpCircle',
    color_theme: 'indigo',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'hangman_themed',
    name: 'hangman_themed',
    display_name: 'Themed Hangman',
    description: 'Classic word guessing with themed categories. From Star Wars planets to programming keywords.',
    category: 'word',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 12,
    icon_name: 'Type',
    color_theme: 'pink',
    difficulty_levels: ['beginner', 'easy', 'medium', 'hard'],
  },
  {
    id: 'guess_the_song',
    name: 'guess_the_song',
    display_name: 'Guess the Song',
    description: 'Identify songs from lyrics, music videos, and artist clues across all genres and eras.',
    category: 'puzzle',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 10,
    icon_name: 'Music',
    color_theme: 'teal',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },

  // TIER 3: SOCIAL & CREATIVE GAMES
  {
    id: 'story_chain',
    name: 'story_chain',
    display_name: 'Story Chain',
    description: 'Collaborative storytelling with AI plot twists. Build narratives together with unexpected turns.',
    category: 'creative',
    min_players: 2,
    max_players: 6,
    estimated_duration_minutes: 20,
    icon_name: 'BookOpen',
    color_theme: 'purple',
    difficulty_levels: ['easy', 'medium'],
  },
  {
    id: 'pitch_movie',
    name: 'pitch_movie',
    display_name: 'Pitch Me a Movie!',
    description: 'Be a Hollywood producer! Create movie titles, taglines, and synopses from genre and keyword prompts.',
    category: 'creative',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 15,
    icon_name: 'Camera',
    color_theme: 'orange',
    difficulty_levels: ['easy', 'medium'],
  },
  {
    id: 'haiku_battle',
    name: 'haiku_battle',
    display_name: 'Haiku Battle',
    description: 'Poetry competition with AI judging. Create haikus and poems on given themes for creativity points.',
    category: 'creative',
    min_players: 2,
    max_players: 6,
    estimated_duration_minutes: 18,
    icon_name: 'Feather',
    color_theme: 'green',
    difficulty_levels: ['medium', 'hard'],
  },
  {
    id: 'courtroom_drama',
    name: 'courtroom_drama',
    display_name: 'Courtroom Drama',
    description: 'Argue silly cases before Judge AI. Defend or prosecute absurd crimes with humor and logic.',
    category: 'social',
    min_players: 2,
    max_players: 6,
    estimated_duration_minutes: 20,
    icon_name: 'Scale',
    color_theme: 'blue',
    difficulty_levels: ['easy', 'medium'],
  },
  {
    id: 'ai_improv',
    name: 'ai_improv',
    display_name: 'AI Improv Theater',
    description: 'Improvisational acting with AI scenarios. Get character quirks and situations for creative roleplay.',
    category: 'creative',
    min_players: 2,
    max_players: 8,
    estimated_duration_minutes: 25,
    icon_name: 'Theater',
    color_theme: 'red',
    difficulty_levels: ['easy', 'medium'],
  },

  // TIER 4: PERSONAL & RELATIONAL GAMES
  {
    id: 'couples_challenge',
    name: 'couples_challenge',
    display_name: 'Couples Challenge',
    description: 'Learn more about each other through fun questions about preferences, memories, and quirks.',
    category: 'social',
    min_players: 2,
    max_players: 4,
    estimated_duration_minutes: 15,
    icon_name: 'Heart',
    color_theme: 'pink',
    difficulty_levels: ['easy'],
  },
  {
    id: 'two_sides_story',
    name: 'two_sides_story',
    display_name: 'Two Sides of the Story',
    description: 'Compare different perspectives on shared memories. Discover how you each remember the same events.',
    category: 'social',
    min_players: 2,
    max_players: 4,
    estimated_duration_minutes: 12,
    icon_name: 'Users2',
    color_theme: 'indigo',
    difficulty_levels: ['easy'],
  },
  {
    id: 'memory_lane',
    name: 'memory_lane',
    display_name: 'Memory Lane',
    description: 'Guided reminiscence about shared experiences, challenges overcome, and joyful moments together.',
    category: 'social',
    min_players: 2,
    max_players: 6,
    estimated_duration_minutes: 18,
    icon_name: 'Clock',
    color_theme: 'teal',
    difficulty_levels: ['easy'],
  },
  {
    id: 'dare_or_describe',
    name: 'dare_or_describe',
    display_name: 'Dare or Describe',
    description: 'Wholesome dares and thoughtful descriptions. Express appreciation and have fun together.',
    category: 'social',
    min_players: 2,
    max_players: 8,
    estimated_duration_minutes: 20,
    icon_name: 'Smile',
    color_theme: 'orange',
    difficulty_levels: ['easy'],
  },

  // TIER 5: ADVANCED AI-CENTRIC GAMES
  {
    id: 'escape_room',
    name: 'escape_room',
    display_name: 'Text-Based Escape Room',
    description: 'Immersive puzzle-solving adventure. Examine objects, collect items, and solve mysteries to escape.',
    category: 'puzzle',
    min_players: 1,
    max_players: 4,
    estimated_duration_minutes: 30,
    icon_name: 'Key',
    color_theme: 'purple',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },
  {
    id: 'solo_adventure',
    name: 'solo_adventure',
    display_name: 'Solo Adventure RPG',
    description: 'AI Dungeon Master creates dynamic worlds. Choose your setting and embark on personalized quests.',
    category: 'adventure',
    min_players: 1,
    max_players: 1,
    estimated_duration_minutes: 45,
    icon_name: 'Sword',
    color_theme: 'red',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'five_levels_challenge',
    name: 'five_levels_challenge',
    display_name: 'Five Levels Challenge',
    description: 'Complex topics explained at 5 levels: child, teen, college, grad student, and expert. Test comprehension.',
    category: 'educational',
    min_players: 1,
    max_players: 4,
    estimated_duration_minutes: 25,
    icon_name: 'Layers',
    color_theme: 'blue',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },
  {
    id: 'code_breaker',
    name: 'code_breaker',
    display_name: 'Code Breaker',
    description: 'Logic puzzles and cipher challenges. Solve Einstein\'s Riddle, Mastermind, and cryptographic puzzles.',
    category: 'logic',
    min_players: 1,
    max_players: 4,
    estimated_duration_minutes: 20,
    icon_name: 'Lock',
    color_theme: 'green',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },
  {
    id: 'connect_dots',
    name: 'connect_dots',
    display_name: 'Connect the Dots',
    description: 'Find creative connections between unrelated concepts. Chain historical events, ideas, and discoveries.',
    category: 'logic',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 15,
    icon_name: 'Link',
    color_theme: 'indigo',
    difficulty_levels: ['medium', 'hard'],
  },

  // ENHANCED ACADEMIC GAMES
  {
    id: 'math_physics_challenge',
    name: 'math_physics_challenge',
    display_name: 'Math & Physics Challenge',
    description: 'From basic arithmetic to quantum mechanics. Solve problems and understand the universe through numbers.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 20,
    icon_name: 'Calculator',
    color_theme: 'blue',
    difficulty_levels: ['beginner', 'easy', 'medium', 'hard', 'expert'],
    is_popular: true,
  },
  {
    id: 'chemistry_lab',
    name: 'chemistry_lab',
    display_name: 'Virtual Chemistry Lab',
    description: 'Explore chemical reactions, periodic table, and molecular structures through interactive questions.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 18,
    icon_name: 'TestTube',
    color_theme: 'green',
    difficulty_levels: ['easy', 'medium', 'hard', 'expert'],
  },
  {
    id: 'astronomy_explorer',
    name: 'astronomy_explorer',
    display_name: 'Astronomy Explorer',
    description: 'Journey through space and time. Discover planets, stars, galaxies, and cosmic phenomena.',
    category: 'educational',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 16,
    icon_name: 'Star',
    color_theme: 'purple',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'medical_mysteries',
    name: 'medical_mysteries',
    display_name: 'Medical Mysteries',
    description: 'Explore human anatomy, diseases, treatments, and medical breakthroughs throughout history.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 22,
    icon_name: 'Stethoscope',
    color_theme: 'red',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },
  {
    id: 'pharmacy_knowledge',
    name: 'pharmacy_knowledge',
    display_name: 'Pharmacy Knowledge',
    description: 'Learn about medications, drug interactions, and pharmaceutical science in an educational context.',
    category: 'educational',
    min_players: 1,
    max_players: 4,
    estimated_duration_minutes: 20,
    icon_name: 'Pill',
    color_theme: 'orange',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },
  {
    id: 'biology_quest',
    name: 'biology_quest',
    display_name: 'Biology Quest',
    description: 'Evolution, genetics, ecology, and cellular biology. Discover how life works at every level.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 18,
    icon_name: 'Dna',
    color_theme: 'green',
    difficulty_levels: ['easy', 'medium', 'hard', 'expert'],
  },
  {
    id: 'history_detective',
    name: 'history_detective',
    display_name: 'History Detective',
    description: 'Solve historical mysteries and uncover lesser-known facts from civilizations across time.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 20,
    icon_name: 'Search',
    color_theme: 'blue',
    difficulty_levels: ['easy', 'medium', 'hard'],
    is_popular: true,
  },
  {
    id: 'language_master',
    name: 'language_master',
    display_name: 'Language Master',
    description: 'Etymology, translation, linguistic patterns, and cultural nuances across world languages.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 16,
    icon_name: 'Languages',
    color_theme: 'indigo',
    difficulty_levels: ['medium', 'hard'],
  },
  {
    id: 'art_appreciation',
    name: 'art_appreciation',
    display_name: 'Art Appreciation',
    description: 'Famous artworks, art movements, techniques, and artists\' stories throughout cultural history.',
    category: 'educational',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 15,
    icon_name: 'Palette',
    color_theme: 'pink',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'philosophy_cafe',
    name: 'philosophy_cafe',
    display_name: 'Philosophy Café',
    description: 'Thought experiments, ethical dilemmas, and philosophical concepts made accessible and engaging.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 25,
    icon_name: 'Brain',
    color_theme: 'purple',
    difficulty_levels: ['medium', 'hard', 'expert'],
  },
  {
    id: 'psychology_insights',
    name: 'psychology_insights',
    display_name: 'Psychology Insights',
    description: 'Cognitive biases, behavioral patterns, famous experiments, and mental health awareness.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 18,
    icon_name: 'Brain',
    color_theme: 'teal',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'economics_game',
    name: 'economics_game',
    display_name: 'Economics Game',
    description: 'Market dynamics, financial concepts, economic history, and practical money management.',
    category: 'educational',
    min_players: 1,
    max_players: 6,
    estimated_duration_minutes: 20,
    icon_name: 'TrendingUp',
    color_theme: 'green',
    difficulty_levels: ['easy', 'medium', 'hard'],
  },
  {
    id: 'geography_explorer',
    name: 'geography_explorer',
    display_name: 'Geography Explorer',
    description: 'Countries, capitals, natural wonders, cultural landmarks, and geographical phenomena worldwide.',
    category: 'educational',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 14,
    icon_name: 'Map',
    color_theme: 'blue',
    difficulty_levels: ['beginner', 'easy', 'medium', 'hard'],
    is_popular: true,
  },
];

export const GAME_CATEGORIES = Array.from(new Set(GAME_DATA.map(game => game.category)));

export function getGameById(id: string): GameLibraryItem | undefined {
  return GAME_DATA.find(game => game.id === id);
}

export function getGamesByCategory(category: string): GameLibraryItem[] {
  return GAME_DATA.filter(game => game.category === category);
}

export function searchGames(query: string): GameLibraryItem[] {
  const searchTerm = query.toLowerCase();
  return GAME_DATA.filter(game => 
    game.display_name.toLowerCase().includes(searchTerm) ||
    game.description.toLowerCase().includes(searchTerm) ||
    game.category.toLowerCase().includes(searchTerm)
  );
} 