#!/usr/bin/env node

/**
 * Test Recipe Template Creation
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
          if (body.trim() === '') {
            resolve(null); // Handle empty response
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          console.log('Raw response:', body);
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
    console.log('🧪 TESTING RECIPE TEMPLATE CREATION');
    console.log('='.repeat(50));
    
    // Authenticate first
    await authenticateAdmin();
    
    // Try to create a single test template
    console.log('\n🔄 Creating test template...');
    
    const templateOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates',
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' }
    };
    
    const templateData = {
      name: 'Test Template',
      description: 'Test recipe template',
      category_name: 'Test',
      instructions: 'Test instructions',
      yield_quantity: 1,
      serving_size: 1,
      version: 1,
      is_active: true
    };
    
    console.log('Template data:', JSON.stringify(templateData, null, 2));
    
    const template = await makeRequest(templateOptions, templateData);
    console.log('Template response:', template);
    
    if (template && template.length > 0) {
      const templateId = template[0].id;
      console.log(`✅ Created template ${templateId}`);
      
      // Try to create ingredients
      console.log('\n🔄 Creating test ingredients...');
      
      const ingredientData = [
        {
          recipe_template_id: templateId,
          ingredient_name: 'Test Ingredient 1',
          quantity: 1,
          unit: 'piece',
          cost_per_unit: 10,
          location_type: 'all'
        },
        {
          recipe_template_id: templateId,
          ingredient_name: 'Test Ingredient 2',
          quantity: 2,
          unit: 'portion',
          cost_per_unit: 5,
          location_type: 'all'
        }
      ];
      
      const ingredientsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_template_ingredients',
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' }
      };
      
      console.log('Ingredient data:', JSON.stringify(ingredientData, null, 2));
      
      const ingredients = await makeRequest(ingredientsOptions, ingredientData);
      console.log('Ingredients response:', ingredients);
      
      if (ingredients) {
        console.log(`✅ Created ${ingredients.length || 'unknown number of'} ingredients`);
      }
      
    } else {
      console.log('❌ No template returned');
    }
    
    // Verify creation
    console.log('\n🔍 Verifying creation...');
    
    const checkOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(checkOptions);
    console.log(`Found ${templates.length} templates after creation`);
    
    if (templates.length > 0) {
      templates.forEach(t => {
        console.log(`   - ${t.name} (${t.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
