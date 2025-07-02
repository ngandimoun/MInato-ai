-- ============================================================================
-- FILE: migrations/sync_game_types_with_frontend.sql
-- DESC: Sync all game types from frontend gameData.ts with database
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert all game types from frontend game library
INSERT INTO public.game_types (name, display_name, category, description, icon, difficulty_rating, is_active) VALUES
-- TIER 1: FOUNDATIONAL QUIZ & TRIVIA GAMES
('classic_academia_quiz', 'Classic Academia Quiz', 'trivia', 'Test your knowledge in History, Geography, Science, and Mathematics. From Ancient Rome to Astrophysics.', '🎓', 3, true),
('pop_culture_trivia', 'Pop Culture Trivia', 'trivia', 'Anime, K-Pop, Netflix shows, and viral trends. Stay current with entertainment and internet culture.', '📺', 3, true),
('niche_hobbyist_corner', 'Niche Hobbyist Corner', 'trivia', 'Mythology, World Cuisine, Internet History, and Fashion. Deep dives into specialized interests.', '👥', 4, true),

-- TIER 2: CLASSIC GUESSING & WORD GAMES
('guess_the_entity', 'Guess the Entity', 'puzzle', 'Progressive clues lead you to Cities, Animals, Historical Figures, and more. Can you guess with fewer hints?', '👁️', 3, true),
('guess_the_title', 'Guess the Title', 'puzzle', 'Movies, TV Shows, Anime, Books, and Games. Identify titles from plots, quotes, and character lists.', '🎬', 3, true),
('twenty_questions', '20 Questions: Universe Edition', 'puzzle', 'The classic game with a twist. Guess characters, objects, and locations from specific fictional universes.', '❓', 3, true),
('hangman_themed', 'Themed Hangman', 'word', 'Classic word guessing with themed categories. From Star Wars planets to programming keywords.', '📝', 2, true),
('guess_the_song', 'Guess the Song', 'puzzle', 'Identify songs from lyrics, music videos, and artist clues across all genres and eras.', '🎵', 3, true),

-- TIER 3: SOCIAL & CREATIVE GAMES
('story_chain', 'Story Chain', 'creative', 'Collaborative storytelling with AI plot twists. Build narratives together with unexpected turns.', '📚', 3, true),
('pitch_movie', 'Pitch Me a Movie!', 'creative', 'Be a Hollywood producer! Create movie titles, taglines, and synopses from genre and keyword prompts.', '📹', 3, true),
('haiku_battle', 'Haiku Battle', 'creative', 'Poetry competition with AI judging. Create haikus and poems on given themes for creativity points.', '🌸', 3, true),
('courtroom_drama', 'Courtroom Drama', 'social', 'Argue silly cases before Judge AI. Defend or prosecute absurd crimes with humor and logic.', '⚖️', 4, true),
('ai_improv', 'AI Improv Theater', 'creative', 'Improvisational acting with AI scenarios. Get character quirks and situations for creative roleplay.', '🎭', 3, true),

-- TIER 4: PERSONAL & RELATIONAL GAMES
('couples_challenge', 'Couples Challenge', 'social', 'Learn more about each other through fun questions about preferences, memories, and quirks.', '❤️', 2, true),
('two_sides_story', 'Two Sides of the Story', 'social', 'Compare different perspectives on shared memories. Discover how you each remember the same events.', '👥', 3, true),
('friendship_test', 'Friendship Test', 'social', 'Test how well you know your friends through questions about each other''s preferences and habits.', '🤝', 2, true),

-- TIER 5: PHYSICAL & INTERACTIVE GAMES
('mini_escape_room', 'Mini Escape Room', 'puzzle', 'Quick puzzle-solving adventures with hidden clues, riddles, and time pressure.', '🗝️', 4, true),
('team_building_olympics', 'Team Building Olympics', 'social', 'Collaborative challenges that build teamwork through creative problem-solving activities.', '🏆', 3, true),
('lightning_round', 'Lightning Round Challenge', 'trivia', 'Ultra-fast trivia with 5-second answers. Quick thinking and instant responses required.', '⚡', 3, true),

-- TIER 6: ADVANCED STRATEGY & LOGIC GAMES
('logic_puzzles', 'Logic Puzzles Arena', 'puzzle', 'Brain teasers, math puzzles, and logical reasoning challenges that test analytical thinking.', '🧠', 4, true),
('ai_detective', 'AI Detective Mystery', 'puzzle', 'Solve complex mysteries by gathering clues, interviewing suspects, and deducing the truth.', '🔍', 4, true),
('strategy_showdown', 'Strategy Showdown', 'strategy', 'Tactical games requiring planning, resource management, and strategic thinking.', '♟️', 4, true),

-- TIER 7: SPECIALTY & THEMED EXPERIENCES
('time_machine_adventures', 'Time Machine Adventures', 'adventure', 'Travel through different eras making historical decisions that shape outcomes.', '⏰', 4, true),
('alien_first_contact', 'Alien First Contact', 'roleplay', 'Diplomatic scenarios where players negotiate with alien civilizations.', '👽', 4, true),
('survival_simulator', 'Survival Simulator', 'strategy', 'Make critical decisions in survival scenarios from wilderness to space stations.', '🏕️', 4, true),
('dream_interpreter', 'Dream Interpreter', 'creative', 'Share and interpret dreams with AI analysis and creative storytelling.', '💭', 3, true),
('parallel_universe', 'Parallel Universe Stories', 'creative', 'Explore alternate realities where historical events happened differently.', '🌌', 4, true),

