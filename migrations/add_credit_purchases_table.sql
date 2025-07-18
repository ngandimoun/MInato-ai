-- Migration pour ajouter la table credit_purchases
-- Cette table enregistre tous les achats de crédits à usage unique

CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('images', 'videos', 'recordings', 'leads')),
  pack_id TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL CHECK (credits_purchased > 0),
  amount_paid INTEGER NOT NULL CHECK (amount_paid > 0), -- en centimes
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL, -- Date d'expiration de l'abonnement au moment de l'achat
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_credit_type ON credit_purchases(credit_type);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_valid_until ON credit_purchases(valid_until);

-- RLS (Row Level Security)
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne voient que leurs propres achats
CREATE POLICY "Users can view their own credit purchases" ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs ne puissent pas modifier leurs achats (seul le webhook peut)
CREATE POLICY "Users cannot modify credit purchases" ON credit_purchases
  FOR ALL USING (false);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_credit_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_credit_purchases_updated_at
  BEFORE UPDATE ON credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_purchases_updated_at();

-- Fonction pour nettoyer les crédits expirés
CREATE OR REPLACE FUNCTION cleanup_expired_credits()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  -- Mettre à jour les crédits expirés dans la table users
  UPDATE users 
  SET one_time_credits = jsonb_build_object(
    'images', GREATEST(0, (one_time_credits->>'images')::int),
    'videos', GREATEST(0, (one_time_credits->>'videos')::int),
    'recordings', GREATEST(0, (one_time_credits->>'recordings')::int),
    'leads', GREATEST(0, (one_time_credits->>'leads')::int)
  )
  WHERE subscription_end_date < NOW()
    AND one_time_credits IS NOT NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires pour la documentation
COMMENT ON TABLE credit_purchases IS 'Enregistre les achats de crédits à usage unique des utilisateurs Pro';
COMMENT ON COLUMN credit_purchases.credit_type IS 'Type de crédit acheté (images, videos, recordings, leads)';
COMMENT ON COLUMN credit_purchases.credits_purchased IS 'Nombre de crédits achetés';
COMMENT ON COLUMN credit_purchases.amount_paid IS 'Montant payé en centimes';
COMMENT ON COLUMN credit_purchases.valid_until IS 'Date de validité des crédits (date d''expiration de l''abonnement)';
COMMENT ON COLUMN credit_purchases.status IS 'Statut de l''achat (pending, completed, failed, refunded)'; 