interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance monitoring service for tracking checkout improvements
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  static startTimer(operationId: string): void {
    this.timers.set(operationId, performance.now());
  }

  /**
   * End timing and record metric
   */
  static endTimer(operationId: string, operation: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      console.warn(`No timer found for operation: ${operationId}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operationId);

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`, metadata);
    return duration;
  }

  /**
   * Record a metric without using timers
   */
  static recordMetric(operation: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    console.log(`📊 ${operation}: ${duration.toFixed(2)}ms`, metadata);
  }

  /**
   * Get performance statistics
   */
  static getStats(operation?: string): {
    averageDuration: number;
    totalOperations: number;
    minDuration: number;
    maxDuration: number;
    recent: PerformanceMetric[];
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        averageDuration: 0,
        totalOperations: 0,
        minDuration: 0,
        maxDuration: 0,
        recent: []
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const recent = filteredMetrics.slice(-10);

    return {
      averageDuration,
      totalOperations: filteredMetrics.length,
      minDuration,
      maxDuration,
      recent
    };
  }

  /**
   * Log performance summary
   */
  static logSummary(): void {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    
    console.group('🚀 Performance Summary');
    operations.forEach(op => {
      const stats = this.getStats(op);
      console.log(`${op}: avg ${stats.averageDuration.toFixed(2)}ms (${stats.totalOperations} ops)`);
    });
    console.groupEnd();
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }
}
