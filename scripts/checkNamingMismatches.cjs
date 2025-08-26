#!/usr/bin/env node

/**
 * Check Naming Mismatches for Packaging Items
 * 
 * This script identifies exact naming mismatches between recipe ingredients
 * and commissary/inventory items that are causing deployment failures.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

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

async function authenticateAdmin() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers
  };
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const authResult = await makeRequest(authOptions, authData);
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    return authResult;
  } catch (error) {
    console.log('Auth failed:', error.message);
    return null;
  }
}

async function checkNamingMismatches() {
  console.log('🔍 CHECKING NAMING MISMATCHES FOR PACKAGING ITEMS');
  console.log('='.repeat(60));
  
  await authenticateAdmin();
  
  // Get recipe ingredients that use packaging items
  const recipeIngredientsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_template_ingredients?select=*',
    method: 'GET',
    headers
  };
  
  const recipeIngredients = await makeRequest(recipeIngredientsOptions);
  const packagingIngredients = recipeIngredients.filter(ingredient => 
    ingredient.ingredient_name.toLowerCase().includes('take') ||
    ingredient.ingredient_name.toLowerCase().includes('box') ||
    ingredient.ingredient_name.toLowerCase().includes('rectangle') ||
    ingredient.ingredient_name.toLowerCase().includes('paper bag')
  );
  
  console.log('📝 RECIPE INGREDIENTS USING PACKAGING ITEMS:');
  console.log('-'.repeat(40));
  packagingIngredients.forEach(ingredient => {
    console.log(`- "${ingredient.ingredient_name}"`);
  });
  
  // Get what's actually available in commissary
  const commissaryOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/commissary_inventory?select=name',
    method: 'GET',
    headers
  };
  
  const commissaryItems = await makeRequest(commissaryOptions);
  const packagingCommissary = commissaryItems.filter(item => 
    item.name.toLowerCase().includes('take') ||
    item.name.toLowerCase().includes('box') ||
    item.name.toLowerCase().includes('rectangle') ||
    item.name.toLowerCase().includes('paper bag')
  );
  
  console.log('\n🏭 COMMISSARY ITEMS AVAILABLE:');
  console.log('-'.repeat(40));
  packagingCommissary.forEach(item => {
    console.log(`- "${item.name}"`);
  });
  
  console.log('\n🔍 NAMING MISMATCH ANALYSIS:');
  console.log('-'.repeat(40));
  
  const mismatches = [];
  
  packagingIngredients.forEach(ingredient => {
    const exactMatch = packagingCommissary.find(item => item.name === ingredient.ingredient_name);
    if (!exactMatch) {
      console.log(`❌ NO EXACT MATCH: "${ingredient.ingredient_name}"`);
      
      // Find similar items
      const similar = packagingCommissary.filter(item => {
        const itemWords = item.name.toLowerCase().split(' ');
        const ingredientWords = ingredient.ingredient_name.toLowerCase().split(' ');
        return itemWords.some(word => ingredientWords.includes(word)) ||
               ingredientWords.some(word => itemWords.includes(word));
      });
      
      if (similar.length > 0) {
        console.log(`   💡 Similar items found:`);
        similar.forEach(item => {
          console.log(`      - "${item.name}"`);
        });
        
        mismatches.push({
          recipeIngredient: ingredient.ingredient_name,
          similarItems: similar.map(item => item.name)
        });
      } else {
        mismatches.push({
          recipeIngredient: ingredient.ingredient_name,
          similarItems: []
        });
      }
    } else {
      console.log(`✅ EXACT MATCH: "${ingredient.ingredient_name}"`);
    }
  });
  
  if (mismatches.length > 0) {
    console.log('\n🚨 DEPLOYMENT BLOCKING ISSUES:');
    console.log('-'.repeat(40));
    
    mismatches.forEach(mismatch => {
      console.log(`Recipe needs: "${mismatch.recipeIngredient}"`);
      if (mismatch.similarItems.length > 0) {
        console.log(`Available: ${mismatch.similarItems.map(item => `"${item}"`).join(', ')}`);
        console.log(`💡 SOLUTION: Update recipe ingredient name OR add exact match to commissary`);
      } else {
        console.log(`Available: NONE`);
        console.log(`💡 SOLUTION: Add "${mismatch.recipeIngredient}" to commissary inventory`);
      }
      console.log('');
    });
    
    console.log('🔧 RECOMMENDED FIXES:');
    console.log('-'.repeat(40));
    console.log('1. Update recipe ingredient names to match commissary items exactly');
    console.log('2. OR add missing items to commissary with exact recipe names');
    console.log('3. Ensure case-sensitive matching in deployment validation');
    console.log('4. Re-run recipe deployment after fixes');
  } else {
    console.log('\n✅ All packaging ingredients have exact matches in commissary!');
  }
}

checkNamingMismatches().catch(console.error);
