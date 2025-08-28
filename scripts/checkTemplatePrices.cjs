#!/usr/bin/env node

/**
 * Check Template Prices
 * 
 * This script investigates why template prices are missing
 * and shows what data is actually in the recipe templates.
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
          const result = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result?.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          resolve(body);
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
  console.log('🔐 Authenticating admin user...');
  
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
  
  if (authResult.access_token) {
    headers.Authorization = `Bearer ${authResult.access_token}`;
    console.log('✅ Admin authenticated successfully');
  } else {
    throw new Error('Authentication failed');
  }
}

async function checkTemplateData() {
  console.log('\n🔍 Checking recipe template data...');
  
  // Get all recipe templates with all fields
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=*&is_active=eq.true&limit=10',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  
  console.log(`   Found ${templates.length} active templates (showing first 10)`);
  console.log('\n   📋 Template Data Sample:');
  
  templates.forEach((template, index) => {
    console.log(`\n   ${index + 1}. ${template.name}`);
    console.log(`      ID: ${template.id}`);
    console.log(`      Category: ${template.category_name}`);
    console.log(`      Description: ${template.description || 'N/A'}`);
    console.log(`      Suggested Price: ${template.suggested_price || 'NULL/MISSING'}`);
    console.log(`      Created: ${template.created_at}`);
    console.log(`      Active: ${template.is_active}`);
  });
  
  // Check if any templates have prices
  const templatesWithPrices = templates.filter(t => t.suggested_price && t.suggested_price > 0);
  const templatesWithoutPrices = templates.filter(t => !t.suggested_price || t.suggested_price === 0);
  
  console.log('\n   📊 PRICE ANALYSIS:');
  console.log(`      Templates with prices: ${templatesWithPrices.length}`);
  console.log(`      Templates without prices: ${templatesWithoutPrices.length}`);
  
  if (templatesWithPrices.length > 0) {
    console.log('\n   💰 Templates WITH prices:');
    templatesWithPrices.forEach(t => {
      console.log(`      ✅ ${t.name}: ₱${t.suggested_price}`);
    });
  }
  
  if (templatesWithoutPrices.length > 0) {
    console.log('\n   ⚠️ Templates WITHOUT prices:');
    templatesWithoutPrices.slice(0, 5).forEach(t => {
      console.log(`      ❌ ${t.name}: ${t.suggested_price || 'NULL'}`);
    });
    if (templatesWithoutPrices.length > 5) {
      console.log(`      ... and ${templatesWithoutPrices.length - 5} more`);
    }
  }
  
  return { templates, templatesWithPrices, templatesWithoutPrices };
}

async function checkCSVImportCode() {
  console.log('\n🔍 Checking if CSV import includes price field...');
  
  // This is informational - we'll check what fields are expected
  console.log('   📋 Expected CSV columns for recipe import:');
  console.log('      - recipe_name (product name)');
  console.log('      - recipe_category (category)');
  console.log('      - recipe_description (description)');
  console.log('      - suggested_price (PRICE - this might be missing!)');
  console.log('      - ingredient_name');
  console.log('      - quantity');
  console.log('      - unit');
  console.log('      - cost_per_unit');
  
  console.log('\n   🎯 LIKELY ISSUE:');
  console.log('      The CSV import might not be reading the price column');
  console.log('      OR the CSV file might not have a price column');
  console.log('      OR the price column has a different name');
}

async function main() {
  try {
    console.log('🔍 CHECK TEMPLATE PRICES');
    console.log('='.repeat(50));
    console.log('This script investigates why template prices are missing');
    console.log('');
    
    await authenticateAdmin();
    
    // Check template data
    const result = await checkTemplateData();
    
    // Check CSV import expectations
    await checkCSVImportCode();
    
    console.log('\n🎯 DIAGNOSIS COMPLETE!');
    console.log('='.repeat(50));
    
    if (result.templatesWithPrices.length === 0) {
      console.log('❌ PROBLEM IDENTIFIED: No templates have prices!');
      console.log('');
      console.log('🔧 POSSIBLE SOLUTIONS:');
      console.log('   1. Check your CSV file - does it have a price column?');
      console.log('   2. Check the column name - should be "suggested_price" or similar');
      console.log('   3. Re-import the CSV with proper price column');
      console.log('   4. Manually update template prices in database');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Check your original CSV file for price column');
      console.log('   2. If prices exist in CSV, re-import with correct mapping');
      console.log('   3. If no prices in CSV, add them and re-import');
      console.log('   4. Or manually set prices for each template');
    } else {
      console.log('✅ Some templates have prices - partial success!');
      console.log(`   ${result.templatesWithPrices.length} templates have prices`);
      console.log(`   ${result.templatesWithoutPrices.length} templates need prices`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

main();
