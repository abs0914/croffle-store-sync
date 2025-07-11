/**
 * Console script to run bulk recipe upload
 * 
 * To use this script:
 * 1. Open the browser console (F12)
 * 2. Navigate to any page in the admin panel
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to execute
 * 
 * The script will automatically import and run the bulk upload function.
 */

// Import the bulk upload function
import bulkUploadCroffleRecipes from './bulkUploadCroffleRecipes';

// Function to run the bulk upload with console logging
async function runBulkUploadFromConsole() {
  console.log('🚀 Starting bulk recipe upload from console...');
  console.log('📋 This will upload 15 classic croffle recipes with all ingredients');
  
  try {
    await bulkUploadCroffleRecipes();
    console.log('✅ Bulk upload completed successfully!');
    console.log('🔄 You can now check the Recipe Templates page to see the uploaded recipes');
  } catch (error) {
    console.error('❌ Bulk upload failed:', error);
    console.log('💡 Try refreshing the page and running the script again');
  }
}

// Make the function available globally for console use
(window as any).runBulkUpload = runBulkUploadFromConsole;

// Auto-run if this script is imported directly
if (typeof window !== 'undefined') {
  console.log('🔧 Bulk upload script loaded!');
  console.log('📝 Run: runBulkUpload() to start the upload process');
}

export default runBulkUploadFromConsole;
