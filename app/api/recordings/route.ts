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

    // ✅ VÉRIFICATION AUTOMATIQUE: Contrôler l'expiration Pro avant de traiter la requête
    const { checkQuota, incrementMonthlyUsage, checkAndHandleProExpiration } = await import('@/lib/middleware/subscription-guards');
    const { expired, updated } = await checkAndHandleProExpiration(session.user.id);
    
    if (expired) {
      console.warn(`User attempted to access recordings with expired Pro subscription: ${session.user.id.substring(0, 8)}`);
      return NextResponse.json({ 
        error: 'Subscription expired',
        code: 'subscription_expired',
        message: 'Your Pro subscription has expired. Please renew to continue accessing premium features.'
      }, { status: 403 });
    }

    // Vérifier les quotas d'enregistrement
    const quotaCheck = await checkQuota(req, 'recordings');
    
    if (!quotaCheck.success) {
      console.warn(`Quota exceeded for recordings: ${quotaCheck.response?.status}`);
      return quotaCheck.response!;
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

    // Incrémenter l'utilisation mensuelle après création réussie
    await incrementMonthlyUsage(session.user.id, 'recordings');

    console.log("Recording created successfully:", data);
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error creating recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 