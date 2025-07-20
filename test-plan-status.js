const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabase = createClient(
  'https://auzkjkliwlycclkpjlbl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

async function testPlanStatus() {
  console.log('=== Test Plan Status ===');
  
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
      console.log('=== USER PLAN TYPE ===');
      console.log(`User ID: ${proUserId}`);
      console.log(`Plan Type: ${status.plan_type}`);
      console.log(`Status: ${status.is_active ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`Days Remaining: ${status.days_remaining}`);
      console.log('========================');
      
      if (status.is_pro) {
        console.log('✅ User is on PRO PLAN');
      } else if (status.is_trial) {
        console.log('🆓 User is on FREE TRIAL');
      } else if (status.is_expired) {
        console.log('❌ User subscription is EXPIRED');
      }
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
      console.log('=== USER PLAN TYPE ===');
      console.log(`User ID: ${trialUserId}`);
      console.log(`Plan Type: ${status.plan_type}`);
      console.log(`Status: ${status.is_active ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`Days Remaining: ${status.days_remaining}`);
      console.log('========================');
      
      if (status.is_pro) {
        console.log('✅ User is on PRO PLAN');
      } else if (status.is_trial) {
        console.log('🆓 User is on FREE TRIAL');
      } else if (status.is_expired) {
        console.log('❌ User subscription is EXPIRED');
      }
    }
  } catch (error) {
    console.error('Error testing TRIAL user:', error);
  }
}

// Exécuter le test
testPlanStatus().catch(console.error); 