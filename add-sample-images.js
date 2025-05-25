// Add sample image URLs to products
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sample croffle images from Unsplash (free to use)
const sampleImages = [
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop'
];

async function addSampleImages() {
  try {
    console.log('🖼️  Adding sample images to products...\n');
    
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
    
    // Get products without images
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image_url')
      .eq('store_id', storeId)
      .order('name');
    
    if (!products || products.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
    console.log(`📦 Found ${products.length} products\n`);
    
    // Update products with sample images
    let updateCount = 0;
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const hasImage = product.image_url && product.image_url.trim() !== '';
      
      if (!hasImage) {
        const imageUrl = sampleImages[i % sampleImages.length];
        
        const { error } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', product.id);
        
        if (error) {
          console.log(`❌ Failed to update ${product.name}: ${error.message}`);
        } else {
          console.log(`✅ Updated ${product.name} with image`);
          updateCount++;
        }
      } else {
        console.log(`⏭️  ${product.name} already has an image`);
      }
    }
    
    console.log(`\n🎉 Updated ${updateCount} products with sample images!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addSampleImages().catch(console.error);
