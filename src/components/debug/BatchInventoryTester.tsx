import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { batchDeductInventoryForTransaction } from "@/services/inventory/batchInventoryService";

/**
 * Debug tool to test the new batch inventory deduction system
 */
export function BatchInventoryTester() {
  const [isTesting, setIsTesting] = useState(false);
  const [transactionId, setTransactionId] = useState('8b0af76e-6119-40cf-8f95-404b2f470d44'); // Default to the problem transaction
  const [results, setResults] = useState<any>(null);

  const handleTestBatchProcessing = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter a transaction ID');
      return;
    }

    setIsTesting(true);
    setResults(null);
    
    try {
      console.log('🧪 Testing batch inventory processing...');
      
      // Test data based on the problematic transaction
      const testItems = [
        { name: 'Caramel Delight Croffle', quantity: 1, unit_price: 125, total_price: 125 },
        { name: 'Cookies Cream Croffle', quantity: 1, unit_price: 125, total_price: 125 },
        { name: 'Nutella Croffle', quantity: 1, unit_price: 125, total_price: 125 },
        { name: 'Mango Croffle', quantity: 1, unit_price: 125, total_price: 125 },
        { name: 'Glaze Croffle', quantity: 1, unit_price: 79, total_price: 79 },
        { name: 'Lemonade', quantity: 1, unit_price: 60, total_price: 60 },
        { name: 'Oreo Strawberry Blended', quantity: 1, unit_price: 110, total_price: 110 },
        { name: 'Vanilla Caramel Iced', quantity: 1, unit_price: 90, total_price: 90 },
        { name: 'Mini Croffle with Choco Flakes and Tiramisu', quantity: 1, unit_price: 65, total_price: 65 },
        { name: 'Cafe Latte Iced', quantity: 1, unit_price: 70, total_price: 70 },
        { name: 'Coke', quantity: 1, unit_price: 20, total_price: 20 },
        { name: 'Bottled Water', quantity: 1, unit_price: 20, total_price: 20 },
        { name: 'Dark Chocolate Sauce', quantity: 1, unit_price: 10, total_price: 10 }
      ];
      
      const result = await batchDeductInventoryForTransaction(
        `test-${transactionId}`, // Use test prefix
        'fd45e07e-7832-4f51-b46b-7ef604359b86',
        testItems,
        15000 // 15 second timeout for testing
      );
      
      setResults(result);
      
      if (result.success) {
        toast.success(`✅ Batch processing completed in ${result.processingTimeMs}ms!`);
      } else {
        toast.error(`❌ Batch processing failed: ${result.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Error testing batch processing:', error);
      toast.error('Failed to test batch processing');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Batch Inventory Deduction Tester</CardTitle>
        <p className="text-muted-foreground">
          Test the optimized batch processing system for inventory deductions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transactionId">Test Transaction ID</Label>
          <Input
            id="transactionId"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter transaction ID for testing"
          />
        </div>

        <Button 
          onClick={handleTestBatchProcessing}
          disabled={isTesting}
          className="w-full"
        >
          {isTesting ? 'Testing Batch Processing...' : 'Test Batch Processing'}
        </Button>
        
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-green-600">⚡ Performance</p>
                <p>Time: {results.processingTimeMs}ms</p>
                <p>Items: {results.itemsProcessed}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-blue-600">✅ Results</p>
                <p>Deducted: {results.deductedItems?.length || 0}</p>
                <p>Success: {results.success ? 'Yes' : 'No'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-orange-600">⚠️ Issues</p>
                <p>Errors: {results.errors?.length || 0}</p>
                <p>Warnings: {results.warnings?.length || 0}</p>
              </div>
            </div>
            
            {results.deductedItems?.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="font-medium text-green-700 mb-2">Deducted Items:</p>
                <ul className="text-sm text-green-600 space-y-1">
                  {results.deductedItems.map((item: any, idx: number) => (
                    <li key={idx}>
                      • {item.itemName}: -{item.quantityDeducted} units (stock: {item.newStock})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.errors?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="font-medium text-red-700 mb-2">Errors:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {results.errors.map((error: string, idx: number) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.warnings?.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-medium text-yellow-700 mb-2">Warnings:</p>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {results.warnings.map((warning: string, idx: number) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}