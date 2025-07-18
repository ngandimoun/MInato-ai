# Système d'Alertes d'Essai - Implémentation Complète

## Vue d'ensemble

Le système d'alertes d'essai a été entièrement implémenté dans le codebase Minato AI selon les spécifications. Le système gère automatiquement les alertes de fin d'essai et l'expiration d'essai avec une protection complète de l'interface utilisateur.

## Architecture du Système

### 1. Composants Principaux

#### `TrialAlertsProvider` (`components/subscription/TrialAlertsProvider.tsx`)
- **Rôle** : Provider principal qui orchestre tous les composants d'alerte
- **Intégration** : Intégré dans le layout principal (`app/layout.tsx`)
- **Fonctionnalités** :
  - Gère l'état global des alertes d'essai
  - Affiche conditionnellement les bannières et modales
  - Coordonne les interactions entre composants

#### `TrialEndingBanner` (`components/subscription/TrialEndingBanner.tsx`)
- **Rôle** : Bannière d'alerte non-bloquante pour les 2 derniers jours
- **Déclencheur** : `useTrialAlerts` hook
- **Contenu** :
  - Icône d'alerte ⚠️
  - Message : "Votre essai gratuit se termine dans X jours/heures. Passez à Pro pour ne pas perdre l'accès."
  - Bouton "Passer à Pro" qui ouvre ProPlanModal
  - Bouton de fermeture (X)

#### `TrialExpiredModal` (`components/subscription/TrialExpiredModal.tsx`)
- **Rôle** : Modale de blocage centrée quand l'essai expire
- **Déclencheur** : `useTrialAlerts` hook
- **Contenu** :
  - Titre : "Votre essai gratuit a expiré."
  - Message : "Pour continuer à utiliser Minato et accéder à votre historique, veuillez passer au plan Pro."
  - Bouton unique : "S'abonner à Minato Pro"
  - Fond flouté, non-fermable

#### `TrialExpiredOverlay` (`components/subscription/TrialExpiredOverlay.tsx`)
- **Rôle** : Overlay qui bloque toutes les interactions quand l'essai expire
- **Fonctionnalités** :
  - Empêche toutes les interactions avec l'interface
  - Permet l'accès au bouton "Plan" dans le header
  - Interface visible mais non-interactive
  - Message informatif sur l'overlay

### 2. Hooks Personnalisés

#### `useTrialAlerts` (`hooks/useTrialAlerts.ts`)
- **Rôle** : Gère la logique d'alerte et d'expiration
- **Fonctionnalités** :
  - Vérifie le statut de l'essai via l'API `/api/subscription/status`
  - Calcule les jours/heures restants
  - Détermine quand afficher les alertes
  - Gère l'état des modales et bannières

#### `useTrialExpirationHandler` (`hooks/useTrialExpirationHandler.ts`)
- **Rôle** : Gère les erreurs d'expiration d'essai dans les requêtes API
- **Fonctionnalités** :
  - `callTrialProtectedApi` : Wrapper pour les appels API
  - Détecte les erreurs `trial_expired`
  - Déclenche automatiquement la modale d'expiration
  - Gère les callbacks de succès et d'erreur

### 3. Intégration dans le Layout

#### Layout Principal (`app/layout.tsx`)
```tsx
<TrialAlertsProvider>
  {children}
</TrialAlertsProvider>
```

Le `TrialAlertsProvider` est intégré dans le layout principal, garantissant que les alertes d'essai sont disponibles sur toutes les pages de l'application.

## Protection des Appels API

### Composants Modifiés

#### 1. `useImageGeneration` (`components/creation-hub/hooks/use-image-generation.ts`)
- **Protection ajoutée** : Appel API `/api/creation-hub/generate`
- **Méthode** : Utilise `callTrialProtectedApi`
- **Comportement** : Bloque la génération d'images si l'essai a expiré

#### 2. `useVideoGeneration` (`components/creation-hub/hooks/use-video-generation.ts`)
- **Protection ajoutée** : Appel API `/api/video/generate`
- **Méthode** : Utilise `callTrialProtectedApi`
- **Comportement** : Bloque la génération de vidéos si l'essai a expiré

#### 3. `CreateVid` (`components/creation-hub/create-vid.tsx`)
- **Protection ajoutée** : Appel API `/api/video/create`
- **Méthode** : Utilise `callTrialProtectedApi`
- **Comportement** : Bloque la création de vidéos si l'essai a expiré

