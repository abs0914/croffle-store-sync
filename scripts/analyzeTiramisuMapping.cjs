const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA2NzI4NzQsImV4cCI6MjAzNjI0ODg3NH0.Ej8XZvB_8Z2bbkTJAyeUw3_5KDa6ULkBKlrGpw_tIkE';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function analyzeTiramisuMapping() {
  console.log('🔍 TIRAMISU CROFFLE INVENTORY MAPPING ANALYSIS');
  console.log('='.repeat(60));
  
  // Step 1: Find all Tiramisu products
  console.log('\n📦 STEP 1: Finding Tiramisu Products');
  console.log('-'.repeat(40));
  
  const catalogOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/product_catalog?select=*,stores(name)&product_name=ilike.*tiramisu*',
    method: 'GET',
    headers
  };
  
  const tiramisuProducts = await makeRequest(catalogOptions);
  console.log(`Found ${tiramisuProducts.length} Tiramisu products:`);
  
  for (const product of tiramisuProducts) {
    const storeName = product.stores?.name || 'Unknown Store';
    console.log(`\n   📍 ${product.product_name} in ${storeName}`);
    console.log(`      ID: ${product.id}`);
    console.log(`      Price: ₱${product.price}`);
    console.log(`      Recipe ID: ${product.recipe_id || 'None'}`);
    console.log(`      Available: ${product.is_available}`);
    
    // Step 2: Check recipe ingredients if recipe exists
    if (product.recipe_id) {
      console.log('\n   🧪 Recipe Ingredients:');
      const recipeOptions = {
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      };
      
      const recipeIngredients = await makeRequest(recipeOptions);
      if (recipeIngredients.length > 0) {
        recipeIngredients.forEach((ing, i) => {
          console.log(`      ${i + 1}. ${ing.ingredient_name} - ${ing.quantity} ${ing.unit} (₱${ing.cost_per_unit || 'N/A'})`);
        });
      } else {
        console.log('      ❌ No recipe ingredients found');
      }
    }
    
    // Step 3: Check product ingredient mappings
    console.log('\n   🔗 Product Ingredient Mappings:');
    const mappingOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=*,inventory_stock(item,stock_quantity,unit,unit_cost)&product_catalog_id=eq.${product.id}`,
      method: 'GET',
      headers
    };
    
    const mappings = await makeRequest(mappingOptions);
    if (mappings.length > 0) {
      mappings.forEach((mapping, i) => {
        const invItem = mapping.inventory_stock;
        console.log(`      ${i + 1}. ${invItem?.item || 'Unknown Item'}`);
        console.log(`         Required: ${mapping.required_quantity} ${mapping.unit}`);
        console.log(`         Stock: ${invItem?.stock_quantity || 'N/A'} ${invItem?.unit || 'N/A'}`);
        console.log(`         Cost: ₱${invItem?.unit_cost || 'N/A'}`);
        console.log(`         Inventory ID: ${mapping.inventory_stock_id}`);
      });
    } else {
      console.log('      ❌ No product ingredient mappings found');
    }
    
    // Step 4: Check store inventory for expected ingredients
    console.log('\n   📋 Store Inventory Check:');
    const expectedIngredients = ['Croissant', 'Whipped Cream', 'Tiramisu', 'Choco Flakes', 'Take out Box', 'Chopstick', 'Wax'];
    
    for (const ingredient of expectedIngredients) {
      const inventoryOptions = {
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${product.store_id}&item=ilike.*${ingredient}*`,
        method: 'GET',
        headers
      };
      
      const inventoryItems = await makeRequest(inventoryOptions);
      if (inventoryItems.length > 0) {
        inventoryItems.forEach(item => {
          console.log(`      ✅ ${item.item} - ${item.stock_quantity} ${item.unit} (₱${item.unit_cost || 'N/A'})`);
        });
      } else {
        console.log(`      ❌ No inventory found for: ${ingredient}`);
      }
    }
  }
  
  // Step 5: Analysis Summary
  console.log('\n\n📊 ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  const providedIngredients = [
    { name: 'Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Tiramisu Sauce', unit: 'portion', quantity: 1, cost: 3.5 },
    { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Take out Box', unit: 'piece', quantity: 1, cost: 6 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Waxpaper', unit: 'piece', quantity: 1, cost: 0.7 }
  ];
  
  console.log('\n📋 Expected Ingredients (from provided data):');
  providedIngredients.forEach((ing, i) => {
    console.log(`   ${i + 1}. ${ing.name} - ${ing.quantity} ${ing.unit} (₱${ing.cost})`);
  });
  
  const totalCost = providedIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  console.log(`\n💰 Total Expected Cost: ₱${totalCost}`);
  console.log(`💰 Expected Selling Price: ₱125 (Classic category)`);
  console.log(`📈 Expected Profit Margin: ₱${125 - totalCost} (${((125 - totalCost) / 125 * 100).toFixed(1)}%)`);
}

analyzeTiramisuMapping().catch(console.error);
