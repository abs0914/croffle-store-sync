import { supabase } from "@/integrations/supabase/client";
import { unifiedProductService } from "./unifiedProductService";
import { toast } from "sonner";

export interface MiniCroffleTestResult {
  success: boolean;
  message: string;
  details: {
    productExists: boolean;
    correctPrice: boolean;
    productId?: string;
    actualPrice?: number;
    expectedPrice: number;
    storeId: string;
    storeName?: string;
  };
}

export const miniCroffleTestService = {
  // Test Mini Croffle ordering for a specific store
  async testMiniCroffleOrder(storeId: string): Promise<MiniCroffleTestResult> {
    console.log('🧪 Testing Mini Croffle order for store:', storeId);
    
    try {
      // Clear any cached data first
      await unifiedProductService.clearProductCache();
      
      // Get store info
      const { data: store } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();
      
      // Find Mini Croffle product in this store
      const { data: miniCroffle, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('name', 'Mini Croffle')
        .single();
      
      if (error || !miniCroffle) {
        console.error('❌ Mini Croffle not found in store:', storeId, error);
        return {
          success: false,
          message: 'Mini Croffle product not found in store',
          details: {
            productExists: false,
            correctPrice: false,
            expectedPrice: 65.00,
            storeId,
            storeName: store?.name
          }
        };
      }
      
      console.log('✅ Mini Croffle found:', miniCroffle);
      
      // Validate price
      const expectedPrice = 65.00;
      const actualPrice = parseFloat(miniCroffle.price.toString());
      const correctPrice = actualPrice === expectedPrice;
      
      if (!correctPrice) {
        console.error('❌ Incorrect Mini Croffle price:', {
          expected: expectedPrice,
          actual: actualPrice
        });
      }
      
      // Test product validation service
      const validation = await unifiedProductService.validateProductExists(miniCroffle.id);
      
      const result: MiniCroffleTestResult = {
        success: validation.exists && correctPrice,
        message: validation.exists && correctPrice 
          ? 'Mini Croffle ready for ordering' 
          : 'Mini Croffle has issues',
        details: {
          productExists: validation.exists,
          correctPrice,
          productId: miniCroffle.id,
          actualPrice,
          expectedPrice,
          storeId,
          storeName: store?.name
        }
      };
      
      if (result.success) {
        console.log('✅ Mini Croffle test passed:', result);
        toast.success(`Mini Croffle test passed for ${store?.name}`);
      } else {
        console.error('❌ Mini Croffle test failed:', result);
        toast.error(`Mini Croffle test failed for ${store?.name}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Mini Croffle test exception:', error);
      return {
        success: false,
        message: 'Test failed with exception',
        details: {
          productExists: false,
          correctPrice: false,
          expectedPrice: 65.00,
          storeId
        }
      };
    }
  },
  
  // Test all stores
  async testAllStores(): Promise<MiniCroffleTestResult[]> {
    console.log('🧪 Testing Mini Croffle across all stores...');
    
    // Get all active stores
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (error || !stores) {
      console.error('❌ Failed to fetch stores:', error);
      return [];
    }
    
    const results: MiniCroffleTestResult[] = [];
    
    // Test each store sequentially to avoid overwhelming the system
    for (const store of stores) {
      const result = await this.testMiniCroffleOrder(store.id);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`🧪 Test Summary: ${successCount}/${totalCount} stores passed`);
    toast.info(`Mini Croffle Test: ${successCount}/${totalCount} stores passed`);
    
    return results;
  },
  
  // Get current Mini Croffle status across all stores
  async getMiniCroffleStatus(): Promise<{
    storeId: string;
    storeName: string;
    productId: string | null;
    price: number | null;
    isAvailable: boolean;
    hasIssues: boolean;
  }[]> {
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (storesError || !stores) {
      console.error('❌ Failed to fetch stores:', storesError);
      return [];
    }
    
    const results = [];
    
    for (const store of stores) {
      const { data: miniCroffle } = await supabase
        .from('products')
        .select('id, price, is_active')
        .eq('store_id', store.id)
        .eq('name', 'Mini Croffle')
        .single();
      
      const expectedPrice = 65.00;
      const actualPrice = miniCroffle ? parseFloat(miniCroffle.price.toString()) : null;
      const hasIssues = !miniCroffle || actualPrice !== expectedPrice;
      
      results.push({
        storeId: store.id,
        storeName: store.name,
        productId: miniCroffle?.id || null,
        price: actualPrice,
        isAvailable: miniCroffle?.is_active || false,
        hasIssues
      });
    }
    
    return results;
  }
};