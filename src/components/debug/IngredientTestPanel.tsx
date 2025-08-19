import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deductIngredientsForProduct } from "@/services/productCatalog/ingredientDeductionService";
import { toast } from "sonner";

export const IngredientTestPanel = () => {
  const [testing, setTesting] = useState(false);

  const testCokeDeduction = async () => {
    setTesting(true);
    console.log('🧪 Testing Coke ingredient deduction...');
    
    try {
      // Use the product catalog ID for Coke (from Sugbo Mercado)
      const catalogId = 'c22760a7-92e0-4878-bc99-827ede9f05eb';
      const quantity = 1;
      const testTransactionId = 'test-' + Date.now();
      
      const result = await deductIngredientsForProduct(catalogId, quantity, testTransactionId);
      
      if (result) {
        toast.success('✅ Ingredient deduction test PASSED!');
        console.log('✅ Test result: SUCCESS');
      } else {
        toast.error('❌ Ingredient deduction test FAILED!');
        console.log('❌ Test result: FAILED');
      }
      
    } catch (error) {
      console.error('🧪 Test error:', error);
      toast.error('Test error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          🧪 Ingredient Deduction Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Test the ingredient deduction service with Coke product to verify the ID mapping fix is working.
        </p>
        
        <Button 
          onClick={testCokeDeduction}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Test Coke Deduction'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Check console logs for detailed results
        </p>
      </CardContent>
    </Card>
  );
};