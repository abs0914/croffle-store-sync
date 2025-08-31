import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deductIngredientsForProduct } from "@/services/productCatalog/ingredientDeductionService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecipeCreationTool } from "./RecipeCreationTool";
import { BatchInventoryTester } from "./BatchInventoryTester";

export const TransactionTestRunner = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testActualTransaction = async () => {
    setTesting(true);
    console.log('🧪 Testing actual transaction #20250826-9601-101759...');
    
    try {
      // Get the actual transaction details
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', 'd6e81a4e-5616-4cc6-afcc-7fb8b1e1f0c4')
        .single();

      if (txError || !transaction) {
        throw new Error(`Transaction not found: ${txError?.message}`);
      }

      console.log('📋 Transaction found:', transaction);

      // Get current inventory levels before deduction
      const { data: inventoryBefore } = await supabase
        .from('inventory_stock')
        .select('item, stock_quantity')
        .eq('store_id', transaction.store_id);

      console.log('📦 Inventory before:', inventoryBefore);

      // Use known data from our investigation - Tiramisu Croffle product
      const testItems = [{
        product_id: '0cf80f7e-4f40-4ea7-83d7-d803d3474428', // Tiramisu Croffle
        product_name: 'Tiramisu Croffle', 
        quantity: 1
      }];

      console.log('📋 Testing with known product:', testItems);

      // Test deduction for each item in the transaction
      const deductionResults = [];
      
      for (const item of testItems) {
        console.log(`\n🧪 Testing deduction for ${item.product_name} (${item.product_id}), qty: ${item.quantity}...`);
        
        try {
          const result = await deductIngredientsForProduct(
            item.product_id, 
            item.quantity, 
            `test-${transaction.id}`
          );
          
          deductionResults.push({
            product: item.product_name,
            product_id: item.product_id,
            quantity: item.quantity,
            success: !!result,
            result
          });
          
          console.log(`${result ? '✅' : '❌'} ${item.product_name}: ${result ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.error(`❌ ${item.product_name} ERROR:`, error);
          deductionResults.push({
            product: item.product_name,
            product_id: item.product_id,
            quantity: item.quantity,
            success: false,
            error: error.message
          });
        }
      }

      // Get inventory levels after deduction
      const { data: inventoryAfter } = await supabase
        .from('inventory_stock')
        .select('item, stock_quantity')
        .eq('store_id', transaction.store_id);

      console.log('📦 Inventory after:', inventoryAfter);

      // Compare inventory changes
      const changes = inventoryBefore?.map(before => {
        const after = inventoryAfter?.find(a => a.item === before.item);
        return {
          item: before.item,
          before: before.stock_quantity,
          after: after?.stock_quantity || 0,
          change: (after?.stock_quantity || 0) - before.stock_quantity
        };
      }).filter(change => change.change !== 0);

      setResults({
        transaction,
        testItems,
        deductionResults,
        inventoryChanges: changes,
        success: deductionResults.every(r => r.success)
      });

      if (deductionResults.every(r => r.success)) {
        toast.success(`✅ All ${deductionResults.length} products processed successfully!`);
      } else {
        toast.warning(`⚠️ Some deductions failed. Check console for details.`);
      }

    } catch (error) {
      console.error('🧪 Test error:', error);
      toast.error('Test failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recipe Creation Tool */}
      <RecipeCreationTool />
      
      {/* Batch Inventory Tester */}
      <BatchInventoryTester />
      
      {/* Original Transaction Test */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            🧪 Transaction Inventory Test (Legacy)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Test inventory deduction for transaction #20250826-9601-101759 (Tiramisu Croffle)
          </p>
          
          <Button 
            onClick={testActualTransaction}
            disabled={testing}
            className="w-full"
          >
            {testing ? 'Testing...' : 'Test Transaction Deduction'}
          </Button>

          {results && (
            <div className="mt-4 space-y-3">
              <div className="p-3 border rounded">
                <h3 className="font-medium">Transaction: {results.transaction.receipt_number}</h3>
                <p className="text-sm text-muted-foreground">
                  Items: {results.testItems.length}, 
                  Total: ₱{results.transaction.total}
                </p>
              </div>
              
              <div className="p-3 border rounded">
                <h3 className="font-medium">Deduction Results:</h3>
                {results.deductionResults.map((result: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{result.product} (qty: {result.quantity})</span>
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                ))}
              </div>

              {results.inventoryChanges && results.inventoryChanges.length > 0 && (
                <div className="p-3 border rounded">
                  <h3 className="font-medium">Inventory Changes:</h3>
                  {results.inventoryChanges.map((change: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{change.item}</span>
                      <span className={change.change < 0 ? 'text-green-600' : 'text-red-600'}>
                        {change.before} → {change.after} ({change.change > 0 ? '+' : ''}{change.change})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            This will test the actual transaction and show inventory changes
          </p>
        </CardContent>
      </Card>
    </div>
  );
};