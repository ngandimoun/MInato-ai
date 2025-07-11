-- ============================================================================
-- FILE: migrations/add_genz_games.sql
-- DESC: Add Gen Z-focused games to Minato AI Games platform
-- ============================================================================

-- Insert new Gen Z-focused game types
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
-- Gen Z Social Media & Digital Culture Games
(
    'viral_challenge',
    'Viral Challenge Creator',
    'Create the next big social media trend! Design viral challenges, predict what goes viral, and understand internet culture.',
    'creative',
    1,
    8,
    10,
    ARRAY['easy', 'medium', 'hard'],
    12,
    'Trending',
    'pink',
    true
),
(
    'meme_battle',
    'Meme Battle Royale',
    'Compete in meme knowledge and creation! From classic rage faces to modern TikTok trends, prove your internet culture expertise.',
    'trivia',
    2,
    8,
    10,
    ARRAY['easy', 'medium', 'hard'],
    10,
    'Laugh',
    'orange',
    true
),
(
    'aesthetic_quiz',
    'Aesthetic & Vibe Check',
    'Explore aesthetics from cottagecore to dark academia. Identify vibes, color palettes, and cultural movements that define Gen Z.',
    'trivia',
    1,
    6,
    12,
    ARRAY['easy', 'medium', 'hard'],
    15,
    'Palette',
    'purple',
    true
),
(
    'social_dilemma',
    'Social Media Dilemmas',
    'Navigate modern digital scenarios. Handle online drama, privacy issues, and social media ethics with wisdom and humor.',
    'social',
    2,
    6,
    8,
    ARRAY['easy', 'medium'],
    18,
    'Smartphone',
    'blue',
    true
),
(
    'gen_z_slang',
    'Gen Z Slang Decoder',
    'Test your knowledge of internet slang, abbreviations, and evolving language. From "bussin" to "no cap" - are you fluent?',
    'word',
    1,
    8,
    15,
    ARRAY['easy', 'medium', 'hard'],
    8,
    'MessageCircle',
    'teal',
    true
),
(
    'sustainability_quest',
    'Climate Action Quest',
    'Save the planet through knowledge and action! Learn about sustainability, climate change, and eco-friendly lifestyle choices.',
    'educational',
    1,
    6,
    12,
    ARRAY['easy', 'medium', 'hard'],
    20,
    'Leaf',
    'green',
    true
),
(
    'mental_health_check',
    'Mental Wellness Trivia',
    'Learn about mental health, self-care strategies, and emotional intelligence. Break stigma through education and awareness.',
    'educational',
    1,
    6,
    10,
    ARRAY['easy', 'medium'],
    16,
    'Brain',
    'indigo',
    true
),
(
    'crypto_nft_challenge',
    'Crypto & NFT Challenge',
    'Navigate the digital economy! Learn about blockchain, cryptocurrency, NFTs, and the future of digital assets.',
    'educational',
    1,
    6,
    8,
    ARRAY['medium', 'hard', 'expert'],
    22,
    'Coins',
    'yellow',
    true
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    min_players = EXCLUDED.min_players,
    max_players = EXCLUDED.max_players,
    default_rounds = EXCLUDED.default_rounds,
    difficulty_levels = EXCLUDED.difficulty_levels,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    icon_name = EXCLUDED.icon_name,
    color_theme = EXCLUDED.color_theme,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- Update the updated_at timestamp for audit trail
UPDATE public.game_types 
SET updated_at = timezone('utc'::text, now()) 
WHERE name IN (
    'viral_challenge',
    'meme_battle', 
    'aesthetic_quiz',
    'social_dilemma',
    'gen_z_slang',
    'sustainability_quest',
    'mental_health_check',
    'crypto_nft_challenge'
);

-- Create comment for tracking
COMMENT ON TABLE public.game_types IS 'Game types including new Gen Z-focused games added for enhanced user engagement'; 