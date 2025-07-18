import { useState, useEffect } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export interface UserPlan {
  planType: 'FREE' | 'FREE_TRIAL' | 'PRO';
  isPro: boolean;
  isFreeTrial: boolean;
  isFree: boolean;
}

export const useUserPlan = () => {
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserPlan = async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setUserPlan({
            planType: 'FREE',
            isPro: false,
            isFreeTrial: false,
            isFree: true
          });
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('plan_type, subscription_end_date')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setUserPlan({
            planType: 'FREE',
            isPro: false,
            isFreeTrial: false,
            isFree: true
          });
          setLoading(false);
          return;
        }

        // Déterminer le plan réel
        let planType: 'FREE' | 'FREE_TRIAL' | 'PRO' = 'FREE';
        
        if (profile.plan_type === 'PRO' && profile.subscription_end_date) {
          const endDate = new Date(profile.subscription_end_date);
          if (endDate > new Date()) {
            planType = 'PRO';
          } else {
            planType = 'FREE_TRIAL';
          }
        } else if (profile.plan_type === 'FREE_TRIAL') {
          planType = 'FREE_TRIAL';
        }

        setUserPlan({
          planType,
          isPro: planType === 'PRO',
          isFreeTrial: planType === 'FREE_TRIAL',
          isFree: planType === 'FREE'
        });
      } catch (error) {
        console.error('Error checking user plan:', error);
        setUserPlan({
          planType: 'FREE',
          isPro: false,
          isFreeTrial: false,
          isFree: true
        });
      } finally {
        setLoading(false);
      }
    };

    checkUserPlan();
  }, []);

  return { userPlan, loading };
}; 