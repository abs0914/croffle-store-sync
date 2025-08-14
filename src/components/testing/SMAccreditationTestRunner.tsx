import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Play, Download, FileText } from 'lucide-react';
import { SMAccreditationTesting, TestScenario, ValidationResult } from '@/services/testing/smAccreditationTesting';
import { useToast } from '@/hooks/use-toast';

interface TestRunnerProps {
  storeId: string;
  storeName?: string;
}

interface TestResult {
  scenario: TestScenario;
  validation: ValidationResult;
  csvFiles: {
    transactions: string;
    transactionDetails: string;
    filename: string;
  };
}

export const SMAccreditationTestRunner: React.FC<TestRunnerProps> = ({ 
  storeId, 
  storeName = 'Selected Store' 
}) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [overallPassed, setOverallPassed] = useState<boolean | null>(null);
  const { toast } = useToast();

  const testingService = new SMAccreditationTesting();

  const runTests = async () => {
    setTesting(true);
    setTestResults(null);
    setOverallPassed(null);

    try {
      const results = await testingService.runAllTests(storeId);
      setTestResults(results.scenarios);
      setOverallPassed(results.overallPassed);

      toast({
        title: results.overallPassed ? "Tests Passed" : "Tests Failed",
        description: results.overallPassed 
          ? "All SM Accreditation tests completed successfully!"
          : "Some tests failed. Check the results below.",
        variant: results.overallPassed ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error running tests:', error);
      toast({
        title: "Test Error",
        description: "Failed to run SM Accreditation tests",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const downloadCSV = (content: string, filename: string, type: 'transactions' | 'details') => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Use SM-compliant naming convention
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }).replace('/', '_');
    
    if (type === 'transactions') {
      a.download = `${monthYear}_transactions.csv`;
    } else {
      a.download = `${monthYear}_transactiondetails.csv`;
    }
    
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"}>
        {passed ? "PASSED" : "FAILED"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SM Accreditation Testing Suite
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test Store: <strong>{storeName}</strong>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will create test transaction data, generate CSV files, validate against SM requirements, 
                and clean up test data. The process may take a few minutes.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Test Scenarios</h3>
                <p className="text-sm text-muted-foreground">
                  5 comprehensive scenarios covering discounts, promos, returns, and complex transactions
                </p>
              </div>
              
              <Button 
                onClick={runTests} 
                disabled={testing}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {testing ? "Running Tests..." : "Run All Tests"}
              </Button>
            </div>

            {overallPassed !== null && (
              <Alert variant={overallPassed ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(overallPassed)}
                  <AlertDescription>
                    <strong>Overall Result: {overallPassed ? "PASSED" : "FAILED"}</strong>
                    {overallPassed 
                      ? " - All tests completed successfully. Your SM Accreditation export is ready for production."
                      : " - Some tests failed. Review the detailed results below to identify issues."
                    }
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid gap-4">
                  {testResults.map((result, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{result.scenario.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {result.scenario.description}
                            </p>
                          </div>
                          {getStatusBadge(result.validation.passed)}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{result.scenario.expectedResults.transactionCount}</p>
                            <p className="text-xs text-muted-foreground">Transactions</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">₱{result.scenario.expectedResults.totalGrossAmount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Gross Amount</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">₱{result.scenario.expectedResults.totalDiscounts.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Total Discounts</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{result.scenario.expectedResults.uniquePromos}</p>
                            <p className="text-xs text-muted-foreground">Unique Promos</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadCSV(
                              result.csvFiles.transactions, 
                              result.csvFiles.filename, 
                              'transactions'
                            )}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Transactions CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadCSV(
                              result.csvFiles.transactionDetails, 
                              result.csvFiles.filename, 
                              'details'
                            )}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Details CSV
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                <ScrollArea className="h-[600px]">
                  {testResults.map((result, index) => (
                    <Card key={index} className="mb-4">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{result.scenario.name}</CardTitle>
                          {getStatusBadge(result.validation.passed)}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* File Structure Validation */}
                        <div>
                          <h4 className="font-medium mb-2">File Structure</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium">Transactions File</h5>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result.validation.fileStructure.transactionsFile.filename)}
                                  <span className="text-sm">Filename Format</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result.validation.fileStructure.transactionsFile.headers)}
                                  <span className="text-sm">Headers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result.validation.fileStructure.transactionsFile.dataIntegrity)}
                                  <span className="text-sm">Data Integrity</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Rows: {result.validation.fileStructure.transactionsFile.rowCount}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium">Details File</h5>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result.validation.fileStructure.detailsFile.filename)}
                                  <span className="text-sm">Filename Format</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result.validation.fileStructure.detailsFile.headers)}
                                  <span className="text-sm">Headers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(result.validation.fileStructure.detailsFile.dataIntegrity)}
                                  <span className="text-sm">Data Integrity</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Rows: {result.validation.fileStructure.detailsFile.rowCount}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Data Validation */}
                        <div>
                          <h4 className="font-medium mb-2">Data Validation</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.validation.dataValidation.totals)}
                              <span className="text-sm">Totals</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.validation.dataValidation.discounts)}
                              <span className="text-sm">Discounts</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.validation.dataValidation.promos)}
                              <span className="text-sm">Promos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.validation.dataValidation.vatCalculations)}
                              <span className="text-sm">VAT</span>
                            </div>
                          </div>
                        </div>

                        {/* Errors and Warnings */}
                        {(result.validation.errors.length > 0 || result.validation.warnings.length > 0) && (
                          <div className="space-y-2">
                            {result.validation.errors.length > 0 && (
                              <div>
                                <h4 className="font-medium text-red-600 mb-1">Errors</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {result.validation.errors.map((error, i) => (
                                    <li key={i} className="text-sm text-red-600">{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {result.validation.warnings.length > 0 && (
                              <div>
                                <h4 className="font-medium text-yellow-600 mb-1">Warnings</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {result.validation.warnings.map((warning, i) => (
                                    <li key={i} className="text-sm text-yellow-600">{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};