#!/usr/bin/env node

/**
 * Diagnose System Integration Issues
 * 
 * This script diagnoses why the inventory deduction system is not working
 * by checking the integration points and service calls.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

async function main() {
  try {
    console.log('🔍 DIAGNOSING SYSTEM INTEGRATION ISSUES');
    console.log('='.repeat(60));
    
    // STEP 1: Check if inventory deduction service exists
    console.log('\n📁 STEP 1: CHECKING SERVICE FILES');
    console.log('-'.repeat(40));
    
    const serviceFiles = [
      'src/services/inventoryDeductionService.ts',
      'src/services/transactions/streamlinedTransactionService.ts',
      'src/services/inventory/simpleInventoryService.ts'
    ];
    
    serviceFiles.forEach(file => {
      const exists = checkFileExists(file);
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
      
      if (exists) {
        const content = readFileContent(file);
        if (content) {
          // Check for key functions
          const hasDeductFunction = content.includes('deductInventoryForTransaction');
          const hasImports = content.includes('import') || content.includes('require');
          console.log(`      - Has deduction function: ${hasDeductFunction ? '✅' : '❌'}`);
          console.log(`      - Has imports: ${hasImports ? '✅' : '❌'}`);
          console.log(`      - File size: ${content.length} characters`);
        }
      }
    });
    
    // STEP 2: Check streamlined transaction service integration
    console.log('\n🔗 STEP 2: CHECKING TRANSACTION SERVICE INTEGRATION');
    console.log('-'.repeat(40));
    
    const streamlinedServicePath = 'src/services/transactions/streamlinedTransactionService.ts';
    const streamlinedContent = readFileContent(streamlinedServicePath);
    
    if (streamlinedContent) {
      console.log('✅ Streamlined transaction service found');
      
      // Check for inventory deduction imports
      const hasInventoryImport = streamlinedContent.includes('inventoryDeductionService') || 
                                streamlinedContent.includes('deductInventoryForTransaction');
      console.log(`   Import check: ${hasInventoryImport ? '✅' : '❌'} Inventory deduction service imported`);
      
      // Check for processInventoryDeduction method
      const hasProcessMethod = streamlinedContent.includes('processInventoryDeduction');
      console.log(`   Method check: ${hasProcessMethod ? '✅' : '❌'} processInventoryDeduction method exists`);
      
      // Check for deduction call in processTransaction
      const hasDeductionCall = streamlinedContent.includes('processInventoryDeduction(') ||
                              streamlinedContent.includes('deductInventoryForTransaction(');
      console.log(`   Call check: ${hasDeductionCall ? '✅' : '❌'} Deduction method called in processTransaction`);
      
      // Extract the processTransaction method
      const processTransactionMatch = streamlinedContent.match(/async processTransaction\([^}]+\{[\s\S]*?\n  \}/);
      if (processTransactionMatch) {
        console.log('\n📋 ProcessTransaction Method Analysis:');
        const method = processTransactionMatch[0];
        
        const hasInventoryStep = method.includes('inventory') || method.includes('deduct');
        const hasErrorHandling = method.includes('try') && method.includes('catch');
        const hasLogging = method.includes('console.log') || method.includes('console.error');
        
        console.log(`   - Has inventory step: ${hasInventoryStep ? '✅' : '❌'}`);
        console.log(`   - Has error handling: ${hasErrorHandling ? '✅' : '❌'}`);
        console.log(`   - Has logging: ${hasLogging ? '✅' : '❌'}`);
        
        // Show relevant lines
        const lines = method.split('\n');
        const inventoryLines = lines.filter(line => 
          line.toLowerCase().includes('inventory') || 
          line.toLowerCase().includes('deduct')
        );
        
        if (inventoryLines.length > 0) {
          console.log('\n   📝 Inventory-related lines:');
          inventoryLines.forEach(line => {
            console.log(`      ${line.trim()}`);
          });
        } else {
          console.log('\n   ❌ No inventory-related code found in processTransaction');
        }
      }
      
    } else {
      console.log('❌ Streamlined transaction service not found');
    }
    
    // STEP 3: Check inventory deduction service implementation
    console.log('\n🧪 STEP 3: CHECKING INVENTORY DEDUCTION SERVICE');
    console.log('-'.repeat(40));
    
    const inventoryServicePath = 'src/services/inventoryDeductionService.ts';
    const inventoryContent = readFileContent(inventoryServicePath);
    
    if (inventoryContent) {
      console.log('✅ Inventory deduction service found');
      
      // Check for main function
      const hasMainFunction = inventoryContent.includes('export async function deductInventoryForTransaction');
      console.log(`   Main function: ${hasMainFunction ? '✅' : '❌'} deductInventoryForTransaction exported`);
      
      // Check for supabase integration
      const hasSupabaseImport = inventoryContent.includes('supabase');
      console.log(`   Database integration: ${hasSupabaseImport ? '✅' : '❌'} Supabase imported`);
      
      // Check for error handling
      const hasErrorHandling = inventoryContent.includes('try') && inventoryContent.includes('catch');
      console.log(`   Error handling: ${hasErrorHandling ? '✅' : '❌'} Try-catch blocks present`);
      
      // Check for movement recording
      const hasMovementRecording = inventoryContent.includes('inventory_transactions');
      console.log(`   Movement recording: ${hasMovementRecording ? '✅' : '❌'} Creates inventory movements`);
      
    } else {
      console.log('❌ Inventory deduction service not found');
    }
    
    // STEP 4: Check for build/deployment issues
    console.log('\n🏗️  STEP 4: CHECKING BUILD AND DEPLOYMENT');
    console.log('-'.repeat(40));
    
    // Check if there's a build directory
    const buildPaths = ['dist', 'build', '.next'];
    let buildFound = false;
    
    buildPaths.forEach(buildPath => {
      if (checkFileExists(buildPath)) {
        console.log(`   ✅ Build directory found: ${buildPath}`);
        buildFound = true;
      }
    });
    
    if (!buildFound) {
      console.log('   ⚠️  No build directory found - may be using development mode');
    }
    
    // Check package.json for build scripts
    const packageJsonPath = 'package.json';
    const packageContent = readFileContent(packageJsonPath);
    
    if (packageContent) {
      try {
        const packageData = JSON.parse(packageContent);
        console.log('   ✅ Package.json found');
        
        if (packageData.scripts) {
          const hasBuildScript = packageData.scripts.build;
          const hasDevScript = packageData.scripts.dev;
          const hasStartScript = packageData.scripts.start;
          
          console.log(`   - Build script: ${hasBuildScript ? '✅' : '❌'}`);
          console.log(`   - Dev script: ${hasDevScript ? '✅' : '❌'}`);
          console.log(`   - Start script: ${hasStartScript ? '✅' : '❌'}`);
        }
        
        if (packageData.dependencies) {
          const hasSupabase = packageData.dependencies['@supabase/supabase-js'];
          console.log(`   - Supabase dependency: ${hasSupabase ? '✅' : '❌'}`);
        }
        
      } catch (error) {
        console.log('   ❌ Error parsing package.json');
      }
    }
    
    // STEP 5: Generate diagnostic report
    console.log('\n📊 DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    
    console.log('🔍 FINDINGS:');
    console.log('1. File Structure Analysis:');
    console.log('   - Check if all required service files exist');
    console.log('   - Verify file contents and key functions');
    
    console.log('\n2. Integration Analysis:');
    console.log('   - Verify inventory service is imported in transaction service');
    console.log('   - Check if deduction method is called during transaction processing');
    console.log('   - Analyze error handling and logging');
    
    console.log('\n3. Implementation Analysis:');
    console.log('   - Verify inventory deduction service has all required functions');
    console.log('   - Check database integration and movement recording');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. 🔧 Fix any missing imports or method calls');
    console.log('2. 🔧 Add comprehensive logging to track execution');
    console.log('3. 🔧 Test the integration with a controlled transaction');
    console.log('4. 🔧 Verify the code is properly deployed/built');
    
    console.log('\n🎯 CRITICAL CHECKS:');
    console.log('- Is the inventory deduction service being called?');
    console.log('- Are there any runtime errors preventing execution?');
    console.log('- Is the database connection working properly?');
    console.log('- Are the recipe templates and inventory items properly linked?');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    process.exit(1);
  }
}

main();
