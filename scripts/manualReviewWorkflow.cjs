#!/usr/bin/env node

/**
 * Manual Review Workflow
 * 
 * Generates structured review templates for complex ingredient mappings requiring human intervention
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

// Review templates for different issue types
const reviewTemplates = {
  ambiguousMatch: {
    title: 'AMBIGUOUS INGREDIENT MATCH',
    instructions: [
      '1. Review the recipe ingredient and potential inventory matches',
      '2. Select the most appropriate inventory item',
      '3. If none are suitable, mark for new inventory item creation',
      '4. Verify quantity and unit compatibility'
    ],
    decisionCriteria: [
      'Ingredient name similarity',
      'Unit compatibility (pieces, servings, etc.)',
      'Typical usage in recipes',
      'Cost reasonableness',
      'Availability in store'
    ]
  },
  
  missingInventory: {
    title: 'MISSING INVENTORY ITEM',
    instructions: [
      '1. Confirm the ingredient is actually needed for the recipe',
      '2. Determine appropriate inventory item details',
      '3. Set initial stock quantity and minimum threshold',
      '4. Estimate cost per unit',
      '5. Create inventory item and mapping'
    ],
    decisionCriteria: [
      'Is this ingredient essential for the product?',
      'What is the appropriate unit (pieces, servings, grams)?',
      'What is a reasonable initial stock quantity?',
      'What is the estimated cost per unit?',
      'What should the minimum threshold be?'
    ]
  },
  
  complexRecipe: {
    title: 'COMPLEX RECIPE REVIEW',
    instructions: [
      '1. Review all recipe ingredients systematically',
      '2. Map each ingredient to appropriate inventory item',
      '3. Verify quantities make sense for the product',
      '4. Check for missing essential ingredients',
      '5. Validate total ingredient cost vs product price'
    ],
    decisionCriteria: [
      'Are all ingredients necessary?',
      'Do quantities seem reasonable?',
      'Are units compatible?',
      'Is total ingredient cost reasonable vs selling price?',
      'Are there any missing essential ingredients?'
    ]
  }
};

async function main() {
  console.log('📋 MANUAL REVIEW WORKFLOW GENERATOR');
  console.log('=' .repeat(60));
  
  await auth();
  
  // Get high-priority products needing manual review
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc&limit=3',
    method: 'GET',
    headers
  });
  
  const reviewCases = [];
  
  for (const store of stores) {
    console.log(`\n🏪 Analyzing: ${store.name}`);
    
    const storeCases = await generateReviewCasesForStore(store);
    reviewCases.push(...storeCases);
    
    console.log(`   📋 Review cases: ${storeCases.length}`);
  }
  
  // Generate review documents
  await generateReviewDocuments(reviewCases);
  
  console.log(`\n📊 MANUAL REVIEW SUMMARY:`);
  console.log(`   Total Review Cases: ${reviewCases.length}`);
  console.log(`   High Priority: ${reviewCases.filter(c => c.priority === 'high').length}`);
  console.log(`   Medium Priority: ${reviewCases.filter(c => c.priority === 'medium').length}`);
  console.log(`   Review documents generated in 'review-cases' directory`);
}

async function generateReviewCasesForStore(store) {
  const cases = [];
  
  // Get high-priority unmapped products
  const products = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null&price=gte.90&limit=5`,
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
  
  // Generate review cases
  for (const product of unmappedProducts) {
    try {
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      const reviewCase = await analyzeProductForReview(product, recipeIngredients, inventoryItems, store);
      cases.push(reviewCase);
      
    } catch (error) {
      console.log(`   ❌ Error analyzing ${product.product_name}: ${error.message}`);
    }
  }
  
  return cases;
}

async function analyzeProductForReview(product, recipeIngredients, inventoryItems, store) {
  const issues = [];
  const mappingSuggestions = [];
  
  // Analyze each ingredient
  for (const recipeIng of recipeIngredients) {
    const matches = inventoryItems.map(inv => ({
      inventory: inv,
      similarity: calculateSimilarity(recipeIng.ingredient_name, inv.item)
    })).filter(m => m.similarity > 0.3).sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length === 0) {
      issues.push({
        type: 'missing_inventory',
        ingredient: recipeIng.ingredient_name,
        quantity: recipeIng.quantity,
        unit: recipeIng.unit,
        suggestion: 'Create new inventory item'
      });
    } else if (matches.length === 1 && matches[0].similarity < 0.8) {
      issues.push({
        type: 'ambiguous_match',
        ingredient: recipeIng.ingredient_name,
        quantity: recipeIng.quantity,
        unit: recipeIng.unit,
        matches: matches.slice(0, 1)
      });
    } else if (matches.length > 1) {
      issues.push({
        type: 'ambiguous_match',
        ingredient: recipeIng.ingredient_name,
        quantity: recipeIng.quantity,
        unit: recipeIng.unit,
        matches: matches.slice(0, 3)
      });
    } else {
      // Good match - suggest mapping
      mappingSuggestions.push({
        ingredient: recipeIng.ingredient_name,
        quantity: recipeIng.quantity,
        unit: recipeIng.unit,
        suggestedInventory: matches[0].inventory,
        confidence: matches[0].similarity
      });
    }
  }
  
  // Determine review type and priority
  let reviewType = 'complexRecipe';
  let priority = 'medium';
  
  if (issues.filter(i => i.type === 'missing_inventory').length > 2) {
    reviewType = 'missingInventory';
    priority = 'high';
  } else if (issues.filter(i => i.type === 'ambiguous_match').length > 2) {
    reviewType = 'ambiguousMatch';
    priority = 'high';
  }
  
  if (product.price >= 125) priority = 'high'; // Croffles are high priority
  
  return {
    id: `${store.id}-${product.id}`,
    product,
    store,
    recipeIngredients,
    issues,
    mappingSuggestions,
    reviewType,
    priority,
    estimatedTime: calculateEstimatedReviewTime(issues, mappingSuggestions)
  };
}

function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w));
  
  return commonWords.length / Math.max(words1.length, words2.length);
}

function calculateEstimatedReviewTime(issues, suggestions) {
  let minutes = 5; // Base time
  
  minutes += issues.length * 3; // 3 minutes per issue
  minutes += suggestions.length * 1; // 1 minute per suggestion
  
  return Math.min(minutes, 30); // Cap at 30 minutes
}

async function generateReviewDocuments(reviewCases) {
  // Create review-cases directory if it doesn't exist
  if (!fs.existsSync('review-cases')) {
    fs.mkdirSync('review-cases');
  }
  
  // Generate summary document
  const summaryDoc = generateSummaryDocument(reviewCases);
  fs.writeFileSync('review-cases/REVIEW_SUMMARY.md', summaryDoc);
  
  // Generate individual review cases
  reviewCases.forEach((reviewCase, index) => {
    const caseDoc = generateCaseDocument(reviewCase, index + 1);
    const filename = `review-cases/CASE_${String(index + 1).padStart(3, '0')}_${reviewCase.product.product_name.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    fs.writeFileSync(filename, caseDoc);
  });
  
  console.log(`\n📄 Generated ${reviewCases.length + 1} review documents`);
}

function generateSummaryDocument(reviewCases) {
  const highPriority = reviewCases.filter(c => c.priority === 'high');
  const mediumPriority = reviewCases.filter(c => c.priority === 'medium');
  
  return `# INGREDIENT MAPPING MANUAL REVIEW SUMMARY

## Overview
Total Review Cases: ${reviewCases.length}
- High Priority: ${highPriority.length} cases
- Medium Priority: ${mediumPriority.length} cases

Estimated Total Review Time: ${reviewCases.reduce((sum, c) => sum + c.estimatedTime, 0)} minutes

## High Priority Cases (Complete First)
${highPriority.map((c, i) => `${i + 1}. ${c.product.product_name} (${c.store.name}) - ${c.estimatedTime} min`).join('\n')}

## Medium Priority Cases
${mediumPriority.map((c, i) => `${i + 1}. ${c.product.product_name} (${c.store.name}) - ${c.estimatedTime} min`).join('\n')}

## Review Process
1. Start with high priority cases
2. Follow the instructions in each case document
3. Use the decision criteria to make mapping choices
4. Update the database with approved mappings
5. Test inventory deduction after each batch

## Quality Assurance Checklist
- [ ] All recipe ingredients have mappings
- [ ] Units are compatible between recipe and inventory
- [ ] Quantities are reasonable for the product
- [ ] Total ingredient cost is reasonable vs selling price
- [ ] Essential ingredients are not missing
- [ ] Inventory items exist and are active
`;
}

function generateCaseDocument(reviewCase, caseNumber) {
  const template = reviewTemplates[reviewCase.reviewType];
  
  return `# REVIEW CASE ${String(caseNumber).padStart(3, '0')}: ${reviewCase.product.product_name}

## ${template.title}
**Store:** ${reviewCase.store.name}
**Product:** ${reviewCase.product.product_name}
**Price:** ₱${reviewCase.product.price}
**Priority:** ${reviewCase.priority.toUpperCase()}
**Estimated Time:** ${reviewCase.estimatedTime} minutes

## Instructions
${template.instructions.map(instruction => `${instruction}`).join('\n')}

## Decision Criteria
${template.decisionCriteria.map(criteria => `- ${criteria}`).join('\n')}

## Recipe Ingredients (${reviewCase.recipeIngredients.length})
${reviewCase.recipeIngredients.map((ing, i) => `${i + 1}. **${ing.ingredient_name}** - ${ing.quantity} ${ing.unit}`).join('\n')}

## Issues Found (${reviewCase.issues.length})
${reviewCase.issues.map((issue, i) => {
  let issueText = `${i + 1}. **${issue.ingredient}** (${issue.quantity} ${issue.unit})\n`;
  
  if (issue.type === 'missing_inventory') {
    issueText += `   - ❌ No inventory item found\n   - 💡 Suggestion: ${issue.suggestion}`;
  } else if (issue.type === 'ambiguous_match') {
    issueText += `   - ⚠️  Multiple potential matches:\n`;
    issue.matches.forEach(match => {
      issueText += `     • ${match.inventory.item} (${(match.similarity * 100).toFixed(1)}% match)\n`;
    });
  }
  
  return issueText;
}).join('\n\n')}

## Mapping Suggestions (${reviewCase.mappingSuggestions.length})
${reviewCase.mappingSuggestions.map((suggestion, i) => 
  `${i + 1}. **${suggestion.ingredient}** → ${suggestion.suggestedInventory.item} (${(suggestion.confidence * 100).toFixed(1)}% confidence)`
).join('\n')}

## Review Actions Required
- [ ] Review all issues and make mapping decisions
- [ ] Create missing inventory items if needed
- [ ] Verify quantities and units are reasonable
- [ ] Check total ingredient cost vs product price
- [ ] Create product_ingredients mappings
- [ ] Test inventory deduction with sample transaction

## Notes
_Add your review notes and decisions here_

---
**Review Completed By:** _________________ **Date:** _________
`;
}

main().catch(err => {
  console.error('Manual review workflow generation failed:', err.message);
  process.exit(1);
});
