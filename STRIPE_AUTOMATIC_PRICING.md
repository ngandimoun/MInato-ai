# ✅ Système de Prix Automatique Stripe - Basé sur lib/constants.ts

## 🎯 Objectif

**Problème résolu :** Comment affecter automatiquement les nouveaux paiements dans Stripe lorsqu'on change un montant de prix dans `lib/constants.ts`

## ✅ Solution Implémentée

### **1. Service StripePriceService**

Créé `lib/services/StripePriceService.ts` qui :

- ✅ **Lit automatiquement** les prix depuis `lib/constants.ts`
- ✅ **Crée/récupère** les produits et prix Stripe dynamiquement
- ✅ **Met en cache** les Price IDs pour éviter les doublons
- ✅ **Gère** les remises annuelles automatiquement

### **2. Fonctionnement Automatique**

#### **Quand vous modifiez `lib/constants.ts` :**

```typescript
// AVANT
MINATO_PRO_PRICE_CENTS: 2500, // $25.00

// APRÈS
MINATO_PRO_PRICE_CENTS: 3000, // $30.00
```

#### **Ce qui se passe automatiquement :**

1. **Prochain paiement** → Le service détecte le nouveau prix
2. **Création automatique** → Nouveau Price ID dans Stripe avec $30.00
3. **Cache mis à jour** → Le nouveau prix est utilisé pour tous les paiements suivants
4. **Interface mise à jour** → Affichage automatique du nouveau prix

## 🔍 Architecture du Système

### **Flux de Paiement Automatique**

```
1. Utilisateur initie un paiement
   ↓
2. API create-payment-intent appelée
   ↓
3. StripePriceService.getPrice() exécuté
   ↓
4. Lecture de lib/constants.ts
   ↓
5. Vérification du cache des Price IDs
   ↓
6. Si nouveau prix → Création automatique dans Stripe
   ↓
7. Payment Intent créé avec le bon montant
   ↓
8. Interface affiche le prix depuis lib/constants.ts
```

### **Gestion du Cache**

```typescript
// Clé de cache basée sur le prix actuel
const cacheKey = `minato_pro_${billingCycle}_${unitAmount}_${currency}`;

// Exemple : minato_pro_monthly_2500_usd
// Si le prix change → Nouvelle clé → Nouveau Price ID créé
```

## ✅ Avantages du Système

### **1. Automatisation Complète**
- ✅ **Aucune intervention manuelle** dans Stripe
- ✅ **Synchronisation automatique** avec `lib/constants.ts`
- ✅ **Gestion des remises** intégrée (20% annuel)

### **2. Performance Optimisée**
- ✅ **Cache des Price IDs** pour éviter les appels Stripe inutiles
- ✅ **Récupération intelligente** des prix existants
- ✅ **Création conditionnelle** seulement si nécessaire

### **3. Cohérence Garantie**
- ✅ **Une seule source de vérité** : `lib/constants.ts`
- ✅ **Pas de décalage** entre interface et facturation
- ✅ **Métadonnées** pour tracer l'origine des prix

## 🎯 Utilisation

### **1. Modification de Prix**

Pour changer le prix, modifiez simplement `lib/constants.ts` :

```typescript
export const STRIPE_CONFIG = {
  MINATO_PRO_PRICE_CENTS: 3500, // $35.00
  MINATO_PRO_PRICE_DISPLAY: '$35.00',
  // ... autres configs
} as const;
```

### **2. Test du Changement**

1. **Modifiez** le prix dans `lib/constants.ts`
2. **Rechargez** la page de paiement
3. **Vérifiez** que le nouveau prix s'affiche
4. **Testez** un paiement pour confirmer le montant

### **3. Vérification dans Stripe**

- ✅ **Nouveau Price ID** créé automatiquement
- ✅ **Métadonnées** indiquent `created_from: 'lib/constants.ts'`
- ✅ **Montant** correspond au prix dans `lib/constants.ts`

## 🔍 Métadonnées Stripe

### **Produit Minato Pro**
```json
{
  "minato_product_type": "pro_subscription",
  "created_from": "lib/constants.ts",
  "base_price_cents": "2500"
}
```

### **Prix Mensuel**
```json
{
  "minato_product_type": "pro_subscription",
  "billing_cycle": "monthly",
  "base_price_cents": "2500",
  "created_from": "lib/constants.ts",
  "discount_applied": "none"
}
```

### **Prix Annuel**
```json
{
  "minato_product_type": "pro_subscription",
  "billing_cycle": "annual",
  "base_price_cents": "2500",
  "created_from": "lib/constants.ts",
  "discount_applied": "20%"
}
```

## ✅ API Modifiées

### **1. create-payment-intent/route.ts**
- ✅ **Utilise StripePriceService** au lieu de création manuelle
- ✅ **Calcul automatique** des montants
- ✅ **Logs détaillés** pour le debugging

### **2. Autres APIs à modifier**
- 🔄 `create-subscription/route.ts` (à adapter)
- 🔄 `create-checkout-session/route.ts` (à adapter)

## 🎯 Gestion des Abonnements Existants

### **Important à Noter :**
- ✅ **Nouveaux abonnements** : Utilisent le nouveau prix automatiquement
- ⚠️ **Abonnements existants** : Restent à l'ancien prix (conformité Stripe)
- 🔄 **Migration** : Nécessaire pour les abonnements existants si changement de prix

## ✅ Test Recommandé

### **Scénario de Test :**

1. **Prix actuel** : $25.00
2. **Modifiez** vers $30.00 dans `lib/constants.ts`
3. **Rechargez** la page de paiement
4. **Vérifiez** l'affichage : $30.00
5. **Testez** un paiement (mode test)
6. **Vérifiez** dans Stripe : Nouveau Price ID avec $30.00

### **Résultat Attendu :**
- ✅ **Interface** : Affiche $30.00
- ✅ **Payment Intent** : 3000 cents
- ✅ **Stripe Dashboard** : Nouveau Price ID créé
- ✅ **Métadonnées** : `created_from: 'lib/constants.ts'`

Le système est **entièrement automatique** et **prêt à l'emploi** ! 