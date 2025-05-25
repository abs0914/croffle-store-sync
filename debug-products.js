// Debug script to check products and categories for Robinsons North
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function debugProducts() {
  console.log('🔍 Debugging products for Robinsons North...\n');

  try {
    // Get the store ID for Robinsons North
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .order('name');

    console.log('🏪 Available stores:');
    stores.forEach((store, index) => {
      console.log(`   ${index + 1}. ${store.name} (ID: ${store.id})`);
    });

    const robinsonsNorth = stores.find(store => store.name === 'Robinsons North');
    
    if (!robinsonsNorth) {
      console.error('❌ Robinsons North store not found');
      return;
    }

    console.log(`\n🎯 Target store: ${robinsonsNorth.name} (ID: ${robinsonsNorth.id})`);

    // Check categories for this store
    console.log('\n📂 Checking categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', robinsonsNorth.id)
      .order('name');

    if (categoriesError) {
      console.log('❌ Categories error:', categoriesError.message);
    } else {
      console.log(`✅ Found ${categories.length} categories:`);
      categories.forEach((category, index) => {
        console.log(`   ${index + 1}. ${category.name} (ID: ${category.id}, Active: ${category.is_active})`);
      });
    }

    // Check products for this store
    console.log('\n📦 Checking products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, is_active, image_url, description)
      `)
      .eq('store_id', robinsonsNorth.id)
      .order('name');

    if (productsError) {
      console.log('❌ Products error:', productsError.message);
    } else {
      console.log(`✅ Found ${products.length} products:`);
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`      Category: ${product.category?.name || 'No category'}`);
        console.log(`      Active: ${product.is_active}`);
        console.log(`      Price: ₱${product.price}`);
        console.log(`      Stock: ${product.stock_quantity}`);
      });
    }

    // Check if there are products in other stores
    console.log('\n🔍 Checking products in all stores...');
    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select('id, name, store_id')
      .order('name');

    if (allProductsError) {
      console.log('❌ All products error:', allProductsError.message);
    } else {
      console.log(`✅ Total products across all stores: ${allProducts.length}`);
      
      // Group by store
      const productsByStore = {};
      allProducts.forEach(product => {
        if (!productsByStore[product.store_id]) {
          productsByStore[product.store_id] = [];
        }
        productsByStore[product.store_id].push(product);
      });

      console.log('\n📊 Products by store:');
      Object.keys(productsByStore).forEach(storeId => {
        const store = stores.find(s => s.id === storeId);
        const storeName = store ? store.name : `Unknown Store (${storeId})`;
        console.log(`   ${storeName}: ${productsByStore[storeId].length} products`);
      });
    }

    // Check inventory stock for this store
    console.log('\n📋 Checking inventory stock...');
    const { data: inventoryStock, error: inventoryError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', robinsonsNorth.id)
      .order('item');

    if (inventoryError) {
      console.log('❌ Inventory error:', inventoryError.message);
    } else {
      console.log(`✅ Found ${inventoryStock.length} inventory items:`);
      inventoryStock.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.item} (${item.unit}) - Stock: ${item.stock_quantity}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugProducts().catch(console.error);
