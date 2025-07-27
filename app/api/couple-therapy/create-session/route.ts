import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateInvitationCode } from '@/lib/utils/couple-therapy';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      language = 'en', 
      ai_personality = 'empathetic',
      therapy_approach = 'couple-focused',
      settings = {}
    } = body;

    // Get the couple therapy category
    const { data: categoryData, error: categoryError } = await supabase
      .from('therapy_categories')
      .select('id')
      .eq('name', 'Couple Therapy')
      .single();

    if (categoryError || !categoryData) {
      return NextResponse.json({ error: 'Couple therapy category not found' }, { status: 404 });
    }

    // Generate invitation code
    const invitationCode = generateInvitationCode();
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // Expires in 7 days

    // Create the couple therapy session
    const { data: session, error: sessionError } = await supabase
      .from('couple_therapy_sessions')
      .insert({
        creator_id: user.id,
        category_id: categoryData.id,
        title: title || 'Couple Therapy Session',
        language,
        ai_personality,
        therapy_approach,
        settings: {
          voice_enabled: true,
          auto_save: true,
          background_sounds: false,
          session_reminders: true,
          partner_notifications: true,
          ...settings
        },
        invitation_code: invitationCode,
        invitation_expires_at: invitationExpiresAt.toISOString(),
        status: 'waiting_for_partner'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating couple therapy session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({
      session,
      invitation_code: invitationCode,
      message: 'Couple therapy session created successfully. Share the invitation code with your partner.'
    });

  } catch (error) {
    console.error('Error in create couple therapy session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 