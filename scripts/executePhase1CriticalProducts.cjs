#!/usr/bin/env node

/**
 * Execute Phase 1: Critical Priority Products
 * 
 * Systematic fixing of 156 critical priority products to restore inventory deduction
 */

const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Phase 1 Configuration
const PHASE1_CONFIG = {
  TARGET_PRODUCTS: 156,
  BATCH_SIZE: 10,
  MIN_PRICE_CRITICAL: 90, // ₱90+ for critical priority
  CROFFLE_PRICE: 125,
  BLENDED_DRINK_MIN: 90,
  BLENDED_DRINK_MAX: 110
};

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

class Phase1Executor {
  constructor() {
    this.progress = {
      phase: 'Phase 1: Critical Priority',
      startTime: new Date().toISOString(),
      totalTargetProducts: PHASE1_CONFIG.TARGET_PRODUCTS,
      processedProducts: 0,
      successfulFixes: 0,
      failedFixes: 0,
      batches: [],
      currentBatch: 0
    };
    
    this.stats = {
      crofflesFixed: 0,
      blendedDrinksFixed: 0,
      keyIngredientsFixed: 0,
      packagingFixed: 0
    };
  }
  
  async execute() {
    console.log('🚀 EXECUTING PHASE 1: CRITICAL PRIORITY PRODUCTS');
    console.log('=' .repeat(70));
    console.log(`Target: ${PHASE1_CONFIG.TARGET_PRODUCTS} critical priority products`);
    console.log(`Focus: Croffles (₱${PHASE1_CONFIG.CROFFLE_PRICE}) and Blended Drinks (₱${PHASE1_CONFIG.BLENDED_DRINK_MIN}-₱${PHASE1_CONFIG.BLENDED_DRINK_MAX})`);
    console.log(`Batch Size: ${PHASE1_CONFIG.BATCH_SIZE} products per batch`);
    console.log('=' .repeat(70));
    
    // Step 1: Identify critical priority products
    const criticalProducts = await this.identifyCriticalProducts();
    
    if (criticalProducts.length === 0) {
      console.log('✅ No critical priority products need fixing!');
      return this.progress;
    }
    
    console.log(`\n📊 CRITICAL PRODUCTS IDENTIFIED: ${criticalProducts.length}`);
    this.progress.totalTargetProducts = criticalProducts.length;
    
    // Step 2: Process in batches
    const batches = this.createBatches(criticalProducts);
    console.log(`📦 PROCESSING IN ${batches.length} BATCHES`);
    
    for (let i = 0; i < batches.length; i++) {
      this.progress.currentBatch = i + 1;
      console.log(`\n🔄 PROCESSING BATCH ${i + 1}/${batches.length}`);
      
      const batchResult = await this.processBatch(batches[i], i + 1);
      this.progress.batches.push(batchResult);
      
      // Update progress
      this.progress.processedProducts += batchResult.products.length;
      this.progress.successfulFixes += batchResult.successCount;
      this.progress.failedFixes += batchResult.failureCount;
      
      // Test batch if successful
      if (batchResult.successCount > 0) {
        await this.testBatch(batchResult);
      }
      
      // Save progress
      this.saveProgress();
      
      console.log(`✅ Batch ${i + 1} complete: ${batchResult.successCount}/${batchResult.products.length} successful`);
    }
    
    // Step 3: Generate final report
    await this.generatePhase1Report();
    
    return this.progress;
  }
  
