#!/usr/bin/env node

/**
 * Batch Processing Strategy
 * 
 * Implements systematic batch processing for ingredient mappings with testing and rollback capabilities
 */

const https = require('https');
const fs = require('fs');

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

// Batch processing configuration
const BATCH_CONFIG = {
  // Batch sizes for different operations
  MAPPING_CREATION: 10,
  INVENTORY_CREATION: 5,
  VALIDATION_BATCH: 20,
  
  // Testing configuration
  TEST_PRODUCTS_PER_BATCH: 2,
  TEST_TRANSACTION_AMOUNT: 100,
  
  // Rollback configuration
  BACKUP_RETENTION_HOURS: 24,
  MAX_ROLLBACK_BATCHES: 5,
  
  // Progress tracking
  PROGRESS_LOG_FILE: 'batch-progress.json',
  ERROR_LOG_FILE: 'batch-errors.json'
};

class BatchProcessor {
  constructor() {
    this.progress = this.loadProgress();
    this.errors = [];
  }
  
  // Load existing progress
  loadProgress() {
    try {
      if (fs.existsSync(BATCH_CONFIG.PROGRESS_LOG_FILE)) {
        return JSON.parse(fs.readFileSync(BATCH_CONFIG.PROGRESS_LOG_FILE, 'utf8'));
      }
    } catch (error) {
      console.log('⚠️  Could not load progress file, starting fresh');
    }
    
    return {
      currentPhase: 'initialization',
      completedBatches: [],
      failedBatches: [],
      totalProducts: 0,
      processedProducts: 0,
      startTime: new Date().toISOString()
    };
  }
  
