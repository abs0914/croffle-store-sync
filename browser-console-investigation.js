/**
 * Browser Console Investigation Script for Robinsons North Cashier Data
 * 
 * Instructions:
 * 1. Open browser console (F12)
 * 2. Navigate to Reports > Cashier Performance
 * 3. Select "Robinsons North" store
 * 4. Set date to May 26th, 2025 (or current date)
 * 5. Paste and run this script in the console
 * 6. Check the output for debugging information
 */

// Store ID for Robinsons North
const ROBINSONS_NORTH_ID = 'a12a8269-5cbc-4a78-bae0-d6f166e1446d';

console.log('🔍 STARTING ROBINSONS NORTH INVESTIGATION');
console.log('==========================================');

// Function to test the cashier report API directly
async function testCashierReportAPI() {
    console.log('\n📡 TESTING CASHIER REPORT API DIRECTLY');
    console.log('--------------------------------------');
    
    try {
        // Get the current date range from the UI or use default
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = startDate;
        
        console.log(`📅 Testing date range: ${startDate} to ${endDate}`);
        console.log(`🏪 Store ID: ${ROBINSONS_NORTH_ID}`);
        
        // Check if we can access the Supabase client
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase client not found in window object');
            console.log('💡 Try accessing from React component context');
            return;
        }
        
        const supabase = window.supabase;
        
        // Test 1: Check app_users for this store
        console.log('\n👥 TESTING APP_USERS QUERY');
        const { data: users, error: usersError } = await supabase
            .from('app_users')
            .select('user_id, first_name, last_name, role, is_active, store_ids')
            .contains('store_ids', [ROBINSONS_NORTH_ID])
            .eq('role', 'cashier')
            .eq('is_active', true);
            
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
        } else {
            console.log(`✅ Found ${users.length} cashiers for Robinsons North:`, users);
        }
        
        // Test 2: Check transactions for this store
        console.log('\n💳 TESTING TRANSACTIONS QUERY');
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('id, user_id, total, status, created_at')
            .eq('store_id', ROBINSONS_NORTH_ID)
            .eq('status', 'completed')
            .gte('created_at', `${startDate}T00:00:00Z`)
            .lte('created_at', `${endDate}T23:59:59Z`);
            
        if (transactionsError) {
            console.error('❌ Error fetching transactions:', transactionsError);
        } else {
            console.log(`✅ Found ${transactions.length} transactions for Robinsons North:`, transactions);
        }
        
        // Test 3: Check shifts for this store
        console.log('\n⏰ TESTING SHIFTS QUERY');
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('id, user_id, start_time, end_time, status')
            .eq('store_id', ROBINSONS_NORTH_ID)
            .gte('start_time', `${startDate}T00:00:00Z`)
            .lte('start_time', `${endDate}T23:59:59Z`);
            
        if (shiftsError) {
            console.error('❌ Error fetching shifts:', shiftsError);
        } else {
            console.log(`✅ Found ${shifts.length} shifts for Robinsons North:`, shifts);
        }
        
        // Test 4: Test the actual cashier report function if available
        console.log('\n📊 TESTING CASHIER REPORT FUNCTION');
        if (typeof window.getCashierReport === 'function') {
            const reportResult = await window.getCashierReport(ROBINSONS_NORTH_ID, startDate, endDate);
            console.log('📈 Cashier report result:', reportResult);
        } else {
            console.log('⚠️ getCashierReport function not found in window object');
        }
        
    } catch (error) {
        console.error('❌ Error in API testing:', error);
    }
}

// Function to monitor network requests
function monitorNetworkRequests() {
    console.log('\n🌐 MONITORING NETWORK REQUESTS');
    console.log('------------------------------');
    
    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('cashier') || url.includes('transactions') || url.includes('shifts') || url.includes('app_users'))) {
            console.log('🔗 API Request:', url);
            console.log('📦 Request args:', args);
        }
        
        return originalFetch.apply(this, args).then(response => {
            if (typeof url === 'string' && (url.includes('cashier') || url.includes('transactions') || url.includes('shifts') || url.includes('app_users'))) {
                console.log('📥 API Response status:', response.status);
                // Clone response to read it without consuming the original
                const clonedResponse = response.clone();
                clonedResponse.json().then(data => {
                    console.log('📄 API Response data:', data);
                }).catch(err => {
                    console.log('⚠️ Could not parse response as JSON');
                });
            }
            return response;
        });
    };
    
    console.log('✅ Network monitoring enabled. Perform actions in the UI now.');
}

