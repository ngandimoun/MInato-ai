-- ============================================================================
-- FILE: migrations/add_new_5_games.sql
-- DESC: Add 5 new games to Minato AI Games platform
-- GAMES: Sport Guru, Language Master, Programming Challenge, Retro Nostalgia, Strategy Thinker
-- ============================================================================

-- Insert new game types for the 5 requested games
INSERT INTO public.game_types (
    name,
    display_name,
    description,
    category,
    min_players,
    max_players,
    default_rounds,
    difficulty_levels,
    estimated_duration_minutes,
    icon_name,
    color_theme,
    is_active
) VALUES 
-- Sport Guru - Diverse sports knowledge
(
    'sport_guru',
    'Sport Guru',
    'Master sports knowledge across football, rugby, basketball, tennis, cricket, soccer, baseball, and more. From rules to legendary moments!',
    'trivia',
    1,
    8,
    15,
    ARRAY['beginner', 'easy', 'medium', 'hard', 'expert'],
    18,
    'Trophy',
    'orange',
    true
),
-- Global Linguist - Multi-language vocabulary, grammar, syntax
(
    'global_linguist',
    'Global Linguist',
    'Explore languages worldwide! Test vocabulary, grammar, syntax across French, English, Spanish, German, Japanese, and many more.',
    'educational',
    1,
    6,
    12,
    ARRAY['beginner', 'easy', 'medium', 'hard', 'expert'],
    20,
    'Languages',
    'blue',
    true
),
-- Programming Challenge - Different programming languages and concepts
(
    'programming_challenge',
    'Programming Challenge',
    'Code your way to victory! JavaScript, Python, Java, C++, React, algorithms, data structures, and programming concepts.',
    'educational',
    1,
    6,
    10,
    ARRAY['beginner', 'easy', 'medium', 'hard', 'expert'],
    25,
    'Code',
    'purple',
    true
),
-- Retro Nostalgia - Retro games, anime, manga, music, movies, culture
(
    'retro_nostalgia',
    'Retro Nostalgia',
    'Journey through the past! Retro games, classic anime, vintage manga, old-school music, retro movies, and nostalgic culture.',
    'trivia',
    1,
    8,
    12,
    ARRAY['easy', 'medium', 'hard', 'expert'],
    22,
    'Gamepad2',
    'pink',
    true
),
-- Strategy Thinker - Game theory, strategic thinking, expert strategies
(
    'strategy_thinker',
    'Strategy Thinker',
    'Master strategic thinking! Game theory, chess strategies, business tactics, military strategy, decision-making, and expert strategic concepts.',
    'strategy',
    1,
    6,
    8,
    ARRAY['medium', 'hard', 'expert'],
    30,
    'Brain',
    'teal',
    true
)
ON CONFLICT (name) DO NOTHING;

-- Verify the insertions
SELECT 
    name,
    display_name,
    category,
    min_players,
    max_players,
    estimated_duration_minutes,
    icon_name,
    color_theme,
    difficulty_levels
FROM public.game_types 
WHERE name IN ('sport_guru', 'global_linguist', 'programming_challenge', 'retro_nostalgia', 'strategy_thinker')
ORDER BY name;

-- Update game count comment
-- Total games after this migration: 48+ games available 