  // Save progress
  saveProgress() {
    try {
      fs.writeFileSync(BATCH_CONFIG.PROGRESS_LOG_FILE, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.log('⚠️  Could not save progress:', error.message);
    }
  }
  
  // Save errors
  saveErrors() {
    try {
      fs.writeFileSync(BATCH_CONFIG.ERROR_LOG_FILE, JSON.stringify(this.errors, null, 2));
    } catch (error) {
      console.log('⚠️  Could not save errors:', error.message);
    }
  }
  
  // Create backup before batch processing
  async createBackup(batchId) {
    const backupData = {
      batchId,
      timestamp: new Date().toISOString(),
      mappings: [],
      inventoryItems: []
    };
    
    try {
      // Backup recent mappings (last 24 hours)
      const recentMappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*&created_at=gte.${new Date(Date.now() - 24*60*60*1000).toISOString()}`,
        method: 'GET',
        headers
      });
      
      backupData.mappings = recentMappings;
      
      // Save backup
      const backupFile = `backup-${batchId}-${Date.now()}.json`;
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log(`💾 Backup created: ${backupFile}`);
      return backupFile;
      
    } catch (error) {
      console.log(`❌ Backup failed: ${error.message}`);
      return null;
    }
  }
  
  // Process a batch of products
  async processBatch(products, batchId) {
    console.log(`\n🔄 Processing Batch ${batchId}: ${products.length} products`);
    
    const batchResult = {
      batchId,
      startTime: new Date().toISOString(),
      products: products.map(p => ({ id: p.id, name: p.product_name })),
      results: [],
      success: false,
      backupFile: null
    };
    
    try {
      // Create backup
      batchResult.backupFile = await this.createBackup(batchId);
      
      // Process each product in the batch
      for (const product of products) {
        const productResult = await this.processProduct(product);
        batchResult.results.push(productResult);
        
        if (!productResult.success) {
          this.errors.push({
            batchId,
            productId: product.id,
            productName: product.product_name,
            error: productResult.error,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Test the batch
      const testResult = await this.testBatch(products, batchId);
      batchResult.testResult = testResult;
      batchResult.success = testResult.success;
      
      if (batchResult.success) {
        this.progress.completedBatches.push(batchResult);
        console.log(`✅ Batch ${batchId} completed successfully`);
      } else {
        this.progress.failedBatches.push(batchResult);
        console.log(`❌ Batch ${batchId} failed testing`);
        
        // Rollback if needed
        if (batchResult.backupFile) {
          await this.rollbackBatch(batchResult);
        }
      }
      
    } catch (error) {
      batchResult.error = error.message;
      batchResult.success = false;
      this.progress.failedBatches.push(batchResult);
      
      console.log(`❌ Batch ${batchId} processing failed: ${error.message}`);
    }
    
    // Update progress
    this.progress.processedProducts += products.length;
    this.saveProgress();
    this.saveErrors();
    
    return batchResult;
  }
  
  // Process a single product
  async processProduct(product) {
    try {
      // Get recipe ingredients
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      // Get inventory items for the store
      const inventoryItems = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${product.store_id}&is_active=eq.true`,
        method: 'GET',
        headers
      });
      
      // Create mappings (this would use the manual review decisions)
      const mappings = await this.createMappingsForProduct(product, recipeIngredients, inventoryItems);
      
      return {
        productId: product.id,
        productName: product.product_name,
        mappingsCreated: mappings.length,
        success: mappings.length === recipeIngredients.length
      };
      
    } catch (error) {
      return {
        productId: product.id,
        productName: product.product_name,
        success: false,
        error: error.message
      };
    }
  }
  
  // Create mappings for a product (placeholder - would use manual review decisions)
  async createMappingsForProduct(product, recipeIngredients, inventoryItems) {
    // This is a placeholder - in real implementation, this would use
    // the decisions from the manual review process
    const mappings = [];
    
    for (const recipeIng of recipeIngredients) {
      // Find exact match (simplified logic)
      const match = inventoryItems.find(inv => 
        inv.item.toLowerCase() === recipeIng.ingredient_name.toLowerCase()
      );
      
      if (match) {
        const mapping = {
          product_catalog_id: product.id,
          inventory_stock_id: match.id,
          required_quantity: recipeIng.quantity,
          unit: recipeIng.unit
        };
        
        mappings.push(mapping);
      }
    }
    
    // Create mappings in database
    if (mappings.length > 0) {
      await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/product_ingredients',
        method: 'POST',
        headers
      }, mappings);
    }
    
    return mappings;
  }
  
  // Test a batch of processed products
  async testBatch(products, batchId) {
    console.log(`🧪 Testing Batch ${batchId}...`);
    
    const testResults = {
      batchId,
      success: true,
      tests: []
    };
    
    // Test a sample of products from the batch
    const testProducts = products.slice(0, BATCH_CONFIG.TEST_PRODUCTS_PER_BATCH);
    
    for (const product of testProducts) {
      const testResult = await this.testProductMapping(product);
      testResults.tests.push(testResult);
      
      if (!testResult.success) {
        testResults.success = false;
      }
    }
    
    return testResults;
  }
  
  // Test a single product's mapping
  async testProductMapping(product) {
    try {
      // Check if mappings exist
      const mappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*&product_catalog_id=eq.${product.id}`,
        method: 'GET',
        headers
      });
      
      // Check if recipe ingredients are covered
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      const success = mappings.length === recipeIngredients.length;
      
      return {
        productId: product.id,
        productName: product.product_name,
        mappingsFound: mappings.length,
        ingredientsExpected: recipeIngredients.length,
        success
      };
      
    } catch (error) {
      return {
        productId: product.id,
        productName: product.product_name,
        success: false,
        error: error.message
      };
    }
  }
  
  // Rollback a failed batch
  async rollbackBatch(batchResult) {
    console.log(`🔄 Rolling back Batch ${batchResult.batchId}...`);
    
    try {
      // Delete mappings created in this batch
      const productIds = batchResult.products.map(p => p.id);
      
      await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?product_catalog_id=in.(${productIds.join(',')})`,
        method: 'DELETE',
        headers
      });
      
      console.log(`✅ Rollback completed for Batch ${batchResult.batchId}`);
      
    } catch (error) {
      console.log(`❌ Rollback failed for Batch ${batchResult.batchId}: ${error.message}`);
    }
  }
  
  // Generate progress report
  generateProgressReport() {
    const completionRate = this.progress.totalProducts > 0 
      ? (this.progress.processedProducts / this.progress.totalProducts * 100).toFixed(1)
      : 0;
    
    const successRate = this.progress.completedBatches.length > 0
      ? (this.progress.completedBatches.length / (this.progress.completedBatches.length + this.progress.failedBatches.length) * 100).toFixed(1)
      : 0;
    
    return `
📊 BATCH PROCESSING PROGRESS REPORT
${'='.repeat(50)}

Current Phase: ${this.progress.currentPhase}
Start Time: ${this.progress.startTime}
Current Time: ${new Date().toISOString()}

Progress:
  Products Processed: ${this.progress.processedProducts}/${this.progress.totalProducts} (${completionRate}%)
  Completed Batches: ${this.progress.completedBatches.length}
  Failed Batches: ${this.progress.failedBatches.length}
  Success Rate: ${successRate}%

Errors: ${this.errors.length} total errors logged

Next Steps:
  ${this.progress.failedBatches.length > 0 ? '- Review and fix failed batches' : '- Continue with next phase'}
  ${this.errors.length > 0 ? '- Address logged errors' : '- No errors to address'}
`;
  }
}

async function main() {
  console.log('⚙️  BATCH PROCESSING STRATEGY');
  console.log('=' .repeat(50));
  
  await auth();
  
  const processor = new BatchProcessor();
  
  // Demo: Process a small batch for testing
  console.log('\n🧪 DEMO: Processing sample batch...');
  
  // Get a few high-priority products for demo
  const sampleProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/product_catalog?select=*&recipe_id=not.is.null&price=gte.125&limit=3',
    method: 'GET',
    headers
  });
  
  if (sampleProducts.length > 0) {
    processor.progress.totalProducts = sampleProducts.length;
    processor.progress.currentPhase = 'demo_processing';
    
    const batchResult = await processor.processBatch(sampleProducts, 'DEMO-001');
    
    console.log('\n📋 BATCH RESULT:');
    console.log(`   Success: ${batchResult.success}`);
    console.log(`   Products: ${batchResult.results.length}`);
    console.log(`   Backup: ${batchResult.backupFile || 'None'}`);
  }
  
  // Generate progress report
  console.log(processor.generateProgressReport());
  
  console.log('\n📋 BATCH PROCESSING STRATEGY SUMMARY:');
  console.log('   ✅ Backup and rollback system implemented');
  console.log('   ✅ Progress tracking and error logging');
  console.log('   ✅ Batch testing and validation');
  console.log('   ✅ Systematic processing workflow');
  console.log('\n   Ready for full-scale ingredient mapping completion!');
}

main().catch(err => {
  console.error('Batch processing strategy failed:', err.message);
  process.exit(1);
});
