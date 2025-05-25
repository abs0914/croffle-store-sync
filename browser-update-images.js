// Run this in the browser console to update product images
// Make sure you're on the POS page or any page where Supabase client is available

async function updateProductImages() {
  // Check if supabase is available
  if (typeof window === 'undefined' || !window.supabase) {
    console.log('❌ Supabase client not found. Make sure you are on the application page.');
    return;
  }
  
  const supabase = window.supabase;
  
  console.log('🖼️  Starting to update product images...\n');
  
  try {
    // Get Robinsons North store
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('name', 'Robinsons North');
    
    if (!stores || stores.length === 0) {
      console.log('❌ Robinsons North store not found');
      return;
    }
    
    const storeId = stores[0].id;
    console.log(`🏪 Found Robinsons North store: ${storeId}`);
    
    // Get products without images
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image_url')
      .eq('store_id', storeId);
    
    if (!products || products.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
    console.log(`📦 Found ${products.length} products`);
    
    // Sample images
    const imageMap = {
      'biscoff': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
      'blueberry': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
      'caramel': 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop',
      'choco': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
      'nut': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop',
      'cookies': 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop',
      'croffle': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
      'dark': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
      'kitkat': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop'
    };
    
    const defaultImage = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop';
    
    let updateCount = 0;
    
    for (const product of products) {
      const hasImage = product.image_url && product.image_url.trim() !== '';
      
      if (!hasImage) {
        // Find matching image based on product name
        let imageUrl = defaultImage;
        const productName = product.name.toLowerCase();
        
        for (const [keyword, url] of Object.entries(imageMap)) {
          if (productName.includes(keyword)) {
            imageUrl = url;
            break;
          }
        }
        
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
    
    console.log(`\n🎉 Updated ${updateCount} products with images!`);
    console.log('🔄 Please refresh the page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
updateProductImages();
