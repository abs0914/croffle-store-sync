const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// Helper function to make HTTP requests
const makeRequest = (options) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

async function quickDeploymentCheck() {
  console.log('🚀 QUICK DEPLOYMENT READINESS CHECK');
  console.log('='.repeat(50));

  try {
    // 1. Check Recipe Templates with Essential Fields
    console.log('\n📋 1. RECIPE TEMPLATES WITH ESSENTIAL FIELDS');
    console.log('-'.repeat(40));

    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name,suggested_price,is_active,category_name',
      method: 'GET',
      headers
    };

    const templates = await makeRequest(templatesOptions);

    if (!Array.isArray(templates)) {
      console.log('❌ Error: Could not fetch templates data');
      console.log('Response:', templates);
      return;
    }

    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(t => t.is_active).length;
    const pricedTemplates = templates.filter(t => t.suggested_price && t.suggested_price > 0).length;

    console.log(`📊 Total Templates: ${totalTemplates}`);
    console.log(`✅ Active Templates: ${activeTemplates}`);
    console.log(`💰 Templates with Pricing: ${pricedTemplates}/${totalTemplates}`);

    // 2. Check Ingredient Mappings
    console.log('\n🧪 2. INGREDIENT CATEGORY MAPPINGS');
    console.log('-'.repeat(40));

    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=ingredient_name,ingredient_category,combo_main,combo_add_on',
      method: 'GET',
      headers
    };

    const ingredients = await makeRequest(ingredientsOptions);

    if (!Array.isArray(ingredients)) {
      console.log('❌ Error: Could not fetch ingredients data');
      return;
    }

    const totalIngredients = ingredients.length;
    const categorizedIngredients = ingredients.filter(i => i.ingredient_category).length;
    const comboMainItems = ingredients.filter(i => i.combo_main === true).length;
    const comboAddOnItems = ingredients.filter(i => i.combo_add_on === true).length;

    console.log(`📊 Total Ingredients: ${totalIngredients}`);
    console.log(`🏷️ Categorized: ${categorizedIngredients}/${totalIngredients} (${Math.round(categorizedIngredients/totalIngredients*100)}%)`);
    console.log(`🍽️ Combo Main Items: ${comboMainItems}`);
    console.log(`➕ Combo Add-ons: ${comboAddOnItems}`);

    // 3. Check Store Readiness
    console.log('\n🏪 3. STORE DEPLOYMENT READINESS');
    console.log('-'.repeat(40));

    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name,is_active',
      method: 'GET',
      headers
    };

    const stores = await makeRequest(storesOptions);
    const activeStores = stores.filter(s => s.is_active);

    console.log(`📊 Total Active Stores: ${activeStores.length}`);

    // Check inventory for each store
    let storesWithInventory = 0;
    for (const store of activeStores.slice(0, 5)) { // Check first 5 stores
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=count&store_id=eq.${store.id}&is_active=eq.true`,
        method: 'GET',
        headers
      };

      const inventory = await makeRequest(inventoryOptions);
      if (inventory && inventory.length > 0) {
        storesWithInventory++;
      }
    }

    console.log(`📦 Stores with Inventory: ${storesWithInventory}/${Math.min(activeStores.length, 5)} (sample)`);

    // 4. Overall Assessment
    console.log('\n🎯 4. DEPLOYMENT READINESS ASSESSMENT');
    console.log('-'.repeat(40));

    const checks = [
      { name: 'Templates Active', status: activeTemplates > 0, score: activeTemplates / totalTemplates },
      { name: 'Pricing Complete', status: pricedTemplates === totalTemplates, score: pricedTemplates / totalTemplates },
      { name: 'Ingredients Categorized', status: categorizedIngredients > totalIngredients * 0.8, score: categorizedIngredients / totalIngredients },
      { name: 'Combo Items Defined', status: comboMainItems > 0 && comboAddOnItems > 0, score: (comboMainItems > 0 && comboAddOnItems > 0) ? 1 : 0 },
      { name: 'Stores Ready', status: storesWithInventory > 0, score: storesWithInventory / Math.min(activeStores.length, 5) }
    ];

    let totalScore = 0;
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      const percentage = Math.round(check.score * 100);
      console.log(`${icon} ${check.name}: ${percentage}%`);
      totalScore += check.score;
    });

    const overallScore = Math.round((totalScore / checks.length) * 100);

    console.log('\n🏆 OVERALL DEPLOYMENT READINESS');
    console.log('='.repeat(50));
    console.log(`📊 Readiness Score: ${overallScore}%`);

    if (overallScore >= 90) {
      console.log('🎉 READY FOR DEPLOYMENT!');
      console.log('✅ All systems are go. You can proceed with store deployment.');
    } else if (overallScore >= 70) {
      console.log('⚠️ MOSTLY READY - Minor Issues');
      console.log('🔧 Address the failed checks above before deployment.');
    } else {
      console.log('🔴 NOT READY FOR DEPLOYMENT');
      console.log('❌ Critical issues need to be resolved first.');
    }

    // 5. Next Steps
    console.log('\n📋 NEXT STEPS:');
    console.log('-'.repeat(40));

    if (pricedTemplates < totalTemplates) {
      console.log('1. 💰 Set suggested_price for all recipe templates');
    }

    if (categorizedIngredients < totalIngredients) {
      console.log('2. 🏷️ Assign ingredient_category to all ingredients');
    }

    if (comboMainItems === 0 || comboAddOnItems === 0) {
      console.log('3. 🍽️ Set combo_main and combo_add_on flags properly');
    }

    if (overallScore >= 90) {
      console.log('4. 🚀 Run full deployment to all stores');
      console.log('5. 📊 Generate product catalogs');
      console.log('6. 🖥️ Sync with POS systems');
    }

    console.log('\n🔗 For detailed verification, visit: /admin/deployment-verification');

  } catch (error) {
    console.error('❌ Error during deployment check:', error.message);
  }
}

// Run the check
quickDeploymentCheck();