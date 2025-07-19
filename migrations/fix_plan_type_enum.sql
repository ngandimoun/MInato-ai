-- Fix for plan_type_enum issue
-- This migration ensures the plan_type_enum type exists and updates the handle_new_user function

-- First, ensure the plan_type_enum type exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type_enum') THEN
    CREATE TYPE plan_type_enum AS ENUM ('FREE_TRIAL', 'PRO', 'EXPIRED');
  END IF;
END$$;

-- Update the handle_new_user function to handle cases where the enum might not exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    first_name, 
    avatar_url,
    -- Subscription fields initialization
    plan_type,
    trial_end_date,
    monthly_usage,
    one_time_credits
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    -- Initialize subscription fields for new users
    'FREE_TRIAL'::plan_type_enum,
    (NOW() + INTERVAL '7 days')::timestamptz,
    '{"leads": 0, "recordings": 0, "images": 0, "videos": 0}'::jsonb,
    '{"leads": 0, "recordings": 0, "images": 0, "videos": 0}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    -- Only update subscription fields if they are NULL (for existing users)
    plan_type = COALESCE(user_profiles.plan_type, EXCLUDED.plan_type),
    trial_end_date = COALESCE(user_profiles.trial_end_date, EXCLUDED.trial_end_date),
    monthly_usage = COALESCE(user_profiles.monthly_usage, EXCLUDED.monthly_usage),
    one_time_credits = COALESCE(user_profiles.one_time_credits, EXCLUDED.one_time_credits);
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user(); 