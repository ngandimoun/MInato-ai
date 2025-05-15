// Utility to view memories stored in Supabase
// Run with: node view-memories.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Supabase URL or service key not found in .env file');
  console.log('Make sure you have these variables in your .env file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function viewMemories() {
  try {
    console.log('Connecting to Supabase...');
    
    // Get the user ID from command line or use default
    const userId = process.argv[2] || 'dd111baf-c8d5-42b6-89ae-7d3bc2c99d70';
    console.log(`Fetching memories for user: ${userId}`);
    
    // Fetch memories from Supabase
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No memories found for this user.');
      return;
    }
    
    console.log(`Found ${data.length} memories:`);
    data.forEach((memory, index) => {
      console.log(`\n--- Memory ${index + 1} ---`);
      console.log(`ID: ${memory.memory_id}`);
      console.log(`Content: ${memory.content}`);
      console.log(`Created: ${new Date(memory.created_at).toLocaleString()}`);
      console.log(`Categories: ${memory.categories ? JSON.stringify(memory.categories) : 'None'}`);
      
      // Don't print the full embedding vector as it's too large
      if (memory.embedding) {
        console.log(`Embedding: [${memory.embedding.length} dimensions]`);
      } else {
        console.log('Embedding: None');
      }
      
      if (memory.metadata) {
        console.log('Metadata:', JSON.stringify(memory.metadata, null, 2));
      }
    });
    
    console.log('\nMemory retrieval complete!');
  } catch (error) {
    console.error('Error retrieving memories:', error);
  }
}

viewMemories().catch(console.error); 