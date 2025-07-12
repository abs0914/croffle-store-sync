#!/usr/bin/env node

/**
 * Check Oreo Cookies Recipe Deployment
 * 
 * This script verifies if the Oreo Cookies recipe was correctly deployed 
 * to Robinsons North and Sugbo Mercado (IT Park, Cebu) stores.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Store IDs for the target stores
const ROBINSONS_NORTH_ID = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d';
const SUGBO_MERCADO_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function checkOreoDeployment() {
  console.log('🍪 Checking Oreo Cookies Recipe Deployment Status\n');
  
  try {
    // Step 1: Find Oreo Cookies recipe template
    console.log('🔍 Step 1: Finding Oreo Cookies recipe template...');

    // First, let's get all templates to see what's available
    const allTemplatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*',
      method: 'GET',
      headers
    };

    const allTemplates = await makeRequest(allTemplatesOptions);
    console.log(`Found ${allTemplates.length} templates total`);

    // Look for templates with "cookies", "cream", or "oreo" in the name
    const oreoTemplate = allTemplates.find(t => {
      const name = t.name.toLowerCase();
      return (name.includes('cookies') && name.includes('cream')) ||
             name.includes('oreo') ||
             (name.includes('cookies') && name.includes('&'));
    });

    if (!oreoTemplate) {
      console.log('❌ Oreo Cookies template not found');
      console.log('Available templates:');
      allTemplates.forEach(t => console.log(`   - ${t.name} (${t.category_name || t.category})`));
      return;
    }
    
    console.log(`✅ Found template: ${oreoTemplate.name} (ID: ${oreoTemplate.id})`);
    console.log(`   Category: ${oreoTemplate.category_name || oreoTemplate.category}`);
    console.log(`   Price: ₱${oreoTemplate.suggested_price}`);
    
    // Step 2: Check store information
    console.log('\n🏪 Step 2: Verifying target stores...');
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/stores?select=*&id=in.(${ROBINSONS_NORTH_ID},${SUGBO_MERCADO_ID})`,
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    
    const robinsonsStore = stores.find(s => s.id === ROBINSONS_NORTH_ID);
    const sugboStore = stores.find(s => s.id === SUGBO_MERCADO_ID);
    
    if (!robinsonsStore) {
      console.log('❌ Robinsons North store not found');
      return;
    }
    
    if (!sugboStore) {
      console.log('❌ Sugbo Mercado store not found');
      return;
    }
    
    console.log(`✅ Robinsons North: ${robinsonsStore.name} (Active: ${robinsonsStore.is_active})`);
    console.log(`✅ Sugbo Mercado: ${sugboStore.name} (Active: ${sugboStore.is_active})`);
    
    // Step 3: Check recipe deployments
    console.log('\n📋 Step 3: Checking recipe deployments...');
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&template_id=eq.${oreoTemplate.id}&store_id=in.(${ROBINSONS_NORTH_ID},${SUGBO_MERCADO_ID})`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    
    const robinsonsRecipe = recipes.find(r => r.store_id === ROBINSONS_NORTH_ID);
    const sugboRecipe = recipes.find(r => r.store_id === SUGBO_MERCADO_ID);
    
    console.log(`\n📊 Deployment Results:`);
    console.log(`   Robinsons North: ${robinsonsRecipe ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    if (robinsonsRecipe) {
      console.log(`      Recipe ID: ${robinsonsRecipe.id}`);
      console.log(`      Active: ${robinsonsRecipe.is_active}`);
      console.log(`      Price: ₱${robinsonsRecipe.suggested_price}`);
    }
    
    console.log(`   Sugbo Mercado: ${sugboRecipe ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
    if (sugboRecipe) {
      console.log(`      Recipe ID: ${sugboRecipe.id}`);
      console.log(`      Active: ${sugboRecipe.is_active}`);
      console.log(`      Price: ₱${sugboRecipe.suggested_price}`);
    }
    
    // Step 4: Check product catalog entries
    console.log('\n🛍️ Step 4: Checking product catalog entries...');
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*&store_id=in.(${ROBINSONS_NORTH_ID},${SUGBO_MERCADO_ID})&product_name=ilike.*cookies*cream*`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    
    const robinsonsProduct = products.find(p => p.store_id === ROBINSONS_NORTH_ID);
    const sugboProduct = products.find(p => p.store_id === SUGBO_MERCADO_ID);
    
    console.log(`\n🛒 Product Catalog Results:`);
    console.log(`   Robinsons North: ${robinsonsProduct ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
    if (robinsonsProduct) {
      console.log(`      Product: ${robinsonsProduct.product_name}`);
      console.log(`      Price: ₱${robinsonsProduct.price}`);
      console.log(`      Available: ${robinsonsProduct.is_available}`);
      console.log(`      Recipe ID: ${robinsonsProduct.recipe_id}`);
    }
    
    console.log(`   Sugbo Mercado: ${sugboProduct ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
    if (sugboProduct) {
      console.log(`      Product: ${sugboProduct.product_name}`);
      console.log(`      Price: ₱${sugboProduct.price}`);
      console.log(`      Available: ${sugboProduct.is_available}`);
      console.log(`      Recipe ID: ${sugboProduct.recipe_id}`);
    }
    
    // Step 5: Check deployment logs
    console.log('\n📝 Step 5: Checking recent deployment logs...');
    const logsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_deployment_logs?select=*&template_id=eq.${oreoTemplate.id}&store_id=in.(${ROBINSONS_NORTH_ID},${SUGBO_MERCADO_ID})&order=created_at.desc&limit=10`,
      method: 'GET',
      headers
    };
    
    const logs = await makeRequest(logsOptions);
    
    if (logs.length > 0) {
      console.log(`\n📋 Recent Deployment Logs (${logs.length} entries):`);
      logs.forEach(log => {
        const storeName = log.store_id === ROBINSONS_NORTH_ID ? 'Robinsons North' : 'Sugbo Mercado';
        console.log(`   ${log.created_at}: ${storeName} - ${log.deployment_status}`);
        if (log.step_details && Object.keys(log.step_details).length > 0) {
          console.log(`      Details: ${JSON.stringify(log.step_details)}`);
        }
      });
    } else {
      console.log('   ⚠️ No deployment logs found');
    }
    
    // Step 6: Check deployment records
    console.log('\n📊 Step 6: Checking deployment records...');
    const deploymentsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_deployments?select=*&template_id=eq.${oreoTemplate.id}&store_id=in.(${ROBINSONS_NORTH_ID},${SUGBO_MERCADO_ID})&order=created_at.desc`,
      method: 'GET',
      headers
    };
    
    const deployments = await makeRequest(deploymentsOptions);
    
    if (deployments.length > 0) {
      console.log(`\n📈 Deployment Records (${deployments.length} entries):`);
      deployments.forEach(deployment => {
        const storeName = deployment.store_id === ROBINSONS_NORTH_ID ? 'Robinsons North' : 'Sugbo Mercado';
        console.log(`   ${deployment.created_at}: ${storeName}`);
        console.log(`      Status: ${deployment.deployment_status}`);
        console.log(`      Cost: ₱${deployment.cost_snapshot || 'N/A'}`);
        console.log(`      Price: ₱${deployment.price_snapshot || 'N/A'}`);
        console.log(`      Recipe ID: ${deployment.recipe_id}`);
        if (deployment.deployment_notes) {
          console.log(`      Notes: ${deployment.deployment_notes}`);
        }
      });
    } else {
      console.log('   ⚠️ No deployment records found');
    }
    
    // Summary
    console.log('\n🎯 DEPLOYMENT VERIFICATION SUMMARY:');
    console.log('=====================================');
    
    const robinsonsSuccess = robinsonsRecipe && robinsonsProduct;
    const sugboSuccess = sugboRecipe && sugboProduct;
    
    console.log(`Robinsons North: ${robinsonsSuccess ? '✅ FULLY DEPLOYED' : '❌ INCOMPLETE'}`);
    console.log(`Sugbo Mercado: ${sugboSuccess ? '✅ FULLY DEPLOYED' : '❌ INCOMPLETE'}`);
    
    if (robinsonsSuccess && sugboSuccess) {
      console.log('\n🎉 SUCCESS: Oreo Cookies recipe is correctly deployed to both stores!');
    } else {
      console.log('\n⚠️ WARNING: Deployment is incomplete. Please check the missing components above.');
    }
    
  } catch (error) {
    console.error('❌ Error checking deployment:', error.message);
  }
}

// Run the check
checkOreoDeployment();
