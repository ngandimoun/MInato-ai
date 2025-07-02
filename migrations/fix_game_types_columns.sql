-- ============================================================================
-- Fix missing columns in game_types table
-- ============================================================================

-- Add missing columns to game_types table
DO $$ 
BEGIN
    -- Add difficulty_rating column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'difficulty_rating'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN difficulty_rating INTEGER DEFAULT 3;
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN description TEXT;
    END IF;

    -- Add icon column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'icon'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN icon VARCHAR(10);
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;

    -- Add icon_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'icon_name'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN icon_name VARCHAR(50);
    END IF;

    -- Add color_theme column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'color_theme'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN color_theme VARCHAR(50);
    END IF;

    -- Add min_players column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'min_players'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN min_players INTEGER DEFAULT 1;
    END IF;

    -- Add max_players column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'max_players'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN max_players INTEGER DEFAULT 8;
    END IF;

    -- Add default_rounds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'default_rounds'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN default_rounds INTEGER DEFAULT 10;
    END IF;

    -- Add difficulty_levels column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'difficulty_levels'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN difficulty_levels TEXT[] DEFAULT ARRAY['easy', 'medium', 'hard'];
    END IF;

    -- Add estimated_duration_minutes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_types' 
        AND column_name = 'estimated_duration_minutes'
    ) THEN
        ALTER TABLE public.game_types ADD COLUMN estimated_duration_minutes INTEGER DEFAULT 15;
    END IF;
END $$;

-- Insert the astronomy_explorer game type that was failing
INSERT INTO public.game_types (
    name, 
    display_name, 
    category, 
    description, 
    icon, 
    difficulty_rating, 
    is_active,
    icon_name,
    color_theme,
    min_players,
    max_players,
    default_rounds,
    difficulty_levels,
    estimated_duration_minutes
) VALUES (
    'astronomy_explorer',
    'Astronomy Explorer',
    'educational',
    'Journey through space and time. Discover planets, stars, galaxies, and cosmic phenomena.',
    '🌌',
    3,
    true,
    'Star',
    'purple',
    1,
    8,
    16,
    ARRAY['easy', 'medium', 'hard'],
    16
) ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    difficulty_rating = EXCLUDED.difficulty_rating,
    is_active = EXCLUDED.is_active,
    icon_name = EXCLUDED.icon_name,
    color_theme = EXCLUDED.color_theme,
    min_players = EXCLUDED.min_players,
    max_players = EXCLUDED.max_players,
    default_rounds = EXCLUDED.default_rounds,
    difficulty_levels = EXCLUDED.difficulty_levels,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    updated_at = timezone('utc'::text, now());

-- Grant permissions
ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view game types" ON public.game_types
    FOR SELECT USING (TRUE); 