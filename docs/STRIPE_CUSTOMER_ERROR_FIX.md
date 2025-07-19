# Correction de l'erreur "No such customer" dans Stripe

## Problème identifié

L'utilisateur recevait l'erreur suivante lors de la tentative d'upgrade vers Minato Pro :

```
Upgrade Failed
No such customer: 'cus_Shplz8zJEyeJST'
```

## Cause du problème

Le problème venait du fait que :

1. **L'utilisateur avait un `stripe_customer_id` enregistré** dans la base de données (`cus_ShpIz8zJEyeJST`)
2. **Ce customer avait été supprimé de Stripe** ou n'existait plus pour une raison quelconque
3. **L'API `/api/subscription/upgrade` essayait d'utiliser ce customer ID** pour créer une session de checkout
4. **Stripe retournait l'erreur "No such customer"** car le customer n'existait plus

## Solution implémentée

### 1. Modification des APIs de checkout

**Fichiers modifiés :**
- `app/api/subscription/upgrade/route.ts`
- `app/api/payments/create-checkout-session/route.ts`

**Changements apportés :**
- Ajout d'une vérification pour s'assurer que le customer existe dans Stripe avant de l'utiliser
- Si le customer n'existe pas, suppression de l'ID de la base de données et création d'un nouveau customer
- Ajout de logs détaillés pour le debugging

### 2. Correction du prix de l'abonnement

**Fichier modifié :** `lib/constants.ts`

**Changement :**
- Correction du prix de 100 cents (1$) à 2500 cents (25$) pour l'abonnement Minato Pro

### 3. Nettoyage de la base de données

**Action effectuée :**
- Suppression du customer ID invalide `cus_ShpIz8zJEyeJST` de la base de données pour l'utilisateur `renemakoule@gmail.com`

### 4. Script de maintenance

**Fichier créé :** `scripts/fix-invalid-stripe-customers.ts`

**Fonctionnalité :**
- Script pour identifier et nettoyer automatiquement tous les customer IDs invalides dans la base de données
- Vérification de l'existence de chaque customer dans Stripe
- Suppression automatique des IDs invalides

## Code de vérification ajouté

```typescript
// ✅ NOUVEAU: Vérifier si le customer existe dans Stripe
if (stripeCustomerId) {
  try {
    // Try to retrieve the customer from Stripe
    await stripe.customers.retrieve(stripeCustomerId);
    logger.info(`[subscription-upgrade] Existing Stripe customer ${stripeCustomerId} is valid`);
  } catch (error: any) {
    // Customer doesn't exist in Stripe, clear it and create a new one
    logger.warn(`[subscription-upgrade] Stripe customer ${stripeCustomerId} not found, creating new customer`);
    stripeCustomerId = null;
    
    // Clear the invalid customer ID from database
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: null })
      .eq('id', userId);
  }
}
```

## Prévention future

Pour éviter ce problème à l'avenir :

1. **Vérification systématique** : Toutes les APIs de paiement vérifient maintenant l'existence du customer dans Stripe
2. **Nettoyage automatique** : Les customer IDs invalides sont automatiquement supprimés de la base de données
3. **Création de nouveaux customers** : Un nouveau customer est créé automatiquement si nécessaire
4. **Logs détaillés** : Ajout de logs pour faciliter le debugging

## Test de la solution

L'utilisateur `renemakoule@gmail.com` peut maintenant :
1. Tenter de s'abonner à Minato Pro
2. Un nouveau customer Stripe sera créé automatiquement
3. La session de checkout sera générée avec succès
4. L'upgrade vers Pro fonctionnera normalement

## Monitoring

Pour surveiller ce type de problème à l'avenir :

1. **Logs** : Surveiller les logs avec le pattern `Stripe customer X not found, creating new customer`
2. **Métriques** : Compter le nombre de nouveaux customers créés vs customers existants
3. **Alertes** : Configurer des alertes si trop de customers invalides sont détectés 