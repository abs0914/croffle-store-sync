import { useState, useEffect, useCallback } from 'react';
import { advancedAnalyticsEngine, SyncTrend, PredictiveInsight, PerformanceMetrics } from '@/services/inventory/advancedAnalyticsEngine';
import { workflowAutomationEngine, AutomationRule, WorkflowExecution } from '@/services/inventory/workflowAutomationEngine';
import { multiStoreOrchestrator, StoreCluster, CrossStoreSync } from '@/services/inventory/multiStoreOrchestrator';

interface Phase3AnalyticsState {
  // Analytics
  syncTrends: SyncTrend[];
  predictiveInsights: PredictiveInsight[];
  performanceMetrics: PerformanceMetrics;
  
  // Automation
  automationRules: AutomationRule[];
  activeExecutions: WorkflowExecution[];
  
  // Multi-store
  storeClusters: StoreCluster[];
  activeSyncs: CrossStoreSync[];
  storeHealthScores: Map<string, number>;
  
  // Loading states
  isLoadingAnalytics: boolean;
  isLoadingAutomation: boolean;
  isLoadingOrchestration: boolean;
  
  // Error states
  analyticsError: string | null;
  automationError: string | null;
  orchestrationError: string | null;
}

export const usePhase3Analytics = (storeId?: string) => {
  const [state, setState] = useState<Phase3AnalyticsState>({
    syncTrends: [],
    predictiveInsights: [],
    performanceMetrics: {
      avgSyncTime: 0,
      peakHours: [],
      bottleneckOperations: [],
      resourceUtilization: 0,
      errorPatterns: []
    },
    automationRules: [],
    activeExecutions: [],
    storeClusters: [],
    activeSyncs: [],
    storeHealthScores: new Map(),
    isLoadingAnalytics: false,
    isLoadingAutomation: false,
    isLoadingOrchestration: false,
    analyticsError: null,
    automationError: null,
    orchestrationError: null
  });

  const loadAnalytics = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingAnalytics: true, analyticsError: null }));
    
    try {
      const [trends, insights, metrics] = await Promise.all([
        advancedAnalyticsEngine.generateSyncTrends(storeId || 'global', 30),
        advancedAnalyticsEngine.generatePredictiveInsights(storeId),
        advancedAnalyticsEngine.getPerformanceMetrics(storeId)
      ]);

      setState(prev => ({
        ...prev,
        syncTrends: trends,
        predictiveInsights: insights,
        performanceMetrics: metrics,
        isLoadingAnalytics: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        analyticsError: error instanceof Error ? error.message : 'Failed to load analytics',
        isLoadingAnalytics: false
      }));
    }
  }, [storeId]);

  const loadAutomation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingAutomation: true, automationError: null }));
    
    try {
      const [rules, executions] = await Promise.all([
        workflowAutomationEngine.getRules(),
        workflowAutomationEngine.getActiveExecutions()
      ]);

      setState(prev => ({
        ...prev,
        automationRules: rules,
        activeExecutions: executions,
        isLoadingAutomation: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        automationError: error instanceof Error ? error.message : 'Failed to load automation data',
        isLoadingAutomation: false
      }));
    }
  }, []);

  const loadOrchestration = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingOrchestration: true, orchestrationError: null }));
    
    try {
      const [clusters, syncs, healthScores] = await Promise.all([
        multiStoreOrchestrator.getClusters(),
        multiStoreOrchestrator.getActiveSyncs(),
        multiStoreOrchestrator.getStoreHealthScores()
      ]);

      setState(prev => ({
        ...prev,
        storeClusters: clusters,
        activeSyncs: syncs,
        storeHealthScores: healthScores,
        isLoadingOrchestration: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        orchestrationError: error instanceof Error ? error.message : 'Failed to load orchestration data',
        isLoadingOrchestration: false
      }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadAnalytics(),
      loadAutomation(),
      loadOrchestration()
    ]);
  }, [loadAnalytics, loadAutomation, loadOrchestration]);

  // Automation controls
  const toggleAutomationRule = useCallback(async (ruleId: string, enabled: boolean) => {
    try {
      await workflowAutomationEngine.updateRule(ruleId, { isActive: enabled });
      await loadAutomation(); // Refresh automation data
    } catch (error) {
      console.error('Failed to toggle automation rule:', error);
    }
  }, [loadAutomation]);

  const executeAutomationRule = useCallback(async (ruleId: string) => {
    try {
      const rule = state.automationRules.find(r => r.id === ruleId);
      if (rule) {
        await workflowAutomationEngine.executeRule(rule);
        await loadAutomation(); // Refresh to show new execution
      }
    } catch (error) {
      console.error('Failed to execute automation rule:', error);
    }
  }, [state.automationRules, loadAutomation]);

  // Orchestration controls
  const startCrossStoreSync = useCallback(async (clusterId: string) => {
    try {
      await multiStoreOrchestrator.performCrossStoreSync(clusterId);
      await loadOrchestration(); // Refresh orchestration data
    } catch (error) {
      console.error('Failed to start cross-store sync:', error);
    }
  }, [loadOrchestration]);

  const createStoreCluster = useCallback(async (
    name: string, 
    storeIds: string[], 
    config: any
  ) => {
    try {
      await multiStoreOrchestrator.createCustomCluster(name, storeIds, config);
      await loadOrchestration(); // Refresh to show new cluster
    } catch (error) {
      console.error('Failed to create store cluster:', error);
    }
  }, [loadOrchestration]);

  // Initialize and periodic refresh
  useEffect(() => {
    refreshAll();
    
    // Set up periodic refresh every 2 minutes
    const interval = setInterval(refreshAll, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Computed values
  const overallHealth = state.storeHealthScores.size > 0 
    ? Array.from(state.storeHealthScores.values()).reduce((a, b) => a + b, 0) / state.storeHealthScores.size
    : 0;

  const criticalInsights = state.predictiveInsights.filter(
    insight => insight.severity === 'critical' || insight.severity === 'high'
  );

  const activeAutomationCount = state.automationRules.filter(rule => rule.isActive).length;

  const isLoading = state.isLoadingAnalytics || state.isLoadingAutomation || state.isLoadingOrchestration;

  const hasErrors = !!(state.analyticsError || state.automationError || state.orchestrationError);

  return {
    // Data
    ...state,
    
    // Computed values
    overallHealth,
    criticalInsights,
    activeAutomationCount,
    isLoading,
    hasErrors,
    
    // Actions
    refreshAll,
    loadAnalytics,
    loadAutomation,
    loadOrchestration,
    toggleAutomationRule,
    executeAutomationRule,
    startCrossStoreSync,
    createStoreCluster
  };
};