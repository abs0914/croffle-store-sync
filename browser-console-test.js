/**
 * Browser Console Test Script for Cashier Report Fixes
 * 
 * Instructions:
 * 1. Open the application in browser (http://localhost:5173)
 * 2. Navigate to Reports > Cashier Performance
 * 3. Open browser console (F12)
 * 4. Copy and paste this script
 * 5. Run the script to verify fixes are working
 */

(function() {
  console.log('🔧 Cashier Report Fix Verification Script');
  console.log('==========================================');
  
  // Test 1: Check if the application is loaded
  function checkAppLoaded() {
    const isReactApp = window.React || document.querySelector('[data-reactroot]') || document.querySelector('#root');
    console.log('✅ React app detected:', !!isReactApp);
    return !!isReactApp;
  }
  
  // Test 2: Check for cashier report elements
  function checkCashierReportElements() {
    const reportElements = {
      storeSelector: document.querySelector('[role="combobox"]') || document.querySelector('button:contains("Select Store")'),
      cashierTable: document.querySelector('table') || document.querySelector('[role="table"]'),
      reportTabs: document.querySelectorAll('[role="tab"]'),
      cashierCards: document.querySelectorAll('[data-testid*="cashier"], .cashier-card, .performance-card')
    };
    
    console.log('📊 Report Elements Found:');
    Object.entries(reportElements).forEach(([key, element]) => {
      console.log(`  ${key}: ${element ? '✅ Found' : '❌ Not found'}`);
    });
    
    return Object.values(reportElements).some(el => el);
  }
  
  // Test 3: Monitor console logs for our debug messages
  function monitorConsoleLogs() {
    console.log('👀 Monitoring console for cashier report logs...');
    console.log('Look for these patterns in the console:');
    console.log('  🔄 Fetching cashier report for...');
    console.log('  💳 Transactions fetched:...');
    console.log('  👥 Cashier report result:...');
    console.log('  🔍 Sample data detection result:...');
    
    // Store original console.log
    const originalLog = console.log;
    const cashierLogs = [];
    
    // Override console.log to capture our messages
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('🔄') || message.includes('💳') || message.includes('👥') || message.includes('🔍')) {
        cashierLogs.push(message);
      }
      originalLog.apply(console, args);
    };
    
    // Restore after 30 seconds
    setTimeout(() => {
      console.log = originalLog;
      console.log('📝 Captured Cashier Report Logs:');
      cashierLogs.forEach(log => console.log('  ' + log));
    }, 30000);
  }
  
  // Test 4: Check for sample data indicators
  function checkSampleDataIndicators() {
    const sampleIndicators = {
      sampleDataAlert: document.querySelector('[role="alert"]') || document.querySelector('.alert'),
      demoDataWarning: Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('sample data')
      ),
      johnSmithName: Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('John Smith')
      ),
      pravatarAvatars: document.querySelectorAll('img[src*="pravatar.cc"]')
    };
    
    console.log('🎭 Sample Data Indicators:');
    Object.entries(sampleIndicators).forEach(([key, element]) => {
      if (key === 'pravatarAvatars') {
        console.log(`  ${key}: ${element.length} found`);
      } else {
        console.log(`  ${key}: ${element ? '⚠️ Found (may indicate sample data)' : '✅ Not found'}`);
      }
    });
  }
  
  // Test 5: Check for real data indicators
  function checkRealDataIndicators() {
    const realDataIndicators = {
      uiAvatarsImages: document.querySelectorAll('img[src*="ui-avatars.com"]'),
      unknownCashier: Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('Unknown Cashier')
      ),
      realNames: Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && 
        !el.textContent.includes('John Smith') && 
        !el.textContent.includes('Sarah Lee') &&
        !el.textContent.includes('Miguel Rodriguez') &&
        !el.textContent.includes('Priya Patel') &&
        /[A-Z][a-z]+ [A-Z][a-z]+/.test(el.textContent) // Pattern for "First Last"
      )
    };
    
    console.log('👤 Real Data Indicators:');
    console.log(`  UI Avatars: ${realDataIndicators.uiAvatarsImages.length} found`);
    console.log(`  Unknown Cashier: ${realDataIndicators.unknownCashier ? '⚠️ Found' : '✅ Not found'}`);
    console.log(`  Potential real names: ${realDataIndicators.realNames.length} found`);
  }
  
  // Test 6: Simulate store switching
  function simulateStoreSwitching() {
    const storeSelector = document.querySelector('[role="combobox"]');
    if (storeSelector) {
      console.log('🔄 Store selector found - you can test store switching manually');
      console.log('Instructions:');
      console.log('1. Click the store selector dropdown');
      console.log('2. Select different stores');
      console.log('3. Watch console for debug messages');
      console.log('4. Verify cashier names change between stores');
    } else {
      console.log('❌ Store selector not found - may not be on reports page');
    }
  }
  
  // Main test runner
  function runVerification() {
    console.log('\n🚀 Starting Verification Tests...\n');
    
    // Run tests with delays to allow for UI updates
    setTimeout(() => {
      console.log('1️⃣ Checking App Status...');
      checkAppLoaded();
    }, 100);
    
    setTimeout(() => {
      console.log('\n2️⃣ Checking Report Elements...');
      checkCashierReportElements();
    }, 500);
    
    setTimeout(() => {
      console.log('\n3️⃣ Setting up Log Monitoring...');
      monitorConsoleLogs();
    }, 1000);
    
    setTimeout(() => {
      console.log('\n4️⃣ Checking Sample Data Indicators...');
      checkSampleDataIndicators();
    }, 1500);
    
    setTimeout(() => {
      console.log('\n5️⃣ Checking Real Data Indicators...');
      checkRealDataIndicators();
    }, 2000);
    
    setTimeout(() => {
      console.log('\n6️⃣ Store Switching Test...');
      simulateStoreSwitching();
    }, 2500);
    
    setTimeout(() => {
      console.log('\n✅ Verification Complete!');
      console.log('📋 Next Steps:');
      console.log('1. Navigate to different stores using the store selector');
      console.log('2. Check that cashier names and data change');
      console.log('3. Verify no sample data warnings for real data');
      console.log('4. Look for the debug messages in console');
    }, 3000);
  }
  
  // Auto-run the verification
  runVerification();
  
  // Expose functions for manual testing
  window.cashierReportTest = {
    checkAppLoaded,
    checkCashierReportElements,
    checkSampleDataIndicators,
    checkRealDataIndicators,
    simulateStoreSwitching,
    runVerification
  };
  
  console.log('\n💡 Manual Testing Functions Available:');
  console.log('window.cashierReportTest.runVerification() - Run all tests');
  console.log('window.cashierReportTest.checkSampleDataIndicators() - Check for sample data');
  console.log('window.cashierReportTest.checkRealDataIndicators() - Check for real data');
  
})();
