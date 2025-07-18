# Subscription Guards - Documentation

## Vue d'ensemble

Le système de protection d'abonnement Minato Pro permet de contrôler l'accès aux fonctionnalités premium et de gérer les quotas d'utilisation. Il comprend des middlewares côté serveur et des composants côté client pour une expérience utilisateur fluide.

## Architecture

### 1. Middlewares côté serveur (`lib/middleware/subscription-guards.ts`)

#### Fonctions principales :

- **`getUserSubscription(userId)`** : Récupère les informations d'abonnement d'un utilisateur
- **`requireProAccess(req, featureName)`** : Vérifie l'accès aux fonctionnalités Pro
- **`checkQuota(req, feature)`** : Vérifie les quotas d'utilisation
- **`incrementMonthlyUsage(userId, feature)`** : Incrémente l'utilisation mensuelle
- **`consumeOneTimeCredit(userId, feature)`** : Consomme un crédit à usage unique

#### Quotas par plan :

```typescript
const QUOTAS = {
  FREE_TRIAL: {
    leads: 10,
    recordings: 5,
    images: 10,
    videos: 5
  },
  PRO: {
    leads: 1000,
    recordings: 500,
    images: 1000,
    videos: 500
  },
  EXPIRED: {
    leads: 0,
    recordings: 0,
    images: 0,
    videos: 0
  }
}
```

### 2. Composants côté client

#### `UpgradeModal` (`components/subscription/UpgradeModal.tsx`)
Modal réutilisable qui s'affiche quand un utilisateur tente d'accéder à une fonctionnalité Pro.

#### `useSubscriptionGuard` (`hooks/useSubscriptionGuard.ts`)
Hook React pour gérer les erreurs d'abonnement et afficher automatiquement le modal d'upgrade.

## Utilisation

### 1. Protection d'une route API

```typescript
// Exemple : Route API pour fonctionnalité Pro
import { requireProAccess } from '@/lib/middleware/subscription-guards';

export async function POST(req: NextRequest) {
  // Vérifier l'accès Pro
  const proCheck = await requireProAccess(req, 'Multiplayer Mode');
  
  if (!proCheck.success) {
    return proCheck.response!;
  }

  // Logique de la fonctionnalité Pro...
}
```

### 2. Vérification de quotas

```typescript
// Exemple : Route API avec quotas
import { checkQuota, incrementMonthlyUsage } from '@/lib/middleware/subscription-guards';

export async function POST(req: NextRequest) {
  // Vérifier les quotas
  const quotaCheck = await checkQuota(req, 'recordings');
  
  if (!quotaCheck.success) {
    return quotaCheck.response!;
  }

  // Créer l'enregistrement...
  const recording = await createRecording(data);

  // Incrémenter l'utilisation après création réussie
  await incrementMonthlyUsage(userId, 'recordings');

  return NextResponse.json(recording);
}
```

### 3. Gestion côté client

```typescript
// Exemple : Composant React
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export const MyComponent = () => {
  const { handleSubscriptionError, isUpgradeModalOpen, handleUpgrade, closeUpgradeModal } = useSubscriptionGuard();

  const handleFeatureClick = async () => {
    try {
      const response = await fetch('/api/pro-feature', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      // Succès...
    } catch (error) {
      // Gérer automatiquement les erreurs d'abonnement
      if (!handleSubscriptionError(error)) {
        // Gérer les autres erreurs...
      }
    }
  };

  return (
    <>
      <button onClick={handleFeatureClick}>Try Pro Feature</button>
      
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onUpgrade={handleUpgrade}
        feature="Pro Feature"
      />
    </>
  );
};
```

## Types d'erreurs

### 1. `trial_expired`
L'essai gratuit de l'utilisateur a expiré.

### 2. `subscription_expired`
L'abonnement Pro de l'utilisateur a expiré.

### 3. `quota_exceeded`
L'utilisateur a dépassé son quota mensuel pour une fonctionnalité.

### 4. `pro_feature`
L'utilisateur tente d'accéder à une fonctionnalité Pro sans abonnement.

## Réponses API

### Erreur d'accès Pro
```json
{
  "error": "Pro access required",
  "code": "trial_expired",
  "feature": "Multiplayer Mode"
}
```

### Erreur de quota
```json
{
  "error": "Quota exceeded",
  "code": "quota_exceeded",
  "feature": "recordings",
  "currentUsage": 5,
  "maxQuota": 5
}
```

## Routes API existantes

### 1. `/api/subscription/status`
Récupère le statut complet de l'abonnement de l'utilisateur.

**Réponse :**
```json
{
  "plan": {
    "type": "FREE_TRIAL",
    "name": "Free Trial",
    "isActive": true
  },
  "trial": {
    "isActive": true,
    "endDate": "2025-07-25T02:01:52.371Z",
    "daysRemaining": 3,
    "isExpired": false
  },
  "quotas": {
    "monthly": {
      "recordings": {
        "used": 2,
        "limit": 5,
        "remaining": 3,
        "percentage": 40
      }
    },
    "oneTime": {
      "images": 0,
      "videos": 0,
      "recordings": 0
    }
  }
}
```

### 2. `/api/games/multiplayer`
Exemple de route Pro protégée.

### 3. `/api/recordings`
Exemple de route avec quotas.

## Intégration avec Stripe

Le système est conçu pour s'intégrer facilement avec Stripe :

1. **Création de client Stripe** : `stripe_customer_id` dans `user_profiles`
2. **Gestion des abonnements** : `subscription_end_date` pour les abonnements actifs
3. **Webhooks Stripe** : Pour mettre à jour le statut d'abonnement

## Maintenance

### Réinitialisation mensuelle des quotas

```typescript
// À exécuter mensuellement (cron job)
import { resetMonthlyUsage } from '@/lib/middleware/subscription-guards';

// Pour tous les utilisateurs
const users = await getAllUsers();
for (const user of users) {
  await resetMonthlyUsage(user.id);
}
```

### Monitoring

Les middlewares loggent automatiquement :
- Tentatives d'accès non autorisées
- Dépassements de quotas
- Erreurs de base de données
- Utilisation des fonctionnalités

## Tests

### Test des middlewares

```typescript
// Test d'accès Pro
const proCheck = await requireProAccess(mockRequest, 'Test Feature');
expect(proCheck.success).toBe(false);
expect(proCheck.response?.status).toBe(403);

// Test de quotas
const quotaCheck = await checkQuota(mockRequest, 'recordings');
expect(quotaCheck.success).toBe(true);
```

### Test du modal d'upgrade

```typescript
// Test d'affichage du modal
const { handleSubscriptionError } = useSubscriptionGuard();
const error = { code: 'trial_expired', feature: 'Test' };
handleSubscriptionError(error);
// Vérifier que le modal s'affiche
```

## Bonnes pratiques

1. **Toujours vérifier les quotas avant l'action** : Éviter de créer des ressources puis échouer
2. **Incrémenter l'utilisation après succès** : Garantir la cohérence des données
3. **Gérer les erreurs côté client** : Afficher le modal d'upgrade automatiquement
4. **Logging approprié** : Pour le monitoring et le debugging
5. **Tests complets** : Couvrir tous les cas d'erreur

## Évolutions futures

- **Crédits à usage unique** : Système de packs de crédits

- **Fonctionnalités par niveau** : Plus de granularité dans les plans
- **Analytics avancés** : Tableau de bord d'utilisation
- **Notifications** : Alertes de quota et expiration 