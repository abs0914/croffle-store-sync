#!/usr/bin/env node

/**
 * Deploy Remaining Recipe Templates
 * 
 * This script deploys recipe templates that haven't been deployed to any store yet.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'; // Sugbo Mercado store ID

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}, Response: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
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

async function authenticate() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  return await makeRequest(authOptions, authData);
}

async function deployRemainingTemplates() {
  console.log('🚀 Starting deployment of remaining recipe templates...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json'
  };
  
  // Step 1: Get all recipe templates
  console.log('📋 Fetching all recipe templates...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,suggested_price,description,image_url&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`✅ Found ${templates.length} active templates`);
  
  // Step 2: Get deployed recipes to find which templates are already deployed
  console.log('🏪 Checking deployed recipes...');
  const recipesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipes?select=template_id&store_id=eq.' + SUGBO_STORE_ID,
    method: 'GET',
    headers
  };
  
  const deployedRecipes = await makeRequest(recipesOptions);
  const deployedTemplateIds = new Set(deployedRecipes.map(r => r.template_id).filter(Boolean));
  
  console.log(`✅ Found ${deployedRecipes.length} deployed recipes`);
  
  // Step 3: Find templates that haven't been deployed
  const undeployedTemplates = templates.filter(template => !deployedTemplateIds.has(template.id));
  
  console.log(`🔍 Found ${undeployedTemplates.length} templates to deploy:`);
  undeployedTemplates.forEach(template => {
    console.log(`   - ${template.name} (${template.category_name})`);
  });
  
  if (undeployedTemplates.length === 0) {
    console.log('✅ All templates are already deployed!');
    return;
  }
  
  // Step 4: Deploy each undeployed template
  console.log('\n🚀 Deploying templates...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const template of undeployedTemplates) {
    try {
      console.log(`   🔄 Deploying: ${template.name}`);
      
      // Create recipe
      const createRecipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipes',
        method: 'POST',
        headers
      };
      
      const recipeData = {
        name: template.name,
        description: template.description || `Delicious ${template.name} made fresh to order`,
        instructions: 'Follow template instructions',
        yield_quantity: 1,
        total_cost: 0,
        cost_per_serving: 0,
        suggested_price: template.suggested_price || 125,
        store_id: SUGBO_STORE_ID,
        template_id: template.id,
        is_active: true,
        approval_status: 'approved'
      };
      
      const recipe = await makeRequest(createRecipeOptions, recipeData);
      console.log(`   ✅ Created recipe: ${template.name}`);
      
      // Create product catalog entry
      const createProductOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog',
        method: 'POST',
        headers
      };
      
      const productData = {
        store_id: SUGBO_STORE_ID,
        product_name: template.name,
        description: template.description || `Delicious ${template.name} made fresh to order`,
        price: template.suggested_price || 125,
        is_available: true,
        recipe_id: recipe[0].id,
        image_url: template.image_url || null,
        display_order: 0
      };
      
      await makeRequest(createProductOptions, productData);
      console.log(`   ✅ Created product: ${template.name}`);
      
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed to deploy ${template.name}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n🎉 Deployment completed!`);
  console.log(`   ✅ Successfully deployed: ${successCount} templates`);
  console.log(`   ❌ Failed to deploy: ${errorCount} templates`);
  
  if (successCount > 0) {
    console.log('\n📱 New products should now appear in the POS system!');
  }
}

deployRemainingTemplates().catch(console.error);
