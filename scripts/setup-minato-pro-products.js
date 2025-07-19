#!/usr/bin/env node

/**
 * Script pour configurer automatiquement les produits et prix Stripe pour Minato Pro
 * 
 * Usage: node scripts/setup-minato-pro-products.js
 */

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// ✅ Read constants from lib/constants.ts
function getConstantsFromFile() {
  try {
    const constantsPath = path.join(__dirname, '..', 'lib', 'constants.ts');
    const constantsContent = fs.readFileSync(constantsPath, 'utf8');
    
    // Extract STRIPE_CONFIG values using regex
    const priceMatch = constantsContent.match(/MINATO_PRO_PRICE_CENTS:\s*(\d+)/);
    const displayMatch = constantsContent.match(/MINATO_PRO_PRICE_DISPLAY:\s*['"`]([^'"`]+)['"`]/);
    const currencyMatch = constantsContent.match(/MINATO_PRO_PRICE_CURRENCY:\s*['"`]([^'"`]+)['"`]/);
    const intervalMatch = constantsContent.match(/MINATO_PRO_PRICE_INTERVAL:\s*['"`]([^'"`]+)['"`]/);
    
    // Extract CREDIT_PACKS_CONFIG values
    const creditPacksMatch = constantsContent.match(/CREDIT_PACKS_CONFIG\s*=\s*{[\s\S]*?} as const;/);
    
    return {
      STRIPE_CONFIG: {
        MINATO_PRO_PRICE_CENTS: parseInt(priceMatch?.[1] || '2500'),
        MINATO_PRO_PRICE_DISPLAY: displayMatch?.[1] || '$25.00',
        MINATO_PRO_PRICE_CURRENCY: currencyMatch?.[1] || 'usd',
        MINATO_PRO_PRICE_INTERVAL: intervalMatch?.[1] || 'month'
      },
      creditPacksContent: creditPacksMatch?.[0] || null
    };
  } catch (error) {
    console.warn('⚠️  Could not read lib/constants.ts, using fallback values');
    return {
      STRIPE_CONFIG: {
        MINATO_PRO_PRICE_CENTS: 2500,
        MINATO_PRO_PRICE_DISPLAY: '$25.00',
        MINATO_PRO_PRICE_CURRENCY: 'usd',
        MINATO_PRO_PRICE_INTERVAL: 'month'
      },
      creditPacksContent: null
    };
  }
}

const constants = getConstantsFromFile();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function setupMinatoProProducts() {
  try {
    console.log('🚀 Configuration des produits Minato Pro...');

    // 1. Créer le produit Minato Pro
    console.log('📦 Création du produit Minato Pro...');
    const product = await stripe.products.create({
      name: 'Minato Pro',
      description: 'Accès illimité à toutes les fonctionnalités Minato',
      metadata: {
        minato_product_type: 'pro_subscription',
        created_via: 'setup_script'
      }
    });
    console.log(`✅ Produit créé: ${product.id}`);

    // 2. Créer le prix mensuel (dynamique depuis lib/constants.ts)
    console.log(`💰 Création du prix mensuel (${constants.STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY}/mois)...`);
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: constants.STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS, // Prix dynamique depuis lib/constants.ts
      currency: constants.STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY,
      recurring: {
        interval: constants.STRIPE_CONFIG.MINATO_PRO_PRICE_INTERVAL
      },
      metadata: {
        minato_product_type: 'pro_subscription',
        plan_type: 'monthly',
        created_via: 'setup_script',
        source: 'lib/constants.ts'
      }
    });
    console.log(`✅ Prix mensuel créé: ${monthlyPrice.id} (${constants.STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY})`);

    
    console.log(`✅ Prix annuel créé: ${yearlyPrice.id}`);

    // 4. Créer les produits pour les crédits à usage unique
    console.log('🎯 Création des produits de crédits...');

    // ✅ Configuration des packs de crédits depuis lib/constants.ts
    const creditPacks = [
      // Images
      { name: 'Pack Images', credits: 10, price: 15, type: 'images', priceId: 'price_images_10' },
      { name: 'Pack Images Plus', credits: 30, price: 25, type: 'images', priceId: 'price_images_30' },
      { name: 'Pack Images Pro', credits: 50, price: 35, type: 'images', priceId: 'price_images_50' },
      
      // Videos
      { name: 'Pack Vidéos', credits: 10, price: 15, type: 'videos', priceId: 'price_videos_10' },
      { name: 'Pack Vidéos Plus', credits: 20, price: 25, type: 'videos', priceId: 'price_videos_20' },
      { name: 'Pack Vidéos Pro', credits: 35, price: 35, type: 'videos', priceId: 'price_videos_35' },
      
      // Recordings
      { name: 'Pack Recordings', credits: 10, price: 15, type: 'recordings', priceId: 'price_recordings_10' },
      { name: 'Pack Recordings Plus', credits: 20, price: 25, type: 'recordings', priceId: 'price_recordings_20' },
      { name: 'Pack Recordings Pro', credits: 35, price: 35, type: 'recordings', priceId: 'price_recordings_35' },
      
      // Leads
      { name: 'Pack Leads', credits: 10, price: 15, type: 'leads', priceId: 'price_leads_10' },
      { name: 'Pack Leads Plus', credits: 20, price: 25, type: 'leads', priceId: 'price_leads_20' },
      { name: 'Pack Leads Pro', credits: 35, price: 35, type: 'leads', priceId: 'price_leads_35' }
    ];

    const createdCredits = {};

    for (const pack of creditPacks) {
      console.log(`📦 Création du ${pack.name}...`);
      
      const product = await stripe.products.create({
        name: pack.name,
        description: `${pack.credits} crédits pour ${pack.type}`,
        metadata: {
          minato_product_type: 'one_time_credits',
          credit_type: pack.type,
          credit_amount: pack.credits.toString(),
          created_via: 'setup_script'
        }
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.price * 100, // Convertir en centimes
        currency: 'usd',
        metadata: {
          minato_product_type: 'one_time_credits',
          credit_type: pack.type,
          credit_amount: pack.credits.toString(),
          created_via: 'setup_script'
        }
      });

      createdCredits[pack.priceId] = {
        productId: product.id,
        priceId: price.id,
        name: pack.name,
        credits: pack.credits,
        price: pack.price
      };

      console.log(`✅ ${pack.name} créé: ${price.id}`);
    }

    console.log('✅ Tous les produits de crédits créés');

    // 5. Afficher le résumé
    console.log('\n🎉 Configuration terminée avec succès !');
    console.log('\n📋 Résumé des produits créés:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Produit Minato Pro: ${product.id}`);
    console.log(`💰 Prix mensuel (${constants.STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY}/mois): ${monthlyPrice.id}`);
    console.log('\n🎯 Crédits à usage unique:');
    Object.entries(createdCredits).forEach(([priceId, credit]) => {
      console.log(`   ${credit.name} (${credit.credits} crédits - $${credit.price}): ${credit.priceId}`);
    });
    console.log('\n💡 Conseil: Sauvegardez ces IDs pour les utiliser dans votre application !');

    // 6. Créer un fichier de configuration
    const config = {
      products: {
        minatoPro: {
          id: product.id,
          name: 'Minato Pro',
          prices: {
            monthly: monthlyPrice.id
          }
        },
        credits: createdCredits
      },
      created_at: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync('stripe-products-config.json', JSON.stringify(config, null, 2));
    console.log('\n💾 Configuration sauvegardée dans stripe-products-config.json');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  setupMinatoProProducts();
}

module.exports = { setupMinatoProProducts }; 