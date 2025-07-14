const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function fixPolicy() {
  console.log('🔧 Fixing game_participants policy...')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'migrations', 'fix_game_participants_policy.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  // Execute the SQL directly
  const { error } = await supabase.rpc('exec_sql', { 
    sql_query: migrationSQL 
  })
  
  if (error) {
    console.error('❌ Error applying fix:', error)
    process.exit(1)
  }
  
  console.log('✅ Policy fix applied successfully!')
}

fixPolicy() 