-- ============================================================================
-- FILE: migrations/create_user_profile_trigger.sql
-- DESC: Auto-create user profiles when users sign up through Supabase Auth
-- ============================================================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, first_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create user_game_stats entry for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_game_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_game_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for game stats
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_game_stats();

-- Backfill existing auth users who don't have profiles
INSERT INTO public.user_profiles (id, email, full_name, first_name, avatar_url)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name',
  COALESCE(
    au.raw_user_meta_data->>'first_name',
    split_part(au.raw_user_meta_data->>'full_name', ' ', 1),
    split_part(au.email, '@', 1)
  ),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill user_game_stats for existing profiles
INSERT INTO public.user_game_stats (user_id)
SELECT up.id
FROM public.user_profiles up
LEFT JOIN public.user_game_stats ugs ON up.id = ugs.user_id
WHERE ugs.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user_profiles entry when user signs up';
COMMENT ON FUNCTION public.handle_new_user_game_stats() IS 'Automatically creates user_game_stats entry when user profile is created'; 