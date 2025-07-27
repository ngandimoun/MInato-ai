import { createClient } from '@supabase/supabase-js';
import fs from "fs";
import path from "path";

// This script applies the evasion video transcript migration to your remote Supabase database
// Make sure you have these environment variables set:
// NEXT_PUBLIC_SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY

async function applyEvasionVideoTranscriptMigration() {
  try {
    console.log("🚀 Starting Evasion Video Transcript Migration...");
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing environment variables:");
      console.error("   - NEXT_PUBLIC_SUPABASE_URL");
      console.error("   - SUPABASE_SERVICE_ROLE_KEY");
      console.error("Please set these in your .env file");
      process.exit(1);
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), "migrations", "add_evasion_video_transcripts.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    
    console.log("📖 Migration SQL loaded successfully");
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error);
        console.error("SQL:", statement);
        throw error;
      }
      
      console.log(`✅ Statement ${i + 1} completed`);
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