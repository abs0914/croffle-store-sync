/**
 * POS Performance Monitor
 * Tracks loading times and performance metrics for optimization
 */

interface PerformanceMetrics {
  authTime: number;
  dataLoadTime: number;
  imageValidationTime: number;
  totalLoadTime: number;
  cacheHitRate: number;
}

class POSPerformanceMonitor {
  private static instance: POSPerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private startTime: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  static getInstance(): POSPerformanceMonitor {
    if (!POSPerformanceMonitor.instance) {
      POSPerformanceMonitor.instance = new POSPerformanceMonitor();
    }
    return POSPerformanceMonitor.instance;
  }

  startTracking(stage: string): void {
    this.metrics.set(`${stage}_start`, performance.now());
  }

  endTracking(stage: string): number {
    const startTime = this.metrics.get(`${stage}_start`);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.metrics.set(`${stage}_duration`, duration);
    
    // Log if duration exceeds thresholds
    if (duration > 3000) {
      console.warn(`⚠️ ${stage} took ${duration.toFixed(0)}ms (SLOW)`);
    } else if (duration > 1000) {
      console.log(`🟡 ${stage} took ${duration.toFixed(0)}ms`);
    } else {
      console.log(`✅ ${stage} took ${duration.toFixed(0)}ms`);
    }
    
    return duration;
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  getMetrics(): PerformanceMetrics {
    return {
      authTime: this.metrics.get('auth_duration') || 0,
      dataLoadTime: this.metrics.get('dataLoad_duration') || 0,
      imageValidationTime: this.metrics.get('imageValidation_duration') || 0,
      totalLoadTime: this.metrics.get('total_duration') || 0,
      cacheHitRate: this.getCacheHitRate()
    };
  }

  logSummary(): void {
    const metrics = this.getMetrics();
    console.log('📊 POS Performance Summary:', {
      authTime: `${metrics.authTime.toFixed(0)}ms`,
      dataLoadTime: `${metrics.dataLoadTime.toFixed(0)}ms`,
      imageValidationTime: `${metrics.imageValidationTime.toFixed(0)}ms`,
      totalLoadTime: `${metrics.totalLoadTime.toFixed(0)}ms`,
      cacheHitRate: `${metrics.cacheHitRate.toFixed(1)}%`
    });
  }

  reset(): void {
    this.metrics.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

export const posPerformanceMonitor = POSPerformanceMonitor.getInstance();
