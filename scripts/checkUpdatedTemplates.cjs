#!/usr/bin/env node

/**
 * Check Updated Templates Status
 * 
 * This script checks the current status of recipe templates after recent updates
 * to pricing and images.
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

async function checkUpdatedStatus() {
  console.log('🔍 CHECKING UPDATED TEMPLATE STATUS');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Get all templates
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&order=name',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`📊 Total Recipe Templates: ${templates.length}\n`);
    
    // Check the specific templates that were mentioned as updated
    const updatedTemplates = [
      'Croffle Overload', 'Mini Croffle', // Images added
      'Biscoff Crushed', 'Blueberry Jam', 'Caramel', 'Choco Flakes', 
      'Chocolate', 'Colored Sprinkles', 'Mango Jam', 'Marshmallow', 
      'Oreo Cookies', 'Oreo Crushed', 'Peanut', 'Strawberry Jam' // Prices added
    ];
    
    console.log('🔍 CHECKING RECENTLY UPDATED TEMPLATES:');
    console.log('-'.repeat(40));
    
    let fixedCount = 0;
    let stillNeedingFixes = [];
    
    for (const templateName of updatedTemplates) {
      const template = templates.find(t => t.name === templateName);
      
      if (!template) {
        console.log(`❌ ${templateName} - Template not found`);
        continue;
      }
      
      const issues = [];
      
      // Check pricing
      if (!template.suggested_price || template.suggested_price <= 0) {
        issues.push('Missing/invalid price');
      }
      
      // Check image
      if (!template.image_url) {
        issues.push('Missing image');
      }
      
      // Check active status
      if (!template.is_active) {
        issues.push('Not active');
      }
      
      if (issues.length === 0) {
        console.log(`   ✅ ${templateName} - Fixed (Price: ₱${template.suggested_price})`);
        fixedCount++;
      } else {
        console.log(`   ❌ ${templateName} - Issues: ${issues.join(', ')}`);
        stillNeedingFixes.push({
          name: templateName,
          issues: issues,
          price: template.suggested_price,
          hasImage: !!template.image_url
        });
      }
    }
    
    console.log(`\n📈 Update Progress:`);
    console.log(`   ✅ Fixed templates: ${fixedCount}/${updatedTemplates.length}`);
    console.log(`   ❌ Still need fixes: ${stillNeedingFixes.length}`);
    
    if (stillNeedingFixes.length > 0) {
      console.log('\n❌ Templates still needing fixes:');
      stillNeedingFixes.forEach(template => {
        console.log(`   - ${template.name}: ${template.issues.join(', ')}`);
      });
    }
    
    // Check all templates for overall readiness
    console.log('\n🔍 OVERALL TEMPLATE READINESS CHECK:');
    console.log('-'.repeat(40));
    
    let totalReady = 0;
    let totalWithIssues = 0;
    
    for (const template of templates) {
      const issues = [];
      
      if (!template.suggested_price || template.suggested_price <= 0) {
        issues.push('price');
      }
      
      if (!template.image_url) {
        issues.push('image');
      }
      
      if (!template.is_active) {
        issues.push('inactive');
      }
      
      if (issues.length === 0) {
        totalReady++;
      } else {
        totalWithIssues++;
      }
    }
    
    console.log(`📊 Overall Template Status:`);
    console.log(`   ✅ Ready for deployment: ${totalReady}/${templates.length}`);
    console.log(`   ❌ Still have issues: ${totalWithIssues}/${templates.length}`);
    
    // Check Oreo templates specifically
    console.log('\n🍪 OREO TEMPLATES STATUS:');
    console.log('-'.repeat(40));
    
    const oreoTemplates = templates.filter(t => 
      t.name.toLowerCase().includes('cookies') || 
      t.name.toLowerCase().includes('oreo') ||
      t.name.toLowerCase().includes('cream')
    );
    
    oreoTemplates.forEach(template => {
      const issues = [];
      
      if (!template.suggested_price || template.suggested_price <= 0) {
        issues.push('price');
      }
      
      if (!template.image_url) {
        issues.push('image');
      }
      
      if (!template.is_active) {
        issues.push('inactive');
      }
      
      const status = issues.length === 0 ? '✅ Ready' : `❌ Issues: ${issues.join(', ')}`;
      console.log(`   ${template.name}: ${status} (Price: ₱${template.suggested_price || 'N/A'})`);
    });
    
    // Quick ingredient cost check
    console.log('\n🍽️ INGREDIENT COST STATUS CHECK:');
    console.log('-'.repeat(40));
    
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=cost_per_unit&limit=10',
      method: 'GET',
      headers
    };
    
    const sampleIngredients = await makeRequest(ingredientsOptions);
    const hasValidCosts = sampleIngredients.some(ing => ing.cost_per_unit > 0);
    
    console.log(`📊 Ingredient Costs: ${hasValidCosts ? '✅ Some valid costs found' : '❌ Still all zero costs'}`);
    
    if (!hasValidCosts) {
      console.log('⚠️ WARNING: Ingredient costs still need to be fixed - this is a blocking issue!');
    }
    
    // Summary and next steps
    console.log('\n🎯 SUMMARY AND NEXT STEPS:');
    console.log('='.repeat(50));
    
    if (totalReady === templates.length && hasValidCosts) {
      console.log('🎉 ALL TEMPLATES READY FOR DEPLOYMENT!');
    } else {
      console.log('📋 Remaining work needed:');
      
      if (totalWithIssues > 0) {
        console.log(`   1. Fix ${totalWithIssues} templates with pricing/image issues`);
      }
      
      if (!hasValidCosts) {
        console.log('   2. 🔴 CRITICAL: Fix ingredient costs (blocking issue)');
      }
      
      console.log('   3. Run full deployment readiness assessment');
      console.log('   4. Deploy to all stores once ready');
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error.message);
  }
}

// Run the check
checkUpdatedStatus();
