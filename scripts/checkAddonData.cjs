const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAddonData() {
  console.log('🔍 Checking addon data sources...\n');
  
  // Check product_addon_items table
  console.log('📦 Checking product_addon_items table:');
  try {
    const { data: addonItems, error: addonError } = await supabase
      .from('product_addon_items')
      .select('*')
      .limit(20);
      
    if (addonError) {
      console.error('❌ Error fetching addon items:', addonError);
    } else {
      console.log(`✅ Found ${addonItems.length} addon items:`);
      addonItems.forEach(item => {
        console.log(`   - ${item.name} (₱${item.price}) - Available: ${item.is_available}`);
      });
    }
  } catch (error) {
    console.error('❌ Error with product_addon_items:', error.message);
  }
  
  // Check recipe_templates with addon category
  console.log('\n📋 Checking recipe_templates with addon category:');
  try {
    const { data: addonRecipes, error: recipeError } = await supabase
      .from('recipe_templates')
      .select('id, name, category_name, is_active')
      .eq('category_name', 'addon')
      .eq('is_active', true);
      
    if (recipeError) {
      console.error('❌ Error fetching addon recipes:', recipeError);
    } else {
      console.log(`✅ Found ${addonRecipes.length} addon recipes:`);
      addonRecipes.forEach(recipe => {
        console.log(`   - ${recipe.name} (${recipe.category_name})`);
      });
    }
  } catch (error) {
    console.error('❌ Error with recipe_templates:', error.message);
  }
  
  // Check addon categories
  console.log('\n🏷️ Checking addon_categories table:');
  try {
    const { data: categories, error: catError } = await supabase
      .from('addon_categories')
      .select('*')
      .eq('is_active', true);
      
    if (catError) {
      console.error('❌ Error fetching addon categories:', catError);
    } else {
      console.log(`✅ Found ${categories.length} addon categories:`);
      categories.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.category_type})`);
      });
    }
  } catch (error) {
    console.error('❌ Error with addon_categories:', error.message);
  }
  
  // Check products in addon categories
  console.log('\n🛍️ Checking products in addon categories:');
  try {
    const { data: products, error: prodError } = await supabase
      .from('product_catalog')
      .select(`
        product_name,
        price,
        is_available,
        categories(name)
      `)
      .limit(50);
      
    if (prodError) {
      console.error('❌ Error fetching products:', prodError);
    } else {
      const addonProducts = products.filter(p => 
        p.categories?.name?.toLowerCase().includes('addon') || 
        p.categories?.name?.toLowerCase().includes('add-on')
      );
      
      console.log(`✅ Found ${addonProducts.length} products in addon categories:`);
      addonProducts.forEach(product => {
        console.log(`   - ${product.product_name} (₱${product.price}) - ${product.categories?.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Error with product_catalog:', error.message);
  }
}

checkAddonData().catch(console.error);
