/**
 * Performance monitoring utility for tracking loading times and bottlenecks
 * in the croffle-store-sync POS application
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    // Enable performance monitoring in development and staging
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     window.location.hostname.includes('staging');
  }

  /**
   * Start tracking a performance metric
   */
  startMetric(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.metrics.set(name, metric);
    console.log(`🚀 Performance: Started tracking "${name}"`, metadata);
  }

  /**
   * End tracking a performance metric
   */
  endMetric(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ Performance: Metric "${name}" not found`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // Log performance results
    const duration = metric.duration;
    const logLevel = duration > 3000 ? 'error' : duration > 1000 ? 'warn' : 'info';
    
    console[logLevel](
      `⏱️ Performance: "${name}" completed in ${duration.toFixed(2)}ms`,
      metric.metadata
    );

    // Track slow operations
    if (duration > 2000) {
      this.reportSlowOperation(metric);
    }

    return duration;
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for a specific operation
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Report slow operations for further investigation
   */
  private reportSlowOperation(metric: PerformanceMetric): void {
    console.error('🐌 Slow Operation Detected:', {
      operation: metric.name,
      duration: metric.duration,
      metadata: metric.metadata,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to an analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to analytics service
      // analytics.track('slow_operation', { ... });
    }
  }

  /**
   * Track navigation performance
   */
  trackNavigation(from: string, to: string): void {
    this.startMetric(`navigation_${from}_to_${to}`, { from, to });
  }

  /**
   * Track authentication performance
   */
  trackAuth(operation: string): void {
    this.startMetric(`auth_${operation}`, { operation });
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint: string, method: string = 'GET'): void {
    this.startMetric(`api_${method}_${endpoint}`, { endpoint, method });
  }

  /**
   * Track component loading performance
   */
  trackComponentLoad(componentName: string): void {
    this.startMetric(`component_load_${componentName}`, { componentName });
  }

  /**
   * Track store context operations
   */
  trackStoreOperation(operation: string): void {
    this.startMetric(`store_${operation}`, { operation });
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    slowOperations: PerformanceMetric[];
    averageDuration: number;
  } {
    const metrics = this.getMetrics().filter(m => m.duration !== undefined);
    const slowOperations = metrics.filter(m => m.duration! > 2000);
    const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = metrics.length > 0 ? totalDuration / metrics.length : 0;

    return {
      totalMetrics: metrics.length,
      slowOperations,
      averageDuration
    };
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const startMetric = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.startMetric(name, metadata);

export const endMetric = (name: string, metadata?: Record<string, any>) => 
  performanceMonitor.endMetric(name, metadata);

export const trackNavigation = (from: string, to: string) => 
  performanceMonitor.trackNavigation(from, to);

export const trackAuth = (operation: string) => 
  performanceMonitor.trackAuth(operation);

export const trackApiCall = (endpoint: string, method?: string) => 
  performanceMonitor.trackApiCall(endpoint, method);

export const trackComponentLoad = (componentName: string) => 
  performanceMonitor.trackComponentLoad(componentName);

export const trackStoreOperation = (operation: string) => 
  performanceMonitor.trackStoreOperation(operation);

// Auto-track page navigation
if (typeof window !== 'undefined') {
  let lastPath = window.location.pathname;
  
  const trackPageChange = () => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      performanceMonitor.trackNavigation(lastPath, currentPath);
      lastPath = currentPath;
    }
  };

  // Track initial page load
  window.addEventListener('load', () => {
    performanceMonitor.endMetric('initial_page_load');
  });

  // Track navigation changes
  window.addEventListener('popstate', trackPageChange);
  
  // Track programmatic navigation (for React Router)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(trackPageChange, 0);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(trackPageChange, 0);
  };
}

// Start tracking initial page load
if (typeof window !== 'undefined') {
  performanceMonitor.startMetric('initial_page_load');
}
