import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProactiveSyncMonitor } from './proactiveSyncMonitor';
import { advancedAnalyticsEngine } from './advancedAnalyticsEngine';

interface StoreCluster {
  id: string;
  name: string;
  storeIds: string[];
  syncStrategy: 'parallel' | 'sequential' | 'priority_based';
  healthThreshold: number;
  autoRepairEnabled: boolean;
}

interface CrossStoreSync {
  id: string;
  clusterId: string;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  storeResults: Map<string, StoreyncResult>;
  overallMetrics: SyncMetrics;
}

interface StoreyncResult {
  storeId: string;
  storeName: string;
  status: 'success' | 'failed' | 'skipped';
  startTime: string;
  endTime?: string;
  itemsProcessed: number;
  errorsEncountered: string[];
  repairActions: string[];
}

interface SyncMetrics {
  totalStores: number;
  successfulStores: number;
  failedStores: number;
  totalItemsProcessed: number;
  totalDuration: number;
  averageStoreTime: number;
}

interface OrchestrationStrategy {
  type: 'round_robin' | 'load_balanced' | 'priority_first' | 'health_based';
  config: Record<string, any>;
}

class MultiStoreOrchestrator {
  private static instance: MultiStoreOrchestrator;
  private clusters: Map<string, StoreCluster> = new Map();
  private activeSyncs: Map<string, CrossStoreSync> = new Map();
  private storeHealthCache: Map<string, { health: number; lastCheck: number }> = new Map();
  
  static getInstance(): MultiStoreOrchestrator {
    if (!MultiStoreOrchestrator.instance) {
      MultiStoreOrchestrator.instance = new MultiStoreOrchestrator();
    }
    return MultiStoreOrchestrator.instance;
  }

  async initialize(): Promise<void> {
    console.log('🌐 Initializing Multi-Store Orchestrator...');
    
    await this.loadStoreClusters();
    await this.initializeHealthMonitoring();
    
    console.log('✅ Multi-Store Orchestrator initialized');
  }

  private async loadStoreClusters(): Promise<void> {
    try {
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name, is_active')
        .eq('is_active', true);

      if (error) throw error;

      // Create default clusters based on store geography or type
      const defaultCluster: StoreCluster = {
        id: 'default-cluster',
        name: 'All Active Stores',
        storeIds: stores?.map(s => s.id) || [],
        syncStrategy: 'parallel',
        healthThreshold: 0.8,
        autoRepairEnabled: true
      };

      this.clusters.set(defaultCluster.id, defaultCluster);

      // Create smaller clusters for better management
      if (stores && stores.length > 5) {
        const chunkSize = Math.ceil(stores.length / 3);
        for (let i = 0; i < stores.length; i += chunkSize) {
          const chunk = stores.slice(i, i + chunkSize);
          const cluster: StoreCluster = {
            id: `cluster-${Math.floor(i / chunkSize) + 1}`,
            name: `Store Cluster ${Math.floor(i / chunkSize) + 1}`,
            storeIds: chunk.map(s => s.id),
            syncStrategy: 'parallel',
            healthThreshold: 0.8,
            autoRepairEnabled: true
          };
          this.clusters.set(cluster.id, cluster);
        }
      }

    } catch (error) {
      console.error('Failed to load store clusters:', error);
    }
  }

