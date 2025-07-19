import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

if (!stripeSecretKey) {
  console.error('❌ Missing Stripe secret key in .env.local');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-06-30.basil',
});

async function main() {
  console.log('🔍 Starting payment issues diagnosis...');
  
  // 1. Check for users with payment issues
  const userEmail = 'renemakoule@gmail.com';
  
  console.log(`\n📧 Looking up user: ${userEmail}`);
  
  // Find user in Supabase
  const { data: userData, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, plan_type, stripe_customer_id, subscription_end_date')
    .eq('email', userEmail)
    .single();
  
  if (userError) {
    console.error(`❌ Error finding user: ${userError.message}`);
    process.exit(1);
  }
  
  if (!userData) {
    console.error(`❌ User not found: ${userEmail}`);
    process.exit(1);
  }
  
  console.log(`✅ Found user: ${userData.id} (${userData.email})`);
  console.log(`   Plan type: ${userData.plan_type}`);
  console.log(`   Stripe customer ID: ${userData.stripe_customer_id || 'None'}`);
  console.log(`   Subscription end date: ${userData.subscription_end_date || 'None'}`);
  
  // 2. Check for incomplete payment intents in Stripe
  console.log('\n🔍 Looking for incomplete payment intents in Stripe...');
  
  let stripeCustomerId = userData.stripe_customer_id;
  
  // If no Stripe customer ID, create one
  if (!stripeCustomerId) {
    console.log('   Creating new Stripe customer...');
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        minato_user_id: userData.id
      }
    });
    stripeCustomerId = customer.id;
    
    // Update user with new Stripe customer ID
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userData.id);
    
    console.log(`✅ Created new Stripe customer: ${stripeCustomerId}`);
  }
  
  // Find incomplete payment intents
  const paymentIntents = await stripe.paymentIntents.list({
    customer: stripeCustomerId,
    limit: 10
  });
  
  console.log(`\n📋 Found ${paymentIntents.data.length} payment intents:`);
  
  paymentIntents.data.forEach((pi, index) => {
    console.log(`\n🧾 Payment Intent ${index + 1}:`);
    console.log(`   ID: ${pi.id}`);
    console.log(`   Status: ${pi.status}`);
    console.log(`   Amount: $${(pi.amount / 100).toFixed(2)} ${pi.currency.toUpperCase()}`);
    console.log(`   Created: ${new Date(pi.created * 1000).toISOString()}`);
    console.log(`   Metadata:`, pi.metadata);
  });
  
  // 3. Cancel any incomplete payment intents
  const incompleteIntents = paymentIntents.data.filter(pi => 
    ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(pi.status)
  );
  
  if (incompleteIntents.length > 0) {
    console.log(`\n⚠️ Found ${incompleteIntents.length} incomplete payment intents. Canceling...`);
    
    for (const intent of incompleteIntents) {
      try {
        await stripe.paymentIntents.cancel(intent.id);
        console.log(`✅ Canceled payment intent: ${intent.id}`);
      } catch (error: any) {
        console.error(`❌ Error canceling payment intent ${intent.id}: ${error.message}`);
      }
    }
  } else {
    console.log('\n✅ No incomplete payment intents to cancel');
  }
  
  // 4. Create a new checkout session for the user
  console.log('\n🔄 Would you like to create a new checkout session for this user? (y/n)');
  console.log('   Run this command to create a new session:');
  console.log(`   
  curl -X POST http://localhost:3000/api/subscription/create-checkout-session \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <user_token>" \\
  -d '{"email": "${userEmail}", "annualBilling": false}'
  `);
  
  console.log('\n✅ Done! Payment issues diagnosed and fixed.');
}

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 