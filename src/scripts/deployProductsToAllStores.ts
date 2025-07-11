import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function deployProductsToAllStores() {
  try {
    console.log('🚀 Starting deployment of products to all stores...');

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

    // Get all stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true);

    if (storesError) {
      console.error('❌ Error fetching stores:', storesError);
      process.exit(1);
    }

    console.log(`📍 Found ${stores.length} active stores`);

    // Get all recipe templates
    const { data: templates, error: templatesError } = await supabase
      .from('recipe_templates')
      .select('*')
      .eq('is_active', true);

    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError);
      process.exit(1);
    }

    console.log(`📋 Found ${templates.length} recipe templates`);

    // Category mapping from template categories to POS categories
    const categoryMapping = {
      'croffles': 'Classic',
      'drinks': 'Beverages', 
      'add-ons': 'Add-ons',
      'combos': 'Combo'
    };

    let deployedCount = 0;
    let catalogCount = 0;
    let skippedCount = 0;

    for (const store of stores) {
      console.log(`\n🏪 Processing store: ${store.name}`);
      
      for (const template of templates) {
        try {
          // Check if recipe already exists for this store
          const { data: existingRecipe } = await supabase
            .from('recipes')
            .select('id')
            .eq('template_id', template.id)
            .eq('store_id', store.id)
            .maybeSingle();

          let recipeId = existingRecipe?.id;

          if (!existingRecipe) {
            // Deploy recipe to store
            const { data: recipe, error: recipeError } = await supabase
              .from('recipes')
              .insert({
                template_id: template.id,
                name: template.name,
                description: template.description,
                instructions: template.instructions,
                store_id: store.id,
                serving_size: template.serving_size,
                yield_quantity: template.yield_quantity,
                total_cost: 0, // Will be calculated by triggers
                cost_per_serving: 0,
                suggested_price: template.base_price || 0,
                sku: `${template.id.slice(0, 8)}-${store.id.slice(0, 8)}`,
                is_active: true,
                approval_status: 'approved'
              })
              .select()
              .single();

            if (recipeError) {
              console.error(`  ❌ Error deploying "${template.name}" to ${store.name}:`, recipeError);
              continue;
            }

            recipeId = recipe.id;
            deployedCount++;
            console.log(`  ✅ Deployed recipe "${template.name}" to ${store.name}`);
          } else {
            console.log(`  ⏭️  Recipe "${template.name}" already exists for ${store.name}`);
          }

          // Check if product catalog entry already exists
          const { data: existingCatalog } = await supabase
            .from('product_catalog')
            .select('id')
            .eq('recipe_id', recipeId)
            .eq('store_id', store.id)
            .maybeSingle();

          if (existingCatalog) {
            console.log(`  ⏭️  Catalog entry for "${template.name}" already exists for ${store.name}`);
            skippedCount++;
            continue;
          }

          // Get category for this recipe based on template category
          const categoryName = categoryMapping[template.category_name as keyof typeof categoryMapping] || 'Classic';
          
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('store_id', store.id)
            .eq('name', categoryName)
            .eq('is_active', true)
            .maybeSingle();

          // Create product catalog entry with category
          const { data: catalogEntry, error: catalogError } = await supabase
            .from('product_catalog')
            .insert({
              store_id: store.id,
              recipe_id: recipeId,
              product_name: template.name,
              description: template.description,
              price: template.base_price || 0,
              category_id: category?.id || null,
              is_available: true,
              display_order: 0
            })
            .select()
            .single();

          if (catalogError) {
            console.error(`  ❌ Error creating catalog entry for "${template.name}":`, catalogError);
          } else {
            catalogCount++;
            console.log(`  ✅ Created catalog entry for "${template.name}" (Category: ${categoryName})`);
          }

        } catch (error) {
          console.error(`  ❌ Error processing "${template.name}" for ${store.name}:`, error);
        }
      }
    }

    console.log(`\n📊 Deployment Summary:`);
    console.log(`✅ New recipes deployed: ${deployedCount}`);
    console.log(`✅ Catalog entries created: ${catalogCount}`);
    console.log(`⏭️  Items skipped (already exist): ${skippedCount}`);
    console.log(`🎉 Deployment completed successfully!`);

  } catch (error) {
    console.error('❌ Fatal error during deployment:', error);
    process.exit(1);
  }
}

// Run the deployment
deployProductsToAllStores()
  .then(() => {
    console.log('\n✨ Deployment process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment process failed:', error);
    process.exit(1);
  });