// Function to check for debugging messages in console
function checkDebuggingMessages() {
    console.log('\n🐛 CHECKING FOR DEBUGGING MESSAGES');
    console.log('----------------------------------');
    console.log('Look for these emoji patterns in the console:');
    console.log('🔄 - Fetching cashier report');
    console.log('💳 - Transactions fetched');
    console.log('⏰ - Shifts fetched');
    console.log('👥 - Cashier report result');
    console.log('🔍 - Sample data detection');
    console.log('');
    console.log('If you don\'t see these messages, the debugging code may not be active.');
}

// Function to check current UI state
function checkUIState() {
    console.log('\n🖥️ CHECKING CURRENT UI STATE');
    console.log('-----------------------------');
    
    // Check selected store
    const storeSelector = document.querySelector('[data-testid="store-selector"]') || 
                         document.querySelector('select') ||
                         document.querySelector('[class*="select"]');
    
    if (storeSelector) {
        console.log('🏪 Store selector found:', storeSelector.value || storeSelector.textContent);
    } else {
        console.log('⚠️ Store selector not found');
    }
    
    // Check date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    console.log(`📅 Found ${dateInputs.length} date inputs:`);
    dateInputs.forEach((input, index) => {
        console.log(`  Date input ${index + 1}: ${input.value}`);
    });
    
    // Check for error messages
    const errorElements = document.querySelectorAll('[class*="error"], [class*="warning"], .alert');
    if (errorElements.length > 0) {
        console.log('⚠️ Found potential error/warning elements:');
        errorElements.forEach(el => console.log('  ', el.textContent));
    } else {
        console.log('✅ No obvious error messages found');
    }
    
    // Check for "No data" messages
    const noDataElements = document.querySelectorAll('*');
    const noDataTexts = Array.from(noDataElements).filter(el => 
        el.textContent && el.textContent.toLowerCase().includes('no') && 
        (el.textContent.toLowerCase().includes('data') || el.textContent.toLowerCase().includes('cashier'))
    );
    
    if (noDataTexts.length > 0) {
        console.log('📭 Found "no data" messages:');
        noDataTexts.forEach(el => console.log('  ', el.textContent.trim()));
    }
}

// Function to test sample data detection
function testSampleDataDetection() {
    console.log('\n🎭 TESTING SAMPLE DATA DETECTION');
    console.log('--------------------------------');
    
    const testNames = [
        ['John Smith', 'Sarah Lee', 'Mike Johnson'], // Should be detected as sample
        ['Maria Santos', 'Juan Dela Cruz', 'Ana Rodriguez'], // Should NOT be detected as sample
        ['Alice Brown', 'Bob Wilson'], // Should be detected as sample
        ['Jose Rizal', 'Andres Bonifacio'] // Should NOT be detected as sample
    ];
    
    // If the sample detection function is available, test it
    if (typeof window.isSampleData === 'function') {
        testNames.forEach((names, index) => {
            const result = window.isSampleData(names);
            console.log(`Test ${index + 1}: ${JSON.stringify(names)} -> ${result ? 'SAMPLE' : 'REAL'}`);
        });
    } else {
        console.log('⚠️ isSampleData function not found in window object');
        console.log('💡 The function might be in a different scope or not exposed globally');
    }
}

// Main investigation function
async function investigateRobinsonsNorth() {
    console.log('🚀 Starting comprehensive investigation...\n');
    
    checkUIState();
    checkDebuggingMessages();
    testSampleDataDetection();
    monitorNetworkRequests();
    
    // Wait a moment for network monitoring to be set up
    setTimeout(async () => {
        await testCashierReportAPI();
        
        console.log('\n✅ INVESTIGATION COMPLETE');
        console.log('========================');
        console.log('📋 Next steps:');
        console.log('1. Check the SQL investigation results');
        console.log('2. Try refreshing the page and selecting the store again');
        console.log('3. Check if test data needs to be inserted');
        console.log('4. Verify the date range includes data');
        console.log('5. Look for any error messages in the Network tab');
        
    }, 1000);
}

// Auto-run the investigation
investigateRobinsonsNorth();

// Export functions for manual testing
window.investigateRobinsonsNorth = investigateRobinsonsNorth;
window.testCashierReportAPI = testCashierReportAPI;
window.checkUIState = checkUIState;
window.testSampleDataDetection = testSampleDataDetection;
