import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function syncTemplateImagesToProducts() {
  try {
    console.log('🔄 Starting template image sync to product catalog...');

    // Authenticate as admin
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'password123'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      process.exit(1);
    }

    console.log(`📝 Authenticated as: ${authData.user.email}`);

    // Get product catalog entries that are missing images but have templates with images
    const { data: catalogEntries, error: catalogError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        image_url,
        store_id,
        recipe_id,
        recipes!inner(
          template_id,
          recipe_templates!inner(
            id,
            name,
            image_url
          )
        )
      `)
      .is('image_url', null);

    if (catalogError) {
      console.error('❌ Error fetching catalog entries:', catalogError);
      process.exit(1);
    }

    console.log(`📋 Found ${catalogEntries.length} catalog entries without images`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const entry of catalogEntries) {
      const recipe = entry.recipes as any;
      const template = recipe?.recipe_templates;
      
      if (template?.image_url) {
        try {
          const { error: updateError } = await supabase
            .from('product_catalog')
            .update({
              image_url: template.image_url
            })
            .eq('id', entry.id);

          if (updateError) {
            console.error(`  ❌ Error updating "${entry.product_name}":`, updateError);
          } else {
            updatedCount++;
            console.log(`  ✅ Updated "${entry.product_name}" with image from template`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing "${entry.product_name}":`, error);
        }
      } else {
        skippedCount++;
        console.log(`  ⏭️  Skipped "${entry.product_name}" - template has no image`);
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`✅ Product catalog entries updated: ${updatedCount}`);
    console.log(`⏭️  Entries skipped (no template image): ${skippedCount}`);
    console.log(`🎉 Image sync completed successfully!`);

  } catch (error) {
    console.error('❌ Fatal error during image sync:', error);
    process.exit(1);
  }
}

// Run the sync
syncTemplateImagesToProducts()
  .then(() => {
    console.log('\n✨ Image sync process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Image sync process failed:', error);
    process.exit(1);
  });