# Système de Gestion des Abonnements - Minato

## Vue d'ensemble

Ce système gère les abonnements et les permissions des utilisateurs dans l'application Minato.

## Structure de la Base de Données

### Table `user_profiles`
- `plan_type`: 'FREE_TRIAL', 'PRO', 'EXPIRED'
- `trial_end_date`: Date de fin d'essai gratuit
- `subscription_end_date`: Date de fin d'abonnement Pro
- `expires_at`: Date d'expiration générale

## Plans d'Abonnement

### Essai Gratuit (FREE_TRIAL) - 7 jours
**Fonctionnalités accessibles :**
- ✅ Chat
- ✅ Memory
- ✅ Listening (limité à 5 enregistrements)
- ✅ Game Solo

**Fonctionnalités bloquées :**
- ❌ Génération d'images
- ❌ Génération de vidéos
- ❌ Game Multiplayer
- ❌ Leads

### Plan Pro (PRO) - 29 jours
**Toutes les fonctionnalités accessibles :**
- ✅ Chat
- ✅ Memory
- ✅ Listening (illimité)
- ✅ Game Solo
- ✅ Game Multiplayer
- ✅ Génération d'images
- ✅ Génération de vidéos
- ✅ Leads

### Statut Expiré (EXPIRED)
**Toutes les fonctionnalités bloquées**

## Composants React

### 1. Hook `useSubscription`
```typescript
import { useSubscription } from '@/hooks/use-subscription';

const { 
  subscriptionStatus, 
  permissions, 
  loading,
  checkFeatureAccess,
  showProFeatureToast 
} = useSubscription();
```

### 2. Composant `FeatureGuard`
```typescript
import { FeatureGuard } from '@/components/subscription/feature-guard';

<FeatureGuard feature="generate_image">
  <Button>Generate Image</Button>
</FeatureGuard>
```

### 3. Composant `ProtectedButton`
```typescript
import { ProtectedButton } from '@/components/subscription/feature-guard';

<ProtectedButton feature="generate_video" onClick={handleGenerate}>
  Generate Video
</ProtectedButton>
```

### 4. Composant `ListeningLimitGuard`
```typescript
import { ListeningLimitGuard } from '@/components/subscription/listening-limit-guard';

<ListeningLimitGuard>
  <RecordingButton />
</ListeningLimitGuard>
```

### 5. Composant `ProtectedInput`
```typescript
import { ProtectedInput } from '@/components/subscription/protected-input';

<ProtectedInput feature="chat">
  <textarea placeholder="Type your message..." />
</ProtectedInput>
```

### 6. Composant `SubscriptionStatus`
```typescript
import { SubscriptionStatus } from '@/components/subscription/subscription-status';

// À utiliser dans le header
<SubscriptionStatus />
```

## API Routes

### 1. `/api/subscription/status`
- **GET** - Récupère le statut d'abonnement d'un utilisateur
- **Paramètres :** `userId`

### 2. `/api/subscription/check-access`
- **POST** - Vérifie l'accès à une fonctionnalité
- **Body :** `{ userId, feature }`

### 3. `/api/subscription/notifications`
- **GET** - Récupère les notifications (bienvenue, expiration, etc.)
- **Paramètres :** `userId`

## Fonctions Base de Données

### 1. `get_user_subscription_status(user_uuid)`
Retourne le statut complet d'abonnement d'un utilisateur.

### 2. `check_feature_access(user_uuid, feature_name)`
Vérifie si un utilisateur a accès à une fonctionnalité spécifique.

### 3. `get_users_expiring_soon(days_ahead)`
Récupère les utilisateurs qui expirent bientôt pour les notifications.

### 4. `get_new_users_last_24h()`
Récupère les nouveaux utilisateurs pour le message de bienvenue.

### 5. `cleanup_expired_subscriptions()`
Marque automatiquement les abonnements expirés.

## Notifications

### Messages de Bienvenue
- Affiché aux nouveaux utilisateurs
- Message : "Bienvenue sur Minato ! Profitez de votre essai gratuit de 7 jours"

### Notifications d'Expiration
- 2 jours avant expiration (essai gratuit et Pro)
- Message avec bouton pour passer au Pro ou renouveler

### Messages de Limitation
- Quand un utilisateur tente d'accéder à une fonctionnalité Pro
- Message : "Fonctionnalité Pro requise - Cliquez sur 'Plan' pour passer au Pro"

## Intégration dans l'Application

### 1. Header
```typescript
// Ajouter dans le header
<SubscriptionStatus />
```

### 2. Chat
```typescript
<ProtectedInput feature="chat">
  <textarea placeholder="Type your message..." />
</ProtectedInput>
```

### 3. Creation Hub
```typescript
<FeatureGuard feature="generate_image">
  <Button>Generate Image</Button>
</FeatureGuard>

<FeatureGuard feature="generate_video">
  <Button>Generate Video</Button>
</FeatureGuard>

<FeatureGuard feature="leads">
  <Button>Find Leads</Button>
</FeatureGuard>
```

### 4. Listening
```typescript
<ListeningLimitGuard>
  <RecordingButton />
</ListeningLimitGuard>
```

### 5. Games
```typescript
<FeatureGuard feature="game_solo">
  <Button>Create Solo Game</Button>
</FeatureGuard>

<FeatureGuard feature="game_multiplayer">
  <Button>Create Multiplayer Game</Button>
</FeatureGuard>
```

## Gestion Automatique

### Expiration Automatique
- Les abonnements sont automatiquement marqués comme 'EXPIRED' à la date d'expiration
- Trigger automatique sur la table `user_profiles`

### Nettoyage Périodique
- Fonction `cleanup_expired_subscriptions()` à exécuter périodiquement
- Met à jour les statuts expirés

### Notifications Périodiques
- Vérification toutes les 5 minutes via `useSubscription`
- Affichage automatique des toasts appropriés

## Tests

### Vérifier les Permissions
```typescript
const hasAccess = await checkFeatureAccess('generate_image');
console.log('Can generate images:', hasAccess);
```

### Vérifier le Statut
```typescript
const { subscriptionStatus } = useSubscription();
console.log('Plan type:', subscriptionStatus?.plan_type);
console.log('Days remaining:', subscriptionStatus?.days_remaining);
```

## Maintenance

### Mise à Jour des Abonnements
```sql
-- Passer un utilisateur au Pro
SELECT public.upgrade_user_to_pro('user-uuid-here');

-- Vérifier le statut
SELECT * FROM public.get_user_subscription_status('user-uuid-here');
```

### Surveillance
```sql
-- Utilisateurs expirant bientôt
SELECT * FROM public.get_users_expiring_soon(2);

-- Nouveaux utilisateurs
SELECT * FROM public.get_new_users_last_24h();
``` 