#!/usr/bin/env node

/**
 * Check if Recipe Templates were Created
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
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
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
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

async function authenticateAdmin() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);

  // Update headers with access token
  headers.Authorization = `Bearer ${authResult.access_token}`;

  console.log('✅ Admin authenticated successfully');
  return authResult;
}

async function main() {
  try {
    console.log('🔍 CHECKING RECIPE TEMPLATES STATUS');
    console.log('='.repeat(50));

    // Authenticate first
    await authenticateAdmin();
    
    // Check recipe templates
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name,is_active',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`✅ Found ${templates.length} recipe templates`);
    
    if (templates.length > 0) {
      console.log('\n📋 Templates:');
      templates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.is_active ? 'Active' : 'Inactive'})`);
      });
    }
    
    // Check recipe template ingredients
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=recipe_template_id,ingredient_name',
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    console.log(`\n🥘 Found ${ingredients.length} recipe template ingredients`);
    
    if (ingredients.length > 0) {
      // Group by template
      const ingredientsByTemplate = {};
      ingredients.forEach(ing => {
        if (!ingredientsByTemplate[ing.recipe_template_id]) {
          ingredientsByTemplate[ing.recipe_template_id] = [];
        }
        ingredientsByTemplate[ing.recipe_template_id].push(ing.ingredient_name);
      });
      
      console.log('\n📊 Ingredients by template:');
      Object.entries(ingredientsByTemplate).forEach(([templateId, ings]) => {
        const template = templates.find(t => t.id === templateId);
        const templateName = template ? template.name : `Unknown (${templateId})`;
        console.log(`   ${templateName}: ${ings.length} ingredients`);
      });
      
      // Get unique ingredients
      const uniqueIngredients = [...new Set(ingredients.map(i => i.ingredient_name))];
      console.log(`\n🎯 Unique ingredients: ${uniqueIngredients.length}`);
      console.log('📝 Sample ingredients:');
      uniqueIngredients.slice(0, 10).forEach((ingredient, index) => {
        console.log(`   ${index + 1}. ${ingredient}`);
      });
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Recipe templates: ${templates.length}`);
    console.log(`Template ingredients: ${ingredients.length}`);
    
    if (templates.length > 0 && ingredients.length === 0) {
      console.log('\n⚠️  WARNING: Templates exist but no ingredients found!');
      console.log('This explains why inventory deployment failed.');
    } else if (templates.length > 0 && ingredients.length > 0) {
      const uniqueIngredients = [...new Set(ingredients.map(i => i.ingredient_name))];
      console.log('\n✅ SUCCESS: Templates and ingredients are ready for inventory deployment!');
      console.log(`Expected inventory items per store: ${uniqueIngredients.length}`);
      console.log(`Expected total inventory items (8 stores): ${uniqueIngredients.length * 8}`);
    } else {
      console.log('\n❌ ERROR: No templates found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
