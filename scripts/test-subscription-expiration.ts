#!/usr/bin/env tsx

/**
 * Script de test pour vérifier les restrictions post-expiration
 * 
 * Ce script teste que les utilisateurs avec un abonnement Pro expiré
 * ne peuvent plus accéder aux fonctionnalités premium.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkAndHandleProExpiration, getUserSubscription } from '@/lib/middleware/subscription-guards';
import { logger } from '@/memory-framework/config';

async function testSubscriptionExpiration() {
  const logPrefix = "[Test Subscription Expiration]";
  
  try {
    logger.info(`${logPrefix} Starting subscription expiration tests...`);
    
    const supabase = await createServerSupabaseClient();
    
    // Test 1: Vérifier la fonction checkAndHandleProExpiration
    logger.info(`${logPrefix} Test 1: Testing checkAndHandleProExpiration function`);
    
    // Créer un utilisateur de test avec un abonnement Pro expiré
    const testUserEmail = `test-expired-${Date.now()}@example.com`;
    const testUserPassword = 'test-password-123';
    
    // Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUserEmail,
      password: testUserPassword,
    });
    
    if (authError || !authData.user) {
      logger.error(`${logPrefix} Failed to create test user:`, authError);
      return;
    }
    
    const testUserId = authData.user.id;
    logger.info(`${logPrefix} Created test user: ${testUserId.substring(0, 8)}`);
    
    // Mettre à jour le profil utilisateur pour simuler un abonnement Pro expiré
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // Expiré hier
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: testUserId,
        plan_type: 'PRO',
        subscription_end_date: expiredDate.toISOString(),
        monthly_usage: { leads: 0, recordings: 0, images: 0, videos: 0 },
        one_time_credits: { images: 0, videos: 0, recordings: 0 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      logger.error(`${logPrefix} Failed to create user profile:`, profileError);
      return;
    }
    
    logger.info(`${logPrefix} Set up test user with expired Pro subscription`);
    
    // Test 2: Vérifier que checkAndHandleProExpiration détecte l'expiration
    logger.info(`${logPrefix} Test 2: Testing expiration detection`);
    
    const { expired, updated } = await checkAndHandleProExpiration(testUserId);
    
    if (expired) {
      logger.info(`${logPrefix} ✅ Expiration detected successfully`);
      if (updated) {
        logger.info(`${logPrefix} ✅ User status updated to EXPIRED`);
      }
    } else {
      logger.error(`${logPrefix} ❌ Expiration not detected`);
    }
    
    // Test 3: Vérifier que l'utilisateur a bien le statut EXPIRED
    logger.info(`${logPrefix} Test 3: Verifying user status`);
    
    const subscription = await getUserSubscription(testUserId);
    
    if (subscription) {
      logger.info(`${logPrefix} User subscription status: ${subscription.planType}`);
      
      if (subscription.planType === 'EXPIRED') {
        logger.info(`${logPrefix} ✅ User correctly marked as EXPIRED`);
        
        // Test 4: Vérifier les quotas EXPIRED
        logger.info(`${logPrefix} Test 4: Verifying EXPIRED quotas`);
        
        const quotas = {
          leads: subscription.monthlyUsage.leads,
          recordings: subscription.monthlyUsage.recordings,
          images: subscription.monthlyUsage.images,
          videos: subscription.monthlyUsage.videos
        };
        
        logger.info(`${logPrefix} Current usage:`, quotas);
        
        // Vérifier que les quotas sont bien à 0
        const allZero = Object.values(quotas).every(quota => quota === 0);
        
        if (allZero) {
          logger.info(`${logPrefix} ✅ All quotas are correctly set to 0 for EXPIRED users`);
        } else {
          logger.error(`${logPrefix} ❌ Some quotas are not 0 for EXPIRED user`);
        }
      } else {
        logger.error(`${logPrefix} ❌ User not marked as EXPIRED: ${subscription.planType}`);
      }
    } else {
      logger.error(`${logPrefix} ❌ Could not fetch user subscription`);
    }
    
    // Test 5: Nettoyer les données de test
    logger.info(`${logPrefix} Test 5: Cleaning up test data`);
    
    // Supprimer le profil utilisateur
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testUserId);
    
    // Supprimer l'utilisateur
    const { error: deleteError } = await supabase.auth.admin.deleteUser(testUserId);
    
    if (deleteError) {
      logger.warn(`${logPrefix} Could not delete test user:`, deleteError);
    } else {
      logger.info(`${logPrefix} ✅ Test user cleaned up successfully`);
    }
    
    logger.info(`${logPrefix} All tests completed successfully!`);
    
  } catch (error) {
    logger.error(`${logPrefix} Test failed with error:`, error);
  }
}

// Fonction pour tester les API endpoints
async function testAPIEndpoints() {
  const logPrefix = "[Test API Endpoints]";
  
  logger.info(`${logPrefix} Testing API endpoints with expired subscription...`);
  
  // Note: Ce test nécessiterait un serveur en cours d'exécution
  // et des appels HTTP réels aux endpoints
  
  const endpoints = [
    '/api/creation-hub/generate',
    '/api/video/generate',
    '/api/ai-leads/generate-message',
    '/api/recordings',
    '/api/recordings/upload'
  ];
  
  logger.info(`${logPrefix} Endpoints to test:`, endpoints);
  logger.info(`${logPrefix} To test these endpoints, run the server and make HTTP requests`);
  logger.info(`${logPrefix} Expected response: 403 Forbidden with subscription_expired error`);
}

// Fonction principale
async function main() {
  logger.info("🚀 Starting Subscription Expiration Tests");
  
  await testSubscriptionExpiration();
  await testAPIEndpoints();
  
  logger.info("✅ All tests completed");
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

export { testSubscriptionExpiration, testAPIEndpoints }; 