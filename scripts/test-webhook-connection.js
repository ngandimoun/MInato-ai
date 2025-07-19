/**
 * Stripe Webhook Connection Test Script
 * 
 * This script provides instructions for testing webhook connections through the Stripe dashboard.
 * 
 * Usage: node scripts/test-webhook-connection.js
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

async function main() {
  console.log('🔍 Stripe Webhook Connection Test');
  console.log('================================\n');

  try {
    // 1. List all webhook endpoints
    console.log('Listing webhook endpoints...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    if (webhooks.data.length === 0) {
      console.log('❌ No webhook endpoints found. Please create webhooks first.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${webhooks.data.length} webhook endpoints:\n`);
    
    // 2. Display webhook information
    webhooks.data.forEach((webhook, index) => {
      console.log(`[${index + 1}] Webhook: ${webhook.url}`);
      console.log(`   ID: ${webhook.id}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
      console.log(''); // Add a blank line for readability
    });
    
    console.log('\n📋 To test these webhooks:');
    console.log('1. Go to the Stripe Dashboard: https://dashboard.stripe.com/webhooks');
    console.log('2. Click on each webhook endpoint');
    console.log('3. Click "Send test webhook" button');
    console.log('4. Select an event type (e.g., "checkout.session.completed")');
    console.log('5. Click "Send test webhook"');
    console.log('\n⚠️ Important: Check your server logs to verify that the test events were received.');
    console.log('If you do not see any logs, there may be an issue with your webhook configuration.\n');
    
    console.log('🔧 Webhook Troubleshooting:');
    console.log('1. Ensure your server is running and accessible from the internet');
    console.log('2. Verify that the webhook secrets in .env.local match those in the Stripe Dashboard');
    console.log('3. Check that your webhook endpoint code is correctly verifying signatures');
    console.log('4. Look for any errors in your server logs when test events are sent');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 