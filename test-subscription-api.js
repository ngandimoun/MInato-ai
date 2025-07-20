const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auzkjkliwlycclkpjlbl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

async function testSubscriptionStatus() {
  console.log('=== Test Subscription Status ===');
  
  // Test avec un utilisateur PRO
  const proUserId = 'dd111baf-c8d5-42b6-89ae-7d3bc2c99d70';
  console.log(`\nTesting PRO user: ${proUserId}`);
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: proUserId });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const status = data[0];
      console.log('PRO User Status:', {
        plan_type: status.plan_type,
        is_active: status.is_active,
        is_trial: status.is_trial,
        is_pro: status.is_pro,
        is_expired: status.is_expired,
        days_remaining: status.days_remaining,
        trial_end_date: status.trial_end_date,
        subscription_end_date: status.subscription_end_date
      });
    }
  } catch (error) {
    console.error('Error testing PRO user:', error);
  }
  
  // Test avec un utilisateur en essai gratuit
  const trialUserId = 'bacc6ae6-5e48-4395-9987-b64b4249c3c6';
  console.log(`\nTesting TRIAL user: ${trialUserId}`);
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: trialUserId });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const status = data[0];
      console.log('TRIAL User Status:', {
        plan_type: status.plan_type,
        is_active: status.is_active,
        is_trial: status.is_trial,
        is_pro: status.is_pro,
        is_expired: status.is_expired,
        days_remaining: status.days_remaining,
        trial_end_date: status.trial_end_date,
        subscription_end_date: status.subscription_end_date
      });
    }
  } catch (error) {
    console.error('Error testing TRIAL user:', error);
  }
}

// Exécuter le test
testSubscriptionStatus().catch(console.error); 