-- Migration pour ajouter les fonctions de gestion des abonnements
-- Date: 2024-12-20

-- Fonction pour récupérer le statut d'abonnement d'un utilisateur
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

-- Fonction pour vérifier l'accès à une fonctionnalité
CREATE OR REPLACE FUNCTION check_feature_access(user_uuid TEXT, feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_status RECORD;
  has_access BOOLEAN := FALSE;
BEGIN
  -- Récupérer le statut d'abonnement
  SELECT * INTO subscription_status
  FROM get_user_subscription_status(user_uuid);
  
  -- Déterminer l'accès selon la fonctionnalité
  CASE feature_name
    WHEN 'chat', 'memory', 'listening', 'game_solo' THEN
      has_access := subscription_status.is_active;
    WHEN 'generate_image', 'generate_video', 'game_multiplayer', 'leads' THEN
      has_access := subscription_status.is_pro;
    ELSE
      has_access := FALSE;
  END CASE;
  
  RETURN has_access;
END;
$$;

-- Fonction pour récupérer les utilisateurs expirant bientôt
CREATE OR REPLACE FUNCTION get_users_expiring_soon(days_ahead INTEGER DEFAULT 2)
RETURNS TABLE (
  user_id TEXT,
  plan_type TEXT,
  days_remaining INTEGER,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.plan_type,
    EXTRACT(DAY FROM (COALESCE(up.expires_at, up.trial_end_date, up.subscription_end_date) - NOW()))::INTEGER as days_remaining,
    up.email
  FROM user_profiles up
  WHERE 
    up.plan_type IN ('FREE_TRIAL', 'PRO')
    AND COALESCE(up.expires_at, up.trial_end_date, up.subscription_end_date) IS NOT NULL
    AND COALESCE(up.expires_at, up.trial_end_date, up.subscription_end_date) > NOW()
    AND COALESCE(up.expires_at, up.trial_end_date, up.subscription_end_date) <= NOW() + (days_ahead || ' days')::INTERVAL;
END;
$$;

-- Fonction pour récupérer les nouveaux utilisateurs (24h)
CREATE OR REPLACE FUNCTION get_new_users_last_24h()
RETURNS TABLE (
  user_id TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.created_at
  FROM user_profiles up
  WHERE up.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY up.created_at DESC;
END;
$$;

-- Fonction pour nettoyer les abonnements expirés
CREATE OR REPLACE FUNCTION cleanup_expired_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE user_profiles
  SET plan_type = 'EXPIRED'
  WHERE 
    plan_type IN ('FREE_TRIAL', 'PRO')
    AND COALESCE(expires_at, trial_end_date, subscription_end_date) IS NOT NULL
    AND COALESCE(expires_at, trial_end_date, subscription_end_date) < NOW()
    AND plan_type != 'EXPIRED';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Fonction pour passer un utilisateur au plan Pro
CREATE OR REPLACE FUNCTION upgrade_user_to_pro(user_uuid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET 
    plan_type = 'PRO',
    subscription_end_date = NOW() + INTERVAL '29 days',
    expires_at = NOW() + INTERVAL '29 days'
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_user_subscription_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_status(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_feature_access(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_feature_access(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_users_expiring_soon(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_new_users_last_24h() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION upgrade_user_to_pro(TEXT) TO service_role; 