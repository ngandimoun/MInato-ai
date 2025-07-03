import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('🔄 User search API called');
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('👤 Auth check:', { 
      hasUser: !!user, 
      userId: user?.id?.substring(0, 8), 
      userEmail: user?.email,
      error: userError?.message 
    });
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized', details: userError?.message },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Add a test mode to bypass the complex logic
    const testMode = searchParams.get('test') === 'true';
    
    if (testMode) {
      // Simple test query without complex logic
      const result = await supabase
        .from('user_profiles')
        .select('id, full_name, first_name, email, avatar_url')
        .limit(10);
      
      console.log('Test mode result:', result);
      
      const formattedUsers = result.data?.map((user: any) => ({
        id: user.id,
        name: user.full_name || user.first_name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        avatar_url: user.avatar_url,
        display_name: user.full_name || user.first_name || user.email?.split('@')[0] || 'Anonymous'
      })) || [];

      return NextResponse.json({
        users: formattedUsers,
        total: formattedUsers.length,
        test: true
      });
    }

    let users;
    let error;

    if (!query || query.trim().length === 0) {
      // Return all users if no query
      console.log('📋 Fetching all users, excluding current user:', user.id);

      const result = await supabase
        .from('user_profiles')
        .select('id, full_name, first_name, email, avatar_url')
        .neq('id', user.id) // Exclude current user
        .order('full_name', { ascending: true, nullsLast: true })
        .limit(limit);
      
      console.log('📊 Query result:', { 
        dataCount: result.data?.length || 0, 
        error: result.error?.message,
        firstUser: result.data?.[0] ? {
          id: result.data[0].id.substring(0, 8),
          name: result.data[0].full_name,
          email: result.data[0].email
        } : null
      });
      
      // If no users found in user_profiles, try to backfill from auth.users
      if (!result.error && (!result.data || result.data.length === 0)) {
        // Get users from auth.users and create profiles
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authUsers.users && authUsers.users.length > 0) {
          // Create user profiles for auth users
          const profilesToInsert = authUsers.users
            .filter((authUser: any) => authUser.id !== user.id)
            .map((authUser: any) => ({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || null,
              first_name: authUser.user_metadata?.first_name || 
                         authUser.user_metadata?.full_name?.split(' ')[0] || 
                         authUser.email?.split('@')[0] || 'User',
              avatar_url: authUser.user_metadata?.avatar_url || null
            }));
          
          if (profilesToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('user_profiles')
              .upsert(profilesToInsert, { onConflict: 'id' });
            
            if (!insertError) {
              // Re-fetch after inserting
              const refetchResult = await supabase
                .from('user_profiles')
                .select('id, full_name, first_name, email, avatar_url')
                .neq('id', user.id)
                .order('full_name', { ascending: true, nullsLast: true })
                .limit(limit);
              
              users = refetchResult.data;
              error = refetchResult.error;
            }
          }
        }
      } else {
        users = result.data;
        error = result.error;
      }
    } else if (query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    } else {
      // Search users by name or email (excluding current user)
      const result = await supabase
        .from('user_profiles')
        .select('id, full_name, first_name, email, avatar_url')
        .neq('id', user.id) // Exclude current user
        .or(`full_name.ilike.%${query}%,first_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('full_name', { ascending: true, nullsLast: true })
        .limit(limit);
      
      users = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json(
        { error: 'Failed to search users', details: error },
        { status: 500 }
      );
    }

    // Format the response
    const formattedUsers = users?.map((user: any) => ({
      id: user.id,
      name: user.full_name || user.first_name || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      avatar_url: user.avatar_url,
      display_name: user.full_name || user.first_name || user.email?.split('@')[0] || 'Anonymous'
    })) || [];

    console.log('✅ Formatted users:', { 
      count: formattedUsers.length,
      users: formattedUsers.map((u: any) => ({ 
        id: u.id.substring(0, 8), 
        name: u.name, 
        email: u.email 
      }))
    });

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (error) {
    console.error('Error in user search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 