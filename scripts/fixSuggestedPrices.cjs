#!/usr/bin/env node

/**
 * Fix Suggested Prices for Recipe Templates
 * 
 * This script updates recipe templates with proper suggested prices.
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

async function updateTemplatePrices() {
  console.log('🔄 Getting templates with zero prices...');

  // Get all templates with zero or null prices
  const getTemplatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,suggested_price&or=(suggested_price.is.null,suggested_price.eq.0)',
    method: 'GET',
    headers
  };

  const templates = await makeRequest(getTemplatesOptions);
  console.log(`   Found ${templates.length} templates to update`);

  let updatedCount = 0;

  for (const template of templates) {
    const name = template.name.toLowerCase();
    const category = template.category_name?.toLowerCase() || '';

    let newPrice = 25.00; // default

    // Determine price based on name and category
    if (category === 'main' && name.includes('croffle')) {
      newPrice = 125.00;
    } else if (category === 'main' && (name.includes('coffee') || name.includes('americano') || name.includes('latte') || name.includes('mocha'))) {
      newPrice = 65.00;
    } else if (category === 'main' && name.includes('blended')) {
      newPrice = 95.00;
    } else if (category === 'main' && (name.includes('iced') || name.includes('cold'))) {
      newPrice = 70.00;
    } else if (category === 'main' && name.includes('hot')) {
      newPrice = 65.00;
    } else if (category === 'main' && (name.includes('tea') || name.includes('lemonade') || name.includes('juice'))) {
      newPrice = 60.00;
    } else if (category === 'main' && (name.includes('bottled') || name.includes('coke') || name.includes('sprite'))) {
      newPrice = 25.00;
    } else if (category === 'add-on' || category === 'topping') {
      newPrice = 15.00;
    } else if (category === 'combo') {
      newPrice = 135.00;
    } else if (category === 'main') {
      newPrice = 85.00;
    }

    // Update the template
    const updateOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_templates?id=eq.${template.id}`,
      method: 'PATCH',
      headers
    };

    try {
      await makeRequest(updateOptions, {
        suggested_price: newPrice,
        updated_at: new Date().toISOString()
      });

      console.log(`   ✅ ${template.name}: ₱${newPrice}`);
      updatedCount++;
    } catch (error) {
      console.log(`   ❌ Failed to update ${template.name}: ${error.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Updated ${updatedCount} templates`);
  return updatedCount;
}

async function main() {
  try {
    console.log('🚀 FIXING SUGGESTED PRICES');
    console.log('='.repeat(50));

    await authenticateAdmin();

    const updatedCount = await updateTemplatePrices();
    
    // Verify the update
    console.log('\n🔍 Verifying price updates...');
    
    const verifyOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=name,category_name,suggested_price&order=category_name,name',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(verifyOptions);
    
    console.log(`\n📊 Updated ${templates.length} recipe templates:`);
    
    const priceStats = {};
    templates.forEach(template => {
      const price = template.suggested_price || 0;
      if (!priceStats[price]) priceStats[price] = 0;
      priceStats[price]++;
    });
    
    console.log('\n💰 Price distribution:');
    Object.entries(priceStats)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .forEach(([price, count]) => {
        console.log(`   ₱${price}: ${count} templates`);
      });
    
    const zeroPriceCount = templates.filter(t => !t.suggested_price || t.suggested_price === 0).length;
    
    if (zeroPriceCount === 0) {
      console.log('\n🎉 SUCCESS: All recipe templates now have suggested prices!');
    } else {
      console.log(`\n⚠️  WARNING: ${zeroPriceCount} templates still have zero prices`);
    }
    
  } catch (error) {
    console.error('❌ Price update failed:', error.message);
    process.exit(1);
  }
}

main();
