import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedDeductionService } from "@/services/inventory/enhancedDeductionService";
import { toast } from "sonner";

export const InventoryDeductionValidator = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  // Test products with their expected deductions
  const testProducts = [
    { 
      name: 'Croffle Overload',
      id: 'f598f705-d3c3-44bb-90e1-04af2184b01e', // Replace with actual ID
      expectedDeductions: {
        'Peanuts Toppings': 1
      }
    },
    {
      name: 'Mini Croffle – Choco Flakes',
      id: 'mini-croffle-choco', // Replace with actual ID
      expectedDeductions: {
        'Choco Flakes Toppings': 0.5
      }
    },
    {
      name: 'Mini Croffle – Caramel',
      id: 'mini-croffle-caramel', // Replace with actual ID
      expectedDeductions: {
        'Caramel Sauce': 0.5
      }
    },
    {
      name: 'Oreo Strawberry Blended',
      id: 'oreo-strawberry', // Replace with actual ID
      expectedDeductions: {
        'Crushed Oreo': 2,
        'Frappe Powder': 30
      }
    }
  ];

  const runDeductionTests = async () => {
    setTesting(true);
    setResults([]);
    const testResults = [];

    try {
      for (const product of testProducts) {
        console.log(`🧪 Testing deduction for: ${product.name}`);
        
        const result = await EnhancedDeductionService.deductIngredientsWithLogging(
          product.id,
          1, // Test with 1 quantity
          `test-${Date.now()}-${product.name.replace(/\s+/g, '-')}`
        );

        const testResult = {
          productName: product.name,
          productId: product.id,
          success: result.success,
          processedIngredients: result.processedIngredients,
          errors: result.errors,
          expectedDeductions: product.expectedDeductions,
          actualDeductions: result.processedIngredients.reduce((acc, ing) => {
            acc[ing.ingredient] = ing.actualDeducted;
            return acc;
          }, {} as Record<string, number>),
          isCorrect: false
        };

        // Validate if deductions match expectations
        testResult.isCorrect = Object.entries(product.expectedDeductions).every(
          ([ingredient, expectedQty]) => {
            const actualQty = testResult.actualDeductions[ingredient];
            return actualQty === expectedQty;
          }
        );

        testResults.push(testResult);
      }

      setResults(testResults);
      
      const successCount = testResults.filter(r => r.success && r.isCorrect).length;
      const totalTests = testResults.length;
      
      if (successCount === totalTests) {
        toast.success(`✅ All ${totalTests} deduction tests passed!`);
      } else {
        toast.warning(`⚠️ ${successCount}/${totalTests} tests passed. Check results for details.`);
      }
      
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTesting(false);
    }
  };

  const validateRecipeQuantities = async () => {
    setValidationResults([]);
    const validations = [];

    for (const product of testProducts) {
      const validation = await EnhancedDeductionService.validateRecipeQuantities(product.name);
      validations.push({
        productName: product.name,
        ...validation
      });
    }

    setValidationResults(validations);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          🧪 Inventory Deduction Validator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="testing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="testing">Deduction Testing</TabsTrigger>
            <TabsTrigger value="validation">Recipe Validation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="testing" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Test inventory deductions for fixed products with enhanced logging
              </p>
              <Button 
                onClick={runDeductionTests}
                disabled={testing}
                variant="default"
              >
                {testing ? 'Testing...' : 'Run Deduction Tests'}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Test Results:</h3>
                {results.map((result, index) => (
                  <Card key={index} className={`border-l-4 ${
                    result.success && result.isCorrect 
                      ? 'border-l-green-500' 
                      : result.success 
                        ? 'border-l-yellow-500'
                        : 'border-l-red-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{result.productName}</h4>
                        <div className="flex gap-2">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? 'Success' : 'Failed'}
                          </Badge>
                          <Badge variant={result.isCorrect ? "default" : "secondary"}>
                            {result.isCorrect ? 'Correct Amounts' : 'Incorrect Amounts'}
                          </Badge>
                        </div>
                      </div>

                      {result.processedIngredients.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Deductions:</p>
                          {result.processedIngredients.map((ing, i) => {
                            const expected = result.expectedDeductions[ing.ingredient];
                            const isCorrect = expected === ing.actualDeducted;
                            
                            return (
                              <div key={i} className={`text-sm p-2 rounded ${
                                isCorrect ? 'bg-green-50' : 'bg-yellow-50'
                              }`}>
                                <strong>{ing.ingredient}:</strong> {ing.actualDeducted} {ing.unit}
                                {expected && (
                                  <span className={`ml-2 ${isCorrect ? 'text-green-600' : 'text-yellow-600'}`}>
                                    (Expected: {expected})
                                  </span>
                                )}
                                <br />
                                <span className="text-muted-foreground">
                                  Stock: {ing.previousStock} → {ing.newStock}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {result.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          <strong>Errors:</strong>
                          <ul className="list-disc pl-5">
                            {result.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Validate that recipe quantities match expected values
              </p>
              <Button 
                onClick={validateRecipeQuantities}
                variant="outline"
              >
                Validate Recipe Quantities
              </Button>
            </div>

            {validationResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Validation Results:</h3>
                {validationResults.map((validation, index) => (
                  <Card key={index} className={`border-l-4 ${
                    validation.isValid ? 'border-l-green-500' : 'border-l-yellow-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{validation.productName}</h4>
                        <Badge variant={validation.isValid ? "default" : "secondary"}>
                          {validation.isValid ? 'Valid' : 'Has Issues'}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        {validation.issues.map((issue, i) => (
                          <div key={i} className={`text-sm p-2 rounded ${
                            issue.expectedQuantity === undefined || issue.currentQuantity === issue.expectedQuantity
                              ? 'bg-green-50' 
                              : 'bg-yellow-50'
                          }`}>
                            <strong>{issue.ingredient}:</strong> {issue.currentQuantity} {issue.unit}
                            {issue.expectedQuantity !== undefined && issue.currentQuantity !== issue.expectedQuantity && (
                              <span className="text-yellow-600 ml-2">
                                (Should be: {issue.expectedQuantity})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};