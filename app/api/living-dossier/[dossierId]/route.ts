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
    
    // Fetch the dossier
    const { data: dossier, error } = await supabase
      .from("living_dossiers")
      .select("*")
      .eq("id", dossierId)
      .single();
    
    if (error) {
      console.error("Error fetching dossier:", error);
      return NextResponse.json(
        { error: "Failed to fetch dossier" },
        { status: 500 }
      );
    }
    
    if (!dossier) {
      return NextResponse.json(
        { error: "Dossier not found" },
        { status: 404 }
      );
    }
    
    // Check if user has access to the dossier
    if (dossier.user_id !== user.id && !(dossier.collaborators || []).includes(user.id)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }
    
    // Fetch annotations if any
    const { data: annotations } = await supabase
      .from("dossier_annotations")
      .select("*")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: false });
    
    // Fetch knowledge items if any
    const { data: knowledgeItems } = await supabase
      .from("dossier_knowledge_items")
      .select("*")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: false });
    
    // Return the dossier with annotations and knowledge items
    return NextResponse.json({
      ...dossier,
      annotations: annotations || [],
      knowledgeItems: knowledgeItems || []
    });
    
  } catch (error) {
    console.error("Error in dossier fetch API:", error);
    return NextResponse.json(
      { error: "Failed to fetch dossier" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const updateData = await request.json();
    
    // Check if the dossier exists and user has access
    const { data: existingDossier, error: fetchError } = await supabase
      .from("living_dossiers")
      .select("user_id, collaborators")
      .eq("id", dossierId)
      .single();
    
    if (fetchError || !existingDossier) {
      return NextResponse.json(
        { error: "Dossier not found" },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update
    if (existingDossier.user_id !== user.id) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }
    
    // Remove protected fields
    const {
      id,
      user_id,
      created_at,
      status,
      progress,
      ...allowedUpdates
    } = updateData;
    
    // Update the dossier
    const { data: updatedDossier, error: updateError } = await supabase
      .from("living_dossiers")
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq("id", dossierId)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating dossier:", updateError);
      return NextResponse.json(
        { error: "Failed to update dossier" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedDossier);
    
  } catch (error) {
    console.error("Error in dossier update API:", error);
    return NextResponse.json(
      { error: "Failed to update dossier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    // Check if the dossier exists and user has access
    const { data: existingDossier, error: fetchError } = await supabase
      .from("living_dossiers")
      .select("user_id")
      .eq("id", dossierId)
      .single();
    
    if (fetchError || !existingDossier) {
      return NextResponse.json(
        { error: "Dossier not found" },
        { status: 404 }
      );
    }
    
    // Check if user has permission to delete
    if (existingDossier.user_id !== user.id) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }
    
    // Delete the dossier
    const { error: deleteError } = await supabase
      .from("living_dossier")
      .delete()
      .eq("id", dossierId);
    
    if (deleteError) {
      console.error("Error deleting dossier:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete dossier" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error in dossier delete API:", error);
    return NextResponse.json(
      { error: "Failed to delete dossier" },
      { status: 500 }
    );
  }
} 