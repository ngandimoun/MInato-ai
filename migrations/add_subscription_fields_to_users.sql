-- ============================================================================
-- MIGRATION: Ajout des champs d'abonnement à la table users
-- DESC: Ajoute les champs nécessaires pour le système d'abonnement Pro
-- ============================================================================

-- Ajouter les champs d'abonnement à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'TRIAL' CHECK (plan_type IN ('TRIAL', 'PRO', 'EXPIRED')),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS monthly_usage JSONB DEFAULT '{"leads": 0, "recordings": 0, "images": 0, "videos": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS one_time_credits JSONB DEFAULT '{"leads": 0, "recordings": 0, "images": 0, "videos": 0}'::jsonb;

-- Créer un index sur plan_type pour les performances
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);

-- Créer un index sur subscription_end_date pour les vérifications d'expiration
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON users(subscription_end_date);

-- Créer un index sur stripe_customer_id pour les recherches Stripe
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Fonction pour nettoyer automatiquement les utilisateurs expirés (optionnel)
CREATE OR REPLACE FUNCTION cleanup_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET plan_type = 'EXPIRED'
  WHERE plan_type = 'PRO' 
    AND subscription_end_date IS NOT NULL 
    AND subscription_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour nettoyer automatiquement (optionnel)
-- DROP TRIGGER IF EXISTS trigger_cleanup_expired_subscriptions ON users;
-- CREATE TRIGGER trigger_cleanup_expired_subscriptions
--   AFTER INSERT OR UPDATE ON users
--   FOR EACH ROW
--   EXECUTE FUNCTION cleanup_expired_subscriptions();

-- ============================================================================
-- MIGRATION TERMINÉE
-- ============================================================================ 