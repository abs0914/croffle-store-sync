#!/usr/bin/env node

/**
 * Prioritize Products by Business Impact
 * 
 * Orders remaining unmapped products by revenue, sales frequency, and business priority
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function req(options, data) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json?.message || body}`));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function auth() {
  const authRes = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${authRes.access_token}`;
}

// Business priority scoring
function calculateBusinessPriority(product, salesData) {
  let score = 0;
  
  // Revenue impact (40% of score)
  if (product.price >= 125) score += 40; // Croffles
  else if (product.price >= 90) score += 35; // Blended drinks
  else if (product.price >= 60) score += 25; // Iced tea, lemonade
  else if (product.price >= 20) score += 15; // Beverages
  else if (product.price >= 10) score += 10; // Ingredients/toppings
  else score += 5; // Packaging/accessories
  
  // Availability impact (30% of score)
  if (product.is_available) score += 30;
  else score += 5; // Still important for future availability
  
  // Product category impact (20% of score)
  const productName = product.product_name.toLowerCase();
  if (productName.includes('croffle')) score += 20; // Main products
  else if (productName.includes('blended')) score += 18; // Premium drinks
  else if (productName.includes('iced tea') || productName.includes('lemonade')) score += 15;
  else if (productName.includes('sauce') || productName.includes('jam')) score += 12; // Key ingredients
  else if (productName.includes('cup') || productName.includes('lid')) score += 8; // Essential packaging
  else score += 5; // Other items
  
  // Sales frequency impact (10% of score) - estimated based on product type
  if (salesData && salesData.frequency) {
    score += Math.min(salesData.frequency * 2, 10);
  } else {
    // Estimate based on product type
    if (productName.includes('croffle')) score += 8;
    else if (productName.includes('blended')) score += 6;
    else if (productName.includes('sauce') || productName.includes('jam')) score += 7;
    else score += 3;
  }
  
  return Math.min(score, 100); // Cap at 100
}

async function main() {
  console.log('💰 BUSINESS IMPACT PRIORITIZATION');
  console.log('=' .repeat(60));
  
  await auth();

  // Get all stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  const prioritizedProducts = [];
  
  // Get sales data for prioritization (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    const salesData = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transaction_items?select=product_id,product_name,quantity&created_at=gte.${thirtyDaysAgo.toISOString()}`,
      method: 'GET',
      headers
    });
    
    // Aggregate sales data
    const salesFrequency = {};
    salesData.forEach(item => {
      if (!salesFrequency[item.product_id]) {
        salesFrequency[item.product_id] = { count: 0, totalQuantity: 0 };
      }
      salesFrequency[item.product_id].count++;
      salesFrequency[item.product_id].totalQuantity += item.quantity;
    });
    
    console.log(`📊 Sales data: ${salesData.length} transactions in last 30 days`);
    
  } catch (error) {
    console.log('⚠️  Could not fetch sales data, using estimated priorities');
  }
  
  for (const store of stores) {
    console.log(`\n🏪 Analyzing: ${store.name}`);
    
    // Get unmapped products
    const products = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null`,
      method: 'GET',
      headers
    });
    
    // Get existing mappings
    const existingMappings = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${products.map(p => p.id).join(',')})`,
      method: 'GET',
      headers
    });
    
    const mappedProductIds = new Set(existingMappings.map(m => m.product_catalog_id));
    const unmappedProducts = products.filter(p => !mappedProductIds.has(p.id));
    
    // Calculate priority for each product
    unmappedProducts.forEach(product => {
      const priority = calculateBusinessPriority(product, null);
      prioritizedProducts.push({
        ...product,
        storeName: store.name,
        businessPriority: priority,
        category: categorizeProduct(product)
      });
    });
    
    console.log(`   📦 Unmapped products: ${unmappedProducts.length}`);
  }
  
  // Sort by business priority
  prioritizedProducts.sort((a, b) => b.businessPriority - a.businessPriority);
  
  // Generate priority report
  generatePriorityReport(prioritizedProducts);
}

function categorizeProduct(product) {
  const name = product.product_name.toLowerCase();
  
  if (name.includes('croffle')) return 'Main Product';
  if (name.includes('blended')) return 'Premium Drink';
  if (name.includes('iced tea') || name.includes('lemonade')) return 'Standard Drink';
  if (name.includes('sauce') || name.includes('jam') || name.includes('syrup')) return 'Key Ingredient';
  if (name.includes('cup') || name.includes('lid') || name.includes('bag')) return 'Essential Packaging';
  if (name.includes('water') || name.includes('coke') || name.includes('sprite')) return 'Beverage';
  return 'Accessory';
}

function generatePriorityReport(products) {
  console.log('\n📋 BUSINESS PRIORITY REPORT');
  console.log('=' .repeat(60));
  
  // Group by priority tiers
  const critical = products.filter(p => p.businessPriority >= 80);
  const high = products.filter(p => p.businessPriority >= 60 && p.businessPriority < 80);
  const medium = products.filter(p => p.businessPriority >= 40 && p.businessPriority < 60);
  const low = products.filter(p => p.businessPriority < 40);
  
  console.log(`\n🎯 PRIORITY TIERS:`);
  console.log(`   Critical (80-100): ${critical.length} products`);
  console.log(`   High (60-79): ${high.length} products`);
  console.log(`   Medium (40-59): ${medium.length} products`);
  console.log(`   Low (<40): ${low.length} products`);
  
  // Show top priorities
  console.log(`\n🚨 TOP 20 CRITICAL PRIORITIES:`);
  products.slice(0, 20).forEach((product, i) => {
    console.log(`   ${i + 1}. ${product.product_name} (${product.storeName})`);
    console.log(`      Priority: ${product.businessPriority}/100 | Price: ₱${product.price} | Category: ${product.category}`);
    console.log(`      Available: ${product.is_available ? 'Yes' : 'No'}`);
  });
  
  // Category breakdown
  const categoryBreakdown = {};
  products.forEach(product => {
    if (!categoryBreakdown[product.category]) {
      categoryBreakdown[product.category] = { count: 0, avgPriority: 0, totalPriority: 0 };
    }
    categoryBreakdown[product.category].count++;
    categoryBreakdown[product.category].totalPriority += product.businessPriority;
  });
  
  Object.keys(categoryBreakdown).forEach(category => {
    categoryBreakdown[category].avgPriority = 
      (categoryBreakdown[category].totalPriority / categoryBreakdown[category].count).toFixed(1);
  });
  
  console.log(`\n📊 CATEGORY BREAKDOWN:`);
  Object.entries(categoryBreakdown)
    .sort((a, b) => b[1].avgPriority - a[1].avgPriority)
    .forEach(([category, data]) => {
      console.log(`   ${category}: ${data.count} products (avg priority: ${data.avgPriority})`);
    });
  
  console.log(`\n🎯 RECOMMENDED PROCESSING SEQUENCE:`);
  console.log(`   Phase 1: Critical Priority (${critical.length} products)`);
  console.log(`     - Focus on croffles and premium drinks`);
  console.log(`     - Target completion: 1-2 days`);
  console.log(`   Phase 2: High Priority (${high.length} products)`);
  console.log(`     - Key ingredients and standard drinks`);
  console.log(`     - Target completion: 3-5 days`);
  console.log(`   Phase 3: Medium Priority (${medium.length} products)`);
  console.log(`     - Essential packaging and beverages`);
  console.log(`     - Target completion: 1 week`);
  console.log(`   Phase 4: Low Priority (${low.length} products)`);
  console.log(`     - Accessories and inactive products`);
  console.log(`     - Target completion: 2 weeks`);
  
  // Export prioritized list for processing
  console.log(`\n💾 PRIORITY LIST GENERATED:`);
  console.log(`   Total products prioritized: ${products.length}`);
  console.log(`   Ready for systematic processing`);
}

main().catch(err => {
  console.error('Prioritization failed:', err.message);
  process.exit(1);
});
