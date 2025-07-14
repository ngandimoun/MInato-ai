import { createServerSupabaseClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyPolicyFix() {
  try {
    console.log('🔧 Applying game_participants policy fix...')
    
    const supabase = await createServerSupabaseClient()
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', 'fix_game_participants_policy.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      })
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error)
        if (!error.message?.includes('does not exist')) {
          throw error
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('🎉 Policy fix applied successfully!')
    
  } catch (error) {
    console.error('❌ Failed to apply policy fix:', error)
    process.exit(1)
  }
}

applyPolicyFix() 