-- TIER 8: EDUCATIONAL & SKILL BUILDING
('language_learning_games', 'Language Learning Games', 'educational', 'Practice vocabulary, grammar, and conversation skills in multiple languages.', '🌍', 3, true),
('coding_challenge', 'Coding Challenge', 'educational', 'Programming puzzles and algorithm challenges for developers of all levels.', '💻', 4, true),
('financial_literacy', 'Financial Literacy Quiz', 'educational', 'Learn about budgeting, investing, and financial planning through interactive scenarios.', '💰', 3, true),
('health_wellness', 'Health & Wellness Challenge', 'educational', 'Nutrition, fitness, and mental health knowledge with practical tips and advice.', '🏥', 3, true)

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  difficulty_rating = EXCLUDED.difficulty_rating,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc'::text, now());

-- Ensure all game types are active
UPDATE public.game_types SET is_active = true WHERE is_active = false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_types_name ON public.game_types(name);
CREATE INDEX IF NOT EXISTS idx_game_types_category ON public.game_types(category);
CREATE INDEX IF NOT EXISTS idx_game_types_active ON public.game_types(is_active);

-- Add any missing columns that might be expected
DO $$ 
BEGIN
    -- Add icon_name column if it doesn't exist (some code might expect this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'icon_name'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN icon_name VARCHAR(50);
        
        -- Update with icon values (remove emoji, keep text for lucide icons)
        UPDATE public.game_types SET icon_name = 
            CASE name
                WHEN 'classic_academia_quiz' THEN 'GraduationCap'
                WHEN 'pop_culture_trivia' THEN 'Tv'
                WHEN 'niche_hobbyist_corner' THEN 'Users'
                WHEN 'guess_the_entity' THEN 'Eye'
                WHEN 'guess_the_title' THEN 'Film'
                WHEN 'twenty_questions' THEN 'HelpCircle'
                WHEN 'hangman_themed' THEN 'Type'
                WHEN 'guess_the_song' THEN 'Music'
                WHEN 'story_chain' THEN 'BookOpen'
                WHEN 'pitch_movie' THEN 'Camera'
                WHEN 'haiku_battle' THEN 'Feather'
                WHEN 'courtroom_drama' THEN 'Scale'
                WHEN 'ai_improv' THEN 'Theater'
                WHEN 'couples_challenge' THEN 'Heart'
                WHEN 'two_sides_story' THEN 'Users2'
                WHEN 'friendship_test' THEN 'Users'
                WHEN 'mini_escape_room' THEN 'Key'
                WHEN 'team_building_olympics' THEN 'Trophy'
                WHEN 'lightning_round' THEN 'Zap'
                WHEN 'logic_puzzles' THEN 'Brain'
                WHEN 'ai_detective' THEN 'Search'
                WHEN 'strategy_showdown' THEN 'Sword'
                WHEN 'time_machine_adventures' THEN 'Clock'
                WHEN 'alien_first_contact' THEN 'Star'
                WHEN 'survival_simulator' THEN 'Shield'
                WHEN 'dream_interpreter' THEN 'Moon'
                WHEN 'parallel_universe' THEN 'Layers'
                WHEN 'language_learning_games' THEN 'Languages'
                WHEN 'coding_challenge' THEN 'Code'
                WHEN 'financial_literacy' THEN 'DollarSign'
                WHEN 'health_wellness' THEN 'Heart'
                ELSE 'Gamepad2'
            END;
    END IF;

    -- Add color_theme column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'color_theme'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN color_theme VARCHAR(50);
        
        -- Update with color themes from frontend
        UPDATE public.game_types SET color_theme = 
            CASE name
                WHEN 'classic_academia_quiz' THEN 'blue'
                WHEN 'pop_culture_trivia' THEN 'purple'
                WHEN 'niche_hobbyist_corner' THEN 'green'
                WHEN 'guess_the_entity' THEN 'orange'
                WHEN 'guess_the_title' THEN 'red'
                WHEN 'twenty_questions' THEN 'indigo'
                WHEN 'hangman_themed' THEN 'pink'
                WHEN 'guess_the_song' THEN 'teal'
                WHEN 'story_chain' THEN 'purple'
                WHEN 'pitch_movie' THEN 'orange'
                WHEN 'haiku_battle' THEN 'green'
                WHEN 'courtroom_drama' THEN 'blue'
                WHEN 'ai_improv' THEN 'red'
                WHEN 'couples_challenge' THEN 'pink'
                WHEN 'two_sides_story' THEN 'yellow'
                WHEN 'friendship_test' THEN 'green'
                WHEN 'mini_escape_room' THEN 'gray'
                WHEN 'team_building_olympics' THEN 'blue'
                WHEN 'lightning_round' THEN 'yellow'
                WHEN 'logic_puzzles' THEN 'purple'
                WHEN 'ai_detective' THEN 'indigo'
                WHEN 'strategy_showdown' THEN 'red'
                WHEN 'time_machine_adventures' THEN 'orange'
                WHEN 'alien_first_contact' THEN 'green'
                WHEN 'survival_simulator' THEN 'brown'
                WHEN 'dream_interpreter' THEN 'purple'
                WHEN 'parallel_universe' THEN 'indigo'
                WHEN 'language_learning_games' THEN 'blue'
                WHEN 'coding_challenge' THEN 'gray'
                WHEN 'financial_literacy' THEN 'green'
                WHEN 'health_wellness' THEN 'red'
                ELSE 'blue'
            END;
    END IF;
    
    -- Add other missing columns that might be referenced
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'min_players'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN min_players INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'max_players'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN max_players INTEGER DEFAULT 8;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'default_rounds'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN default_rounds INTEGER DEFAULT 10;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'difficulty_levels'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN difficulty_levels TEXT[] DEFAULT ARRAY['easy', 'medium', 'hard'];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'estimated_duration_minutes'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN estimated_duration_minutes INTEGER DEFAULT 15;
    END IF;
