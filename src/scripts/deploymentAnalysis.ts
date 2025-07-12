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

    // Get store deployment statistics using the database function
    const { data: storeStats, error: statsError } = await supabase
      .rpc('analyze_store_deployment_status');
    
    if (statsError) {
      console.error('❌ Error getting deployment stats:', statsError);
      process.exit(1);
    }

    console.log(`📋 Deployment Analysis Summary:\n`);
    
    let totalMissingProducts = 0;
    let totalProductsWithoutImages = 0;
    
    for (const store of storeStats || []) {
      console.log(`🏪 ${store.store_name}`);
      console.log(`   Products: ${store.total_products}/${store.expected_products} deployed`);
      console.log(`   Images: ${store.products_with_images}/${store.total_products} have images`);
      
      if (store.missing_products > 0) {
        console.log(`   ⚠️  Missing ${store.missing_products} products`);
        totalMissingProducts += store.missing_products;
      }
      
      if (store.products_without_images > 0) {
        console.log(`   ⚠️  ${store.products_without_images} products missing images`);
        totalProductsWithoutImages += store.products_without_images;
      }
      
      if (store.missing_products === 0 && store.products_without_images === 0) {
        console.log(`   ✅ Fully deployed with images`);
      }
      
      console.log('');
    }

    console.log(`📊 Overall Summary:`);
    console.log(`   Total missing products across all stores: ${totalMissingProducts}`);
    console.log(`   Total products without images: ${totalProductsWithoutImages}`);

    console.log('\n💡 Recommendations:');
    if (totalMissingProducts > 0) {
      console.log('   1. ✅ Run: node deployProductsToAllStores.ts (to deploy missing products)');
    }
    if (totalProductsWithoutImages > 0) {
      console.log('   2. ✅ Run: node syncTemplateImagesToProducts.ts (to sync missing images)');
      console.log('      Or use SQL: SELECT * FROM sync_template_images_to_products();');
    }
    if (totalMissingProducts === 0 && totalProductsWithoutImages === 0) {
      console.log('   🎉 All stores are fully deployed with images!');
    }

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