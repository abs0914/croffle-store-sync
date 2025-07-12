import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function analyzeDeploymentStatus() {
  try {
    console.log('📊 Analyzing deployment status across all stores...\n');

    // Authenticate as admin
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'password123'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      process.exit(1);
    }

    // Get store statistics
    const { data: storeStats } = await supabase.rpc('analyze_store_deployment_status');
    
    if (!storeStats) {
      // Manual analysis if RPC doesn't exist
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      const { data: templates } = await supabase
        .from('recipe_templates')
        .select('id, name, image_url')
        .eq('is_active', true);

      console.log(`📋 Analysis Summary:`);
      console.log(`   Active Stores: ${stores?.length || 0}`);
      console.log(`   Active Templates: ${templates?.length || 0}`);
      console.log(`   Templates with Images: ${templates?.filter(t => t.image_url).length || 0}\n`);

      // Analyze each store
      for (const store of stores || []) {
        const { data: products } = await supabase
          .from('product_catalog')
          .select('id, product_name, image_url')
          .eq('store_id', store.id);

        const productsWithImages = products?.filter(p => p.image_url).length || 0;
        const totalProducts = products?.length || 0;
        const missingProducts = (templates?.length || 0) - totalProducts;

        console.log(`🏪 ${store.name}`);
        console.log(`   Products: ${totalProducts}/${templates?.length || 0} deployed`);
        console.log(`   Images: ${productsWithImages}/${totalProducts} have images`);
        
        if (missingProducts > 0) {
          console.log(`   ⚠️  Missing ${missingProducts} products`);
        }
        
        if (totalProducts > 0 && productsWithImages < totalProducts) {
          console.log(`   ⚠️  ${totalProducts - productsWithImages} products missing images`);
        }
        
        console.log('');
      }
    }

    // Check for deployment issues
    console.log('🔍 Deployment Issues Found:');
    
    // Issue 1: Stores with missing products
    const { data: storesWithMissingProducts } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        product_catalog(count)
      `)
      .eq('is_active', true);

    const { data: templateCount } = await supabase
      .from('recipe_templates')
      .select('id')
      .eq('is_active', true);

    const expectedCount = templateCount?.length || 0;
    const storesNeedingProducts = storesWithMissingProducts?.filter(
      store => (store.product_catalog as any)[0]?.count < expectedCount
    );

    if (storesNeedingProducts?.length) {
      console.log(`   📦 ${storesNeedingProducts.length} stores missing products:`);
      storesNeedingProducts.forEach(store => {
        const currentCount = (store.product_catalog as any)[0]?.count || 0;
        console.log(`      - ${store.name}: ${currentCount}/${expectedCount} products`);
      });
    }

    // Issue 2: Products missing images
    const { data: productsWithoutImages } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        store_id,
        stores(name),
        recipes(
          recipe_templates(image_url)
        )
      `)
      .is('image_url', null);

    const productsWithTemplateImages = productsWithoutImages?.filter(
      product => (product.recipes as any)?.recipe_templates?.image_url
    );

    if (productsWithTemplateImages?.length) {
      console.log(`   🖼️  ${productsWithTemplateImages.length} products missing images (but templates have them)`);
    }

    console.log('\n✅ Analysis completed!');
    console.log('\n💡 Recommendations:');
    console.log('   1. Run deployProductsToAllStores.ts to fix missing products');
    console.log('   2. Run syncTemplateImagesToProducts.ts to fix missing images');

  } catch (error) {
    console.error('❌ Fatal error during analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeDeploymentStatus()
  .then(() => {
    console.log('\n✨ Analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });