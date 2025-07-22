import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// List all recordings for the current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const orderBy = searchParams.get("orderBy") || "created_at";
    const orderDir = searchParams.get("orderDir") || "desc";

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: "Limit cannot exceed 100" },
        { status: 400 }
      );
    }

    // Get recordings owned by the user
    const { data: ownedRecordings, error: ownedError } = await supabase
      .from("audio_recordings")
      .select("*")
      .eq("user_id", session.user.id)
      .order(orderBy, { ascending: orderDir === "asc" })
      .range(offset, offset + limit - 1);

    if (ownedError) {
      console.error("Error fetching owned recordings:", ownedError);
      return NextResponse.json(
        { error: "Failed to fetch recordings" },
        { status: 500 }
      );
    }

    // Get recordings shared with the user
    const { data: sharedRecordingsIds, error: sharedError } = await supabase
      .from("shared_recordings")
      .select("recording_id")
      .eq("shared_with", session.user.id);

    if (sharedError) {
      console.error("Error fetching shared recordings IDs:", sharedError);
      return NextResponse.json({ recordings: ownedRecordings });
    }

    // If there are shared recordings, fetch their details
    let sharedRecordings: any[] = [];
    if (sharedRecordingsIds && sharedRecordingsIds.length > 0) {
      const recordingIds = sharedRecordingsIds.map((item: { recording_id: string }) => item.recording_id);
      
      const { data: sharedData, error: sharedDetailsError } = await supabase
        .from("audio_recordings")
        .select("*")
        .in("id", recordingIds);

      if (!sharedDetailsError && sharedData) {
        sharedRecordings = sharedData;
      } else {
        console.error("Error fetching shared recording details:", sharedDetailsError);
      }
    }

    // Combine and sort recordings
    const allRecordings = [...ownedRecordings, ...sharedRecordings]
      .sort((a, b) => {
        const aValue = a[orderBy as keyof typeof a];
        const bValue = b[orderBy as keyof typeof b];
        
        if (orderDir === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

    return NextResponse.json({
      recordings: allRecordings,
      pagination: {
        total: allRecordings.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error listing recordings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new recording
export async function POST(req: NextRequest) {
  try {
    // Create a fresh Supabase client instance
    const supabase = await createServerSupabaseClient();
    
    // Check authentication using getSession which is more reliable for server-side
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
    
    if (!session || !session.user) {
      console.log("No session or user found");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    console.log("User authenticated:", session.user.id.substring(0, 8));

    // Après avoir récupéré le profil utilisateur (userProfile)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to retrieve user profile" },
        { status: 500 }
      );
    }

    if (userProfile.plan_type === 'PRO') {
      const usage = userProfile.monthly_usage || {};
      const limits = userProfile.quota_limits || {};
      const recordingLimit = limits.recordings ?? 20;
      if ((usage.recordings ?? 0) >= recordingLimit) {
        return NextResponse.json({ error: `Monthly listening recordings limit reached for your Pro plan (${recordingLimit}).` }, { status: 403 });
      }
      // Increment recordings counter
      await supabase
        .from('user_profiles')
        .update({ monthly_usage: { ...usage, recordings: (usage.recordings ?? 0) + 1 } })
        .eq('id', userProfile.id);
      // Log formatted quotas
      const logMsg = [
        '=== REMAINING QUOTAS FOR PRO USER ===',
        `User: ${userProfile.email || userProfile.id}`,
        `  Images     : ${(usage.images ?? 0)} / ${(limits.images ?? 30)}`,
        `  Videos     : ${(usage.videos ?? 0)} / ${(limits.videos ?? 20)}`,
        `  Recordings : ${(usage.recordings ?? 0) + 1} / ${recordingLimit}`,
        '====================================='
      ].join('\n');
      console.log(logMsg);
    } else if (userProfile.plan_type === 'FREE_TRIAL') {
      // Handle FREE_TRIAL users - decrement trial_recordings_remaining
      const trialRecordingsRemaining = userProfile.trial_recordings_remaining ?? 5;
      
      if (trialRecordingsRemaining <= 0) {
        return NextResponse.json({ error: `You have used all your free trial recordings (5/5). Please upgrade to Pro to continue.` }, { status: 403 });
      }
      
      // Decrement trial recordings remaining
      const newTrialRecordingsRemaining = trialRecordingsRemaining - 1;
      await supabase
        .from('user_profiles')
        .update({ trial_recordings_remaining: newTrialRecordingsRemaining })
        .eq('id', userProfile.id);
        
      console.log(`[FREE_TRIAL] Recording created for user ${userProfile.email || userProfile.id}. Recordings remaining: ${newTrialRecordingsRemaining}/5`);
    }

    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.file_path) {
      return NextResponse.json(
        { error: "Missing required field: file_path" },
        { status: 400 }
      );
    }

    // Create recording entry
    const recordingData = {
      user_id: session.user.id,
      title: body.title || "New Recording",
      description: body.description || null,
      file_path: body.file_path,
      duration_seconds: body.duration_seconds || null,
      size_bytes: body.size_bytes || null,
      source: body.source || "manual",
      status: "pending"
    };

    console.log("Creating recording with data:", recordingData);

    // Create recording entry
    const { data, error } = await supabase
      .from("audio_recordings")
      .insert(recordingData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating recording:", error);
      return NextResponse.json(
        { error: `Failed to create recording: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Recording created but no data returned" },
        { status: 500 }
      );
    }

    console.log("Recording created successfully:", data.id);

    // Don't automatically trigger processing - let user manually start it
    // This prevents cancelled recordings from being processed
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating recording:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
} 