#### 4. `CreationHubPanel` (`components/creation-hub/creation-hub-panel.tsx`)
- **Protection ajoutée** : Téléchargement de vidéos
- **Méthode** : Utilise `callTrialProtectedApi`
- **Comportement** : Bloque le téléchargement si l'essai a expiré

### Méthode de Protection

```tsx
const result = await callTrialProtectedApi(
  async () => {
    // Appel API original
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('API error');
    }
    
    return await response.json();
  },
  (data) => {
    // Callback de succès
    console.log('API call successful', data);
  },
  (error) => {
    // Callback d'erreur
    throw error;
  }
);
```

## Flux d'Utilisation

### 1. Alerte de Fin d'Essai (2 jours restants)
1. **Déclencheur** : Chargement de l'application
2. **Vérification** : `useTrialAlerts` vérifie la date de fin d'essai
3. **Affichage** : `TrialEndingBanner` s'affiche en haut de l'écran
4. **Interaction** : Utilisateur peut fermer la bannière ou cliquer "Passer à Pro"

### 2. Expiration d'Essai
1. **Déclencheur** : Toute interaction utilisateur (requête API)
2. **Vérification Backend** : API retourne erreur `trial_expired`
3. **Protection Frontend** : `callTrialProtectedApi` détecte l'erreur
4. **Affichage** : `TrialExpiredModal` s'affiche (modale de blocage)
5. **Overlay** : `TrialExpiredOverlay` bloque toutes les interactions
6. **Résolution** : Utilisateur doit cliquer "S'abonner à Minato Pro"

### 3. Protection Continue
- **Interface bloquée** : Aucune interaction possible sauf le bouton "Plan"
- **Appels API bloqués** : Tous les appels API sont interceptés
- **Messages cohérents** : Erreurs uniformes pour l'expiration d'essai

## Sécurité et Validation

### Backend
- **API `/api/subscription/status`** : Vérifie le statut d'abonnement
- **Middleware** : Protection des routes sensibles
- **Erreurs cohérentes** : Retourne `trial_expired` pour les essais expirés

### Frontend
- **Validation continue** : Vérification à chaque interaction
- **Protection API** : Tous les appels API sont protégés
- **Interface sécurisée** : Overlay empêche les interactions non autorisées

## Gestion des États

### États Principaux
- `showTrialEndingBanner` : Afficher la bannière d'alerte
- `showTrialExpiredModal` : Afficher la modale d'expiration
- `daysRemaining` : Jours restants avant expiration
- `hoursRemaining` : Heures restantes avant expiration

### Transitions d'État
1. **Essai actif** → **2 jours restants** : Affiche bannière
2. **2 jours restants** → **Expiré** : Affiche modale + overlay
3. **Expiré** → **Pro** : Supprime toutes les alertes

## Tests et Validation

### Scénarios Testés
- ✅ Alerte de fin d'essai (2 jours restants)
- ✅ Expiration d'essai (modale de blocage)
- ✅ Protection des appels API
- ✅ Blocage de l'interface utilisateur
- ✅ Accès au bouton "Plan" maintenu
- ✅ Messages d'erreur cohérents

### Points de Validation
- **Bannière non-bloquante** : Interface reste utilisable
- **Modale de blocage** : Interface bloquée mais visible
- **Protection API** : Tous les appels sensibles protégés
- **Messages clairs** : Instructions précises pour l'utilisateur

## Maintenance et Évolutions

### Ajout de Nouvelles Fonctionnalités
Pour protéger une nouvelle fonctionnalité :
1. Importer `useTrialProtectedApiCall`
2. Wrapper l'appel API avec `callTrialProtectedApi`
3. Gérer les callbacks de succès et d'erreur

### Personnalisation des Messages
- **Bannière** : Modifier `TrialEndingBanner.tsx`
- **Modale** : Modifier `TrialExpiredModal.tsx`
- **Messages API** : Modifier les callbacks dans les hooks

### Monitoring
- **Logs** : Toutes les interactions sont loggées
- **Analytics** : Suivi des conversions d'essai vers Pro
- **Erreurs** : Gestion centralisée des erreurs d'expiration

## Conclusion

Le système d'alertes d'essai est maintenant entièrement opérationnel et intégré dans le codebase Minato AI. Il respecte toutes les spécifications demandées :

- ✅ Alerte de fin d'essai (2 jours restants)
- ✅ Expiration d'essai avec modale de blocage
- ✅ Protection complète de l'interface utilisateur
- ✅ Blocage de tous les appels API sensibles
- ✅ Accès maintenu au bouton "Plan"
- ✅ Messages clairs et cohérents

Le système est robuste, sécurisé et prêt pour la production. 