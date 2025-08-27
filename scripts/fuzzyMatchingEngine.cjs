#!/usr/bin/env node

/**
 * Fuzzy Matching Engine for Ingredient Mappings
 * 
 * Advanced fuzzy matching algorithm to automatically resolve naming mismatches
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

// Advanced fuzzy matching algorithm
class FuzzyMatcher {
  constructor() {
    // Common synonyms and variations
    this.synonyms = {
      'cups': ['cup', 'glass', 'container'],
      'lid': ['cover', 'top', 'cap'],
      'sauce': ['syrup', 'topping', 'dressing'],
      'crushed': ['crumbled', 'broken', 'pieces'],
      'powder': ['mix', 'dust'],
      'bag': ['pouch', 'sack', 'package'],
      'box': ['container', 'carton'],
      'water': ['h2o', 'aqua'],
      'tea': ['chai'],
      'coffee': ['espresso', 'brew']
    };
    
    // Common abbreviations
    this.abbreviations = {
      '16oz': ['16 oz', 'sixteen oz', 'sixteen ounce'],
      'w/': ['with', 'w'],
      '#': ['no', 'number', 'num'],
      '&': ['and']
    };
  }
  
  // Normalize text for comparison
  normalize(text) {
    let normalized = text.toLowerCase().trim();
    
    // Handle abbreviations
    Object.entries(this.abbreviations).forEach(([abbrev, expansions]) => {
      expansions.forEach(expansion => {
        normalized = normalized.replace(new RegExp(expansion, 'gi'), abbrev);
      });
    });
    
    // Remove special characters but keep spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');
    
    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  // Calculate similarity score
  calculateSimilarity(str1, str2) {
    const norm1 = this.normalize(str1);
    const norm2 = this.normalize(str2);
    
    // Exact match after normalization
    if (norm1 === norm2) return 1.0;
    
    // Contains match
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
    
    // Word-based similarity
    const words1 = norm1.split(' ').filter(w => w.length > 0);
    const words2 = norm2.split(' ').filter(w => w.length > 0);
    
    let matchingWords = 0;
    let totalWords = Math.max(words1.length, words2.length);
    
    words1.forEach(word1 => {
      const bestMatch = words2.reduce((best, word2) => {
        const similarity = this.wordSimilarity(word1, word2);
        return similarity > best ? similarity : best;
      }, 0);
      
      if (bestMatch > 0.7) matchingWords += bestMatch;
    });
    
    const wordScore = matchingWords / totalWords;
    
    // Synonym matching
    const synonymScore = this.synonymSimilarity(norm1, norm2);
    
    // Combined score
    return Math.max(wordScore, synonymScore);
  }
  
  // Word-level similarity (Levenshtein-based)
  wordSimilarity(word1, word2) {
    if (word1 === word2) return 1.0;
    if (word1.includes(word2) || word2.includes(word1)) return 0.8;
    
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    
    return 1 - (distance / maxLength);
  }
  
  // Levenshtein distance calculation
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // Synonym-based similarity
  synonymSimilarity(str1, str2) {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    let synonymMatches = 0;
    let totalComparisons = 0;
    
    words1.forEach(word1 => {
      words2.forEach(word2 => {
        totalComparisons++;
        
        // Check if words are synonyms
        Object.entries(this.synonyms).forEach(([key, synonymList]) => {
          if ((key === word1 && synonymList.includes(word2)) ||
              (key === word2 && synonymList.includes(word1)) ||
              (synonymList.includes(word1) && synonymList.includes(word2))) {
            synonymMatches++;
          }
        });
      });
    });
    
    return totalComparisons > 0 ? synonymMatches / totalComparisons : 0;
  }
  
  // Find best matches for an ingredient
  findBestMatches(ingredient, inventoryItems, threshold = 0.6) {
    const matches = inventoryItems.map(item => ({
      inventory: item,
      similarity: this.calculateSimilarity(ingredient, item.item),
      confidence: this.getConfidenceLevel(ingredient, item.item)
    }))
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
    
    return matches;
  }
  
  // Determine confidence level
  getConfidenceLevel(ingredient, inventoryItem) {
    const similarity = this.calculateSimilarity(ingredient, inventoryItem);
    
    if (similarity >= 0.95) return 'very_high';
    if (similarity >= 0.85) return 'high';
    if (similarity >= 0.75) return 'medium';
    if (similarity >= 0.6) return 'low';
    return 'very_low';
  }
}

async function main() {
  console.log('🧠 FUZZY MATCHING ENGINE');
  console.log('=' .repeat(50));
  
  await auth();
  
  const matcher = new FuzzyMatcher();
  
  // Get all stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc&limit=2',
    method: 'GET',
    headers
  });
  
  let totalProcessed = 0;
  let totalMapped = 0;
  let totalSkipped = 0;
  
  for (const store of stores) {
    console.log(`\n🏪 Processing: ${store.name}`);
    console.log('-'.repeat(40));
    
    const result = await processStoreWithFuzzyMatching(store, matcher);
    totalProcessed += result.processed;
    totalMapped += result.mapped;
    totalSkipped += result.skipped;
    
    console.log(`   ✅ Processed: ${result.processed}`);
    console.log(`   ✅ Mapped: ${result.mapped}`);
    console.log(`   ⚠️  Skipped: ${result.skipped}`);
  }
  
  console.log(`\n📊 FUZZY MATCHING SUMMARY:`);
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   Successfully Mapped: ${totalMapped}`);
  console.log(`   Skipped (Low Confidence): ${totalSkipped}`);
  console.log(`   Success Rate: ${totalProcessed > 0 ? ((totalMapped / totalProcessed) * 100).toFixed(1) : 0}%`);
}

async function processStoreWithFuzzyMatching(store, matcher) {
  const result = { processed: 0, mapped: 0, skipped: 0 };
  
  // Get high-priority unmapped products (croffles and blended drinks)
  const products = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null&price=gte.90`,
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
  
  // Get inventory items
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 High-priority unmapped: ${unmappedProducts.length}`);
  console.log(`   📦 Inventory items: ${inventoryItems.length}`);
  
  // Process each product with fuzzy matching
  for (const product of unmappedProducts.slice(0, 5)) { // Limit for safety
    result.processed++;
    
    try {
      const mapped = await processProductWithFuzzyMatching(product, inventoryItems, matcher);
      if (mapped) {
        result.mapped++;
        console.log(`   ✅ ${product.product_name}`);
      } else {
        result.skipped++;
        console.log(`   ⚠️  ${product.product_name} - low confidence matches`);
      }
    } catch (error) {
      result.skipped++;
      console.log(`   ❌ ${product.product_name} - error: ${error.message}`);
    }
  }
  
  return result;
}

async function processProductWithFuzzyMatching(product, inventoryItems, matcher) {
  // Get recipe ingredients
  const recipeIngredients = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
    method: 'GET',
    headers
  });
  
  const mappingsToCreate = [];
  let allIngredientsMatched = true;
  
  for (const recipeIng of recipeIngredients) {
    const matches = matcher.findBestMatches(recipeIng.ingredient_name, inventoryItems, 0.75);
    
    if (matches.length === 1 && matches[0].confidence !== 'low') {
      // High confidence single match
      mappingsToCreate.push({
        product_catalog_id: product.id,
        inventory_stock_id: matches[0].inventory.id,
        required_quantity: recipeIng.quantity,
        unit: recipeIng.unit
      });
    } else {
      // No high-confidence match
      allIngredientsMatched = false;
      break;
    }
  }
  
  // Create mappings only if all ingredients have high-confidence matches
  if (allIngredientsMatched && mappingsToCreate.length > 0) {
    await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients',
      method: 'POST',
      headers
    }, mappingsToCreate);
    
    return true;
  }
  
  return false;
}

main().catch(err => {
  console.error('Fuzzy matching failed:', err.message);
  process.exit(1);
});

// Export the FuzzyMatcher class for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FuzzyMatcher };
}
