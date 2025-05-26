// Quick Browser Console Test for Robinsons North
// Paste this in browser console (F12) while on Cashier Performance page

console.log('🔍 ROBINSONS NORTH QUICK INVESTIGATION');
console.log('=====================================');

// Check current page state
console.log('\n📍 CURRENT PAGE STATE:');
console.log('URL:', window.location.href);
console.log('Page title:', document.title);

// Check for store selector
const storeElements = document.querySelectorAll('select, [class*="select"], [data-testid*="store"]');
console.log(`\n🏪 Found ${storeElements.length} potential store selector elements:`);
storeElements.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName} - Value: "${el.value || el.textContent}" - Classes: ${el.className}`);
});

// Check for date inputs
const dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="date"], [class*="date"]');
console.log(`\n📅 Found ${dateInputs.length} date-related elements:`);
dateInputs.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName} - Value: "${el.value}" - Placeholder: "${el.placeholder}"`);
});

// Check for "no data" messages
const textElements = document.querySelectorAll('*');
const noDataMessages = Array.from(textElements).filter(el => {
    const text = el.textContent?.toLowerCase() || '';
    return text.includes('no') && (text.includes('data') || text.includes('cashier') || text.includes('available'));
}).map(el => el.textContent.trim()).filter(text => text.length < 200);

console.log(`\n📭 Found ${noDataMessages.length} "no data" messages:`);
noDataMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. "${msg}"`);
});

// Check for error messages
const errorElements = document.querySelectorAll('[class*="error"], [class*="warning"], .alert, [role="alert"]');
console.log(`\n⚠️ Found ${errorElements.length} potential error elements:`);
errorElements.forEach((el, i) => {
    console.log(`  ${i + 1}. "${el.textContent.trim()}"`);
});

// Look for debugging messages in console history
console.log('\n🐛 LOOKING FOR OUR DEBUGGING MESSAGES:');
console.log('Look above in the console for messages with these emojis:');
console.log('🔄 - Fetching cashier report');
console.log('💳 - Transactions fetched');
console.log('⏰ - Shifts fetched');
console.log('👥 - Cashier report result');
console.log('🔍 - Sample data detection');

// Check if we can access any global variables
console.log('\n🌐 CHECKING GLOBAL VARIABLES:');
console.log('window.supabase exists:', typeof window.supabase !== 'undefined');
console.log('window.React exists:', typeof window.React !== 'undefined');
console.log('window.location:', window.location.href);

// Try to trigger a store change event
console.log('\n🔄 ATTEMPTING TO TRIGGER STORE SELECTION:');
const storeSelector = document.querySelector('select') || document.querySelector('[class*="select"]');
if (storeSelector) {
    console.log('Found store selector, attempting to trigger change...');
    // Create and dispatch a change event
    const event = new Event('change', { bubbles: true });
    storeSelector.dispatchEvent(event);
    console.log('Change event dispatched');
} else {
    console.log('No store selector found');
}

// Monitor for new console messages
console.log('\n👀 MONITORING CONSOLE FOR NEW MESSAGES...');
console.log('Perform actions in the UI now and watch for debugging messages');

// Set up a simple network monitor
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string') {
        console.log('🌐 Network request:', url);
    }
    return originalFetch.apply(this, args);
};

console.log('\n✅ Investigation complete. Now:');
console.log('1. Run the SQL queries in your database console');
console.log('2. Try selecting different stores in the UI');
console.log('3. Try changing the date range');
console.log('4. Watch for any new console messages');
console.log('5. Check the Network tab for API calls');
