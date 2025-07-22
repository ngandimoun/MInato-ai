-- Migration : Ajout du champ quota_limits pour les limites personnalisées de quotas par utilisateur Pro
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS quota_limits jsonb DEFAULT '{}'; 