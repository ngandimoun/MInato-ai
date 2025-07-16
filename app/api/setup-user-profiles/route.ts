import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    // Get the current user to verify they're authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create the user_profiles table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT,
          full_name TEXT,
          first_name TEXT,
          avatar_url TEXT,
          stripe_account_id TEXT,
          stripe_onboarding_complete BOOLEAN DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;

    const { error: tableError } = await supabase.rpc('exec', { sql: createTableSQL });
    
    if (tableError) {
      console.error('Error creating user_profiles table:', tableError);
      return NextResponse.json(
        { error: 'Failed to create user_profiles table' },
        { status: 500 }
      );
    }

    // Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_account_id ON public.user_profiles(stripe_account_id);
    `;

    const { error: indexError } = await supabase.rpc('exec', { sql: createIndexesSQL });
    
    if (indexError) {
      console.warn('Error creating indexes:', indexError);
    }

    // Enable RLS
    const rlsSQL = `
      ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
      CREATE POLICY "Users can view their own profile" ON public.user_profiles
          FOR SELECT USING (auth.uid() = id);

      DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
      CREATE POLICY "Users can insert their own profile" ON public.user_profiles
          FOR INSERT WITH CHECK (auth.uid() = id);

      DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
      CREATE POLICY "Users can update their own profile" ON public.user_profiles
          FOR UPDATE USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);

      DROP POLICY IF EXISTS "Service role full access to user_profiles" ON public.user_profiles;
      CREATE POLICY "Service role full access to user_profiles" ON public.user_profiles
          FOR ALL TO service_role USING (true) WITH CHECK (true);
    `;

    const { error: rlsError } = await supabase.rpc('exec', { sql: rlsSQL });
    
    if (rlsError) {
      console.warn('Error setting up RLS:', rlsError);
    }

    // Create user profile for current user if it doesn't exist
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser.user) {
      const { error: insertError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authUser.user.id,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || null,
          first_name: authUser.user.user_metadata?.first_name || authUser.user.email?.split('@')[0] || null,
          avatar_url: authUser.user.user_metadata?.avatar_url || null,
        }, { onConflict: 'id' });

      if (insertError) {
        console.warn('Error creating user profile:', insertError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User profiles table created successfully'
    });

  } catch (error) {
    console.error('Error in setup-user-profiles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 