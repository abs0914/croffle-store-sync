/**
 * Mix & Match Deduction Tester
 * 
 * Test component to verify the new smart Mix & Match inventory deduction system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Legacy service removed - using AtomicInventoryService
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MixMatchDeductionTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const testScenarios = [
    {
      name: 'Croffle Overload with Peanut',
      productId: 'test-croffle-overload-peanut',
      productName: 'Croffle Overload with Peanut',
      quantity: 1,
      expectedDeductions: ['Regular Croissant', 'Peanut', 'Wax Paper', 'Chopstick'],
      expectedSkipped: ['Marshmallow', 'Choco Flakes', 'Caramel Sauce']
    },
    {
      name: 'Mini Croffle with Choco Flakes and Caramel',
      productId: 'test-mini-croffle-choco-caramel',
      productName: 'Mini Croffle with Choco Flakes and Caramel',
      quantity: 1,
      expectedDeductions: ['Regular Croissant', 'Choco Flakes', 'Caramel Sauce', 'Wax Paper'],
      expectedSkipped: ['Marshmallow', 'Peanut', 'Tiramisu']
    },
    {
      name: 'Regular Product (KitKat Croffle)',
      productId: 'test-kitkat-croffle',
      productName: 'KitKat Croffle',
      quantity: 1,
      expectedDeductions: ['Regular Croissant', 'KitKat', 'Whipped Cream', 'Chocolate Sauce'],
      expectedSkipped: []
    }
  ];

  const runTest = async (scenario: any) => {
    // Legacy test removed - using new AtomicInventoryService
    toast.info('This test component has been replaced with the new atomic inventory system');
    
    setTestResults(prev => [...prev, {
      scenario: scenario.name,
      success: false,
      error: 'Legacy testing removed - use AtomicInventoryService',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mix & Match Deduction Tester</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the new smart inventory deduction system for Mix & Match products
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
              <h3 className="font-semibold">Test Results</h3>
              {testResults.map((result, index) => (
                <Card key={index} className={`border-l-4 ${result.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{result.scenario}</h4>
                      <div className="flex gap-2">
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.success ? 'Success' : 'Failed'}
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
                      <div className="space-y-2 text-sm">
                        {result.deductedItems && result.deductedItems.length > 0 && (
                          <div>
                            <strong>Deducted Items ({result.deductedItems.length}):</strong>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                              {result.deductedItems.map((item: any, i: number) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span>{item.name} (×{item.quantity})</span>
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
                            <strong>Skipped Items ({result.skippedItems.length}):</strong>
                            <ul className="list-disc list-inside ml-2">
                              {result.skippedItems.map((item: string, i: number) => (
                                <li key={i} className="text-orange-600">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.debugInfo && (
                          <div>
                            <strong>Debug Info:</strong>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(result.debugInfo, null, 2)}
                            </pre>
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

export default MixMatchDeductionTester;