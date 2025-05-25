// Check product images in Robinsons North
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProductImages() {
  try {
    console.log('🔍 Checking product images...\n');
    
    // Get Robinsons North store ID
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('name', 'Robinsons North');
    
    if (!stores || stores.length === 0) {
      console.log('❌ Robinsons North store not found');
      return;
    }
    
    const storeId = stores[0].id;
    console.log(`🏪 Found Robinsons North store: ${storeId}\n`);
    
    // Get products for this store
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image_url, sku')
      .eq('store_id', storeId)
      .order('name');
    
    console.log('📦 Products in Robinsons North:');
    console.log(`Total products: ${products?.length || 0}\n`);
    
    if (products && products.length > 0) {
      console.log('🖼️  Image URL Status:');
      products.forEach((product, index) => {
        const hasImage = product.image_url && product.image_url.trim() !== '';
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku || 'N/A'}`);
        console.log(`   Image: ${hasImage ? '✅ ' + product.image_url : '❌ No image URL'}`);
        console.log('');
      });
      
      const withImages = products.filter(p => p.image_url && p.image_url.trim() !== '');
      const withoutImages = products.filter(p => !p.image_url || p.image_url.trim() === '');
      
      console.log('📊 Summary:');
      console.log(`Products with images: ${withImages.length}`);
      console.log(`Products without images: ${withoutImages.length}`);
      
      // Test if any image URLs are accessible
      if (withImages.length > 0) {
        console.log('\n🌐 Testing image URL accessibility...');
        const testImage = withImages[0];
        console.log(`Testing: ${testImage.image_url}`);
        
        try {
          const response = await fetch(testImage.image_url, { method: 'HEAD' });
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log(`Content-Type: ${response.headers.get('content-type')}`);
        } catch (fetchError) {
          console.log(`❌ Failed to fetch image: ${fetchError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProductImages().catch(console.error);
