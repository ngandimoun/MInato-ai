import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { appConfig } from '../lib/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
  appInfo: {
    name: 'Minato AI Companion',
    version: '2.0.0',
  },
});

async function fixInvalidStripeCustomers() {
  console.log('🔍 Starting to check for invalid Stripe customers...');

  try {
    // Get all users with stripe_customer_id
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, stripe_customer_id')
      .not('stripe_customer_id', 'is', null);

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log(`📊 Found ${users.length} users with stripe_customer_id`);

    let validCustomers = 0;
    let invalidCustomers = 0;
    let errors = 0;

    for (const user of users) {
      try {
        console.log(`🔍 Checking customer ${user.stripe_customer_id} for user ${user.email}...`);
        
        // Try to retrieve the customer from Stripe
        await stripe.customers.retrieve(user.stripe_customer_id!);
        
        console.log(`✅ Customer ${user.stripe_customer_id} is valid`);
        validCustomers++;
        
      } catch (error: any) {
        if (error.code === 'resource_missing') {
          console.log(`❌ Customer ${user.stripe_customer_id} not found in Stripe, clearing from database...`);
          
          // Clear the invalid customer ID
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ stripe_customer_id: null })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`❌ Error clearing customer ID for user ${user.email}:`, updateError);
            errors++;
          } else {
            console.log(`✅ Cleared invalid customer ID for user ${user.email}`);
            invalidCustomers++;
          }
        } else {
          console.error(`❌ Error checking customer ${user.stripe_customer_id}:`, error.message);
          errors++;
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Valid customers: ${validCustomers}`);
    console.log(`❌ Invalid customers cleared: ${invalidCustomers}`);
    console.log(`⚠️  Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixInvalidStripeCustomers()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 