-- Migration pour corriger la notification de bienvenue
-- Date: 2024-12-20

-- Fonction pour récupérer le statut d'abonnement d'un utilisateur (mise à jour)
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid TEXT)
RETURNS TABLE (
  plan_type TEXT,
  is_active BOOLEAN,
  is_trial BOOLEAN,
  is_pro BOOLEAN,
  is_expired BOOLEAN,
  days_remaining INTEGER,
  trial_end_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  current_date TIMESTAMPTZ := NOW();
  days_remaining_val INTEGER := 0;
  is_trial_val BOOLEAN := FALSE;
  is_pro_val BOOLEAN := FALSE;
  is_expired_val BOOLEAN := FALSE;
  is_active_val BOOLEAN := FALSE;
  plan_type_val TEXT := 'FREE_TRIAL';
BEGIN
  -- Récupérer le profil utilisateur
  SELECT * INTO user_profile
  FROM user_profiles
  WHERE id = user_uuid;
  
  -- Si l'utilisateur n'existe pas, retourner des valeurs par défaut
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'FREE_TRIAL'::TEXT,
      FALSE::BOOLEAN,
      TRUE::BOOLEAN,
      FALSE::BOOLEAN,
      FALSE::BOOLEAN,
      7::INTEGER,
      (current_date + INTERVAL '7 days')::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      (current_date + INTERVAL '7 days')::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Déterminer le type de plan et le statut
  IF user_profile.plan_type = 'PRO' THEN
    plan_type_val := 'PRO';
    is_pro_val := TRUE;
    is_trial_val := FALSE;
    
    -- Vérifier si l'abonnement Pro est expiré
    IF user_profile.subscription_end_date IS NOT NULL AND user_profile.subscription_end_date < current_date THEN
      is_expired_val := TRUE;
      is_active_val := FALSE;
      days_remaining_val := 0;
    ELSE
      is_expired_val := FALSE;
      is_active_val := TRUE;
      IF user_profile.subscription_end_date IS NOT NULL THEN
        days_remaining_val := EXTRACT(DAY FROM (user_profile.subscription_end_date - current_date))::INTEGER;
      ELSE
        days_remaining_val := 29; -- Valeur par défaut pour Pro
      END IF;
    END IF;
    
  ELSIF user_profile.plan_type = 'FREE_TRIAL' THEN
    plan_type_val := 'FREE_TRIAL';
    is_trial_val := TRUE;
    is_pro_val := FALSE;
    
    -- Vérifier si l'essai gratuit est expiré
    IF user_profile.trial_end_date IS NOT NULL AND user_profile.trial_end_date < current_date THEN
      is_expired_val := TRUE;
      is_active_val := FALSE;
      days_remaining_val := 0;
    ELSE
      is_expired_val := FALSE;
      is_active_val := TRUE;
      IF user_profile.trial_end_date IS NOT NULL THEN
        days_remaining_val := EXTRACT(DAY FROM (user_profile.trial_end_date - current_date))::INTEGER;
      ELSE
        days_remaining_val := 7; -- Valeur par défaut pour l'essai gratuit
      END IF;
    END IF;
    
  ELSE
    -- Plan expiré ou inconnu
    plan_type_val := 'EXPIRED';
    is_expired_val := TRUE;
    is_active_val := FALSE;
    is_trial_val := FALSE;
    is_pro_val := FALSE;
    days_remaining_val := 0;
  END IF;
  
  -- Retourner le résultat
  RETURN QUERY SELECT 
    plan_type_val,
    is_active_val,
    is_trial_val,
    is_pro_val,
    is_expired_val,
    days_remaining_val,
    user_profile.trial_end_date,
    user_profile.subscription_end_date,
    COALESCE(user_profile.expires_at, user_profile.trial_end_date, user_profile.subscription_end_date),
    user_profile.created_at;
    
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_user_subscription_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_status(TEXT) TO service_role; 