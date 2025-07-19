#!/usr/bin/env node

/**
 * Script to apply the price update migration
 * Changes the subscription price from $25 to $1
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Update constants.ts file
function updateConstantsFile() {
  try {
    console.log('📝 Updating constants.ts file...');
    
    const constantsPath = path.join(__dirname, '..', 'lib', 'constants.ts');
    let constantsContent = fs.readFileSync(constantsPath, 'utf8');
    
    // Replace the price values
    constantsContent = constantsContent.replace(/MINATO_PRO_PRICE_CENTS: \d+/g, 'MINATO_PRO_PRICE_CENTS: 100');
    constantsContent = constantsContent.replace(/MINATO_PRO_PRICE_DISPLAY: '\$\d+\.\d+'/g, "MINATO_PRO_PRICE_DISPLAY: '$1.00'");
    
    // Write the updated file
    fs.writeFileSync(constantsPath, constantsContent);
    
    console.log('✅ constants.ts updated successfully!');
    console.log('🎉 Price update complete! The subscription price is now $1.00.');
    
    console.log('\n📋 Next steps:');
    console.log('1. Run the Supabase migration using the MCP tools');
    console.log('2. Restart the application to apply the changes');
    console.log('3. Test the checkout flow to ensure the new price is applied');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Execute the update
updateConstantsFile(); 