/**
 * Mix & Match Portion Testing Component
 * 
 * Tests the corrected portion deduction logic for Croffle Overload and Mini Croffle
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deductInventoryForTransactionEnhanced } from '@/services/inventory/enhancedInventoryDeductionService';
import { supabase } from '@/integrations/supabase/client';

const MixMatchPortionTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const testScenarios = [
    {
      name: 'Croffle Overload with Peanut',
      productName: 'Croffle Overload with Peanut',
      expectedDeductions: [
        { name: 'Regular Croissant', quantity: 0.5 },
        { name: 'Vanilla Ice Cream', quantity: 1.0 },
        { name: 'Overload Cup', quantity: 1.0 },
        { name: 'Mini Spoon', quantity: 1.0 },
        { name: 'Popsicle', quantity: 1.0 },
        { name: 'Peanut', quantity: 1.0 } // Should be 1.0 for Croffle Overload
      ],
      expectedSkipped: ['Marshmallow', 'Choco Flakes', 'Colored Sprinkles']
    },
    {
      name: 'Mini Croffle with Choco Flakes and Caramel',
      productName: 'Mini Croffle with Choco Flakes and Caramel Sauce',
      expectedDeductions: [
        { name: 'Regular Croissant', quantity: 0.5 },
        { name: 'Whipped Cream', quantity: 0.5 },
        { name: 'Mini Take Out Box', quantity: 1.0 },
        { name: 'Popsicle Stick', quantity: 1.0 },
        { name: 'Choco Flakes', quantity: 0.5 }, // Should be 0.5 for Mini Croffle
        { name: 'Caramel Sauce', quantity: 0.5 } // Should be 0.5 for Mini Croffle
      ],
      expectedSkipped: ['Marshmallow', 'Peanut', 'Tiramisu', 'Chocolate Sauce', 'Colored Sprinkles']
    }
  ];

  const runTest = async (scenario: any) => {
    setIsLoading(true);
    
    try {
      const transactionId = `test-portion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const storeId = 'fd45e07e-7832-4f51-b46b-7ef604359b86'; // Sugbo Mercado IT Park store ID
      
      // Get current user for testing
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';
      
      console.log(`🧪 PORTION TEST: ${scenario.name}`);
      
      const result = await deductInventoryForTransactionEnhanced(
        transactionId,
        storeId,
        [{
          productId: 'test-product-id', 
          productName: scenario.productName,
          quantity: 1
        }],
        userId
      );
      
      const testResult = {
        scenario: scenario.name,
        success: result.success,
        isMixMatch: result.isMixMatch,
        deductedItems: result.deductedItems.map(item => ({
          name: item.itemName,
          quantity: item.quantityDeducted,
          category: item.category,
          expected: scenario.expectedDeductions.find(exp => 
            exp.name.toLowerCase() === item.itemName.toLowerCase()
          )?.quantity
        })),
        skippedItems: result.skippedItems || [],
        errors: result.errors,
        debugInfo: result.debugInfo,
        timestamp: new Date().toLocaleTimeString(),
        validation: validateResults(result, scenario)
      };
      
      setTestResults(prev => [...prev, testResult]);
      
      console.log(`✅ PORTION TEST COMPLETED: ${scenario.name}`, testResult);
      
    } catch (error) {
      console.error(`❌ PORTION TEST FAILED: ${scenario.name}`, error);
      
      setTestResults(prev => [...prev, {
        scenario: scenario.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        validation: { correct: false, issues: ['Test execution failed'] }
      }]);
    }
    
    setIsLoading(false);
  };

  const validateResults = (result: any, scenario: any) => {
    const issues: string[] = [];
    let correct = true;

    // Check if expected deductions match
    for (const expected of scenario.expectedDeductions) {
      const actual = result.deductedItems?.find((item: any) => 
        item.itemName.toLowerCase() === expected.name.toLowerCase()
      );
      
      if (!actual) {
        issues.push(`Missing deduction: ${expected.name}`);
        correct = false;
      } else if (actual.quantityDeducted !== expected.quantity) {
        issues.push(`Wrong quantity for ${expected.name}: expected ${expected.quantity}, got ${actual.quantityDeducted}`);
        correct = false;
      }
    }

    // Check if unexpected deductions occurred
    for (const skipped of scenario.expectedSkipped) {
      const unexpectedDeduction = result.deductedItems?.find((item: any) => 
        item.itemName.toLowerCase() === skipped.toLowerCase()
      );
      
      if (unexpectedDeduction) {
        issues.push(`Unexpected deduction: ${skipped} (${unexpectedDeduction.quantityDeducted})`);
        correct = false;
      }
    }

    return { correct, issues };
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mix & Match Portion Deduction Tester</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the corrected portion deduction logic:<br/>
            • Croffle Overload: 1.0 portion for selected toppings<br/>
            • Mini Croffle: 0.5 portion for selected sauces and toppings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {testScenarios.map((scenario, index) => (
              <Button
                key={index}
                onClick={() => runTest(scenario)}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Test {scenario.name}
              </Button>
            ))}
            <Button
              onClick={clearResults}
              variant="secondary"
              size="sm"
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Portion Test Results</h3>
              {testResults.map((result, index) => (
                <Card key={index} className={`border-l-4 ${
                  result.validation?.correct ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{result.scenario}</h4>
                      <div className="flex gap-2">
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.success ? 'Success' : 'Failed'}
                        </Badge>
                        <Badge variant={result.validation?.correct ? 'default' : 'destructive'}>
                          {result.validation?.correct ? 'Portions Correct' : 'Portions Wrong'}
                        </Badge>
                        {result.isMixMatch !== undefined && (
                          <Badge variant={result.isMixMatch ? 'secondary' : 'outline'}>
                            {result.isMixMatch ? 'Mix & Match' : 'Regular'}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {result.success ? (
                      <div className="space-y-3 text-sm">
                        {result.validation?.issues && result.validation.issues.length > 0 && (
                          <div className="bg-red-50 p-3 rounded border border-red-200">
                            <strong>Validation Issues:</strong>
                            <ul className="list-disc list-inside ml-2 space-y-1 text-red-700">
                              {result.validation.issues.map((issue: string, i: number) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.deductedItems && result.deductedItems.length > 0 && (
                          <div>
                            <strong>Deducted Items ({result.deductedItems.length}):</strong>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                              {result.deductedItems.map((item: any, i: number) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span>{item.name} (×{item.quantity})</span>
                                  {item.expected && (
                                    <Badge variant={item.quantity === item.expected ? 'default' : 'destructive'}>
                                      Expected: {item.expected}
                                    </Badge>
                                  )}
                                  {item.category && (
                                    <Badge variant="outline">
                                      {item.category}
                                    </Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.skippedItems && result.skippedItems.length > 0 && (
                          <div>
                            <strong>Correctly Skipped Items ({result.skippedItems.length}):</strong>
                            <ul className="list-disc list-inside ml-2">
                              {result.skippedItems.map((item: string, i: number) => (
                                <li key={i} className="text-green-600">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm">
                        <strong>Error:</strong> {result.error}
                        {result.errors && result.errors.length > 0 && (
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {result.errors.map((error: string, i: number) => (
                              <li key={i} className="text-red-600">{error}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MixMatchPortionTester;