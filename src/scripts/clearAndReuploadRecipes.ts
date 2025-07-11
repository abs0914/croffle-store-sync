import { supabase } from "@/integrations/supabase/client";

async function clearExistingData() {
  console.log('🧹 Clearing existing incomplete recipe data...');
  
  try {
    // Delete existing recipe template ingredients first (foreign key constraint)
    const { error: ingredientsError } = await supabase
      .from('recipe_template_ingredients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (ingredientsError) {
      console.error('❌ Error deleting recipe template ingredients:', ingredientsError);
      return false;
    }

    // Delete existing recipe templates
    const { error: templatesError } = await supabase
      .from('recipe_templates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (templatesError) {
      console.error('❌ Error deleting recipe templates:', templatesError);
      return false;
    }

    console.log('✅ Successfully cleared existing data');
    return true;
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return false;
  }
}

async function clearAndReupload() {
  try {
    console.log('🚀 Starting clear and re-upload process...');

    // Authenticate first
    console.log('🔐 Authenticating with admin account...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'password123'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      process.exit(1);
    }

    console.log(`📝 Authenticated as: ${authData.user?.email}`);

    // Clear existing data
    const cleared = await clearExistingData();
    if (!cleared) {
      console.error('❌ Failed to clear existing data');
      process.exit(1);
    }

    console.log('🔄 Now running the updated upload script...');
    console.log('💡 Please run: npx tsx src/scripts/uploadAllRecipes.ts');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the clear process
clearAndReupload()
  .then(() => {
    console.log('\n✨ Clear process completed! Now run the upload script.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Clear process failed:', error);
    process.exit(1);
  });