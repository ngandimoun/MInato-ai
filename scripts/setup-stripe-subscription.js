#!/usr/bin/env node

/**
 * Script de configuration Stripe pour Minato Pro
 * Ce script crée automatiquement le produit et le prix pour l'abonnement Minato Pro
 * 
 * Usage: node scripts/setup-stripe-subscription.js
 */

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const MINATO_PRO_PRICE = 2500; // $25.00 en centimes
const MINATO_PRO_CURRENCY = 'usd';
const MINATO_PRO_NAME = 'Minato Pro';
const MINATO_PRO_DESCRIPTION = 'Accès illimité à toutes les fonctionnalités premium de Minato AI Companion';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY n\'est pas configuré dans .env.local');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

async function setupMinatoProSubscription() {
  try {
    console.log('🚀 Configuration de l\'abonnement Minato Pro...\n');

    // 1. Créer le produit Minato Pro
    console.log('📦 Création du produit Minato Pro...');
    const product = await stripe.products.create({
      name: MINATO_PRO_NAME,
      description: MINATO_PRO_DESCRIPTION,
      metadata: {
        minato_product_type: 'subscription',
        minato_plan: 'pro'
      }
    });
    console.log(`✅ Produit créé: ${product.id}`);

    // 2. Créer le prix mensuel
    console.log('💰 Création du prix mensuel...');
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: MINATO_PRO_PRICE,
      currency: MINATO_PRO_CURRENCY,
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        minato_plan: 'pro',
        minato_interval: 'monthly'
      }
    });
    console.log(`✅ Prix créé: ${price.id} ($${(MINATO_PRO_PRICE / 100).toFixed(2)}/mois)`);



    // 4. Afficher les variables d'environnement à configurer
    console.log('\n📋 Variables d\'environnement à ajouter à .env.local:');
    console.log('='.repeat(60));
    console.log(`STRIPE_MINATO_PRO_PRODUCT_ID=${product.id}`);
    console.log(`STRIPE_MINATO_PRO_PRICE_ID=${price.id}`);
    console.log('='.repeat(60));

    // 5. Créer un webhook de test (optionnel)
    console.log('\n🔗 Configuration du webhook (optionnel)...');
    console.log('URL du webhook à configurer dans le Dashboard Stripe:');
    console.log('https://votre-domaine.com/api/stripe-webhooks/subscription');
    console.log('\nÉvénements à écouter:');
    console.log('- customer.subscription.created');
    console.log('- customer.subscription.updated');
    console.log('- customer.subscription.deleted');
    console.log('- invoice.payment_succeeded');
    console.log('- invoice.payment_failed');
    console.log('- customer.created');
    console.log('- customer.updated');
    console.log('- customer.deleted');

    // 6. Vérifier la configuration
    console.log('\n✅ Configuration terminée avec succès!');
    console.log('\n📊 Résumé:');
    console.log(`- Produit: ${product.name} (${product.id})`);
    console.log(`- Prix mensuel: $${(MINATO_PRO_PRICE / 100).toFixed(2)} (${price.id})`);

    // 7. Instructions de test
    console.log('\n🧪 Pour tester:');
    console.log('1. Ajoutez les variables d\'environnement à .env.local');
    console.log('2. Redémarrez votre serveur de développement');
    console.log('3. Testez la création d\'abonnement via l\'interface utilisateur');
    console.log('4. Utilisez Stripe CLI pour tester les webhooks:');
    console.log('   stripe listen --forward-to localhost:3000/api/stripe-webhooks/subscription');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('🔑 Vérifiez votre STRIPE_SECRET_KEY');
    } else if (error.type === 'StripePermissionError') {
      console.error('🚫 Vérifiez les permissions de votre compte Stripe');
    }
    
    process.exit(1);
  }
}

// Fonction pour vérifier la configuration existante
async function checkExistingConfiguration() {
  try {
    console.log('🔍 Vérification de la configuration existante...\n');

    const productId = process.env.STRIPE_MINATO_PRO_PRODUCT_ID;
    const priceId = process.env.STRIPE_MINATO_PRO_PRICE_ID;

    if (productId) {
      try {
        const product = await stripe.products.retrieve(productId);
        console.log(`✅ Produit existant trouvé: ${product.name} (${product.id})`);
      } catch (error) {
        console.log(`❌ Produit ${productId} non trouvé ou inaccessible`);
      }
    }

    if (priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        console.log(`✅ Prix existant trouvé: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval} (${price.id})`);
      } catch (error) {
        console.log(`❌ Prix ${priceId} non trouvé ou inaccessible`);
      }
    }

    if (!productId || !priceId) {
      console.log('⚠️  Configuration incomplète détectée');
      console.log('Exécutez ce script pour créer les produits et prix manquants\n');
    } else {
      console.log('✅ Configuration complète détectée\n');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check') || args.includes('-c')) {
    await checkExistingConfiguration();
  } else {
    await checkExistingConfiguration();
    console.log('\n' + '='.repeat(60));
    await setupMinatoProSubscription();
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { setupMinatoProSubscription, checkExistingConfiguration }; 