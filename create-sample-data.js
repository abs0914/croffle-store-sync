// Script to create sample categories and products for testing
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function createSampleData() {
  console.log('🏗️  Creating sample data for stores...\n');

  try {
    // Get stores
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .order('name');

    console.log(`🏪 Found ${stores.length} stores:`);
    stores.forEach(store => {
      console.log(`   - ${store.name} (ID: ${store.id})`);
    });

    // Create categories for each store
    const categories = [
      { name: 'Classic', description: 'Traditional croffle variations' },
      { name: 'Premium', description: 'Premium croffle with special toppings' },
      { name: 'Beverages', description: 'Hot and cold drinks' },
      { name: 'Desserts', description: 'Sweet treats and desserts' }
    ];

    for (const store of stores) {
      console.log(`\n📂 Creating categories for ${store.name}...`);
      
      const createdCategories = [];
      
      for (const category of categories) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: category.name,
            description: category.description,
            store_id: store.id,
            is_active: true
          })
          .select()
          .single();

        if (categoryError) {
          console.log(`   ❌ Error creating ${category.name}: ${categoryError.message}`);
        } else {
          console.log(`   ✅ Created category: ${category.name}`);
          createdCategories.push(categoryData);
        }
      }

      // Create products for each category
      console.log(`\n📦 Creating products for ${store.name}...`);
      
      const products = [
        // Classic category
        {
          name: 'Classic Croffle',
          description: 'Traditional croissant-waffle with butter and powdered sugar',
          price: 120,
          sku: `CRF-001-${store.name.replace(/\s+/g, '').toUpperCase()}`,
          stock_quantity: 50,
          category_name: 'Classic'
        },
        {
          name: 'Chocolate Croffle',
          description: 'Classic croffle with rich chocolate sauce',
          price: 150,
          sku: `CRF-002-${store.name.replace(/\s+/g, '').toUpperCase()}`,
          stock_quantity: 40,
          category_name: 'Classic'
        },
        // Premium category
        {
          name: 'Strawberry Deluxe',
          description: 'Premium croffle with fresh strawberries and cream',
          price: 200,
          sku: `CRF-003-${store.name.replace(/\s+/g, '').toUpperCase()}`,
          stock_quantity: 30,
          category_name: 'Premium'
        },
        {
          name: 'Nutella Supreme',
          description: 'Premium croffle with Nutella and hazelnuts',
          price: 220,
          sku: `CRF-004-${store.name.replace(/\s+/g, '').toUpperCase()}`,
          stock_quantity: 25,
          category_name: 'Premium'
        },
        // Beverages category
        {
          name: 'Iced Coffee',
          description: 'Refreshing iced coffee',
          price: 80,
          sku: `BEV-001-${store.name.replace(/\s+/g, '').toUpperCase()}`,
          stock_quantity: 100,
          category_name: 'Beverages'
        },
        {
          name: 'Hot Chocolate',
          description: 'Rich and creamy hot chocolate',
          price: 90,
          sku: `BEV-002-${store.name.replace(/\s+/g, '').toUpperCase()}`,
          stock_quantity: 80,
          category_name: 'Beverages'
        }
      ];

      for (const product of products) {
        // Find the category ID
        const category = createdCategories.find(cat => cat.name === product.category_name);
        
        if (!category) {
          console.log(`   ⚠️  Category ${product.category_name} not found for product ${product.name}`);
          continue;
        }

        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            description: product.description,
            price: product.price,
            sku: product.sku,
            stock_quantity: product.stock_quantity,
            category_id: category.id,
            store_id: store.id,
            is_active: true
          })
          .select()
          .single();

        if (productError) {
          console.log(`   ❌ Error creating ${product.name}: ${productError.message}`);
        } else {
          console.log(`   ✅ Created product: ${product.name} (₱${product.price})`);
        }
      }
    }

    console.log('\n🎉 Sample data creation completed!');
    
    // Verify the data was created
    console.log('\n🔍 Verifying created data...');
    
    for (const store of stores) {
      const { data: storeCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id);
        
      const { data: storeProducts } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id);

      console.log(`\n📊 ${store.name}:`);
      console.log(`   Categories: ${storeCategories?.length || 0}`);
      console.log(`   Products: ${storeProducts?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Failed to create sample data:', error.message);
  }
}

createSampleData().catch(console.error);
