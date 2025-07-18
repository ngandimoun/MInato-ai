#!/usr/bin/env node

/**
 * Script pour configurer automatiquement les produits et prix Stripe pour Minato Pro
 * 
 * Usage: node scripts/setup-minato-pro-products.js
 */

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

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

    // 2. Créer le prix mensuel ($25/mois)
    console.log('💰 Création du prix mensuel ($25/mois)...');
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 2500, // $25.00 en centimes
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        minato_product_type: 'pro_subscription',
        plan_type: 'monthly',
        created_via: 'setup_script'
      }
    });
    console.log(`✅ Prix mensuel créé: ${monthlyPrice.id}`);

    
    console.log(`✅ Prix annuel créé: ${yearlyPrice.id}`);

    // 4. Créer les produits pour les crédits à usage unique
    console.log('🎯 Création des produits de crédits...');

    // Configuration des packs de crédits
    const creditPacks = [
      // Images
      { name: 'Pack Images', credits: 15, price: 15, type: 'images', priceId: 'price_images_15' },
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
      { name: 'Pack Leads', credits: 25, price: 15, type: 'leads', priceId: 'price_leads_25' },
      { name: 'Pack Leads Plus', credits: 50, price: 25, type: 'leads', priceId: 'price_leads_50' },
      { name: 'Pack Leads Pro', credits: 100, price: 35, type: 'leads', priceId: 'price_leads_100' }
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
    console.log(`💰 Prix mensuel ($25/mois): ${monthlyPrice.id}`);
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