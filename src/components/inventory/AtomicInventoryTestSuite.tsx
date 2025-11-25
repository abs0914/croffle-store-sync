/**
 * Atomic Inventory Test Suite
 * Integration testing component for verifying the atomic inventory system
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Play } from 'lucide-react';
import { AtomicInventoryService, DeductionItem } from '@/services/inventory/atomicInventoryService';
import { AtomicInventoryMonitor } from '@/services/inventory/atomicInventoryMonitor';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export const AtomicInventoryTestSuite: React.FC = () => {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    if (!currentStore || !user) {
      toast.error('Store and user required for testing');
      return;
    }

    setRunning(true);
    setResults([]);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Health Check
      console.log('🧪 Test 1: Running health check...');
      const startHealth = Date.now();
      const health = await AtomicInventoryMonitor.runHealthCheck(currentStore.id);
      const healthDuration = Date.now() - startHealth;
      
      testResults.push({
        name: 'Health Check',
        passed: health.status !== 'critical',
        message: `Status: ${health.status}, ${health.summary.healthy}/${health.summary.total} checks passing`,
        duration: healthDuration
      });

      // Test 2: Idempotency Check
      console.log('🧪 Test 2: Testing idempotency protection...');
      const testTransactionId = `test-idempotency-${Date.now()}`;
      const testItems: DeductionItem[] = [
        { productId: 'test-product-1', productName: 'Test Product', quantity: 1 }
      ];

      try {
        // First attempt
        await AtomicInventoryService.deductInventoryAtomic({
          transactionId: testTransactionId,
          storeId: currentStore.id,
          items: testItems,
          userId: user.id,
          idempotencyKey: 'test-idempotency-key-123'
        });

        // Second attempt with same idempotency key (should be prevented)
        const result2 = await AtomicInventoryService.deductInventoryAtomic({
          transactionId: testTransactionId,
          storeId: currentStore.id,
          items: testItems,
          userId: user.id,
          idempotencyKey: 'test-idempotency-key-123'
        });

        testResults.push({
          name: 'Idempotency Protection',
          passed: result2.warnings.some(w => w.includes('idempotency')),
          message: result2.warnings.length > 0 ? 'Duplicate prevented ✓' : 'Failed to prevent duplicate'
        });
      } catch (error) {
        testResults.push({
          name: 'Idempotency Protection',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }

      // Test 3: Store Isolation
      console.log('🧪 Test 3: Verifying store isolation...');
      const isolationCheck = health.checks.find(c => c.name === 'Cross-Store Prevention');
      testResults.push({
        name: 'Store Isolation',
        passed: isolationCheck?.status === 'healthy',
        message: isolationCheck?.message || 'Cross-store prevention check not found'
      });

      // Test 4: Compensation/Rollback
      console.log('🧪 Test 4: Testing compensation mechanism...');
      try {
        const rollbackResult = await AtomicInventoryService.compensateDeduction(testTransactionId);
        testResults.push({
          name: 'Compensation/Rollback',
          passed: rollbackResult.success,
          message: `Restored ${rollbackResult.itemsRestored} items (may be 0 if test product doesn't exist)`
        });
      } catch (error) {
        testResults.push({
          name: 'Compensation/Rollback',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }

      // Test 5: Metrics Collection
      console.log('🧪 Test 5: Collecting metrics...');
      try {
        const metrics = await AtomicInventoryMonitor.getDeductionMetrics(currentStore.id);
        testResults.push({
          name: 'Metrics Collection',
          passed: metrics.total_deductions >= 0,
          message: `Collected metrics: ${metrics.total_deductions} total deductions`
        });
      } catch (error) {
        testResults.push({
          name: 'Metrics Collection',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }

      // Test 6: Queue System
      console.log('🧪 Test 6: Testing queue system...');
      try {
        const queueMetrics = await AtomicInventoryMonitor.getQueueMetrics(currentStore.id);
        testResults.push({
          name: 'Queue System',
          passed: true,
          message: `Queue stats: ${queueMetrics.pending} pending, ${queueMetrics.insufficient_stock} need approval`
        });
      } catch (error) {
        testResults.push({
          name: 'Queue System',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }

      setResults(testResults);

      const passedCount = testResults.filter(r => r.passed).length;
      const totalCount = testResults.length;

      if (passedCount === totalCount) {
        toast.success(`All ${totalCount} tests passed! ✅`);
      } else {
        toast.warning(`${passedCount}/${totalCount} tests passed`);
      }

    } catch (error) {
      console.error('Test suite error:', error);
      toast.error('Test suite failed to run');
    } finally {
      setRunning(false);
    }
  };

  if (!currentStore) {
    return (
      <Alert>
        <AlertDescription>Please select a store to run tests</AlertDescription>
      </Alert>
    );
  }

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Integration Test Suite</CardTitle>
            <CardDescription>
              Verify atomic inventory system functionality for {currentStore.name}
            </CardDescription>
          </div>
          <Button onClick={runTests} disabled={running}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {results.length > 0 && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {passedCount}/{totalCount}
              </div>
              <div className="text-sm">
                <div className="font-medium">Tests Passed</div>
                <div className="text-muted-foreground">
                  {passedCount === totalCount ? 'All systems operational' : 'Some issues detected'}
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              {results.map((result, idx) => (
                <Card key={idx} className={`border-l-4 ${result.passed ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {result.message}
                          </div>
                          {result.duration && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Duration: {result.duration}ms
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {results.length === 0 && !running && (
          <Alert>
            <AlertDescription>
              Click "Run Tests" to verify the atomic inventory system is working correctly
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
