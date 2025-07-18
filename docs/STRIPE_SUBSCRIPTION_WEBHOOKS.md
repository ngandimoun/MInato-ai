# Webhooks Stripe pour Abonnements Minato Pro

Ce document explique comment configurer et utiliser les webhooks Stripe pour gérer automatiquement les abonnements Minato Pro.

## Vue d'ensemble

Le système d'abonnement Minato Pro utilise des webhooks Stripe pour synchroniser automatiquement les changements d'abonnement entre Stripe et la base de données Supabase. Cela garantit que les utilisateurs ont toujours accès aux bonnes fonctionnalités selon leur plan d'abonnement.

## Configuration des Webhooks

### 1. Variables d'environnement

Ajoutez ces variables à votre fichier `.env.local` :

```bash
# Clés Stripe
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_... pour la production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # ou pk_live_... pour la production

# Webhook secrets (différents pour chaque webhook)
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_... # Pour les webhooks existants
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_... # Pour les webhooks d'abonnement

# Configuration des produits/prix Minato Pro
STRIPE_MINATO_PRO_PRICE_ID=price_... # ID du prix de l'abonnement Pro
STRIPE_MINATO_PRO_PRODUCT_ID=prod_... # ID du produit Pro
```

### 2. Configuration dans le Dashboard Stripe

