
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Clock, Zap, Database } from 'lucide-react';

interface PerformanceMetrics {
  memoryUsage: number;
  loadTime: number;
  cacheHitRate: number;
  apiResponseTime: number;
  componentRenderTime: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    loadTime: 0,
    cacheHitRate: 0,
    apiResponseTime: 0,
    componentRenderTime: 0
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const measurePerformance = () => {
      const perfData = performance.getEntriesByType('measure');
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Calculate metrics
      const loadTime = navTiming ? navTiming.loadEventEnd - navTiming.loadEventStart : 0;
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100 : 0;
      
      // Simulate other metrics (in a real app, these would be tracked properly)
      const cacheHitRate = 85 + Math.random() * 15; // 85-100%
      const apiResponseTime = 100 + Math.random() * 200; // 100-300ms
      const componentRenderTime = 5 + Math.random() * 10; // 5-15ms

      setMetrics({
        memoryUsage,
        loadTime,
        cacheHitRate,
        apiResponseTime,
        componentRenderTime
      });
    };

    measurePerformance();
    const interval = setInterval(measurePerformance, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Activity className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const getPerformanceColor = (value: number, type: 'memory' | 'time' | 'cache') => {
    switch (type) {
      case 'memory':
        if (value < 50) return 'text-green-600';
        if (value < 80) return 'text-amber-600';
        return 'text-red-600';
      case 'time':
        if (value < 100) return 'text-green-600';
        if (value < 300) return 'text-amber-600';
        return 'text-red-600';
      case 'cache':
        if (value > 90) return 'text-green-600';
        if (value > 70) return 'text-amber-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
            </CardTitle>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Memory Usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Memory Usage
              </span>
              <span className={getPerformanceColor(metrics.memoryUsage, 'memory')}>
                {metrics.memoryUsage.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.memoryUsage} className="h-1" />
          </div>

          {/* Cache Hit Rate */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Cache Hit Rate
              </span>
              <span className={getPerformanceColor(metrics.cacheHitRate, 'cache')}>
                {metrics.cacheHitRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.cacheHitRate} className="h-1" />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Load Time</span>
              </div>
              <Badge variant="outline" className={getPerformanceColor(metrics.loadTime, 'time')}>
                {metrics.loadTime.toFixed(0)}ms
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>API Response</span>
              </div>
              <Badge variant="outline" className={getPerformanceColor(metrics.apiResponseTime, 'time')}>
                {metrics.apiResponseTime.toFixed(0)}ms
              </Badge>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Press Ctrl+Shift+P to toggle
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
