import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/contexts/StoreContext';
import { streamlinedTransactionService } from '@/services/transactions/streamlinedTransactionService';
import { CartItem } from '@/types';
import { Play, Square, Zap, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface LoadTestConfig {
  transactionCount: number;
  itemsPerTransaction: number;
  concurrentTransactions: number;
  delayBetweenTransactions: number;
}

interface LoadTestResult {
  transactionId: string;
  status: 'success' | 'error';
  processingTime: number;
  itemCount: number;
  error?: string;
}

interface LoadTestStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  totalProcessingTime: number;
  throughput: number;
}

export function LoadTestRunner() {
  const { currentStore } = useStore();
  const [config, setConfig] = useState<LoadTestConfig>({
    transactionCount: 10,
    itemsPerTransaction: 5,
    concurrentTransactions: 2,
    delayBetweenTransactions: 100
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<LoadTestResult[]>([]);
  const [stats, setStats] = useState<LoadTestStats | null>(null);

  const generateTestTransactionItems = (count: number) => {
    const testProducts = [
      { id: 'test-1', name: 'Test Coffee', price: 120 },
      { id: 'test-2', name: 'Test Pastry', price: 85 },
      { id: 'test-3', name: 'Test Sandwich', price: 150 },
      { id: 'test-4', name: 'Test Beverage', price: 95 },
      { id: 'test-5', name: 'Test Snack', price: 65 }
    ];

    return Array.from({ length: count }, (_, index) => {
      const product = testProducts[index % testProducts.length];
      const quantity = Math.floor(Math.random() * 3) + 1;
      return {
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity
      };
    });
  };

  const runSingleTransaction = async (transactionIndex: number): Promise<LoadTestResult> => {
    const startTime = Date.now();
    
    try {
      const transactionItems = generateTestTransactionItems(config.itemsPerTransaction);
      const total = transactionItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      const transactionData = {
        storeId: currentStore?.id || '',
        userId: 'test-user',
        shiftId: 'test-shift',
        items: transactionItems,
        subtotal: total,
        tax: 0,
        discount: 0,
        total,
        paymentMethod: 'cash' as const
      };

      const result = await streamlinedTransactionService.processTransaction(transactionData);
      const processingTime = Date.now() - startTime;

      return {
        transactionId: result.id,
        status: 'success',
        processingTime,
        itemCount: transactionItems.length
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        transactionId: `failed-${transactionIndex}`,
        status: 'error',
        processingTime,
        itemCount: config.itemsPerTransaction,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runLoadTest = async () => {
    if (!currentStore) {
      alert('Please select a store first');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setStats(null);

    const startTime = Date.now();
    const testResults: LoadTestResult[] = [];

    try {
      // Run transactions in batches based on concurrency setting
      for (let batch = 0; batch < config.transactionCount; batch += config.concurrentTransactions) {
        const batchPromises: Promise<LoadTestResult>[] = [];
        
        // Create concurrent transactions for this batch
        for (let i = 0; i < config.concurrentTransactions && (batch + i) < config.transactionCount; i++) {
          batchPromises.push(runSingleTransaction(batch + i));
        }

        // Wait for batch completion
        const batchResults = await Promise.all(batchPromises);
        testResults.push(...batchResults);

        // Update progress
        setProgress((testResults.length / config.transactionCount) * 100);
        setResults([...testResults]);

        // Add delay between batches if configured
        if (config.delayBetweenTransactions > 0 && batch + config.concurrentTransactions < config.transactionCount) {
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenTransactions));
        }
      }

      // Calculate final statistics
      const totalTime = Date.now() - startTime;
      const successful = testResults.filter(r => r.status === 'success');
      const failed = testResults.filter(r => r.status === 'error');
      const processingTimes = testResults.map(r => r.processingTime);

      const finalStats: LoadTestStats = {
        totalTransactions: testResults.length,
        successfulTransactions: successful.length,
        failedTransactions: failed.length,
        averageProcessingTime: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
        minProcessingTime: Math.min(...processingTimes),
        maxProcessingTime: Math.max(...processingTimes),
        totalProcessingTime: totalTime,
        throughput: (testResults.length / totalTime) * 1000 // transactions per second
      };

      setStats(finalStats);
    } catch (error) {
      console.error('Load test failed:', error);
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  const stopLoadTest = () => {
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Load Test Configuration
          </CardTitle>
          <CardDescription>
            Configure and run load tests to validate system performance under various conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transactionCount">Total Transactions</Label>
              <Input
                id="transactionCount"
                type="number"
                value={config.transactionCount}
                onChange={(e) => setConfig({...config, transactionCount: parseInt(e.target.value) || 10})}
                disabled={isRunning}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="itemsPerTransaction">Items Per Transaction</Label>
              <Input
                id="itemsPerTransaction"
                type="number"
                value={config.itemsPerTransaction}
                onChange={(e) => setConfig({...config, itemsPerTransaction: parseInt(e.target.value) || 5})}
                disabled={isRunning}
                min="1"
                max="20"
              />
            </div>
            <div>
              <Label htmlFor="concurrentTransactions">Concurrent Transactions</Label>
              <Input
                id="concurrentTransactions"
                type="number"
                value={config.concurrentTransactions}
                onChange={(e) => setConfig({...config, concurrentTransactions: parseInt(e.target.value) || 2})}
                disabled={isRunning}
                min="1"
                max="10"
              />
            </div>
            <div>
              <Label htmlFor="delay">Delay Between Batches (ms)</Label>
              <Input
                id="delay"
                type="number"
                value={config.delayBetweenTransactions}
                onChange={(e) => setConfig({...config, delayBetweenTransactions: parseInt(e.target.value) || 100})}
                disabled={isRunning}
                min="0"
                max="5000"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runLoadTest} 
              disabled={isRunning || !currentStore}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Load Test
            </Button>
            {isRunning && (
              <Button 
                variant="outline"
                onClick={stopLoadTest}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Test
              </Button>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Load Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.successfulTransactions}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failedTransactions}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(stats.averageProcessingTime)}ms</div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.throughput.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">TPS</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Min Processing Time:</strong> {stats.minProcessingTime}ms
              </div>
              <div>
                <strong>Max Processing Time:</strong> {stats.maxProcessingTime}ms
              </div>
              <div>
                <strong>Total Test Time:</strong> {(stats.totalProcessingTime / 1000).toFixed(2)}s
              </div>
            </div>

            {stats.averageProcessingTime > 2000 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Average processing time exceeds 2000ms. Consider optimizing the transaction pipeline.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transaction Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.slice(-10).map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-mono">{result.transactionId.substring(0, 8)}</span>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.processingTime}ms • {result.itemCount} items
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}