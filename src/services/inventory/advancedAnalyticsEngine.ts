import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

interface SyncTrend {
  date: string;
  successRate: number;
  totalSyncs: number;
  failureCount: number;
  averageResponseTime: number;
}

interface PredictiveInsight {
  type: 'failure_risk' | 'maintenance_needed' | 'performance_degradation' | 'capacity_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  message: string;
  recommendedAction: string;
  estimatedTimeframe: string;
  affectedStores: string[];
}

interface PerformanceMetrics {
  avgSyncTime: number;
  peakHours: string[];
  bottleneckOperations: string[];
  resourceUtilization: number;
  errorPatterns: Array<{
    pattern: string;
    frequency: number;
    lastOccurrence: string;
  }>;
}

class AdvancedAnalyticsEngine {
  private static instance: AdvancedAnalyticsEngine;
  private trendCache: Map<string, SyncTrend[]> = new Map();
  private insightCache: Map<string, PredictiveInsight[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  static getInstance(): AdvancedAnalyticsEngine {
    if (!AdvancedAnalyticsEngine.instance) {
      AdvancedAnalyticsEngine.instance = new AdvancedAnalyticsEngine();
    }
    return AdvancedAnalyticsEngine.instance;
  }

  async generateSyncTrends(storeId: string, days: number = 30): Promise<SyncTrend[]> {
    const cacheKey = `trends_${storeId}_${days}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.trendCache.get(cacheKey) || [];
    }

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    try {
      const { data: syncRecords, error } = await supabase
        .from('inventory_sync_audit')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const trends = this.processSyncTrends(syncRecords || [], days);
      this.setCacheWithExpiry(cacheKey, trends, 5 * 60 * 1000); // 5 minutes
      
      return trends;
    } catch (error) {
      console.error('Failed to generate sync trends:', error);
      return [];
    }
  }

  async generatePredictiveInsights(storeId?: string): Promise<PredictiveInsight[]> {
    const cacheKey = `insights_${storeId || 'global'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.insightCache.get(cacheKey) || [];
    }

    try {
      const insights: PredictiveInsight[] = [];

      // Analyze failure patterns
      const failureInsights = await this.analyzeFailurePatterns(storeId);
      insights.push(...failureInsights);

      // Analyze performance degradation
      const performanceInsights = await this.analyzePerformanceDegradation(storeId);
      insights.push(...performanceInsights);

      // Analyze capacity trends
      const capacityInsights = await this.analyzeCapacityTrends(storeId);
      insights.push(...capacityInsights);

      // Analyze template health
      const templateInsights = await this.analyzeTemplateHealth(storeId);
      insights.push(...templateInsights);

      this.setCacheWithExpiry(cacheKey, insights, 10 * 60 * 1000); // 10 minutes
      
      return insights.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      });
    } catch (error) {
      console.error('Failed to generate predictive insights:', error);
      return [];
    }
  }

  async getPerformanceMetrics(storeId?: string): Promise<PerformanceMetrics> {
    try {
      const query = supabase
        .from('inventory_sync_audit')
        .select('*')
        .gte('created_at', subDays(new Date(), 7).toISOString());

      if (storeId) {
        // Add store filter if available in the audit table
      }

      const { data: records, error } = await query;
      if (error) throw error;

      return this.calculatePerformanceMetrics(records || []);
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        avgSyncTime: 0,
        peakHours: [],
        bottleneckOperations: [],
        resourceUtilization: 0,
        errorPatterns: []
      };
    }
  }

  private processSyncTrends(records: any[], days: number): SyncTrend[] {
    const trendMap = new Map<string, SyncTrend>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      trendMap.set(date, {
        date,
        successRate: 100,
        totalSyncs: 0,
        failureCount: 0,
        averageResponseTime: 0
      });
    }

    // Process records
    records.forEach(record => {
      const date = format(new Date(record.created_at), 'yyyy-MM-dd');
      const trend = trendMap.get(date);
      
      if (trend) {
        trend.totalSyncs++;
        if (record.sync_status === 'failed') {
          trend.failureCount++;
        }
        if (record.sync_duration_ms) {
          trend.averageResponseTime = (trend.averageResponseTime + record.sync_duration_ms) / 2;
        }
      }
    });

    // Calculate success rates
    Array.from(trendMap.values()).forEach(trend => {
      if (trend.totalSyncs > 0) {
        trend.successRate = ((trend.totalSyncs - trend.failureCount) / trend.totalSyncs) * 100;
      }
    });

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async analyzeFailurePatterns(storeId?: string): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      const { data: failures, error } = await supabase
        .from('inventory_sync_audit')
        .select('*')
        .eq('sync_status', 'failed')
        .gte('created_at', subDays(new Date(), 7).toISOString());

      if (error) throw error;

      const recentFailures = failures || [];
      const failureRate = recentFailures.length;

      if (failureRate > 10) {
        insights.push({
          type: 'failure_risk',
          severity: failureRate > 50 ? 'critical' : failureRate > 25 ? 'high' : 'medium',
          confidence: Math.min(0.9, failureRate / 100),
          message: `High failure rate detected: ${failureRate} failures in the last 7 days`,
          recommendedAction: 'Review sync configuration and template integrity',
          estimatedTimeframe: '1-2 hours',
          affectedStores: storeId ? [storeId] : ['all']
        });
      }

    } catch (error) {
      console.error('Failed to analyze failure patterns:', error);
    }

    return insights;
  }

  private async analyzePerformanceDegradation(storeId?: string): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      const { data: recent, error } = await supabase
        .from('inventory_sync_audit')
        .select('sync_duration_ms')
        .not('sync_duration_ms', 'is', null)
        .gte('created_at', subDays(new Date(), 3).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const durations = (recent || []).map(r => r.sync_duration_ms).filter(Boolean);
      
      if (durations.length > 10) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        if (avgDuration > 5000) { // 5 seconds
          insights.push({
            type: 'performance_degradation',
            severity: avgDuration > 15000 ? 'high' : 'medium',
            confidence: 0.8,
            message: `Sync performance degradation detected: Average ${Math.round(avgDuration)}ms`,
            recommendedAction: 'Optimize database queries and check system resources',
            estimatedTimeframe: '30 minutes',
            affectedStores: storeId ? [storeId] : ['all']
          });
        }
      }

    } catch (error) {
      console.error('Failed to analyze performance degradation:', error);
    }

    return insights;
  }

  private async analyzeCapacityTrends(storeId?: string): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      // Analyze product catalog growth
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select('id, created_at')
        .gte('created_at', subDays(new Date(), 30).toISOString());

      if (error) throw error;

      const recentProducts = products || [];
      const growthRate = recentProducts.length;

      if (growthRate > 100) {
        insights.push({
          type: 'capacity_warning',
          severity: growthRate > 500 ? 'high' : 'medium',
          confidence: 0.7,
          message: `Rapid catalog growth: ${growthRate} new products in 30 days`,
          recommendedAction: 'Consider scaling infrastructure and optimizing sync processes',
          estimatedTimeframe: '1-3 days',
          affectedStores: storeId ? [storeId] : ['all']
        });
      }

    } catch (error) {
      console.error('Failed to analyze capacity trends:', error);
    }

    return insights;
  }

  private async analyzeTemplateHealth(storeId?: string): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      const { data: templates, error } = await supabase
        .from('recipe_templates')
        .select('id, is_active, updated_at')
        .eq('is_active', false);

      if (error) throw error;

      const inactiveTemplates = templates || [];
      
      if (inactiveTemplates.length > 5) {
        insights.push({
          type: 'maintenance_needed',
          severity: inactiveTemplates.length > 20 ? 'medium' : 'low',
          confidence: 0.9,
          message: `${inactiveTemplates.length} inactive templates detected`,
          recommendedAction: 'Review and clean up inactive templates to improve performance',
          estimatedTimeframe: '1-2 hours',
          affectedStores: storeId ? [storeId] : ['all']
        });
      }

    } catch (error) {
      console.error('Failed to analyze template health:', error);
    }

    return insights;
  }

  private calculatePerformanceMetrics(records: any[]): PerformanceMetrics {
    const durations = records
      .map(r => r.sync_duration_ms)
      .filter(Boolean);

    const avgSyncTime = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;

    // Analyze peak hours
    const hourCounts = new Map<number, number>();
    records.forEach(record => {
      const hour = new Date(record.created_at).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    // Analyze error patterns
    const errorPatterns = records
      .filter(r => r.sync_status === 'failed' && r.error_details)
      .reduce((acc, r) => {
        const pattern = this.extractErrorPattern(r.error_details);
        const existing = acc.find(p => p.pattern === pattern);
        if (existing) {
          existing.frequency++;
          existing.lastOccurrence = r.created_at;
        } else {
          acc.push({
            pattern,
            frequency: 1,
            lastOccurrence: r.created_at
          });
        }
        return acc;
      }, [] as Array<{ pattern: string; frequency: number; lastOccurrence: string }>);

    return {
      avgSyncTime,
      peakHours,
      bottleneckOperations: ['recipe_validation', 'template_association'],
      resourceUtilization: Math.min(100, (records.length / 1000) * 100),
      errorPatterns: errorPatterns.slice(0, 5)
    };
  }

  private extractErrorPattern(errorDetails: string): string {
    // Extract common error patterns
    if (errorDetails.includes('template')) return 'Template Issues';
    if (errorDetails.includes('recipe')) return 'Recipe Validation';
    if (errorDetails.includes('connection')) return 'Connection Problems';
    if (errorDetails.includes('timeout')) return 'Timeout Errors';
    return 'Other';
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCacheWithExpiry<T>(key: string, data: T, ttl: number): void {
    if (key.includes('trends')) {
      this.trendCache.set(key, data as SyncTrend[]);
    } else if (key.includes('insights')) {
      this.insightCache.set(key, data as PredictiveInsight[]);
    }
    this.cacheExpiry.set(key, Date.now() + ttl);
  }
}

export const advancedAnalyticsEngine = AdvancedAnalyticsEngine.getInstance();
export type { SyncTrend, PredictiveInsight, PerformanceMetrics };