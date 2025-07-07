import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError }, { status: 401 });
    }

    logger.info('[Debug User Images] Fetching images for user', { userId: user.id });

    // Query the generated_images table
    const { data: images, error: dbError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (dbError) {
      logger.error('[Debug User Images] Database error', { dbError });
      return NextResponse.json({ error: 'Database error', dbError }, { status: 500 });
    }

    const response = {
      userId: user.id,
      count: images?.length || 0,
      images: images?.map((img: any) => ({
        id: img.id,
        image_url: img.image_url,
        prompt: img.prompt,
        status: img.status,
        created_at: img.created_at,
        user_id: img.user_id
      })) || []
    };

    logger.info('[Debug User Images] Query successful', response);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Debug User Images] Unexpected error', { error });
    return NextResponse.json({ error: 'Unexpected error', details: error }, { status: 500 });
  }
} 