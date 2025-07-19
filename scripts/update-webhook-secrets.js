/**
 * Update Webhook Secrets Script
 * 
 * This script helps update the .env.local file with the new webhook secrets.
 * 
 * Usage: node scripts/update-webhook-secrets.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  console.log('🔑 Stripe Webhook Secrets Update Tool');
  console.log('===================================\n');

  try {
    // Get the path to the .env.local file
    const envPath = path.resolve(process.cwd(), '.env.local');
    
    // Check if the file exists
    if (!fs.existsSync(envPath)) {
      console.error(`❌ .env.local file not found at ${envPath}`);
      return;
    }
    
    // Read the current .env.local file
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Get the new webhook secrets from user input
    console.log('Please enter the new webhook secrets:');
    const mainSecret = await prompt('Main webhook secret (STRIPE_WEBHOOK_SIGNING_SECRET): ');
    const subscriptionSecret = await prompt('Subscription webhook secret (STRIPE_SUBSCRIPTION_WEBHOOK_SECRET): ');
    const debugSecret = await prompt('Debug webhook secret (STRIPE_DEBUG_WEBHOOK_SECRET): ');
    
    // Create the updated content
    let updatedContent = envContent;
    
    // Update or add the webhook secrets
    if (mainSecret) {
      if (updatedContent.includes('STRIPE_WEBHOOK_SIGNING_SECRET=')) {
        updatedContent = updatedContent.replace(
          /STRIPE_WEBHOOK_SIGNING_SECRET=.*/,
          `STRIPE_WEBHOOK_SIGNING_SECRET=${mainSecret}`
        );
      } else {
        updatedContent += `\nSTRIPE_WEBHOOK_SIGNING_SECRET=${mainSecret}`;
      }
    }
    
    if (subscriptionSecret) {
      if (updatedContent.includes('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=')) {
        updatedContent = updatedContent.replace(
          /STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=.*/,
          `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=${subscriptionSecret}`
        );
      } else {
        updatedContent += `\nSTRIPE_SUBSCRIPTION_WEBHOOK_SECRET=${subscriptionSecret}`;
      }
    }
    
    if (debugSecret) {
      if (updatedContent.includes('STRIPE_DEBUG_WEBHOOK_SECRET=')) {
        updatedContent = updatedContent.replace(
          /STRIPE_DEBUG_WEBHOOK_SECRET=.*/,
          `STRIPE_DEBUG_WEBHOOK_SECRET=${debugSecret}`
        );
      } else {
        updatedContent += `\nSTRIPE_DEBUG_WEBHOOK_SECRET=${debugSecret}`;
      }
    }
    
    // Write the updated content to a backup file
    const backupPath = path.resolve(process.cwd(), '.env.local.new');
    fs.writeFileSync(backupPath, updatedContent);
    
    console.log(`\n✅ Updated environment variables written to: ${backupPath}`);
    console.log('\n⚠️ To apply these changes:');
    console.log(`1. Review the changes in ${backupPath}`);
    console.log(`2. Copy the content to your .env.local file`);
    console.log('3. Restart your application');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main(); 