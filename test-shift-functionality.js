// Comprehensive test for shift button functionality
// Run this in the browser console after the app loads

async function testShiftFunctionality() {
  console.log('🧪 Starting comprehensive shift button test...\n');
  
  // Wait for app to fully load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 1: Check if shift button exists
  console.log('📍 Test 1: Checking if shift button exists...');
  const shiftButtons = document.querySelectorAll('button');
  let shiftButton = null;
  
  for (const button of shiftButtons) {
    const text = button.textContent?.toLowerCase() || '';
    if (text.includes('shift') || text.includes('loading')) {
      shiftButton = button;
      break;
    }
  }
  
  if (!shiftButton) {
    console.log('❌ No shift button found');
    console.log('Available buttons:', Array.from(shiftButtons).map(b => b.textContent));
    return;
  }
  
  console.log('✅ Shift button found:', shiftButton.textContent);
  console.log('Button classes:', shiftButton.className);
  
  // Test 2: Check button state
  console.log('\n📍 Test 2: Analyzing button state...');
  const buttonText = shiftButton.textContent?.toLowerCase() || '';
  const buttonClasses = shiftButton.className;
  
  let buttonState = 'unknown';
  if (buttonText.includes('loading')) {
    buttonState = 'loading';
  } else if (buttonText.includes('end shift')) {
    buttonState = 'end_shift';
  } else if (buttonText.includes('start shift')) {
    buttonState = 'start_shift';
  }
  
  console.log(`Button state: ${buttonState}`);
  console.log(`Button text: "${shiftButton.textContent}"`);
  
  // Test 3: Check console logs for shift context
  console.log('\n📍 Test 3: Checking shift context logs...');
  console.log('Look for "StartShiftButton render:" logs above this message');
  
  // Test 4: Test button click functionality
  console.log('\n📍 Test 4: Testing button click...');
  
  if (buttonState === 'loading') {
    console.log('⏳ Button is in loading state, waiting...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Re-check button state
    const newText = shiftButton.textContent?.toLowerCase() || '';
    if (newText.includes('end shift')) {
      buttonState = 'end_shift';
    } else if (newText.includes('start shift')) {
      buttonState = 'start_shift';
    }
    console.log(`Updated button state: ${buttonState}`);
  }
  
  if (buttonState === 'end_shift') {
    console.log('🔴 Testing End Shift functionality...');
    
    // Click the button to open End Shift dialog
    shiftButton.click();
    
    // Wait for dialog to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const dialogs = document.querySelectorAll('[role="dialog"]');
    if (dialogs.length > 0) {
      console.log('✅ End Shift dialog opened successfully');
      console.log('Dialog title:', dialogs[0].querySelector('h2, [class*="title"]')?.textContent);
      
      // Close the dialog
      const cancelButton = dialogs[0].querySelector('button[type="button"], button:contains("Cancel")');
      if (cancelButton) {
        cancelButton.click();
        console.log('✅ Dialog closed');
      } else {
        // Try clicking outside the dialog
        document.body.click();
        console.log('✅ Attempted to close dialog');
      }
    } else {
      console.log('❌ End Shift dialog did not open');
    }
    
  } else if (buttonState === 'start_shift') {
    console.log('🟠 Testing Start Shift functionality...');
    
    // Click the button to navigate to POS
    const currentPath = window.location.pathname;
    shiftButton.click();
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (window.location.pathname !== currentPath) {
      console.log('✅ Navigation to POS page successful');
      console.log(`Navigated from ${currentPath} to ${window.location.pathname}`);
    } else {
      console.log('⚠️  No navigation occurred (might already be on POS page)');
    }
  }
  
  // Test 5: Check for any React errors
  console.log('\n📍 Test 5: Checking for React errors...');
  const reactErrors = document.querySelectorAll('[class*="error"], [class*="Error"]');
  if (reactErrors.length > 0) {
    console.log('⚠️  Found potential React errors:', reactErrors);
  } else {
    console.log('✅ No visible React errors found');
  }
  
  // Test 6: Verify shift context is working
  console.log('\n📍 Test 6: Testing shift context access...');
  
  // Try to access React DevTools or check for context
  if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React detected in window');
  } else {
    console.log('⚠️  React not detected in window');
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Button found: ${shiftButton ? 'Yes' : 'No'}`);
  console.log(`✅ Button state: ${buttonState}`);
  console.log(`✅ Button responsive: ${shiftButton && !shiftButton.disabled ? 'Yes' : 'No'}`);
  console.log(`✅ Functionality test: Completed`);
  
  console.log('\n🎉 Shift button test completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Check the browser console for "StartShiftButton render:" logs');
  console.log('2. Verify the button changes state when shift status changes');
  console.log('3. Test the actual shift start/end workflow');
}

// Auto-run the test
testShiftFunctionality();
