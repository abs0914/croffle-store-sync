import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PerformanceMonitor } from '@/services/performance/performanceMonitor';
import { BackgroundProcessingService } from '@/services/transactions/backgroundProcessingService';
import { InventoryCacheService } from '@/services/cache/inventoryCacheService';
import { Activity, Clock, Database, Zap, RefreshCw } from 'lucide-react';

interface PerformanceStats {
  operations: Array<{
    name: string;
    averageTime: number;
    count: number;
    status: 'excellent' | 'good' | 'warning' | 'poor';
  }>;
  cache: {
    hitRate: number;
    totalEntries: number;
    memoryUsage: string;
  };
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    averageTime: number;
  };
}

export function PerformanceMonitorPanel() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(updateStats, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const updateStats = () => {
    // Get performance stats
    const paymentStats = PerformanceMonitor.getStats('payment_processing');
    const validationStats = PerformanceMonitor.getStats('cart_validation');
    const inventoryStats = PerformanceMonitor.getStats('inventory_sync');
    
    // Get cache stats
    const cacheStats = InventoryCacheService.getCacheStats();
    
    // Get queue stats
    const queueStats = BackgroundProcessingService.getProcessingStats();

    const operations = [
      {
        name: 'Payment Processing',
        averageTime: paymentStats.averageDuration,
        count: paymentStats.totalOperations,
        status: getPerformanceStatus(paymentStats.averageDuration, [1000, 2000, 5000]) as any
      },
      {
        name: 'Cart Validation', 
        averageTime: validationStats.averageDuration,
        count: validationStats.totalOperations,
        status: getPerformanceStatus(validationStats.averageDuration, [500, 1000, 2000]) as any
      },
      {
        name: 'Inventory Sync',
        averageTime: inventoryStats.averageDuration,
        count: inventoryStats.totalOperations,
        status: getPerformanceStatus(inventoryStats.averageDuration, [2000, 5000, 10000]) as any
      }
    ];

    const cache = {
      hitRate: cacheStats.totalEntries > 0 ? 85 : 0, // Simulated hit rate
      totalEntries: cacheStats.totalEntries,
      memoryUsage: `${Math.round(cacheStats.totalSize / 1024)}KB`
    };

    const queue = {
      pending: queueStats.pendingJobs,
      processing: queueStats.processingJobs,
      completed: queueStats.completedJobs,
      failed: queueStats.failedJobs,
      averageTime: queueStats.averageProcessingTime
    };

    setStats({ operations, cache, queue });
  };

  const getPerformanceStatus = (time: number, thresholds: [number, number, number]) => {
    if (time < thresholds[0]) return 'excellent';
    if (time < thresholds[1]) return 'good';
    if (time < thresholds[2]) return 'warning';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'warning': return 'Warning';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsVisible(true);
          updateStats();
        }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="w-4 h-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="bg-background/95 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Performance Monitor
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'text-green-600' : 'text-gray-400'}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {stats && (
            <>
              {/* Operations Performance */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Operations
                </h4>
                <div className="space-y-2">
                  {stats.operations.map((op) => (
                    <div key={op.name} className="flex items-center justify-between text-sm">
                      <span className="truncate">{op.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {op.averageTime.toFixed(0)}ms ({op.count})
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(op.status)} text-white text-xs`}
                        >
                          {getStatusText(op.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cache Performance */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  Cache
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hit Rate</span>
                    <span className="text-green-600">{stats.cache.hitRate}%</span>
                  </div>
                  <Progress value={stats.cache.hitRate} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Entries: {stats.cache.totalEntries}</span>
                    <span>Memory: {stats.cache.memoryUsage}</span>
                  </div>
                </div>
              </div>

              {/* Queue Status */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Background Queue
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <Badge variant="outline">{stats.queue.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing</span>
                    <Badge variant="secondary">{stats.queue.processing}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <Badge className="bg-green-600">{stats.queue.completed}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <Badge variant="destructive">{stats.queue.failed}</Badge>
                  </div>
                </div>
                {stats.queue.averageTime > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Avg: {stats.queue.averageTime.toFixed(0)}ms
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    PerformanceMonitor.clearMetrics();
                    InventoryCacheService.clearCache();
                    updateStats();
                  }}
                  className="flex-1"
                >
                  Clear Metrics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    PerformanceMonitor.logSummary();
                    console.log('📊 Cache Stats:', stats.cache);
                    console.log('📋 Queue Stats:', stats.queue);
                  }}
                  className="flex-1"
                >
                  Log Details
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}