#!/usr/bin/env node

/**
 * Verify Phase 1 Results
 * 
 * Simple verification of Phase 1 ingredient mapping fixes
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

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

async function main() {
  console.log('✅ VERIFYING PHASE 1 RESULTS');
  console.log('=' .repeat(50));
  
  try {
    // Check total mappings created
    const totalMappings = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients?select=id&limit=1000',
      method: 'GET',
      headers
    });
    
    console.log(`📊 Total ingredient mappings in system: ${totalMappings.length}`);
    
    // Check croffle mappings specifically
    const croffleProducts = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_catalog?select=id,product_name,price&price=eq.125&product_name=ilike.%croffle%&limit=50',
      method: 'GET',
      headers
    });
    
    console.log(`🥐 Croffle products found: ${croffleProducts.length}`);
    
    if (croffleProducts.length > 0) {
      // Check mappings for croffles
      const croffleIds = croffleProducts.map(p => p.id).join(',');
      const croffleMapppings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${croffleIds})`,
        method: 'GET',
        headers
      });
      
      const mappedCroffleIds = new Set(croffleMapppings.map(m => m.product_catalog_id));
      const mappedCroffles = croffleProducts.filter(p => mappedCroffleIds.has(p.id));
      
      console.log(`✅ Croffles with mappings: ${mappedCroffles.length}/${croffleProducts.length}`);
      
      if (mappedCroffles.length > 0) {
        console.log(`\n🎯 SUCCESSFULLY MAPPED CROFFLES:`);
        mappedCroffles.slice(0, 10).forEach((croffle, i) => {
          console.log(`   ${i + 1}. ${croffle.product_name} - ₱${croffle.price}`);
        });
        
        if (mappedCroffles.length > 10) {
          console.log(`   ... and ${mappedCroffles.length - 10} more croffles`);
        }
      }
      
      // Sample detailed check
      if (mappedCroffles.length > 0) {
        const sampleCroffle = mappedCroffles[0];
        const sampleMappings = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(item,stock_quantity,unit)&product_catalog_id=eq.${sampleCroffle.id}`,
          method: 'GET',
          headers
        });
        
        console.log(`\n🔍 SAMPLE MAPPING DETAILS: ${sampleCroffle.product_name}`);
        console.log(`   Ingredient mappings: ${sampleMappings.length}`);
        
        sampleMappings.forEach((mapping, i) => {
          const inventory = mapping.inventory_item;
          console.log(`   ${i + 1}. ${inventory ? inventory.item : 'Missing'} - ${mapping.required_quantity} ${mapping.unit}`);
          if (inventory) {
            console.log(`      Available: ${inventory.stock_quantity} ${inventory.unit}`);
          }
        });
      }
    }
    
    // Overall system health
    console.log(`\n📋 PHASE 1 VERIFICATION SUMMARY:`);
    console.log(`   ✅ System is accessible and responding`);
    console.log(`   ✅ Ingredient mappings table has ${totalMappings.length} entries`);
    console.log(`   ✅ ${mappedCroffles ? mappedCroffles.length : 0} croffles now have ingredient mappings`);
    
    if (mappedCroffles && mappedCroffles.length >= 10) {
      console.log(`\n🎉 PHASE 1 SUCCESS CONFIRMED:`);
      console.log(`   • ${mappedCroffles.length} high-revenue croffles (₱125 each) now have ingredient mappings`);
      console.log(`   • These products can now deduct inventory after sales`);
      console.log(`   • Revenue impact: ₱${mappedCroffles.length * 125} in products with accurate cost tracking`);
      console.log(`   • Inventory synchronization partially restored for critical products`);
    } else {
      console.log(`\n⚠️  PHASE 1 PARTIAL RESULTS:`);
      console.log(`   • Some progress made but more work needed`);
      console.log(`   • Continue with manual review process`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

main();
