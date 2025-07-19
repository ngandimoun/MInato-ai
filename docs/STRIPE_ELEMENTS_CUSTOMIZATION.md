# Personnalisation de l'interface Stripe avec Elements

## Vue d'ensemble

Ce document explique comment nous avons personnalisé l'interface de paiement Stripe pour qu'elle ressemble à celle de Cursor Pro, en utilisant **Stripe Elements** au lieu des **Checkout Sessions** standard.

## Architecture

### 1. Composants principaux

- **`ProSubscriptionCheckout.tsx`** : Interface personnalisée avec Stripe Elements
- **`/api/subscription/create-payment-intent`** : API pour créer des Payment Intents
- **`/subscription/checkout`** : Page dédiée au checkout personnalisé
- **`/api/stripe-webhooks/payment-intent`** : Webhook pour gérer les paiements réussis

### 2. Flux de paiement

```
Utilisateur → UpgradeModal → /subscription/checkout → Stripe Elements → Payment Intent → Webhook → Activation Pro
```

## Fonctionnalités implémentées

### ✅ Design moderne similaire à Cursor Pro

- **Section gauche** : Détails de l'abonnement avec fond sombre
- **Section droite** : Formulaire de paiement avec fond clair
- **Toggle annuel/mensuel** : Réduction de 20% pour l'abonnement annuel
- **Icônes et couleurs** : Design cohérent avec la marque Minato

### ✅ Stripe Elements personnalisé

- **CardElement** : Champ de carte de crédit stylisé
- **Validation en temps réel** : Feedback visuel immédiat
- **Gestion d'erreurs** : Messages d'erreur personnalisés
- **Sauvegarde des informations** : Option pour accélérer les futurs paiements

### ✅ Gestion robuste des customers

- **Vérification automatique** : Vérifie si le customer existe dans Stripe
- **Recréation automatique** : Crée un nouveau customer si nécessaire
- **Nettoyage des données** : Supprime les customer IDs invalides

### ✅ Webhooks pour l'activation

- **Payment Intent Succeeded** : Active automatiquement l'abonnement Pro
- **Payment Intent Failed** : Gère les échecs de paiement
- **Mise à jour de la base de données** : Met à jour le statut utilisateur

## Configuration requise

### Variables d'environnement

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Dépendances

```json
{
  "@stripe/stripe-js": "^2.0.0",
  "@stripe/react-stripe-js": "^2.0.0"
}
```

## Personnalisation du design

### Couleurs et thème

```typescript
// Couleurs principales
const colors = {
  primary: '#f59e0b', // Yellow-500
  secondary: '#ea580c', // Orange-600
  dark: '#111827', // Gray-900
  light: '#f9fafb', // Gray-50
  success: '#10b981', // Green-500
  error: '#ef4444' // Red-500
};

// Style du CardElement
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      iconColor: '#6772e5',
    },
    invalid: {
      iconColor: '#ef4444',
      color: '#ef4444',
    },
  },
};
```

### Layout responsive

```typescript
// Grid layout pour desktop
<div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
  {/* Section gauche - Détails */}
  <div className="bg-gray-900 text-white rounded-2xl p-8">
    {/* Contenu */}
  </div>
  
  {/* Section droite - Paiement */}
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
    {/* Formulaire */}
  </div>
</div>
```

## Fonctionnalités avancées

### 1. Toggle annuel/mensuel

```typescript
const [annualBilling, setAnnualBilling] = useState(false);
const monthlyPrice = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS / 100;
const annualPrice = monthlyPrice * 12 * 0.8; // 20% discount
const savings = (monthlyPrice * 12) - annualPrice;
```

### 2. Calcul dynamique des prix

```typescript
// Calcul du montant selon le cycle de facturation
const baseAmount = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS;
const amount = annualBilling ? baseAmount * 12 * 0.8 : baseAmount;

// Affichage du prix mensuel pour l'annuel
const displayPrice = annualBilling ? (annualPrice / 12).toFixed(2) : monthlyPrice.toFixed(2);
```

### 3. Gestion des erreurs

```typescript
try {
  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      return_url: returnUrl,
      payment_method_data: {
        billing_details: { email }
      }
    }
  });

  if (error) {
    toast({
      title: "Payment Failed",
      description: error.message,
      variant: "destructive"
    });
  }
} catch (error) {
  // Gestion des erreurs réseau
}
```

## Webhooks et activation

### 1. Configuration du webhook

Dans le dashboard Stripe, configurez un webhook pointant vers :
```
https://votre-domaine.com/api/stripe-webhooks/payment-intent
```

### 2. Événements à écouter

- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### 3. Activation automatique

```typescript
// Mise à jour du profil utilisateur
await supabase
  .from('user_profiles')
  .update({
    plan_type: 'PRO',
    subscription_status: 'active',
    subscription_start_date: new Date().toISOString(),
    subscription_end_date: billingCycle === 'annual' 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    billing_cycle: billingCycle || 'monthly'
  })
  .eq('id', userId);
```

## Avantages par rapport aux Checkout Sessions

### ✅ Contrôle total du design
- Interface 100% personnalisable
- Intégration parfaite avec votre design system
- Responsive design optimisé

### ✅ Expérience utilisateur améliorée
- Pas de redirection vers Stripe
- Feedback en temps réel
- Validation côté client

### ✅ Flexibilité technique
- Gestion personnalisée des erreurs
- Intégration avec votre système d'authentification
- Contrôle total du flux de paiement

### ✅ Sécurité maintenue
- Stripe Elements gère la sécurité des cartes
- Conformité PCI maintenue
- Webhooks sécurisés

## Tests et déploiement

### 1. Test en mode développement

```bash
# Utilisez les cartes de test Stripe
# Succès : 4242 4242 4242 4242
# Échec : 4000 0000 0000 0002
```

### 2. Configuration des webhooks

```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe-webhooks/payment-intent
```

### 3. Déploiement

```bash
# Vercel
vercel --prod

# Mettre à jour les variables d'environnement
# Configurer les webhooks en production
```

## Maintenance

### 1. Monitoring

- Surveillez les logs des webhooks
- Vérifiez les échecs de paiement
- Contrôlez les métriques Stripe

### 2. Mises à jour

- Maintenez les dépendances Stripe à jour
- Testez les nouvelles fonctionnalités
- Documentez les changements

### 3. Support client

- Gestion des remboursements
- Support technique des paiements
- Assistance aux utilisateurs

## Conclusion

Cette implémentation offre une expérience de paiement moderne et personnalisée, similaire à celle de Cursor Pro, tout en maintenant la sécurité et la fiabilité de Stripe. L'interface est entièrement personnalisable et s'intègre parfaitement avec votre design system. 