1. Connectez-vous à votre [Dashboard Stripe](https://dashboard.stripe.com/)
2. Allez dans **Developers > Webhooks**
3. Cliquez sur **Add endpoint**
4. Configurez l'endpoint pour les abonnements :

**URL de l'endpoint :**
```
https://votre-domaine.com/api/stripe-webhooks/subscription
```

**Événements à écouter :**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.created`
- `customer.updated`
- `customer.deleted`

5. Cliquez sur **Add endpoint**
6. Copiez le **Signing secret** et ajoutez-le à `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`

### 3. Création du Produit et Prix Minato Pro

Dans le Dashboard Stripe, créez le produit et le prix pour Minato Pro :

1. Allez dans **Products**
2. Cliquez sur **Add product**
3. Configurez le produit :
   - **Name:** Minato Pro
   - **Description:** Accès illimité à toutes les fonctionnalités premium de Minato
   - **Pricing:** Recurring, $25.00/month (ou votre prix)
   - **Billing:** Monthly
   - **Trial period:** 7 days (optionnel)

4. Copiez les IDs et ajoutez-les aux variables d'environnement

## Architecture des Webhooks

### Endpoint Principal
- **URL:** `/api/stripe-webhooks/subscription`
- **Méthode:** POST
- **Fonction:** Traite tous les événements liés aux abonnements

### Fonctionnalités

#### 1. Gestion des Abonnements
- **Création** (`customer.subscription.created`)
- **Mise à jour** (`customer.subscription.updated`)
- **Suppression** (`customer.subscription.deleted`)

#### 2. Gestion des Paiements
- **Paiement réussi** (`invoice.payment_succeeded`)
- **Paiement échoué** (`invoice.payment_failed`)

#### 3. Gestion des Clients
- **Création** (`customer.created`)
- **Mise à jour** (`customer.updated`)
- **Suppression** (`customer.deleted`)

### Fonctions Helper

#### `checkEventIdempotency(eventId)`
- Vérifie si un événement a déjà été traité
- Évite les doublons en cas de retry

#### `sendNotification(userId, title, message, type, relatedLink)`
- Envoie des notifications in-app aux utilisateurs
- Types: success, info, warning, error

#### `getUserFromStripeCustomer(stripeCustomerId)`
- Récupère l'ID utilisateur Minato à partir de l'ID client Stripe

#### `updateUserSubscription(userId, planType, subscriptionEndDate, stripeCustomerId)`
- Met à jour le statut d'abonnement de l'utilisateur
- Plan types: FREE_TRIAL, PRO, EXPIRED

## Gestion des Événements

### 1. Création d'Abonnement

```typescript
case 'customer.subscription.created':
  // 1. Récupérer l'utilisateur
  const userId = await getUserFromStripeCustomer(customerId);
  
  // 2. Mettre à jour le plan vers PRO
  await updateUserSubscription(userId, 'PRO', subscriptionEndDate);
  
  // 3. Envoyer notification de bienvenue
  await sendNotification(userId, 'Welcome to Minato Pro! 🎉', ...);
```

### 2. Mise à Jour d'Abonnement

```typescript
case 'customer.subscription.updated':
  if (status === 'active') {
    // Renouvellement réussi
    await updateUserSubscription(userId, 'PRO', subscriptionEndDate);
  } else if (status === 'past_due') {
    // Paiement en retard
    await sendNotification(userId, 'Payment Required', ...);
  } else if (status === 'unpaid') {
    // Paiement échoué
    await sendNotification(userId, 'Payment Failed', ...);
  }
```

### 3. Suppression d'Abonnement

```typescript
case 'customer.subscription.deleted':
  // Passer à EXPIRED
  await updateUserSubscription(userId, 'EXPIRED', null);
  
  // Notifier l'utilisateur
  await sendNotification(userId, 'Subscription Cancelled', ...);
```

### 4. Paiement Réussi

```typescript
case 'invoice.payment_succeeded':
  // Mettre à jour la date de fin d'abonnement
  await updateUserSubscription(userId, 'PRO', subscriptionEndDate);
  
  // Confirmer le paiement
  await sendNotification(userId, 'Payment Successful', ...);
```

## Routes API Complémentaires

### 1. Création d'Abonnement
- **URL:** `/api/stripe/create-subscription`
- **Méthode:** POST
- **Fonction:** Crée un nouvel abonnement Stripe

### 2. Annulation d'Abonnement
- **URL:** `/api/stripe/cancel-subscription`
- **Méthode:** POST
- **Fonction:** Annule un abonnement existant

### 3. Statut d'Abonnement
- **URL:** `/api/subscription/status`
- **Méthode:** GET
- **Fonction:** Récupère le statut actuel de l'abonnement

## Composants React

### SubscriptionManager
- Interface utilisateur pour gérer les abonnements
- Affichage du statut, quotas, crédits
- Actions: upgrade, cancel, reactivate

### UpgradeModal
- Modal d'upgrade affiché quand l'utilisateur dépasse ses limites
- Intégration avec Stripe Checkout

## Sécurité

### 1. Vérification des Signatures
```typescript
// Vérifier la signature du webhook
event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
```

### 2. Idempotence
```typescript
// Éviter les doublons
const canProcess = await checkEventIdempotency(event.id);
if (!canProcess) return;
```

### 3. Gestion d'Erreurs
```typescript
try {
  await handleSubscriptionEvent(event);
} catch (error) {
  logger.error('Error processing event:', error);
  // Toujours retourner 200 pour éviter les retry
}
```

## Tests

### 1. Test en Mode Développement
```bash
# Utiliser Stripe CLI pour tester les webhooks
stripe listen --forward-to localhost:3000/api/stripe-webhooks/subscription
```

### 2. Test des Événements
```bash
# Déclencher un événement de test
stripe trigger customer.subscription.created
```

### 3. Vérification des Logs
```bash
# Vérifier les logs de l'application
tail -f logs/app.log | grep subscription-webhooks
```

## Monitoring

### 1. Logs Importants
- Création d'abonnement
- Échecs de paiement
- Annulations
- Erreurs de traitement

### 2. Métriques à Surveiller
- Taux de conversion (trial → pro)
- Taux de rétention
- Échecs de paiement
- Temps de traitement des webhooks

### 3. Alertes
- Webhooks non traités
- Erreurs de paiement répétées
- Anomalies dans les conversions

## Dépannage

### Problèmes Courants

#### 1. Webhook non reçu
- Vérifier l'URL de l'endpoint
- Vérifier les variables d'environnement
- Tester avec Stripe CLI

#### 2. Signature invalide
- Vérifier le webhook secret
- Vérifier l'encodage du payload
- Tester en mode développement

#### 3. Événements dupliqués
- Vérifier l'idempotence
- Vérifier les logs de base de données
- Nettoyer les événements traités

#### 4. Utilisateur non trouvé
- Vérifier la liaison customer_id ↔ user_id
- Vérifier les métadonnées du customer
- Vérifier la table user_profiles

### Commandes de Debug

```bash
# Vérifier les webhooks Stripe
stripe webhooks list

# Tester un webhook spécifique
stripe webhooks trigger customer.subscription.created

# Vérifier les logs
grep "subscription-webhooks" logs/app.log

# Vérifier la base de données
psql -d minato_db -c "SELECT * FROM user_profiles WHERE stripe_customer_id IS NOT NULL;"
```

## Maintenance

### 1. Nettoyage Régulier
- Supprimer les anciens événements traités
- Archiver les logs anciens
- Optimiser les requêtes de base de données

### 2. Mises à Jour
- Surveiller les changements d'API Stripe
- Tester les webhooks après mise à jour
- Mettre à jour les types TypeScript

### 3. Sauvegarde
- Sauvegarder les configurations webhook
- Exporter les données d'abonnement
- Documenter les changements

## Support

Pour toute question ou problème :

1. Vérifiez les logs de l'application
2. Consultez la documentation Stripe
3. Testez avec Stripe CLI
4. Contactez l'équipe de développement

## Ressources

- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Guide des Abonnements Stripe](https://stripe.com/docs/billing/subscriptions)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Types TypeScript Stripe](https://github.com/stripe/stripe-node) 