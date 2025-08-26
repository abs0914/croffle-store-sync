#!/usr/bin/env node

/**
 * Debug Inventory Issue
 * 
 * This script debugs why only 8 inventory items were deployed
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

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

async function main() {
  try {
    console.log('🔍 DEBUGGING INVENTORY DEPLOYMENT ISSUE');
    console.log('='.repeat(50));
    
    // Step 1: Check recipe templates
    console.log('\n📋 STEP 1: CHECKING RECIPE TEMPLATES');
    console.log('-'.repeat(40));
    
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name,is_active',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`✅ Found ${templates.length} recipe templates total`);
    
    const activeTemplates = templates.filter(t => t.is_active);
    const inactiveTemplates = templates.filter(t => !t.is_active);
    
    console.log(`   Active: ${activeTemplates.length}`);
    console.log(`   Inactive: ${inactiveTemplates.length}`);
    
    if (activeTemplates.length > 0) {
      console.log('\n📝 Active templates:');
      activeTemplates.slice(0, 5).forEach(template => {
        console.log(`   - ${template.name} (${template.id})`);
      });
    }
    
    // Step 2: Check recipe template ingredients
    console.log('\n🥘 STEP 2: CHECKING RECIPE TEMPLATE INGREDIENTS');
    console.log('-'.repeat(40));
    
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=*',
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    console.log(`✅ Found ${ingredients.length} recipe template ingredients total`);
    
    if (ingredients.length > 0) {
      console.log('\n📝 Sample ingredients:');
      ingredients.slice(0, 10).forEach((ingredient, index) => {
        console.log(`   ${index + 1}. ${ingredient.ingredient_name} (Template: ${ingredient.recipe_template_id})`);
      });
    }
    
    // Step 3: Check current inventory
    console.log('\n📦 STEP 3: CHECKING CURRENT INVENTORY');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=*&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    console.log(`✅ Found ${inventory.length} inventory items total`);
    
    if (inventory.length > 0) {
      console.log('\n📝 Sample inventory items:');
      inventory.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.item} (Store: ${item.store_id})`);
      });
    }
    
    // Step 4: Check stores
    console.log('\n🏪 STEP 4: CHECKING STORES');
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
    
    console.log(`✅ Found ${activeStores.length} active stores`);
    
    // Step 5: Analysis
    console.log('\n🧮 STEP 5: ANALYSIS');
    console.log('-'.repeat(40));
    
    if (activeTemplates.length === 0) {
      console.log('❌ PROBLEM FOUND: No active recipe templates!');
      console.log('   This explains why no ingredients were deployed.');
      console.log('   The migration script depends on active recipe templates.');
    } else if (ingredients.length === 0) {
      console.log('❌ PROBLEM FOUND: No recipe template ingredients!');
      console.log('   Recipe templates exist but have no ingredients.');
    } else {
      // Calculate unique ingredients for active templates
      const activeTemplateIds = activeTemplates.map(t => t.id);
      const activeIngredients = ingredients.filter(i => activeTemplateIds.includes(i.recipe_template_id));
      const uniqueActiveIngredients = [...new Set(activeIngredients.map(i => i.ingredient_name))];
      
      console.log(`✅ Found ${uniqueActiveIngredients.length} unique ingredients from active templates`);
      console.log(`Expected total inventory: ${uniqueActiveIngredients.length} × ${activeStores.length} = ${uniqueActiveIngredients.length * activeStores.length}`);
      console.log(`Actual inventory: ${inventory.length}`);
      
      if (inventory.length < uniqueActiveIngredients.length * activeStores.length) {
        console.log('❌ DEPLOYMENT INCOMPLETE');
        console.log('Possible reasons:');
        console.log('1. Migration script failed');
        console.log('2. Duplicate prevention logic blocked inserts');
        console.log('3. Data type conversion issues');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