  async identifyCriticalProducts() {
    console.log('\n🔍 IDENTIFYING CRITICAL PRIORITY PRODUCTS...');
    
    const criticalProducts = [];
    
    // Get all active stores
    const stores = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
      method: 'GET',
      headers
    });
    
    for (const store of stores) {
      console.log(`   🏪 Analyzing: ${store.name}`);
      
      // Get high-priority unmapped products
      const products = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null&price=gte.${PHASE1_CONFIG.MIN_PRICE_CRITICAL}&is_available=eq.true&order=price.desc`,
        method: 'GET',
        headers
      });
      
      // Get existing mappings
      if (products.length > 0) {
        const existingMappings = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${products.map(p => p.id).join(',')})`,
          method: 'GET',
          headers
        });
        
        const mappedProductIds = new Set(existingMappings.map(m => m.product_catalog_id));
        const unmappedProducts = products.filter(p => !mappedProductIds.has(p.id));
        
        // Add store info and categorize
        unmappedProducts.forEach(product => {
          product.storeName = store.name;
          product.category = this.categorizeProduct(product);
          product.priority = this.calculatePriority(product);
        });
        
        criticalProducts.push(...unmappedProducts);
        console.log(`     📦 Found ${unmappedProducts.length} critical unmapped products`);
      }
    }
    
    // Sort by priority (highest first)
    criticalProducts.sort((a, b) => b.priority - a.priority);
    
    // Show top priorities
    console.log(`\n🎯 TOP 10 CRITICAL PRIORITIES:`);
    criticalProducts.slice(0, 10).forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.product_name} (${product.storeName}) - ₱${product.price} - ${product.category}`);
    });
    
    return criticalProducts;
  }
  
  categorizeProduct(product) {
    const name = product.product_name.toLowerCase();
    
    if (name.includes('croffle')) return 'Croffle';
    if (name.includes('blended')) return 'Blended Drink';
    if (name.includes('iced tea') || name.includes('lemonade')) return 'Standard Drink';
    if (name.includes('sauce') || name.includes('jam') || name.includes('syrup')) return 'Key Ingredient';
    if (name.includes('cup') || name.includes('lid') || name.includes('bag')) return 'Essential Packaging';
    return 'Other';
  }
  
  calculatePriority(product) {
    let priority = 0;
    
    // Price impact (40%)
    if (product.price >= 125) priority += 40; // Croffles
    else if (product.price >= 90) priority += 35; // Blended drinks
    else if (product.price >= 60) priority += 25; // Standard drinks
    else priority += 15;
    
    // Category impact (30%)
    const category = this.categorizeProduct(product);
    if (category === 'Croffle') priority += 30;
    else if (category === 'Blended Drink') priority += 28;
    else if (category === 'Key Ingredient') priority += 25;
    else if (category === 'Essential Packaging') priority += 20;
    else priority += 15;
    
    // Availability impact (20%)
    if (product.is_available) priority += 20;
    else priority += 5;
    
    // Store impact (10%) - some stores may be higher priority
    priority += 10; // Base store priority
    
    return Math.min(priority, 100);
  }
  
  createBatches(products) {
    const batches = [];
    
    for (let i = 0; i < products.length; i += PHASE1_CONFIG.BATCH_SIZE) {
      const batch = products.slice(i, i + PHASE1_CONFIG.BATCH_SIZE);
      batches.push(batch);
    }
    
    return batches;
  }
  
  async processBatch(products, batchNumber) {
    console.log(`\n📦 BATCH ${batchNumber}: Processing ${products.length} products`);
    console.log('-'.repeat(50));
    
    const batchResult = {
      batchNumber,
      products: products.map(p => ({ id: p.id, name: p.product_name, category: p.category })),
      results: [],
      successCount: 0,
      failureCount: 0,
      startTime: new Date().toISOString()
    };
    
    for (const product of products) {
      console.log(`\n   🔄 Processing: ${product.product_name} (${product.category})`);
      
      try {
        const result = await this.processProduct(product);
        batchResult.results.push(result);
        
        if (result.success) {
          batchResult.successCount++;
          this.updateStats(product.category);
          console.log(`     ✅ Success: ${result.mappingsCreated} mappings created`);
        } else {
          batchResult.failureCount++;
          console.log(`     ❌ Failed: ${result.error}`);
        }
        
      } catch (error) {
        batchResult.results.push({
          productId: product.id,
          productName: product.product_name,
          success: false,
          error: error.message
        });
        batchResult.failureCount++;
        console.log(`     ❌ Error: ${error.message}`);
      }
    }
    
    batchResult.endTime = new Date().toISOString();
    return batchResult;
  }
  
  async processProduct(product) {
    // Get recipe ingredients
    const recipeIngredients = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
      method: 'GET',
      headers
    });
    
    if (recipeIngredients.length === 0) {
      return {
        productId: product.id,
        productName: product.product_name,
        success: false,
        error: 'No recipe ingredients found'
      };
    }
    
    // Get inventory items for this store
    const inventoryItems = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${product.store_id}&is_active=eq.true`,
      method: 'GET',
      headers
    });
    
    // Create mappings using fuzzy matching
    const mappings = [];
    
    for (const recipeIng of recipeIngredients) {
      // Find best match
      const match = this.findBestInventoryMatch(recipeIng.ingredient_name, inventoryItems);
      
      if (match && match.similarity >= 0.8) {
        mappings.push({
          product_catalog_id: product.id,
          inventory_stock_id: match.inventory.id,
          required_quantity: recipeIng.quantity,
          unit: recipeIng.unit
        });
      }
    }
    
    // Only create mappings if we have a complete set
    if (mappings.length === recipeIngredients.length) {
      // Create mappings in database
      await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/product_ingredients',
        method: 'POST',
        headers
      }, mappings);
      
      return {
        productId: product.id,
        productName: product.product_name,
        success: true,
        mappingsCreated: mappings.length,
        totalIngredients: recipeIngredients.length
      };
    } else {
      return {
        productId: product.id,
        productName: product.product_name,
        success: false,
        error: `Only ${mappings.length}/${recipeIngredients.length} ingredients could be mapped`,
        partialMappings: mappings.length
      };
    }
  }
  
  findBestInventoryMatch(ingredientName, inventoryItems) {
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const inventory of inventoryItems) {
      const similarity = this.calculateSimilarity(ingredientName, inventory.item);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = { inventory, similarity };
      }
    }
    
    return bestMatch;
  }
  
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }
  
  updateStats(category) {
    switch (category) {
      case 'Croffle':
        this.stats.crofflesFixed++;
        break;
      case 'Blended Drink':
        this.stats.blendedDrinksFixed++;
        break;
      case 'Key Ingredient':
        this.stats.keyIngredientsFixed++;
        break;
      case 'Essential Packaging':
        this.stats.packagingFixed++;
        break;
    }
  }
  
  async testBatch(batchResult) {
    console.log(`\n🧪 TESTING BATCH ${batchResult.batchNumber}...`);
    
    // Test a sample of successful products
    const successfulProducts = batchResult.results.filter(r => r.success);
    const testSample = successfulProducts.slice(0, 2); // Test 2 products per batch
    
    for (const result of testSample) {
      try {
        // Verify mappings exist
        const mappings = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_ingredients?select=*&product_catalog_id=eq.${result.productId}`,
          method: 'GET',
          headers
        });
        
        console.log(`     ✅ ${result.productName}: ${mappings.length} mappings verified`);
        
      } catch (error) {
        console.log(`     ❌ ${result.productName}: Test failed - ${error.message}`);
      }
    }
  }
  
  saveProgress() {
    try {
      fs.writeFileSync('phase1-progress.json', JSON.stringify({
        progress: this.progress,
        stats: this.stats
      }, null, 2));
    } catch (error) {
      console.log('⚠️  Could not save progress:', error.message);
    }
  }
  
  async generatePhase1Report() {
    console.log('\n📋 PHASE 1 EXECUTION REPORT');
    console.log('=' .repeat(70));
    
    const duration = (new Date() - new Date(this.progress.startTime)) / (1000 * 60);
    const successRate = this.progress.processedProducts > 0 
      ? ((this.progress.successfulFixes / this.progress.processedProducts) * 100).toFixed(1)
      : 0;
    
    console.log(`📊 EXECUTION SUMMARY:`);
    console.log(`   Duration: ${Math.round(duration)} minutes`);
    console.log(`   Products Processed: ${this.progress.processedProducts}`);
    console.log(`   Successful Fixes: ${this.progress.successfulFixes}`);
    console.log(`   Failed Fixes: ${this.progress.failedFixes}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Batches Completed: ${this.progress.batches.length}`);
    
    console.log(`\n📈 CATEGORY BREAKDOWN:`);
    console.log(`   Croffles Fixed: ${this.stats.crofflesFixed}`);
    console.log(`   Blended Drinks Fixed: ${this.stats.blendedDrinksFixed}`);
    console.log(`   Key Ingredients Fixed: ${this.stats.keyIngredientsFixed}`);
    console.log(`   Packaging Fixed: ${this.stats.packagingFixed}`);
    
    console.log(`\n🎯 PHASE 1 STATUS:`);
    if (this.progress.successfulFixes >= 50) {
      console.log(`   ✅ PHASE 1 SUCCESSFUL: Major progress made`);
      console.log(`   🎉 High-revenue products now have inventory deduction`);
    } else if (this.progress.successfulFixes >= 20) {
      console.log(`   ⚠️  PHASE 1 PARTIAL: Some progress made`);
      console.log(`   🔄 Continue with manual review for remaining products`);
    } else {
      console.log(`   ❌ PHASE 1 NEEDS ATTENTION: Limited success`);
      console.log(`   🔧 Review approach and address systematic issues`);
    }
    
    console.log(`\n💡 NEXT STEPS:`);
    console.log(`   1. Test inventory deduction on fixed products`);
    console.log(`   2. Process remaining critical products manually`);
    console.log(`   3. Move to Phase 2: High Priority products`);
    console.log(`   4. Monitor inventory levels for accuracy`);
  }
}

async function main() {
  await auth();
  
  const executor = new Phase1Executor();
  const result = await executor.execute();
  
  console.log('\n🏆 PHASE 1 EXECUTION COMPLETE');
  console.log(`Final Status: ${result.successfulFixes} products fixed`);
}

main().catch(err => {
  console.error('Phase 1 execution failed:', err.message);
  process.exit(1);
});
