import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAILeadsMigration() {
  try {
    console.log('🚀 Starting AI Leads migration...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations/add_ai_leads_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement || statement.trim() === '') continue;

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Check if it's a benign error (like "already exists")
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate key') ||
              error.message?.includes('relation') && error.message?.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1}: ${error.message} (continuing...)`);
            successCount++;
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1}: Success`);
          successCount++;
        }
      } catch (execError: any) {
        console.error(`❌ Statement ${i + 1} execution error:`, execError.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📝 Total: ${statements.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 AI Leads migration completed successfully!');
    } else {
      console.log('\n⚠️  AI Leads migration completed with some errors.');
    }

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = ['ai_lead_searches', 'ai_lead_results', 'ai_lead_messages', 'ai_lead_prompts'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Ready`);
        }
      } catch (error: any) {
        console.log(`❌ Table ${table}: ${error.message}`);
      }
    }

    console.log('\n🚀 AI Leads migration process completed!');

  } catch (error: any) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyAILeadsMigration(); 