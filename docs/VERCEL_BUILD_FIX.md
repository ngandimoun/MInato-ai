# Correction de l'erreur de build Vercel

## Problèmes identifiés

### 1. Erreur critique : `useSearchParams()` sans Suspense boundary
**Erreur :** `useSearchParams() should be wrapped in a suspense boundary at page "/subscription/checkout"`

**Solution appliquée :**
- Enveloppé le composant `SubscriptionCheckoutPage` dans une `Suspense` boundary
- Créé un composant séparé `SubscriptionCheckoutContent` pour gérer la logique
- Ajouté un fallback approprié pendant le chargement

### 2. Avertissement : Option `swcMinify` obsolète
**Avertissement :** `Unrecognized key(s) in object: 'swcMinify'`

**Solution appliquée :**
- Supprimé l'option `swcMinify` du fichier `next.config.mjs`
- Cette option n'est plus nécessaire dans Next.js 15.3.5

### 3. Avertissement : Dépendance `xml2object` incompatible
**Avertissement :** Package `xml2object@0.1.2` incompatible avec Node.js v22.17.1

**Solutions appliquées :**
- Créé un fichier `.npmrc` avec `engine-strict=false`
- Ajouté `--ignore-engines` dans la commande d'installation
- Créé un script `fix-deps` pour identifier et gérer les dépendances problématiques

## Fichiers modifiés

### 1. `app/subscription/checkout/page.tsx`
```tsx
// Avant
export default function SubscriptionCheckoutPage() {
  const searchParams = useSearchParams();
  // ...
}

// Après
function SubscriptionCheckoutContent() {
  const searchParams = useSearchParams();
  // ...
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SubscriptionCheckoutContent />
    </Suspense>
  );
}
```

### 2. `next.config.mjs`
```javascript
// Supprimé
swcMinify: true,
```

### 3. `.npmrc` (nouveau)
```
engine-strict=false
registry=https://registry.npmjs.org/
production=true
optional=false
```

### 4. `vercel.json` (modifié)
```json
{
  "buildCommand": "npm run build:clean",
  "installCommand": "npm install --ignore-engines",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=2048"
  }
}
```

### 5. `package.json`
```json
{
  "scripts": {
    "build:clean": "npm run clean && cross-env NODE_OPTIONS=\"--max-old-space-size=2048\" next build",
    "clean": "rm -rf .next node_modules/.cache && npm install",
    "fix-deps": "node scripts/fix-dependencies.js"
  }
}
```

### 6. `scripts/fix-dependencies.js` (nouveau)
Script pour identifier et résoudre les dépendances problématiques.

## Vérifications effectuées

✅ **Pages avec `useSearchParams` déjà correctement configurées :**
- `app/subscription/page.tsx` - ✅ Suspense boundary présente
- `app/creation-hub/page.tsx` - ✅ Suspense boundary présente  
- `app/games/page.tsx` - ✅ Suspense boundary présente
- `app/chat/page.tsx` - ✅ Suspense boundary présente

## Commandes pour résoudre le problème

### 1. Nettoyer et reconstruire
```bash
npm run fix-deps
npm run build:clean
```

### 2. Ou manuellement
```bash
# Nettoyer les caches
rm -rf .next node_modules/.cache

# Réinstaller les dépendances
npm install --ignore-engines

# Construire
npm run build
```

## Prévention future

1. **Toujours envelopper `useSearchParams()` dans Suspense** lors de la création de nouvelles pages
2. **Vérifier la compatibilité des dépendances** avant l'ajout
3. **Utiliser les scripts de build optimisés** (`build:clean`)
4. **Maintenir le fichier `.npmrc`** pour éviter les conflits d'engines

## Notes importantes

- Le package `xml2object` est une dépendance transitive qui n'est pas directement utilisée
- Les avertissements de dépendances n'empêchent pas le build mais peuvent causer des problèmes en production
- La configuration Vercel optimisée améliore les performances de build et de déploiement 