import { createServerSupabaseClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

async function applyEvasionVideoTranscriptMigration() {
  try {
    console.log("🚀 Starting Evasion Video Transcript Migration...");
    
    const supabase = await createServerSupabaseClient();
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), "migrations", "add_evasion_video_transcripts.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    
    console.log("📖 Migration SQL loaded successfully");
    
    // Apply the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });
    
    if (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
    
    console.log("✅ Evasion Video Transcript Migration completed successfully!");
    console.log("📋 What was added:");
    console.log("   - evasion_video_transcripts table");
    console.log("   - RLS policies for transcript access");
    console.log("   - Indexes for performance");
    console.log("   - Triggers for updated_at timestamps");
    
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
applyEvasionVideoTranscriptMigration(); 