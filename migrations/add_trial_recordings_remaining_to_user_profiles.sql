-- Ajoute un champ de quota d'enregistrements d'essai gratuit
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS trial_recordings_remaining INTEGER DEFAULT 5;

COMMENT ON COLUMN user_profiles.trial_recordings_remaining IS 'Nombre d\'enregistrements restants pour l\'essai gratuit (5 max, décrémenté à chaque analyse réussie)'; 