import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
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
    
    // Parse the request body
    const { query, domain } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }
    
    // Generate a unique ID for the dossier
    const dossierId = uuidv4();
    
    // If domain is not provided, use a default
    const detectedDomain = domain || "general";
    
    // Insert initial dossier record
    await supabase
      .from("living_dossiers")
      .insert({
        id: dossierId,
        user_id: user.id,
        query,
        domain: detectedDomain,
        status: "pending",
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    // For now, we'll just return the dossier ID and let a separate process handle generation
    return NextResponse.json({ 
      dossierId,
      status: "pending", 
      message: "Dossier generation started",
      domain: detectedDomain
    });
    
  } catch (error) {
    console.error("Error starting dossier generation:", error);
    return NextResponse.json(
      { error: "Failed to start dossier generation" },
      { status: 500 }
    );
  }
} 