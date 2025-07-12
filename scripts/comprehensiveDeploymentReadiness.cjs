#!/usr/bin/env node

/**
 * Comprehensive Deployment Readiness Assessment
 * 
 * This script performs a thorough assessment of deployment readiness
 * for all recipe templates across all stores.
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
  console.log('🔐 Authenticating as admin...');
  
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
    console.log('✅ Admin authentication successful\n');
    
    // Update headers with the access token
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function checkImageAccessibility(imageUrl) {
  if (!imageUrl) return false;
  
  try {
    const url = new URL(imageUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'HEAD',
      timeout: 5000
    };
    
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

async function assessmentReport() {
  console.log('🔍 COMPREHENSIVE DEPLOYMENT READINESS ASSESSMENT');
  console.log('='.repeat(60));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // 1. Recipe Template Validation
    console.log('📋 STEP 1: RECIPE TEMPLATE VALIDATION');
    console.log('-'.repeat(40));
    
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&order=name',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`📊 Total Recipe Templates: ${templates.length}`);
    
    let readyTemplates = 0;
    let templatesWithIssues = [];
    
    console.log('\n🔍 Validating each template...');
    
    for (const template of templates) {
      const issues = [];
      
      // Check pricing
      if (!template.suggested_price || template.suggested_price <= 0) {
        issues.push('Missing or invalid suggested_price');
      }
      
      // Check image URL
      if (!template.image_url) {
        issues.push('Missing image_url');
      } else {
        const imageAccessible = await checkImageAccessibility(template.image_url);
        if (!imageAccessible) {
          issues.push('Image URL not accessible');
        }
      }
      
      // Check active status
      if (!template.is_active) {
        issues.push('Template not active');
      }
      
      // Check category
      if (!template.category_name && !template.category) {
        issues.push('Missing category');
      }
      
      if (issues.length === 0) {
        readyTemplates++;
        console.log(`   ✅ ${template.name} - Ready`);
      } else {
        templatesWithIssues.push({
          name: template.name,
          id: template.id,
          issues: issues
        });
        console.log(`   ❌ ${template.name} - Issues: ${issues.join(', ')}`);
      }
    }
    
    console.log(`\n📈 Template Readiness Summary:`);
    console.log(`   ✅ Ready for deployment: ${readyTemplates}`);
    console.log(`   ❌ Templates with issues: ${templatesWithIssues.length}`);
    
    // 2. Recipe Ingredients Validation
    console.log('\n📋 STEP 2: RECIPE INGREDIENTS VALIDATION');
    console.log('-'.repeat(40));
    
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=*',
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    console.log(`📊 Total Recipe Ingredients: ${ingredients.length}`);
    
    // Group ingredients by template
    const ingredientsByTemplate = {};
    ingredients.forEach(ing => {
      if (!ingredientsByTemplate[ing.recipe_template_id]) {
        ingredientsByTemplate[ing.recipe_template_id] = [];
      }
      ingredientsByTemplate[ing.recipe_template_id].push(ing);
    });
    
    let templatesWithIngredientIssues = [];
    
    for (const template of templates) {
      const templateIngredients = ingredientsByTemplate[template.id] || [];
      const ingredientIssues = [];
      
      if (templateIngredients.length === 0) {
        ingredientIssues.push('No ingredients defined');
      } else {
        templateIngredients.forEach(ing => {
          if (!ing.quantity || ing.quantity <= 0) {
            ingredientIssues.push(`${ing.ingredient_name}: Invalid quantity`);
          }
          if (!ing.cost_per_unit || ing.cost_per_unit <= 0) {
            ingredientIssues.push(`${ing.ingredient_name}: Invalid cost`);
          }
          if (!ing.unit) {
            ingredientIssues.push(`${ing.ingredient_name}: Missing unit`);
          }
        });
      }
      
      if (ingredientIssues.length > 0) {
        templatesWithIngredientIssues.push({
          name: template.name,
          id: template.id,
          issues: ingredientIssues
        });
      }
    }
    
    console.log(`📈 Ingredient Validation Summary:`);
    console.log(`   ✅ Templates with valid ingredients: ${templates.length - templatesWithIngredientIssues.length}`);
    console.log(`   ❌ Templates with ingredient issues: ${templatesWithIngredientIssues.length}`);
    
    if (templatesWithIngredientIssues.length > 0) {
      console.log('\n❌ Templates with ingredient issues:');
      templatesWithIngredientIssues.forEach(template => {
        console.log(`   - ${template.name}: ${template.issues.slice(0, 3).join(', ')}${template.issues.length > 3 ? '...' : ''}`);
      });
    }
    
    // 3. Store Readiness Assessment
    console.log('\n🏪 STEP 3: STORE READINESS ASSESSMENT');
    console.log('-'.repeat(40));
    
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=*&order=name',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    const activeStores = stores.filter(store => store.is_active);
    
    console.log(`📊 Total Stores: ${stores.length}`);
    console.log(`📊 Active Stores: ${activeStores.length}`);
    
    console.log('\n🏪 Active Stores:');
    activeStores.forEach(store => {
      console.log(`   ✅ ${store.name} (ID: ${store.id})`);
    });
    
    // 4. Check Current Deployments
    console.log('\n📊 STEP 4: CURRENT DEPLOYMENT STATUS');
    console.log('-'.repeat(40));
    
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipes?select=template_id,store_id',
      method: 'GET',
      headers
    };
    
    const existingRecipes = await makeRequest(recipesOptions);
    
    // Group by template and store
    const deploymentMap = {};
    existingRecipes.forEach(recipe => {
      if (!deploymentMap[recipe.template_id]) {
        deploymentMap[recipe.template_id] = [];
      }
      deploymentMap[recipe.template_id].push(recipe.store_id);
    });
    
    console.log(`📊 Total Deployed Recipes: ${existingRecipes.length}`);
    
    // Check deployment coverage
    let fullyDeployedTemplates = 0;
    let partiallyDeployedTemplates = 0;
    let undeployedTemplates = 0;
    
    templates.forEach(template => {
      const deployedStores = deploymentMap[template.id] || [];
      if (deployedStores.length === activeStores.length) {
        fullyDeployedTemplates++;
      } else if (deployedStores.length > 0) {
        partiallyDeployedTemplates++;
      } else {
        undeployedTemplates++;
      }
    });
    
    console.log(`\n📈 Deployment Coverage:`);
    console.log(`   ✅ Fully deployed (all stores): ${fullyDeployedTemplates}`);
    console.log(`   ⚠️ Partially deployed: ${partiallyDeployedTemplates}`);
    console.log(`   ❌ Not deployed: ${undeployedTemplates}`);
    
    // 5. Commissary Items Check
    console.log('\n🏪 STEP 5: COMMISSARY ITEMS VALIDATION');
    console.log('-'.repeat(40));

    const commissaryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/commissary_inventory?select=*',
      method: 'GET',
      headers
    };

    const commissaryItems = await makeRequest(commissaryOptions);
    console.log(`📊 Total Commissary Items: ${commissaryItems.length}`);

    // Check ingredient mapping
    const commissaryItemNames = commissaryItems.map(item =>
      (item.item_name || item.name || '').toLowerCase()
    );

    let missingCommissaryItems = [];
    const uniqueIngredientNames = [...new Set(ingredients.map(ing =>
      (ing.commissary_item_name || ing.ingredient_name || '').toLowerCase()
    ))];

    uniqueIngredientNames.forEach(ingredientName => {
      if (ingredientName && !commissaryItemNames.includes(ingredientName)) {
        missingCommissaryItems.push(ingredientName);
      }
    });

    console.log(`📈 Commissary Mapping:`);
    console.log(`   ✅ Available commissary items: ${commissaryItems.length}`);
    console.log(`   ❌ Missing commissary items: ${missingCommissaryItems.length}`);

    if (missingCommissaryItems.length > 0) {
      console.log('\n❌ Missing commissary items:');
      missingCommissaryItems.slice(0, 10).forEach(item => {
        console.log(`   - ${item}`);
      });
      if (missingCommissaryItems.length > 10) {
        console.log(`   ... and ${missingCommissaryItems.length - 10} more`);
      }
    }

    // 6. POS Integration Readiness
    console.log('\n🖥️ STEP 6: POS INTEGRATION READINESS');
    console.log('-'.repeat(40));

    // Check categories
    const categories = [...new Set(templates.map(t => t.category_name || t.category).filter(Boolean))];
    console.log(`📊 Recipe Categories: ${categories.length}`);
    console.log('📋 Available categories:');
    categories.forEach(category => {
      const templateCount = templates.filter(t =>
        (t.category_name || t.category) === category
      ).length;
      console.log(`   - ${category}: ${templateCount} templates`);
    });

    // Check product catalog readiness
    const productCatalogOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog?select=store_id&limit=1',
      method: 'GET',
      headers
    };

    const productCatalogTest = await makeRequest(productCatalogOptions);
    console.log(`\n📊 Product Catalog Status: ${productCatalogTest.length > 0 ? 'Ready' : 'Empty'}`);

    // 7. Oreo Cookies Specific Assessment
    console.log('\n🍪 STEP 7: OREO COOKIES SPECIFIC ASSESSMENT');
    console.log('-'.repeat(40));

    const oreoTemplates = templates.filter(t =>
      t.name.toLowerCase().includes('cookies') ||
      t.name.toLowerCase().includes('oreo') ||
      t.name.toLowerCase().includes('cream')
    );

    console.log(`📊 Oreo-related templates found: ${oreoTemplates.length}`);

    oreoTemplates.forEach(template => {
      const issues = templatesWithIssues.find(t => t.id === template.id);
      const ingredientIssues = templatesWithIngredientIssues.find(t => t.id === template.id);
      const deployedStores = deploymentMap[template.id] || [];

      console.log(`\n🍪 ${template.name}:`);
      console.log(`   Template Status: ${issues ? '❌ Has issues' : '✅ Ready'}`);
      console.log(`   Ingredients: ${ingredientIssues ? '❌ Has issues' : '✅ Valid'}`);
      console.log(`   Deployed to: ${deployedStores.length}/${activeStores.length} stores`);
      console.log(`   Price: ₱${template.suggested_price || 'N/A'}`);
      console.log(`   Image: ${template.image_url ? '✅ Present' : '❌ Missing'}`);

      if (issues) {
        console.log(`   Issues: ${issues.issues.join(', ')}`);
      }
    });

    // 8. Final Readiness Report
    console.log('\n🎯 FINAL DEPLOYMENT READINESS REPORT');
    console.log('='.repeat(60));

    const totalReadyTemplates = readyTemplates - templatesWithIngredientIssues.length;
    const deploymentReadyTemplates = templates.filter(template => {
      const hasIssues = templatesWithIssues.find(t => t.id === template.id);
      const hasIngredientIssues = templatesWithIngredientIssues.find(t => t.id === template.id);
      return !hasIssues && !hasIngredientIssues;
    });

    console.log(`📊 SUMMARY STATISTICS:`);
    console.log(`   Total Templates: ${templates.length}`);
    console.log(`   Ready for Deployment: ${deploymentReadyTemplates.length}`);
    console.log(`   Templates with Issues: ${templates.length - deploymentReadyTemplates.length}`);
    console.log(`   Active Stores: ${activeStores.length}`);
    console.log(`   Missing Commissary Items: ${missingCommissaryItems.length}`);

    console.log(`\n🚦 READINESS STATUS:`);
    if (deploymentReadyTemplates.length === templates.length && missingCommissaryItems.length === 0) {
      console.log(`   ✅ FULLY READY - All templates can be deployed`);
    } else if (deploymentReadyTemplates.length > 0) {
      console.log(`   ⚠️ PARTIALLY READY - ${deploymentReadyTemplates.length} templates ready`);
    } else {
      console.log(`   ❌ NOT READY - Critical issues need resolution`);
    }

    console.log(`\n📋 RECOMMENDED NEXT STEPS:`);

    if (templatesWithIssues.length > 0) {
      console.log(`   1. Fix ${templatesWithIssues.length} templates with basic issues (pricing, images, etc.)`);
    }

    if (templatesWithIngredientIssues.length > 0) {
      console.log(`   2. Resolve ingredient issues in ${templatesWithIngredientIssues.length} templates`);
    }

    if (missingCommissaryItems.length > 0) {
      console.log(`   3. Add ${missingCommissaryItems.length} missing commissary items`);
    }

    if (undeployedTemplates > 0) {
      console.log(`   4. Deploy ${undeployedTemplates} undeployed templates to all stores`);
    }

    if (partiallyDeployedTemplates > 0) {
      console.log(`   5. Complete deployment of ${partiallyDeployedTemplates} partially deployed templates`);
    }

    if (deploymentReadyTemplates.length > 0) {
      console.log(`   6. Proceed with deployment of ${deploymentReadyTemplates.length} ready templates`);
    }

    console.log(`\n🍪 OREO COOKIES STATUS:`);
    const readyOreoTemplates = oreoTemplates.filter(template => {
      const hasIssues = templatesWithIssues.find(t => t.id === template.id);
      const hasIngredientIssues = templatesWithIngredientIssues.find(t => t.id === template.id);
      return !hasIssues && !hasIngredientIssues;
    });

    console.log(`   Ready Oreo Templates: ${readyOreoTemplates.length}/${oreoTemplates.length}`);
    if (readyOreoTemplates.length === oreoTemplates.length) {
      console.log(`   ✅ All Oreo templates ready for deployment`);
    } else {
      console.log(`   ⚠️ ${oreoTemplates.length - readyOreoTemplates.length} Oreo templates need attention`);
    }

  } catch (error) {
    console.error('❌ Error during assessment:', error.message);
  }
}

// Run the assessment
assessmentReport();
