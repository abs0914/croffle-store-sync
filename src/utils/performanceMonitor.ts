/**
 * Performance Monitoring Utility
 * Tracks and logs performance metrics for debugging and optimization
 */

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, PerformanceMetric>();
  private enabled = true;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking an operation
   */
  start(operationId: string, operationName: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(operationId, {
      operation: operationName,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End tracking an operation and log results
   */
  end(operationId: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`⚠️ Performance metric not found for: ${operationId}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // Log the metric
    this.logMetric(metric);

    // Clean up
    this.metrics.delete(operationId);

    return metric.duration;
  }

  /**
   * Log a metric with performance categorization
   */
  private logMetric(metric: PerformanceMetric): void {
    const duration = metric.duration || 0;
    let emoji = '✅';
    let category = 'EXCELLENT';

    if (duration > 2000) {
      emoji = '🔴';
      category = 'CRITICAL';
    } else if (duration > 1000) {
      emoji = '🟡';
      category = 'WARNING';
    } else if (duration > 500) {
      emoji = '🟢';
      category = 'GOOD';
    }

    console.log(
      `${emoji} [PERFORMANCE ${category}] ${metric.operation}: ${duration.toFixed(2)}ms`,
      metric.metadata || {}
    );
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${operationName}_${Date.now()}`;
    this.start(operationId, operationName, metadata);

    try {
      const result = await fn();
      this.end(operationId, { success: true });
      return result;
    } catch (error) {
      this.end(operationId, { success: false, error: String(error) });
      throw error;
    }
  }

  /**
   * Get summary of all active metrics
   */
  getSummary(): { activeOperations: number; operations: string[] } {
    return {
      activeOperations: this.metrics.size,
      operations: Array.from(this.metrics.values()).map(m => m.operation)
    };
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`📊 Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator for tracking function performance
 */
export function trackPerformance(operationName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operationId = `${operationName}_${Date.now()}`;
      performanceMonitor.start(operationId, operationName, {
        method: propertyKey,
        args: args.length
      });

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(operationId, { success: true });
        return result;
      } catch (error) {
        performanceMonitor.end(operationId, { success: false, error: String(error) });
        throw error;
      }
    };

    return descriptor;
  };
}
