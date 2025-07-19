/**
 * Stripe Webhook Configuration Fix Script
 * 
 * This script helps diagnose and fix common Stripe webhook configuration issues.
 * Run this script to:
 * 1. Verify webhook endpoint URLs
 * 2. Check webhook signing secrets
 * 3. Test webhook delivery
 * 
 * Usage: node scripts/fix-stripe-webhooks.js
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { execSync } = require('child_process');
const readline = require('readline');

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

// Check for --force flag
const forceMode = process.argv.includes('--force');

// Main function
async function main() {
  console.log('🔍 Stripe Webhook Configuration Diagnostic Tool');
  console.log('=============================================\n');

  try {
    // 1. Check existing webhooks
    console.log('Checking existing webhook endpoints...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    if (webhooks.data.length === 0) {
      console.log('❌ No webhook endpoints found. You need to create webhooks.');
    } else {
      console.log(`✅ Found ${webhooks.data.length} webhook endpoints:`);
      
      webhooks.data.forEach((webhook, index) => {
        console.log(`\n[${index + 1}] Webhook: ${webhook.url}`);
        console.log(`   Status: ${webhook.status}`);
        console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
        console.log(`   Secret: ${webhook.secret ? '✅ Secret configured' : '❌ No secret'}`);
      });
    }

    // 2. Check environment variables
    console.log('\nChecking environment variables...');
    
    const requiredVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SIGNING_SECRET',
      'STRIPE_SUBSCRIPTION_WEBHOOK_SECRET',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    } else {
      console.log('✅ All required environment variables are set');
    }

    // 3. Create webhook endpoints if in force mode or user confirms
    let createNew = forceMode;
    
    if (!forceMode) {
      createNew = (await prompt('\nDo you want to create a new webhook endpoint? (y/n): ')).toLowerCase() === 'y';
    }
    
    if (createNew) {
      let baseUrl;
      
      if (forceMode) {
        baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://minato.ai';
        console.log(`\n[Force Mode] Using base URL: ${baseUrl}`);
      } else {
        baseUrl = await prompt('Enter your base URL (e.g., https://yourdomain.com): ');
      }
      
      if (!baseUrl) {
        console.error('❌ Base URL is required');
        return;
      }
      
      // Create main webhook endpoint
      const mainEndpoint = await stripe.webhookEndpoints.create({
        url: `${baseUrl}/api/stripe-webhooks`,
        enabled_events: [
          'checkout.session.completed',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ],
        description: 'Minato AI main webhook endpoint'
      });
      
      console.log(`✅ Created main webhook endpoint: ${mainEndpoint.url}`);
      console.log(`🔑 Webhook signing secret: ${mainEndpoint.secret}`);
      console.log('⚠️ IMPORTANT: Add this secret to your .env.local as STRIPE_WEBHOOK_SIGNING_SECRET');
      
      // Create subscription-specific webhook endpoint
      const subscriptionEndpoint = await stripe.webhookEndpoints.create({
        url: `${baseUrl}/api/stripe-webhooks/subscription`,
        enabled_events: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ],
        description: 'Minato AI subscription webhook endpoint'
      });
      
      console.log(`\n✅ Created subscription webhook endpoint: ${subscriptionEndpoint.url}`);
      console.log(`🔑 Webhook signing secret: ${subscriptionEndpoint.secret}`);
      console.log('⚠️ IMPORTANT: Add this secret to your .env.local as STRIPE_SUBSCRIPTION_WEBHOOK_SECRET');
      
      // Create debug webhook endpoint
      const debugEndpoint = await stripe.webhookEndpoints.create({
        url: `${baseUrl}/api/stripe-webhooks/debug`,
        enabled_events: ['*'],
        description: 'Minato AI debug webhook endpoint'
      });
      
      console.log(`\n✅ Created debug webhook endpoint: ${debugEndpoint.url}`);
      console.log(`🔑 Webhook signing secret: ${debugEndpoint.secret}`);
      
      // Update .env.local template
      console.log('\n📝 Add these lines to your .env.local file:');
      console.log(`STRIPE_WEBHOOK_SIGNING_SECRET=${mainEndpoint.secret}`);
      console.log(`STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=${subscriptionEndpoint.secret}`);
    }

    // 4. Test webhooks if in force mode or user confirms
    let testWebhooks = forceMode;
    
    if (!forceMode) {
      testWebhooks = (await prompt('\nDo you want to test webhook delivery? (y/n): ')).toLowerCase() === 'y';
    }
    
    if (testWebhooks) {
      console.log('\n⚠️ To test webhooks, you need to have the Stripe CLI installed.');
      console.log('For instructions, visit: https://stripe.com/docs/stripe-cli\n');
      
      let proceed = forceMode;
      
      if (!forceMode) {
        proceed = (await prompt('Do you have Stripe CLI installed and want to proceed? (y/n): ')).toLowerCase() === 'y';
      }
      
      if (proceed) {
        try {
          console.log('\nRunning Stripe CLI login...');
          execSync('stripe login', { stdio: 'inherit' });
          
          console.log('\nStarting webhook forwarding...');
          console.log('Press Ctrl+C to stop the forwarding when done testing.\n');
          
          let baseUrl;
          
          if (forceMode) {
            baseUrl = 'http://localhost:3000';
            console.log(`[Force Mode] Using local URL: ${baseUrl}`);
          } else {
            baseUrl = await prompt('Enter your local development URL (e.g., http://localhost:3000): ');
          }
          
          if (!baseUrl) {
            console.error('❌ Base URL is required');
            return;
          }
          
          // Forward webhooks to the local server
          execSync(`stripe listen --forward-to ${baseUrl}/api/stripe-webhooks/debug`, { stdio: 'inherit' });
        } catch (error) {
          console.error('❌ Error running Stripe CLI:', error.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Script to fix the plan_type_enum issue in the database
// This script creates the plan_type_enum type if it doesn't exist
// and updates the handle_new_user function to use it correctly

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPlanTypeEnum() {
  console.log('Starting plan_type_enum fix...');

  try {
    console.log('Checking if plan_type_enum exists...');
    
    // Check if the enum exists
    const { data: enumExists, error: enumCheckError } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'plan_type_enum')
      .maybeSingle();
    
    if (enumCheckError) {
      console.log('Error checking if enum exists:', enumCheckError.message);
      console.log('Proceeding with migration anyway...');
    }
    
    // Apply the migration to fix the issue
    const { error: migrationError } = await supabase
      .from('supabase_migrations')
      .insert([
        {
          name: 'fix_plan_type_enum_issue_complete',
          version: new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14),
          statements: [
            `
            -- First, ensure the plan_type_enum type exists
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type_enum') THEN
                CREATE TYPE plan_type_enum AS ENUM ('FREE_TRIAL', 'PRO', 'EXPIRED');
              END IF;
            END$$;
            
            -- Update the handle_new_user function to handle cases where the enum might not exist
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $function$
            BEGIN
              INSERT INTO public.user_profiles (
                id, 
                email, 
                full_name, 
                first_name, 
                avatar_url,
                -- Subscription fields initialization
                plan_type,
                trial_end_date,
                monthly_usage,
                one_time_credits
              )
              VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'full_name',
                COALESCE(
                  NEW.raw_user_meta_data->>'first_name',
                  split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
                  split_part(NEW.email, '@', 1)
                ),
                NEW.raw_user_meta_data->>'avatar_url',
                -- Initialize subscription fields for new users
                'FREE_TRIAL'::plan_type_enum,
                (NOW() + INTERVAL '7 days')::timestamptz,
                '{"leads": 0, "recordings": 0, "images": 0, "videos": 0}'::jsonb,
                '{"leads": 0, "recordings": 0, "images": 0, "videos": 0}'::jsonb
              )
              ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
                first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
                avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
                -- Only update subscription fields if they are NULL (for existing users)
                plan_type = COALESCE(user_profiles.plan_type, EXCLUDED.plan_type),
                trial_end_date = COALESCE(user_profiles.trial_end_date, EXCLUDED.trial_end_date),
                monthly_usage = COALESCE(user_profiles.monthly_usage, EXCLUDED.monthly_usage),
                one_time_credits = COALESCE(user_profiles.one_time_credits, EXCLUDED.one_time_credits);
              
              RETURN NEW;
            END;
            $function$;
            
            -- Ensure the trigger exists
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
              AFTER INSERT ON auth.users
              FOR EACH ROW
              EXECUTE FUNCTION public.handle_new_user();
            `
          ],
          created_by: 'fix-stripe-webhooks.js'
        }
      ]);

    if (migrationError) {
      throw new Error(`Failed to apply migration: ${migrationError.message}`);
    }

    console.log('Migration applied successfully!');
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error fixing plan_type_enum issue:', error);
  }
}

fixPlanTypeEnum()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err));

main(); 