import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const domain = searchParams.get("domain");
    const status = searchParams.get("status");
    
    // Build query
    let query = supabase
      .from("living_dossiers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    // Apply filters if provided
    if (domain) {
      query = query.eq("domain", domain);
    }
    
    if (status) {
      query = query.eq("status", status);
    }
    
    // Execute query
    const { data: dossiers, error, count } = await query;
    
    if (error) {
      console.error("Error fetching dossiers:", error);
      return NextResponse.json(
        { error: "Failed to fetch dossiers" },
        { status: 500 }
      );
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("living_dossiers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    return NextResponse.json({
      dossiers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error("Error in dossier list API:", error);
    return NextResponse.json(
      { error: "Failed to fetch dossiers" },
      { status: 500 }
    );
  }
} 