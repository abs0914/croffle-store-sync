#!/usr/bin/env node

/**
 * Mapping Validator
 * 
 * Validates ingredient mappings for accuracy and completeness before implementation
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

// Validation rules
const validationRules = {
  // Unit compatibility checks
  unitCompatibility: {
    'pieces': ['pieces', 'pcs', 'piece', 'each'],
    'serving': ['serving', 'servings', 'portion', 'portions'],
    'bottles': ['bottles', 'bottle', 'btl'],
    'cups': ['cups', 'cup'],
    'grams': ['grams', 'g', 'gram'],
    'ml': ['ml', 'milliliters', 'milliliter'],
    'liters': ['liters', 'l', 'liter']
  },
  
  // Reasonable quantity ranges
  quantityRanges: {
    'pieces': { min: 1, max: 10 },
    'serving': { min: 0.5, max: 5 },
    'bottles': { min: 1, max: 3 },
    'cups': { min: 1, max: 2 },
    'grams': { min: 5, max: 500 },
    'ml': { min: 10, max: 1000 }
  },
  
  // Required ingredients for product types
  requiredIngredients: {
    'croffle': ['croissant', 'wax paper', 'chopstick'],
    'blended': ['cup', 'lid', 'straw'],
    'iced tea': ['cup', 'lid', 'straw', 'tea'],
    'lemonade': ['cup', 'lid', 'straw']
  }
};

class MappingValidator {
  constructor() {
    this.validationErrors = [];
    this.validationWarnings = [];
  }
  
  // Validate a single product mapping
  async validateProductMapping(product, mappings, recipeIngredients, inventoryItems) {
    const errors = [];
    const warnings = [];
    
    // Check completeness
    if (mappings.length !== recipeIngredients.length) {
      errors.push(`Incomplete mapping: ${mappings.length} mappings for ${recipeIngredients.length} recipe ingredients`);
    }
    
    // Validate each mapping
    for (const mapping of mappings) {
      const recipeIng = recipeIngredients.find(r => r.ingredient_name === mapping.ingredient_name);
      const inventoryItem = inventoryItems.find(i => i.id === mapping.inventory_stock_id);
      
      if (!recipeIng) {
        errors.push(`Mapping references unknown recipe ingredient: ${mapping.ingredient_name}`);
        continue;
      }
      
      if (!inventoryItem) {
        errors.push(`Mapping references unknown inventory item: ${mapping.inventory_stock_id}`);
        continue;
      }
      
      // Validate units
      const unitValidation = this.validateUnits(recipeIng.unit, inventoryItem.unit);
      if (!unitValidation.valid) {
        warnings.push(`Unit mismatch: ${recipeIng.ingredient_name} recipe unit '${recipeIng.unit}' vs inventory unit '${inventoryItem.unit}'`);
      }
      
      // Validate quantities
      const quantityValidation = this.validateQuantity(mapping.required_quantity, recipeIng.unit);
      if (!quantityValidation.valid) {
        warnings.push(`Unusual quantity: ${recipeIng.ingredient_name} requires ${mapping.required_quantity} ${recipeIng.unit} - ${quantityValidation.message}`);
      }
      
      // Check stock availability
      if (inventoryItem.stock_quantity < mapping.required_quantity) {
        warnings.push(`Insufficient stock: ${inventoryItem.item} has ${inventoryItem.stock_quantity} but needs ${mapping.required_quantity}`);
      }
    }
    
    // Check for required ingredients based on product type
    const productType = this.determineProductType(product.product_name);
    const requiredCheck = this.validateRequiredIngredients(productType, mappings, inventoryItems);
    warnings.push(...requiredCheck.warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors, warnings)
    };
  }
  
  // Validate unit compatibility
  validateUnits(recipeUnit, inventoryUnit) {
    const normalizedRecipeUnit = recipeUnit.toLowerCase().trim();
    const normalizedInventoryUnit = inventoryUnit.toLowerCase().trim();
    
    // Exact match
    if (normalizedRecipeUnit === normalizedInventoryUnit) {
      return { valid: true, confidence: 1.0 };
    }
    
    // Check compatibility groups
    for (const [baseUnit, compatibleUnits] of Object.entries(validationRules.unitCompatibility)) {
      if (compatibleUnits.includes(normalizedRecipeUnit) && compatibleUnits.includes(normalizedInventoryUnit)) {
        return { valid: true, confidence: 0.8 };
      }
    }
    
    return { valid: false, confidence: 0.0 };
  }
  
  // Validate quantity reasonableness
  validateQuantity(quantity, unit) {
    const normalizedUnit = unit.toLowerCase().trim();
    
    // Find applicable range
    let range = null;
    for (const [baseUnit, unitRange] of Object.entries(validationRules.quantityRanges)) {
      if (validationRules.unitCompatibility[baseUnit]?.includes(normalizedUnit)) {
        range = unitRange;
        break;
      }
    }
    
    if (!range) {
      return { valid: true, message: 'No range defined for unit' };
    }
    
    if (quantity < range.min) {
      return { valid: false, message: `Quantity ${quantity} is below minimum ${range.min}` };
    }
    
    if (quantity > range.max) {
      return { valid: false, message: `Quantity ${quantity} is above maximum ${range.max}` };
    }
    
    return { valid: true, message: 'Quantity within normal range' };
  }
  
  // Determine product type for validation
  determineProductType(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('croffle')) return 'croffle';
    if (name.includes('blended')) return 'blended';
    if (name.includes('iced tea')) return 'iced tea';
    if (name.includes('lemonade')) return 'lemonade';
    
    return 'other';
  }
  
  // Validate required ingredients for product type
  validateRequiredIngredients(productType, mappings, inventoryItems) {
    const warnings = [];
    const requiredIngredients = validationRules.requiredIngredients[productType] || [];
    
    for (const required of requiredIngredients) {
      const hasRequired = mappings.some(mapping => {
        const inventoryItem = inventoryItems.find(i => i.id === mapping.inventory_stock_id);
        return inventoryItem && inventoryItem.item.toLowerCase().includes(required);
      });
      
      if (!hasRequired) {
        warnings.push(`Missing typical ingredient for ${productType}: ${required}`);
      }
    }
    
    return { warnings };
  }
  
  // Calculate validation score
  calculateValidationScore(errors, warnings) {
    let score = 100;
    
    // Deduct points for errors (critical issues)
    score -= errors.length * 25;
    
    // Deduct points for warnings (minor issues)
    score -= warnings.length * 5;
    
    return Math.max(0, score);
  }
}

async function main() {
  console.log('✅ MAPPING VALIDATOR');
  console.log('=' .repeat(40));
  
  await auth();
  
  const validator = new MappingValidator();
  
  // Get sample of recently created mappings to validate
  const recentMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/product_ingredients?select=*,product:product_catalog(*),inventory:inventory_stock(*)&limit=20&order=created_at.desc',
    method: 'GET',
    headers
  });
  
  console.log(`\n📊 Validating ${recentMappings.length} recent mappings...`);
  
  let totalValidated = 0;
  let totalValid = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  
  // Group mappings by product
  const productMappings = {};
  recentMappings.forEach(mapping => {
    const productId = mapping.product_catalog_id;
    if (!productMappings[productId]) {
      productMappings[productId] = {
        product: mapping.product,
        mappings: []
      };
    }
    productMappings[productId].mappings.push(mapping);
  });
  
  // Validate each product's mappings
  for (const [productId, data] of Object.entries(productMappings)) {
    if (!data.product) continue;
    
    totalValidated++;
    
    try {
      // Get recipe ingredients
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${data.product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      // Get inventory items
      const inventoryItems = data.mappings.map(m => m.inventory).filter(Boolean);
      
      // Validate
      const validation = await validator.validateProductMapping(
        data.product,
        data.mappings,
        recipeIngredients,
        inventoryItems
      );
      
      if (validation.valid) {
        totalValid++;
        console.log(`✅ ${data.product.product_name} (Score: ${validation.score}/100)`);
      } else {
        console.log(`❌ ${data.product.product_name} (Score: ${validation.score}/100)`);
        validation.errors.forEach(error => console.log(`   ERROR: ${error}`));
      }
      
      validation.warnings.forEach(warning => console.log(`   WARNING: ${warning}`));
      
      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
      
    } catch (error) {
      console.log(`❌ ${data.product.product_name} - Validation failed: ${error.message}`);
    }
  }
  
  // Summary
  console.log(`\n📋 VALIDATION SUMMARY:`);
  console.log(`   Products Validated: ${totalValidated}`);
  console.log(`   Valid Mappings: ${totalValid}`);
  console.log(`   Invalid Mappings: ${totalValidated - totalValid}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Total Warnings: ${totalWarnings}`);
  console.log(`   Success Rate: ${totalValidated > 0 ? ((totalValid / totalValidated) * 100).toFixed(1) : 0}%`);
  
  if (totalErrors === 0) {
    console.log(`\n✅ All mappings passed validation!`);
  } else {
    console.log(`\n⚠️  ${totalErrors} errors found - review and fix before proceeding`);
  }
}

main().catch(err => {
  console.error('Validation failed:', err.message);
  process.exit(1);
});
