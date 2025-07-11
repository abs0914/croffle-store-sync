#!/usr/bin/env node

/**
 * Check Product Catalog Schema
 * 
 * This script checks what columns exist in the product_catalog table.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}, Response: ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}`);
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
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

async function checkProductCatalogSchema() {
  console.log('🔍 Checking product_catalog table schema...\n');
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  
  // Check product_catalog table
  console.log('📦 Checking product_catalog table...');
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog?limit=1',
      method: 'GET',
      headers
    };
    
    const result = await makeRequest(options);
    
    if (result.length > 0) {
      console.log('✅ Found existing product catalog entry:');
      console.log('📊 Available columns:');
      Object.keys(result[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof result[0][key]} (${result[0][key]})`);
      });
    } else {
      console.log('📝 No existing product catalog entries found');
    }
  } catch (error) {
    console.log('❌ Error checking product_catalog:');
    console.log(`   ${error.message}`);
  }
}

checkProductCatalogSchema().catch(console.error);
