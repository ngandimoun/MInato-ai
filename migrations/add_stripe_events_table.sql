-- Migration: Ajouter la table des événements Stripe traités
-- Date: 2024-12-17
-- Description: Table pour éviter les doublons de traitement des webhooks Stripe

-- Créer la table des événements Stripe traités
CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id SERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    webhook_endpoint TEXT NOT NULL,
    metadata JSONB
);

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_event_id ON processed_stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_event_type ON processed_stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at ON processed_stripe_events(processed_at);
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_webhook_endpoint ON processed_stripe_events(webhook_endpoint);

-- Créer une fonction pour nettoyer les anciens événements (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_stripe_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM processed_stripe_events 
    WHERE processed_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour nettoyer automatiquement les anciens événements (optionnel)
-- Décommentez les lignes suivantes si vous voulez un nettoyage automatique
-- CREATE OR REPLACE FUNCTION trigger_cleanup_stripe_events()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- Nettoyer les événements de plus de 30 jours
--     PERFORM cleanup_old_stripe_events(30);
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER cleanup_stripe_events_trigger
--     AFTER INSERT ON processed_stripe_events
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_cleanup_stripe_events();

-- Ajouter des commentaires pour la documentation
COMMENT ON TABLE processed_stripe_events IS 'Table pour éviter les doublons de traitement des webhooks Stripe';
COMMENT ON COLUMN processed_stripe_events.event_id IS 'ID unique de l''événement Stripe';
COMMENT ON COLUMN processed_stripe_events.event_type IS 'Type d''événement Stripe (ex: customer.subscription.created)';
COMMENT ON COLUMN processed_stripe_events.processed_at IS 'Date et heure de traitement de l''événement';
COMMENT ON COLUMN processed_stripe_events.webhook_endpoint IS 'Endpoint webhook qui a traité l''événement';
COMMENT ON COLUMN processed_stripe_events.metadata IS 'Métadonnées supplémentaires de l''événement (JSON)';

-- Vérifier que la table a été créée correctement
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_stripe_events') THEN
        RAISE EXCEPTION 'La table processed_stripe_events n''a pas été créée correctement';
    END IF;
    
    RAISE NOTICE 'Migration add_stripe_events_table.sql terminée avec succès';
END $$; 