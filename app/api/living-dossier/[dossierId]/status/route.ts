import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { dossierId: string } }
) {
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
    
    const { dossierId } = params;
    
    // Fetch only the status-related fields
    const { data: dossier, error } = await supabase
      .from("living_dossiers")
      .select("id, status, progress, error, updated_at")
      .eq("id", dossierId)
      .single();
    
    if (error) {
      console.error("Error fetching dossier status:", error);
      return NextResponse.json(
        { error: "Failed to fetch dossier status" },
        { status: 500 }
      );
    }
    
    if (!dossier) {
      return NextResponse.json(
        { error: "Dossier not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(dossier);
    
  } catch (error) {
    console.error("Error in dossier status API:", error);
    return NextResponse.json(
      { error: "Failed to fetch dossier status" },
      { status: 500 }
    );
  }
} 