END $$;

-- Update all existing games with proper values
UPDATE public.game_types SET 
    min_players = CASE 
        WHEN name IN ('couples_challenge', 'two_sides_story') THEN 2
        ELSE 1
    END,
    max_players = CASE 
        WHEN name IN ('twenty_questions', 'alien_first_contact') THEN 4
        WHEN name IN ('niche_hobbyist_corner', 'guess_the_entity', 'hangman_themed', 'story_chain', 'haiku_battle', 'courtroom_drama', 'friendship_test') THEN 6
        ELSE 8
    END,
    default_rounds = CASE 
        WHEN name IN ('twenty_questions', 'lightning_round') THEN 8
        WHEN name IN ('pop_culture_trivia', 'guess_the_song', 'guess_the_entity') THEN 10
        WHEN name IN ('hangman_themed', 'guess_the_song', 'music_challenge') THEN 12
        WHEN name IN ('couples_challenge', 'classic_academia_quiz', 'pitch_movie', 'team_building_olympics') THEN 15
        WHEN name IN ('niche_hobbyist_corner', 'haiku_battle', 'friendship_test') THEN 18
        WHEN name IN ('story_chain', 'courtroom_drama', 'two_sides_story') THEN 20
        WHEN name IN ('ai_improv', 'time_machine_adventures', 'alien_first_contact', 'survival_simulator', 'parallel_universe') THEN 25
        ELSE 10
    END,
    difficulty_levels = CASE 
        WHEN name IN ('couples_challenge', 'friendship_test') THEN ARRAY['easy']
        WHEN name IN ('hangman_themed') THEN ARRAY['beginner', 'easy', 'medium', 'hard']
        WHEN name IN ('pop_culture_trivia', 'guess_the_entity', 'guess_the_title', 'guess_the_song', 'story_chain', 'pitch_movie', 'courtroom_drama', 'ai_improv', 'lightning_round') THEN ARRAY['easy', 'medium', 'hard']
        WHEN name IN ('niche_hobbyist_corner', 'escape_room', 'mini_escape_room', 'logic_puzzles', 'ai_detective', 'strategy_showdown', 'time_machine_adventures', 'alien_first_contact', 'survival_simulator', 'parallel_universe', 'coding_challenge') THEN ARRAY['medium', 'hard', 'expert']
        ELSE ARRAY['beginner', 'easy', 'medium', 'hard', 'expert']
    END,
    estimated_duration_minutes = CASE 
        WHEN name IN ('twenty_questions') THEN 8
        WHEN name IN ('guess_the_entity', 'guess_the_song') THEN 10
        WHEN name IN ('pop_culture_trivia', 'hangman_themed') THEN 12
        WHEN name IN ('classic_academia_quiz', 'guess_the_title', 'couples_challenge', 'pitch_movie', 'team_building_olympics', 'financial_literacy', 'health_wellness') THEN 15
        WHEN name IN ('niche_hobbyist_corner', 'haiku_battle', 'friendship_test', 'language_learning_games') THEN 18
        WHEN name IN ('story_chain', 'courtroom_drama', 'two_sides_story', 'mini_escape_room') THEN 20
        WHEN name IN ('ai_improv', 'time_machine_adventures', 'alien_first_contact', 'survival_simulator', 'parallel_universe', 'coding_challenge') THEN 25
        ELSE 15
    END;

-- Create a view for active game types (for easy frontend consumption)
CREATE OR REPLACE VIEW public.active_game_types AS
SELECT 
    id,
    name,
    display_name,
    description,
    category,
    icon,
    icon_name,
    color_theme,
    min_players,
    max_players,
    default_rounds,
    difficulty_levels,
    estimated_duration_minutes,
    difficulty_rating,
    created_at
FROM public.game_types 
WHERE is_active = true
ORDER BY category, display_name;

-- Grant permissions for the view
GRANT SELECT ON public.active_game_types TO authenticated;
GRANT SELECT ON public.active_game_types TO anon; 