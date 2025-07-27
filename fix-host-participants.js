// Script to fix existing rooms by adding hosts as participants
// This ensures hosts can always enter their rooms

const fixHostParticipants = async () => {
  console.log('🔧 Fixing host participants for existing rooms...\n');

  try {
    // Get all rooms
    const response = await fetch('/api/evasion/rooms');
    const data = await response.json();
    
    if (!data.rooms || data.rooms.length === 0) {
      console.log('No rooms found to fix.');
      return;
    }

    console.log(`📊 Found ${data.rooms.length} rooms to check`);

    // Find rooms where user is host but not participant
    const roomsToFix = data.rooms.filter(room => 
      room.user_permissions?.is_host && !room.user_permissions?.is_participant
    );

    console.log(`🔧 Found ${roomsToFix.length} rooms where host is not participant`);

    if (roomsToFix.length === 0) {
      console.log('✅ All hosts are already participants in their rooms!');
      return;
    }

    // Add host as participant for each room
    for (const room of roomsToFix) {
      console.log(`🔧 Adding host as participant to room: ${room.name} (${room.room_code})`);
      
      try {
        const joinResponse = await fetch(`/api/evasion/rooms/${room.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (joinResponse.ok) {
          console.log(`✅ Successfully added host to room: ${room.name}`);
        } else {
          const errorData = await joinResponse.json();
          console.error(`❌ Failed to add host to room ${room.name}:`, errorData.error);
        }
      } catch (error) {
        console.error(`❌ Error adding host to room ${room.name}:`, error.message);
      }
    }

    console.log('\n🎯 Fix Summary:');
    console.log(`✅ Processed ${roomsToFix.length} rooms`);
    console.log('✅ Hosts should now be able to enter all their rooms');
    
    console.log('\n🔄 Refreshing room list...');
    // Refresh the page to show updated permissions
    window.location.reload();

  } catch (error) {
    console.error('❌ Error fixing host participants:', error.message);
  }
};

// Run the fix if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  fixHostParticipants();
} else {
  // Node.js environment
  console.log('This script should be run in the browser environment');
} 