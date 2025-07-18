# Système d'Alertes d'Essai - Minato AI

## Vue d'ensemble

Le système d'alertes d'essai a été implémenté selon les spécifications pour gérer automatiquement les alertes de fin d'essai et l'expiration d'essai. Le système est entièrement intégré dans le layout principal et fonctionne de manière transparente.

## Composants implémentés

### 1. `TrialEndingBanner` 
**Fichier**: `components/subscription/TrialEndingBanner.tsx`

- **Fonction**: Affiche une bannière d'alerte non-bloquante en haut de l'écran
- **Déclencheur**: Quand l'essai se termine dans moins de 2 jours
- **Contenu**: 
  - Icône d'alerte
  - Message: "⚠️ Votre essai gratuit se termine dans X jours/heures. Passez à Pro pour ne pas perdre l'accès."
  - Bouton "Passer à Pro" qui ouvre la modale ProPlanModal
  - Bouton de fermeture (X)

### 2. `TrialExpiredModal`
**Fichier**: `components/subscription/TrialExpiredModal.tsx`

- **Fonction**: Modale de blocage centrée avec fond flouté
- **Déclencheur**: Quand l'essai a expiré
- **Contenu**:
  - Titre: "Votre essai gratuit a expiré"
  - Message: "Pour continuer à utiliser Minato et accéder à votre historique, veuillez passer au plan Pro."
  - Bouton unique: "S'abonner à Minato Pro"
  - Non-fermable (pas de bouton X)

### 3. `TrialExpiredOverlay`
**Fichier**: `components/subscription/TrialExpiredOverlay.tsx`

- **Fonction**: Overlay qui bloque toutes les interactions avec l'interface
- **Déclencheur**: Quand l'essai a expiré
- **Comportement**:
  - Bloque toutes les interactions (saisie, génération, enregistrement, etc.)
  - Laisse accès au header pour le bouton "Plan"
  - Affiche un message d'information centré

### 4. `TrialAlertsProvider`
**Fichier**: `components/subscription/TrialAlertsProvider.tsx`

- **Fonction**: Provider qui orchestre tous les composants d'alerte
- **Intégration**: Intégré dans le layout principal (`app/layout.tsx`)

## Hooks implémentés

### 1. `useTrialAlerts`
**Fichier**: `hooks/useTrialAlerts.ts`

- **Fonction**: Gère la logique d'alerte de fin d'essai et d'expiration
- **Fonctionnalités**:
  - Récupère le statut d'abonnement via `/api/subscription/status`
  - Calcule les jours/heures restants
  - Détermine quand afficher les alertes
  - Gère l'état des modales et bannières

### 2. `useTrialExpirationHandler`
**Fichier**: `hooks/useTrialExpirationHandler.ts`

- **Fonction**: Gère les erreurs d'expiration d'essai dans les requêtes API
- **Fonctionnalités**:
  - Détecte les erreurs `trial_expired`
  - Déclenche automatiquement la modale d'expiration
  - Fournit `useTrialProtectedApiCall` pour les appels API protégés

## Intégration dans le layout

Le système est intégré dans `app/layout.tsx` via le `TrialAlertsProvider` :

```tsx
<AuthProvider>
  <NavigationProvider>
    <UploadStatusProvider>
      <ListeningProvider>
        <TrialAlertsProvider>
          {children}
        </TrialAlertsProvider>
      </ListeningProvider>
    </UploadStatusProvider>
  </NavigationProvider>
</AuthProvider>
```

## Utilisation dans les composants

### Exemple avec `useGameStats`

```tsx
import { useTrialProtectedApiCall } from '@/hooks/useTrialExpirationHandler'

export function useGameStats() {
  const { callTrialProtectedApi } = useTrialProtectedApiCall()
  
  const fetchStats = async () => {
    await callTrialProtectedApi(
      async () => {
        const response = await fetch('/api/games/user-stats')
        // ... logique API
        return data.stats
      },
      (data) => {
        setStats(data) // Succès
      },
      (error) => {
        setError(error.message) // Erreur non-trial
      }
    )
  }
}
```

## Flux de fonctionnement

### 1. Alerte de Fin d'Essai (2 jours avant)
1. `useTrialAlerts` détecte que l'essai se termine dans ≤2 jours
2. `TrialEndingBanner` s'affiche en haut de l'écran
3. L'utilisateur peut fermer la bannière ou cliquer sur "Passer à Pro"
4. L'interface reste entièrement fonctionnelle

### 2. Expiration d'Essai
1. `useTrialAlerts` détecte que l'essai a expiré
2. `TrialExpiredModal` s'affiche (non-fermable)
3. `TrialExpiredOverlay` bloque toutes les interactions
4. L'utilisateur ne peut que cliquer sur "S'abonner à Minato Pro"

### 3. Gestion des Erreurs API
1. Une requête API retourne une erreur `trial_expired`
2. `useTrialExpirationHandler` détecte l'erreur
3. La modale d'expiration s'affiche automatiquement
4. L'overlay bloque les interactions

## API utilisée

Le système utilise l'API `/api/subscription/status` qui retourne :

```json
{
  "plan": {
    "type": "FREE_TRIAL",
    "name": "Free Trial",
    "isActive": true
  },
  "trial": {
    "isActive": true,
    "endDate": "2024-01-15T00:00:00Z",
    "daysRemaining": 1,
    "isExpired": false
  }
}
```

## Personnalisation

### Modifier les seuils d'alerte
Dans `hooks/useTrialAlerts.ts`, ligne ~50 :
```tsx
// Vérifier si l'essai se termine dans moins de 2 jours
if (daysRemaining <= 2) {
```

### Modifier les messages
Dans les composants respectifs :
- `TrialEndingBanner.tsx` - Message de la bannière
- `TrialExpiredModal.tsx` - Messages de la modale
- `TrialExpiredOverlay.tsx` - Message de l'overlay

## Tests

Pour tester le système :

1. **Alerte de fin d'essai** : Modifier la date de fin d'essai dans la base de données pour qu'elle soit dans 1-2 jours
2. **Expiration d'essai** : Modifier la date de fin d'essai pour qu'elle soit dans le passé
3. **Erreurs API** : Simuler une erreur `trial_expired` dans une API

## Maintenance

Le système est conçu pour être :
- **Automatique** : Aucune intervention manuelle requise
- **Non-bloquant** : Les alertes de fin d'essai n'empêchent pas l'utilisation
- **Sécurisé** : L'expiration bloque complètement l'accès aux fonctionnalités
- **Extensible** : Facile d'ajouter de nouveaux types d'alertes 