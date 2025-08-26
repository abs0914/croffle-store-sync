// Mini Croffle Debugging Utilities
// Access via browser console: window.miniCroffleDebugger

import { miniCroffleTestService } from "@/services/productManagement/miniCroffleTestService";
import { unifiedProductService } from "@/services/productManagement/unifiedProductService";
import { supabase } from "@/integrations/supabase/client";

export const miniCroffleDebugger = {
  // Test Mini Croffle for current store (Robinsons North)
  async testCurrentStore() {
    console.log('🧪 Testing Mini Croffle for current store...');
    const currentStoreId = 'fd45e07e-7832-4f51-b46b-7ef604359b86'; // Robinsons North
    return await miniCroffleTestService.testMiniCroffleOrder(currentStoreId);
  },
  
  // Test all stores
  async testAllStores() {
    console.log('🧪 Testing Mini Croffle across ALL stores...');
    return await miniCroffleTestService.testAllStores();
  },
  
  // Get status of Mini Croffle across all stores
  async getStatus() {
    console.log('📊 Getting Mini Croffle status across all stores...');
    return await miniCroffleTestService.getMiniCroffleStatus();
  },
  
  // Clear all product cache
  async clearCache() {
    console.log('🗑️ Clearing all product cache...');
    return await unifiedProductService.clearProductCache();
  },
  
  // Check if problematic product ID exists
  async checkProblematicId() {
    const problematicId = '55a665cd-f0d0-4401-b854-bf908c411e56';
    console.log('🔍 Checking if problematic ID exists:', problematicId);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', problematicId);
    
    if (error) {
      console.error('❌ Error checking problematic ID:', error);
      return { exists: false, error };
    }
    
    console.log('✅ Problematic ID check result:', { exists: data && data.length > 0, data });
    return { exists: data && data.length > 0, data };
  },
  
  // Find Mini Croffle for specific store
  async findMiniCroffleInStore(storeId: string) {
    console.log('🔍 Finding Mini Croffle in store:', storeId);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('name', 'Mini Croffle');
    
    if (error) {
      console.error('❌ Error finding Mini Croffle:', error);
      return { found: false, error };
    }
    
    console.log('🥐 Mini Croffle search result:', data);
    return { found: data && data.length > 0, data, count: data?.length || 0 };
  },
  
  // Simulate an order
  async simulateOrder(storeId?: string) {
    const targetStoreId = storeId || 'fd45e07e-7832-4f51-b46b-7ef604359b86';
    console.log('🛒 Simulating Mini Croffle order for store:', targetStoreId);
    
    // First find the Mini Croffle
    const miniCroffleResult = await this.findMiniCroffleInStore(targetStoreId);
    
    if (!miniCroffleResult.found || !miniCroffleResult.data?.[0]) {
      console.error('❌ Cannot simulate order - Mini Croffle not found');
      return { success: false, message: 'Mini Croffle not found' };
    }
    
    const miniCroffle = miniCroffleResult.data[0];
    console.log('✅ Mini Croffle found for order simulation:', {
      id: miniCroffle.id,
      name: miniCroffle.name,
      price: miniCroffle.price
    });
    
    // Validate the product exists using our validation service
    const validation = await unifiedProductService.validateProductExists(miniCroffle.id);
    
    if (validation.exists) {
      console.log('✅ Order simulation PASSED - Product validation successful');
      return { 
        success: true, 
        message: 'Order simulation successful',
        productId: miniCroffle.id,
        price: miniCroffle.price
      };
    } else {
      console.error('❌ Order simulation FAILED - Product validation failed');
      return { 
        success: false, 
        message: 'Product validation failed',
        productId: miniCroffle.id
      };
    }
  },
  
  // Quick help
  help() {
    console.log(`
🧪 Mini Croffle Debugger Commands:

• testCurrentStore()     - Test Mini Croffle in current store (Robinsons North)
• testAllStores()        - Test Mini Croffle across all stores
• getStatus()            - Get Mini Croffle status overview
• clearCache()           - Clear all product cache
• checkProblematicId()   - Check if the problematic ID exists
• findMiniCroffleInStore(storeId) - Find Mini Croffle in specific store
• simulateOrder(storeId) - Simulate an order (optional storeId)
• help()                 - Show this help message

Example usage:
  await miniCroffleDebugger.testCurrentStore()
  await miniCroffleDebugger.simulateOrder()
    `);
  }
};

// Make it available globally for console access
declare global {
  interface Window {
    miniCroffleDebugger: typeof miniCroffleDebugger;
  }
}

// Auto-assign to window if in browser
if (typeof window !== 'undefined') {
  window.miniCroffleDebugger = miniCroffleDebugger;
  console.log('🧪 Mini Croffle Debugger loaded! Type "miniCroffleDebugger.help()" for commands.');
}