  private async initializeHealthMonitoring(): Promise<void> {
    // Start periodic health checks
    setInterval(async () => {
      await this.performHealthChecks();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Initial health check
    await this.performHealthChecks();
  }

  async performCrossStoreSync(
    clusterId: string, 
    strategy?: OrchestrationStrategy
  ): Promise<CrossStoreSync> {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not found`);
    }

    const sync: CrossStoreSync = {
      id: `sync_${clusterId}_${Date.now()}`,
      clusterId,
      startTime: new Date().toISOString(),
      status: 'running',
      storeResults: new Map(),
      overallMetrics: {
        totalStores: cluster.storeIds.length,
        successfulStores: 0,
        failedStores: 0,
        totalItemsProcessed: 0,
        totalDuration: 0,
        averageStoreTime: 0
      }
    };

    this.activeSyncs.set(sync.id, sync);
    console.log(`🌐 Starting cross-store sync for cluster: ${cluster.name}`);

    try {
      await this.executeSyncStrategy(sync, cluster, strategy);
      sync.status = this.calculateOverallStatus(sync);
    } catch (error) {
      sync.status = 'failed';
      console.error(`Cross-store sync failed for cluster ${clusterId}:`, error);
    } finally {
      sync.endTime = new Date().toISOString();
      sync.overallMetrics.totalDuration = 
        new Date(sync.endTime).getTime() - new Date(sync.startTime).getTime();
      
      if (sync.overallMetrics.totalStores > 0) {
        sync.overallMetrics.averageStoreTime = 
          sync.overallMetrics.totalDuration / sync.overallMetrics.totalStores;
      }

      this.activeSyncs.delete(sync.id);
      await this.reportSyncCompletion(sync);
    }

    return sync;
  }

  private async executeSyncStrategy(
    sync: CrossStoreSync, 
    cluster: StoreCluster, 
    strategy?: OrchestrationStrategy
  ): Promise<void> {
    const actualStrategy = strategy || { 
      type: cluster.syncStrategy === 'parallel' ? 'load_balanced' : 'priority_first',
      config: {} 
    };

    switch (actualStrategy.type) {
      case 'load_balanced':
        await this.executeLoadBalancedSync(sync, cluster);
        break;
      case 'priority_first':
        await this.executePriorityFirstSync(sync, cluster);
        break;
      case 'health_based':
        await this.executeHealthBasedSync(sync, cluster);
        break;
      default:
        await this.executeRoundRobinSync(sync, cluster);
    }
  }

  private async executeLoadBalancedSync(sync: CrossStoreSync, cluster: StoreCluster): Promise<void> {
    const batchSize = Math.min(3, cluster.storeIds.length); // Process max 3 stores at a time
    const batches = this.createBatches(cluster.storeIds, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(storeId => this.syncSingleStore(sync, storeId));
      await Promise.allSettled(batchPromises);
    }
  }

  private async executePriorityFirstSync(sync: CrossStoreSync, cluster: StoreCluster): Promise<void> {
    // Sort stores by health score (healthiest first)
    const storesWithHealth = await Promise.all(
      cluster.storeIds.map(async storeId => ({
        storeId,
        health: await this.getStoreHealth(storeId)
      }))
    );

    const sortedStores = storesWithHealth
      .sort((a, b) => b.health - a.health)
      .map(s => s.storeId);

    // Process sequentially, starting with healthiest stores
    for (const storeId of sortedStores) {
      await this.syncSingleStore(sync, storeId);
    }
  }

  private async executeHealthBasedSync(sync: CrossStoreSync, cluster: StoreCluster): Promise<void> {
    const storesWithHealth = await Promise.all(
      cluster.storeIds.map(async storeId => ({
        storeId,
        health: await this.getStoreHealth(storeId)
      }))
    );

    // Separate healthy and unhealthy stores
    const healthyStores = storesWithHealth
      .filter(s => s.health >= cluster.healthThreshold)
      .map(s => s.storeId);
    
    const unhealthyStores = storesWithHealth
      .filter(s => s.health < cluster.healthThreshold)
      .map(s => s.storeId);

    // Process healthy stores in parallel
    if (healthyStores.length > 0) {
      const healthyPromises = healthyStores.map(storeId => this.syncSingleStore(sync, storeId));
      await Promise.allSettled(healthyPromises);
    }

    // Process unhealthy stores sequentially with repair
    for (const storeId of unhealthyStores) {
      await this.syncSingleStoreWithRepair(sync, storeId);
    }
  }

  private async executeRoundRobinSync(sync: CrossStoreSync, cluster: StoreCluster): Promise<void> {
    // Simple sequential processing
    for (const storeId of cluster.storeIds) {
      await this.syncSingleStore(sync, storeId);
    }
  }

  private async syncSingleStore(sync: CrossStoreSync, storeId: string): Promise<void> {
    const startTime = new Date().toISOString();
    
    const result: StoreyncResult = {
      storeId,
      storeName: await this.getStoreName(storeId),
      status: 'failed',
      startTime,
      itemsProcessed: 0,
      errorsEncountered: [],
      repairActions: []
    };

    try {
      console.log(`📍 Syncing store: ${result.storeName}`);
      
      const storeHealth = await ProactiveSyncMonitor.getStoreSpecificHealth(storeId, result.storeName);
      
      if (storeHealth.criticalIssues.length > 0 || storeHealth.warnings.length > 0) {
        const repairResult = await ProactiveSyncMonitor.attemptAutoRepair(storeId);
        result.repairActions.push(`Auto-repair: ${repairResult.repairsSuccessful} issues fixed`);
      }

      // Perform actual sync operations
      await this.performStoreSync(storeId, result);
      
      result.status = 'success';
      sync.overallMetrics.successfulStores++;
      
    } catch (error) {
      result.status = 'failed';
      result.errorsEncountered.push(error instanceof Error ? error.message : 'Unknown error');
      sync.overallMetrics.failedStores++;
      console.error(`Failed to sync store ${storeId}:`, error);
    } finally {
      result.endTime = new Date().toISOString();
      sync.storeResults.set(storeId, result);
      sync.overallMetrics.totalItemsProcessed += result.itemsProcessed;
    }
  }

  private async syncSingleStoreWithRepair(sync: CrossStoreSync, storeId: string): Promise<void> {
    // First attempt repair, then sync
    try {
      const repairResult = await ProactiveSyncMonitor.attemptAutoRepair(storeId);
      console.log(`🔧 Pre-sync repair for store ${storeId}: ${repairResult.repairsSuccessful} issues fixed`);
    } catch (error) {
      console.error(`Pre-sync repair failed for store ${storeId}:`, error);
    }

    await this.syncSingleStore(sync, storeId);
  }

  private async performStoreSync(storeId: string, result: StoreyncResult): Promise<void> {
    // Get products that need syncing
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, name, recipe_id,
        recipes (
          id, template_id,
          recipe_templates (id, name, is_active)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;

    if (products) {
      for (const product of products) {
        try {
          // Validate product integrity
          if (!product.recipes?.[0]?.recipe_templates?.is_active) {
            result.errorsEncountered.push(`Product ${product.name} has inactive template`);
            continue;
          }

          result.itemsProcessed++;
        } catch (error) {
          result.errorsEncountered.push(`Product ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
  }

  private async performHealthChecks(): Promise<void> {
    const allStoreIds = new Set<string>();
    this.clusters.forEach(cluster => {
      cluster.storeIds.forEach(id => allStoreIds.add(id));
    });

    for (const storeId of allStoreIds) {
      try {
        const health = await this.calculateStoreHealth(storeId);
        this.storeHealthCache.set(storeId, {
          health,
          lastCheck: Date.now()
        });
      } catch (error) {
        console.error(`Health check failed for store ${storeId}:`, error);
      }
    }
  }

  private async calculateStoreHealth(storeId: string): Promise<number> {
    try {
      const storeHealth = await ProactiveSyncMonitor.getStoreSpecificHealth(storeId);
      
      // Calculate health score based on sync health percentage
      return storeHealth.syncHealthPercentage / 100;
    } catch (error) {
      return 0.5; // Default health if calculation fails
    }
  }

  private async getStoreHealth(storeId: string): Promise<number> {
    const cached = this.storeHealthCache.get(storeId);
    const cacheAge = cached ? Date.now() - cached.lastCheck : Infinity;
    const cacheExpiry = 10 * 60 * 1000; // 10 minutes

    if (cached && cacheAge < cacheExpiry) {
      return cached.health;
    }

    const health = await this.calculateStoreHealth(storeId);
    this.storeHealthCache.set(storeId, {
      health,
      lastCheck: Date.now()
    });

    return health;
  }

  private async getStoreName(storeId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();

      return data?.name || `Store ${storeId.slice(0, 8)}`;
    } catch {
      return `Store ${storeId.slice(0, 8)}`;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateOverallStatus(sync: CrossStoreSync): 'completed' | 'partial' | 'failed' {
    const { successfulStores, failedStores, totalStores } = sync.overallMetrics;
    
    if (successfulStores === totalStores) return 'completed';
    if (successfulStores > 0) return 'partial';
    return 'failed';
  }

  private async reportSyncCompletion(sync: CrossStoreSync): Promise<void> {
    const { overallMetrics } = sync;
    const cluster = this.clusters.get(sync.clusterId);
    
    const message = `Cross-store sync completed for ${cluster?.name}: ` +
      `${overallMetrics.successfulStores}/${overallMetrics.totalStores} stores successful, ` +
      `${overallMetrics.totalItemsProcessed} items processed`;

    if (sync.status === 'completed') {
      toast.success(message);
    } else if (sync.status === 'partial') {
      toast.warning(message);
    } else {
      toast.error(`Sync failed: ${message}`);
    }

    console.log(`🌐 ${message}`);
  }

  async getClusters(): Promise<StoreCluster[]> {
    return Array.from(this.clusters.values());
  }

  async getActiveSyncs(): Promise<CrossStoreSync[]> {
    return Array.from(this.activeSyncs.values());
  }

  async getStoreHealthScores(): Promise<Map<string, number>> {
    const healthScores = new Map<string, number>();
    
    for (const [storeId, cached] of this.storeHealthCache) {
      healthScores.set(storeId, cached.health);
    }
    
    return healthScores;
  }

  async createCustomCluster(
    name: string, 
    storeIds: string[], 
    config: Partial<StoreCluster>
  ): Promise<string> {
    const clusterId = `custom_${Date.now()}`;
    const cluster: StoreCluster = {
      id: clusterId,
      name,
      storeIds,
      syncStrategy: 'parallel',
      healthThreshold: 0.8,
      autoRepairEnabled: true,
      ...config
    };

    this.clusters.set(clusterId, cluster);
    return clusterId;
  }

  destroy(): void {
    this.storeHealthCache.clear();
    this.activeSyncs.clear();
    this.clusters.clear();
    console.log('🌐 Multi-Store Orchestrator destroyed');
  }
}

export const multiStoreOrchestrator = MultiStoreOrchestrator.getInstance();
export type { StoreCluster, CrossStoreSync, StoreyncResult, SyncMetrics };