const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAddonService() {
  console.log('🧪 Testing addon service logic...\n');
  
  // Step 1: Find addon categories
  console.log('📂 Step 1: Finding addon categories...');
  try {
    // Check all categories to see which ones might contain addon products
    const { data: allCategories, error: allCatError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (allCatError) {
      console.error('❌ Error fetching all categories:', allCatError);
      return;
    }

    console.log(`   All categories: ${allCategories?.length || 0}`);
    allCategories?.forEach(cat => {
      if (cat.name.toLowerCase().includes('addon') || cat.name.toLowerCase().includes('add-on')) {
        console.log(`     - ${cat.name} (${cat.id}) ✅ ADDON CATEGORY`);
      }
    });

    // Find categories that contain "addon" or "add-on" in the name
    const addonCategories = allCategories?.filter(cat =>
      cat.name.toLowerCase().includes('addon') ||
      cat.name.toLowerCase().includes('add-on')
    ) || [];



    console.log(`✅ Found ${addonCategories.length} addon categories:`);
    addonCategories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.id})`);
    });

    if (addonCategories.length === 0) {
      console.log('❌ No addon categories found, cannot proceed');
      return;
    }

    // Step 2: Get products from addon categories
    console.log('\n🛍️ Step 2: Finding products in addon categories...');
    const addonCategoryIds = addonCategories.map(cat => cat.id);

    const { data: products, error: prodError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        price,
        is_available,
        category_id,
        categories!inner(name)
      `)
      .in('category_id', addonCategoryIds)
      .eq('is_available', true)
      .order('product_name');

    if (prodError) {
      console.error('❌ Error fetching addon products:', prodError);
      return;
    }

    console.log(`✅ Found ${products.length} addon products:`);
    products.forEach(product => {
      console.log(`   - ${product.product_name} (₱${product.price}) - ${product.categories?.name}`);
    });

    // Step 3: Transform to AddonItem format
    console.log('\n🔄 Step 3: Transforming to AddonItem format...');
    const addonItems = products.map(product => ({
      id: product.id,
      name: product.product_name,
      description: undefined,
      price: product.price || 6,
      cost_per_unit: (product.price || 6) * 0.6,
      category: product.categories?.name || 'addon',
      is_active: product.is_available,
      image_url: undefined
    }));

    console.log(`✅ Transformed ${addonItems.length} addon items:`);
    addonItems.forEach(item => {
      console.log(`   - ${item.name} (₱${item.price}) - ${item.category}`);
    });

    // Step 4: Group by category
    console.log('\n📋 Step 4: Grouping by category...');
    const groupedAddons = {};
    addonItems.forEach(addon => {
      const categoryName = addon.category.toLowerCase();
      if (!groupedAddons[categoryName]) {
        groupedAddons[categoryName] = {
          name: categoryName,
          display_name: addon.category,
          items: []
        };
      }
      groupedAddons[categoryName].items.push(addon);
    });

    const addonCategoriesResult = Object.values(groupedAddons);
    console.log(`✅ Created ${addonCategoriesResult.length} addon category groups:`);
    addonCategoriesResult.forEach(cat => {
      console.log(`   - ${cat.display_name}: ${cat.items.length} items`);
    });

    console.log('\n🎉 Addon service test completed successfully!');
    console.log(`📊 Summary: ${addonItems.length} addon items in ${addonCategoriesResult.length} categories`);

  } catch (error) {
    console.error('❌ Error in addon service test:', error);
  }
}

testAddonService().catch(console.error);
