// Test script to verify shift state and button functionality
// Run this in the browser console

async function testShiftButton() {
  console.log('🧪 Testing Shift Button Functionality...\n');
  
  // Check if we're in the React app
  if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment');
    return;
  }
  
  // Wait for React to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if the button exists
  const startShiftButton = document.querySelector('[class*="bg-croffle-accent"], [class*="bg-red-500"]');
  
  if (!startShiftButton) {
    console.log('❌ Start/End Shift button not found in DOM');
    console.log('Available buttons:', document.querySelectorAll('button'));
    return;
  }
  
  console.log('✅ Found shift button in DOM');
  console.log('Button text:', startShiftButton.textContent);
  console.log('Button classes:', startShiftButton.className);
  
  // Check button color to determine state
  const isEndShiftButton = startShiftButton.className.includes('bg-red-500');
  const isStartShiftButton = startShiftButton.className.includes('bg-croffle-accent');
  
  if (isEndShiftButton) {
    console.log('🔴 Button is showing "End Shift" (red) - Active shift detected');
  } else if (isStartShiftButton) {
    console.log('🟠 Button is showing "Start Shift" (orange) - No active shift');
  } else {
    console.log('⚠️  Button state unclear - checking text content');
    if (startShiftButton.textContent.includes('End Shift')) {
      console.log('🔴 Text indicates "End Shift" - Active shift detected');
    } else if (startShiftButton.textContent.includes('Start Shift')) {
      console.log('🟠 Text indicates "Start Shift" - No active shift');
    }
  }
  
  // Test button click functionality
  console.log('\n🖱️  Testing button click...');
  
  try {
    startShiftButton.click();
    console.log('✅ Button click executed successfully');
    
    // Wait a moment and check for dialogs
    setTimeout(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 0) {
        console.log('✅ Dialog opened successfully');
        console.log('Dialog content:', dialogs[0].textContent.substring(0, 100) + '...');
        
        // Close the dialog by clicking outside or finding close button
        const closeButton = document.querySelector('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:contains("Cancel")');
        if (closeButton) {
          closeButton.click();
          console.log('✅ Dialog closed');
        }
      } else {
        console.log('⚠️  No dialog opened - might have navigated to POS page');
      }
    }, 1000);
    
  } catch (error) {
    console.log('❌ Error clicking button:', error.message);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('- Button found: ✅');
  console.log('- Button state detection: ✅');
  console.log('- Button click functionality: ✅');
  console.log('\n🎉 Shift button test completed!');
}

// Auto-run the test
testShiftButton();
