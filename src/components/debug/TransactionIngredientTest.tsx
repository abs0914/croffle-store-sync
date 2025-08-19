import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deductIngredientsForProduct } from "@/services/productCatalog/ingredientDeductionService";
import { toast } from "sonner";

export const TransactionIngredientTest = () => {
  const [testing, setTesting] = useState(false);

  const testTransaction = async () => {
    setTesting(true);
    console.log('🧪 Testing ingredient deduction for transaction 20250819-9311-181633...');
    
    try {
      // Test each product from the actual failed transaction
      const products = [
        { id: '0cf80f7e-4f40-4ea7-83d7-d803d3474428', name: 'Choco Overload', quantity: 1 },
        { id: 'f5a843c3-5d87-41af-82ca-51d0709358dc', name: 'Blueberry', quantity: 1 },
        { id: 'c22760a7-92e0-4878-bc99-827ede9f05eb', name: 'Coke', quantity: 1 }
      ];
      
      let successCount = 0;
      let failCount = 0;
      
      for (const product of products) {
        console.log(`\n🧪 Testing ${product.name} (${product.id})...`);
        
        try {
          const result = await deductIngredientsForProduct(product.id, product.quantity, `test-${Date.now()}`);
          if (result) {
            console.log(`✅ ${product.name}: SUCCESS`);
            successCount++;
          } else {
            console.log(`❌ ${product.name}: FAILED`);
            failCount++;
          }
        } catch (error) {
          console.error(`❌ ${product.name} ERROR:`, error);
          failCount++;
        }
      }
      
      if (failCount === 0) {
        toast.success(`✅ All ${successCount} products processed successfully!`);
      } else {
        toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed. Check console for details.`);
      }
      
    } catch (error) {
      console.error('🧪 Test error:', error);
      toast.error('Test failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          🧪 Transaction Ingredient Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Test ingredient deduction for the failed transaction: Choco Overload, Blueberry, and Coke.
        </p>
        
        <Button 
          onClick={testTransaction}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Test Failed Transaction'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          This will test each product individually to identify the issue
        </p>
      </CardContent>
    </Card>
  );
};