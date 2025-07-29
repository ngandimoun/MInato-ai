import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateStreamingPlatformsPreferences() {
  console.log('🔄 Starting migration: updating streaming_platforms to streaming_content...');

  try {
    // Update user_states table where workflow_preferences contains streaming_platforms
    const { data: userStates, error: userStatesError } = await supabase
      .from('user_states')
      .select('id, user_id, workflow_preferences')
      .textSearch('workflow_preferences', 'streaming_platforms');

    if (userStatesError) {
      console.error('❌ Error fetching user states:', userStatesError);
      return;
    }

    console.log(`📊 Found ${userStates?.length || 0} user states with streaming_platforms`);

    let updatedCount = 0;
    for (const userState of userStates || []) {
      if (userState.workflow_preferences) {
        const preferences = userState.workflow_preferences;
        
        // Check if gamePreferences exists and has topic_focus
        if (preferences.gamePreferences?.topic_focus === 'streaming_platforms') {
          // Update the topic_focus
          preferences.gamePreferences.topic_focus = 'streaming_content';
          
          // Update the database
          const { error: updateError } = await supabase
            .from('user_states')
            .update({ workflow_preferences: preferences })
            .eq('id', userState.id);

          if (updateError) {
            console.error(`❌ Error updating user ${userState.user_id}:`, updateError);
          } else {
            console.log(`✅ Updated user ${userState.user_id}`);
            updatedCount++;
          }
        }
      }
    }

    console.log(`🎉 Migration completed! Updated ${updatedCount} user preferences.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
updateStreamingPlatformsPreferences()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }); 