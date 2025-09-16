/**
 * Debug Component for Testing Mix & Match Chocolate Sauce Issue
 * 
 * Specifically tests the parsing and matching logic for:
 * "Mini Croffle with Choco Flakes and Chocolate Sauce"
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { deductMixMatchInventoryWithAuth } from '@/services/inventory/smartMixMatchDeductionService';
import { toast } from "sonner";

const MixMatchChocolateSauceTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testChocolateSauceDeduction = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('🧪 CHOCOLATE SAUCE TEST: Starting test...');
      
      // Test the specific product that's failing
      const productName = "Mini Croffle with Choco Flakes and Chocolate Sauce";
      const storeId = 'fd45e07e-7832-4f51-b46b-7ef604359b86'; // Sugbo Mercado IT Park
      const productId = '3ee80ecd-a160-4a68-8ff0-e02a229a07a3'; // Mini Croffle product ID
      const transactionId = 'test-' + Date.now(); // Generate test transaction ID
      const userId = 'ad0a9b53-87ad-4e2f-b698-c8af68531521'; // System Admin user ID
      const quantity = 1;
      
      console.log('🧪 TEST PARAMETERS:', {
        productName,
        storeId,
        productId,
        transactionId,
        userId,
        quantity
      });
      
      // Call the smart deduction service
      const result = await deductMixMatchInventoryWithAuth(
        transactionId,
        storeId,
        productId,
        productName,
        quantity,
        userId
      );
      
      console.log('🧪 TEST RESULT:', result);
      
      setResults(result);
      
      if (result.success) {
        toast.success(`✅ Test passed! Deducted ${result.deductedItems.length} items, skipped ${result.skippedItems?.length || 0}`);
      } else {
        toast.error(`❌ Test failed! Errors: ${result.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('🧪 TEST ERROR:', error);
      toast.error(`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🧪 Chocolate Sauce Mix & Match Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p><strong>Testing Product:</strong> "Mini Croffle with Choco Flakes and Chocolate Sauce"</p>
          <p><strong>Expected Behavior:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Should parse "Choco Flakes" and "Chocolate Sauce" as selected choices</li>
            <li>Should deduct base ingredients (Regular Croissant, Whipped Cream, Mini Take Out Box, Popsicle Stick)</li>
            <li>Should deduct Choco Flakes (0.5 portion for Mini Croffle)</li>
            <li>Should deduct Chocolate Sauce (0.5 portion for Mini Croffle)</li>
            <li>Should skip other optional ingredients (Caramel Sauce, Marshmallow, Tiramisu, Colored Sprinkles)</li>
          </ul>
        </div>
        
        <Button 
          onClick={testChocolateSauceDeduction}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Run Chocolate Sauce Test'}
        </Button>
        
        {results && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-600">✅ Success: {results.success ? 'Yes' : 'No'}</h4>
                <h4 className="font-medium">🎯 Mix & Match: {results.debugInfo?.isMixMatch ? 'Yes' : 'No'}</h4>
                <h4 className="font-medium">📋 Selected Choices: [{results.debugInfo?.selectedChoices?.join(', ') || 'None'}]</h4>
              </div>
              <div>
                <h4 className="font-medium">✅ Deducted: {results.deductedItems?.length || 0}</h4>
                <h4 className="font-medium">⏭️ Skipped: {results.skippedItems?.length || 0}</h4>
                <h4 className="font-medium">❌ Errors: {results.errors?.length || 0}</h4>
              </div>
            </div>
            
            {results.deductedItems?.length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2">✅ Deducted Items:</h4>
                <div className="space-y-1 text-sm">
                  {results.deductedItems.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.itemName} ({item.category})</span>
                      <span className="text-muted-foreground">-{item.quantityDeducted} → {item.newStock}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {results.skippedItems?.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-600 mb-2">⏭️ Skipped Items:</h4>
                <div className="space-y-1 text-sm">
                  {results.skippedItems.map((item: string, index: number) => (
                    <div key={index} className="text-muted-foreground">{item}</div>
                  ))}
                </div>
              </div>
            )}
            
            {results.errors?.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">❌ Errors:</h4>
                <div className="space-y-1 text-sm">
                  {results.errors.map((error: string, index: number) => (
                    <div key={index} className="text-red-600">{error}</div>
                  ))}
                </div>
              </div>
            )}
            
            {results.debugInfo && (
              <div>
                <h4 className="font-medium mb-2">🔍 Debug Info:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Base:</strong> [{results.debugInfo.baseIngredients?.join(', ') || 'None'}]</div>
                  <div><strong>Choices:</strong> [{results.debugInfo.choiceIngredients?.join(', ') || 'None'}]</div>
                  <div><strong>Packaging:</strong> [{results.debugInfo.packagingIngredients?.join(', ') || 'None'}]</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MixMatchChocolateSauceTest;