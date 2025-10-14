/**
 * CONFLICT RESOLUTION SYSTEM
 * 
 * Handles data conflicts during sync with:
 * - Rule-based conflict detection and resolution
 * - Multiple resolution strategies (server_wins, client_wins, merge, user_prompt)
 * - Inventory conflict handling
 * - Pricing discrepancy resolution
 * - Customer data conflicts
 * - Audit trail for all resolutions
 */

import { toast } from 'sonner';
import { EnhancedOfflineTransaction } from '../storage/EnhancedOfflineTransactionQueue';

export interface ConflictData {
  id: string;
  transactionId: string;
  conflictType: 'inventory' | 'pricing' | 'customer' | 'product' | 'discount' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientData: any;
  serverData: any;
  detectedAt: number;
  resolvedAt?: number;
  resolutionStrategy?: ConflictResolutionStrategy;
  resolutionData?: any;
  autoResolved: boolean;
  userDecision?: any;
}

export type ConflictResolutionStrategy = 
  | 'server_wins'      // Use server data
  | 'client_wins'      // Use client data
  | 'merge'           // Merge both datasets
  | 'user_prompt'     // Ask user to decide
  | 'skip'            // Skip this transaction
  | 'retry_later';    // Retry after other conflicts resolved

export interface ConflictResolutionRule {
  conflictType: ConflictData['conflictType'];
  severity: ConflictData['severity'];
  strategy: ConflictResolutionStrategy;
  condition?: (conflict: ConflictData) => boolean;
  autoResolve: boolean;
  priority: number;
}

export interface ConflictResolutionResult {
  resolved: boolean;
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  requiresUserInput: boolean;
  error?: string;
}

export interface ConflictStats {
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  autoResolvedCount: number;
  userResolvedCount: number;
  conflictsByType: Record<ConflictData['conflictType'], number>;
  conflictsBySeverity: Record<ConflictData['severity'], number>;
}

export class ConflictResolutionSystem {
  private static instance: ConflictResolutionSystem;
  private conflicts: Map<string, ConflictData> = new Map();
  private resolutionRules: ConflictResolutionRule[] = [];
  private userPromptCallbacks: Map<string, (decision: any) => void> = new Map();

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): ConflictResolutionSystem {
    if (!ConflictResolutionSystem.instance) {
      ConflictResolutionSystem.instance = new ConflictResolutionSystem();
    }
    return ConflictResolutionSystem.instance;
  }

  /**
   * Initialize default conflict resolution rules
   */
  private initializeDefaultRules(): void {
    this.resolutionRules = [
      // Inventory conflicts - usually server wins (authoritative)
      {
        conflictType: 'inventory',
        severity: 'critical',
        strategy: 'server_wins',
        autoResolve: true,
        priority: 1
      },
      {
        conflictType: 'inventory',
        severity: 'high',
        strategy: 'server_wins',
        autoResolve: true,
        priority: 2
      },
      {
        conflictType: 'inventory',
        severity: 'medium',
        strategy: 'user_prompt',
        autoResolve: false,
        priority: 3
      },

      // Pricing conflicts - server wins for consistency
      {
        conflictType: 'pricing',
        severity: 'critical',
        strategy: 'server_wins',
        autoResolve: true,
        priority: 1
      },
      {
        conflictType: 'pricing',
        severity: 'high',
        strategy: 'server_wins',
        autoResolve: true,
        priority: 2
      },
      {
        conflictType: 'pricing',
        severity: 'medium',
        strategy: 'user_prompt',
        autoResolve: false,
        priority: 3
      },

      // Customer conflicts - merge when possible
      {
        conflictType: 'customer',
        severity: 'low',
        strategy: 'merge',
        autoResolve: true,
        priority: 4
      },
      {
        conflictType: 'customer',
        severity: 'medium',
        strategy: 'client_wins',
        autoResolve: true,
        priority: 3
      },

      // Product conflicts - server wins (catalog authority)
      {
        conflictType: 'product',
        severity: 'high',
        strategy: 'server_wins',
        autoResolve: true,
        priority: 2
      },

      // Discount conflicts - user prompt for manual review
      {
        conflictType: 'discount',
        severity: 'medium',
        strategy: 'user_prompt',
        autoResolve: false,
        priority: 3
      },

      // Other conflicts - default to user prompt
      {
        conflictType: 'other',
        severity: 'medium',
        strategy: 'user_prompt',
        autoResolve: false,
        priority: 5
      }
    ];

    console.log(`📋 Initialized ${this.resolutionRules.length} conflict resolution rules`);
  }

  /**
   * Detect conflicts in transaction data
   */
  async detectConflicts(
    transaction: EnhancedOfflineTransaction,
    serverResponse: any
  ): Promise<ConflictData[]> {
    const conflicts: ConflictData[] = [];

    try {
      // Check inventory conflicts
      const inventoryConflicts = await this.detectInventoryConflicts(transaction, serverResponse);
      conflicts.push(...inventoryConflicts);

      // Check pricing conflicts
      const pricingConflicts = await this.detectPricingConflicts(transaction, serverResponse);
      conflicts.push(...pricingConflicts);

      // Check customer conflicts
      const customerConflicts = await this.detectCustomerConflicts(transaction, serverResponse);
      conflicts.push(...customerConflicts);

      // Check product conflicts
      const productConflicts = await this.detectProductConflicts(transaction, serverResponse);
      conflicts.push(...productConflicts);

      // Store detected conflicts
      for (const conflict of conflicts) {
        this.conflicts.set(conflict.id, conflict);
      }

      if (conflicts.length > 0) {
        console.log(`⚠️ Detected ${conflicts.length} conflicts for transaction ${transaction.receiptNumber}`);
      }

      return conflicts;
    } catch (error) {
      console.error('❌ Conflict detection failed:', error);
      return [];
    }
  }

  /**
   * Resolve conflicts using configured rules
   */
  async resolveConflicts(conflicts: ConflictData[]): Promise<ConflictResolutionResult[]> {
    const results: ConflictResolutionResult[] = [];

    // Sort conflicts by priority (rules with lower priority numbers first)
    const sortedConflicts = conflicts.sort((a, b) => {
      const ruleA = this.findResolutionRule(a);
      const ruleB = this.findResolutionRule(b);
      return (ruleA?.priority || 999) - (ruleB?.priority || 999);
    });

    for (const conflict of sortedConflicts) {
      try {
        const result = await this.resolveConflict(conflict);
        results.push(result);

        if (result.resolved) {
          conflict.resolvedAt = Date.now();
          conflict.resolutionStrategy = result.strategy;
          conflict.resolutionData = result.resolvedData;
          conflict.autoResolved = !result.requiresUserInput;
        }
      } catch (error) {
        console.error(`❌ Failed to resolve conflict ${conflict.id}:`, error);
        results.push({
          resolved: false,
          strategy: 'retry_later',
          resolvedData: null,
          requiresUserInput: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Resolve a single conflict
   */
  private async resolveConflict(conflict: ConflictData): Promise<ConflictResolutionResult> {
    const rule = this.findResolutionRule(conflict);
    
    if (!rule) {
      console.warn(`No resolution rule found for conflict ${conflict.id}, using default`);
      return {
        resolved: false,
        strategy: 'user_prompt',
        resolvedData: null,
        requiresUserInput: true
      };
    }

    console.log(`🔧 Resolving ${conflict.conflictType} conflict using ${rule.strategy} strategy`);

    switch (rule.strategy) {
      case 'server_wins':
        return {
          resolved: true,
          strategy: 'server_wins',
          resolvedData: conflict.serverData,
          requiresUserInput: false
        };

      case 'client_wins':
        return {
          resolved: true,
          strategy: 'client_wins',
          resolvedData: conflict.clientData,
          requiresUserInput: false
        };

      case 'merge':
        const mergedData = await this.mergeConflictData(conflict);
        return {
          resolved: true,
          strategy: 'merge',
          resolvedData: mergedData,
          requiresUserInput: false
        };

      case 'user_prompt':
        return await this.promptUserForResolution(conflict);

      case 'skip':
        return {
          resolved: true,
          strategy: 'skip',
          resolvedData: null,
          requiresUserInput: false
        };

      case 'retry_later':
        return {
          resolved: false,
          strategy: 'retry_later',
          resolvedData: null,
          requiresUserInput: false
        };

      default:
        throw new Error(`Unknown resolution strategy: ${rule.strategy}`);
    }
  }

  /**
   * Detect inventory conflicts
   */
  private async detectInventoryConflicts(
    transaction: EnhancedOfflineTransaction,
    serverResponse: any
  ): Promise<ConflictData[]> {
    const conflicts: ConflictData[] = [];

    if (serverResponse.inventoryConflicts) {
      for (const inventoryConflict of serverResponse.inventoryConflicts) {
        conflicts.push({
          id: `inventory_${transaction.id}_${inventoryConflict.productId}`,
          transactionId: transaction.id,
          conflictType: 'inventory',
          severity: inventoryConflict.availableQuantity === 0 ? 'critical' : 'high',
          clientData: {
            productId: inventoryConflict.productId,
            requestedQuantity: inventoryConflict.requestedQuantity,
            expectedAvailable: inventoryConflict.expectedAvailable
          },
          serverData: {
            productId: inventoryConflict.productId,
            availableQuantity: inventoryConflict.availableQuantity,
            lastUpdated: inventoryConflict.lastUpdated
          },
          detectedAt: Date.now(),
          autoResolved: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect pricing conflicts
   */
  private async detectPricingConflicts(
    transaction: EnhancedOfflineTransaction,
    serverResponse: any
  ): Promise<ConflictData[]> {
    const conflicts: ConflictData[] = [];

    if (serverResponse.pricingConflicts) {
      for (const pricingConflict of serverResponse.pricingConflicts) {
        const priceDifference = Math.abs(pricingConflict.clientPrice - pricingConflict.serverPrice);
        const percentageDifference = (priceDifference / pricingConflict.serverPrice) * 100;

        conflicts.push({
          id: `pricing_${transaction.id}_${pricingConflict.productId}`,
          transactionId: transaction.id,
          conflictType: 'pricing',
          severity: percentageDifference > 20 ? 'critical' : percentageDifference > 10 ? 'high' : 'medium',
          clientData: {
            productId: pricingConflict.productId,
            price: pricingConflict.clientPrice,
            timestamp: transaction.timestamp
          },
          serverData: {
            productId: pricingConflict.productId,
            price: pricingConflict.serverPrice,
            lastUpdated: pricingConflict.lastUpdated
          },
          detectedAt: Date.now(),
          autoResolved: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect customer conflicts
   */
  private async detectCustomerConflicts(
    transaction: EnhancedOfflineTransaction,
    serverResponse: any
  ): Promise<ConflictData[]> {
    const conflicts: ConflictData[] = [];

    if (serverResponse.customerConflicts && transaction.customerId) {
      for (const customerConflict of serverResponse.customerConflicts) {
        conflicts.push({
          id: `customer_${transaction.id}_${transaction.customerId}`,
          transactionId: transaction.id,
          conflictType: 'customer',
          severity: 'medium',
          clientData: customerConflict.clientData,
          serverData: customerConflict.serverData,
          detectedAt: Date.now(),
          autoResolved: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect product conflicts
   */
  private async detectProductConflicts(
    transaction: EnhancedOfflineTransaction,
    serverResponse: any
  ): Promise<ConflictData[]> {
    const conflicts: ConflictData[] = [];

    if (serverResponse.productConflicts) {
      for (const productConflict of serverResponse.productConflicts) {
        conflicts.push({
          id: `product_${transaction.id}_${productConflict.productId}`,
          transactionId: transaction.id,
          conflictType: 'product',
          severity: productConflict.discontinued ? 'critical' : 'high',
          clientData: productConflict.clientData,
          serverData: productConflict.serverData,
          detectedAt: Date.now(),
          autoResolved: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Find appropriate resolution rule for conflict
   */
  private findResolutionRule(conflict: ConflictData): ConflictResolutionRule | null {
    return this.resolutionRules.find(rule => 
      rule.conflictType === conflict.conflictType &&
      rule.severity === conflict.severity &&
      (!rule.condition || rule.condition(conflict))
    ) || null;
  }

  /**
   * Merge conflict data intelligently
   */
  private async mergeConflictData(conflict: ConflictData): Promise<any> {
    switch (conflict.conflictType) {
      case 'customer':
        return this.mergeCustomerData(conflict.clientData, conflict.serverData);
      
      case 'inventory':
        // For inventory, we typically can't merge - use server data
        return conflict.serverData;
      
      case 'pricing':
        // For pricing, use the more recent price
        return conflict.serverData.lastUpdated > conflict.clientData.timestamp
          ? conflict.serverData
          : conflict.clientData;
      
      default:
        // Default merge strategy - prefer server data with client timestamps
        return {
          ...conflict.serverData,
          clientTimestamp: conflict.clientData.timestamp || Date.now()
        };
    }
  }

  /**
   * Merge customer data
   */
  private mergeCustomerData(clientData: any, serverData: any): any {
    return {
      ...serverData,
      // Prefer client data for contact information if more recent
      email: clientData.email || serverData.email,
      phone: clientData.phone || serverData.phone,
      // Merge addresses
      addresses: [...(serverData.addresses || []), ...(clientData.addresses || [])],
      // Use latest update timestamp
      lastUpdated: Math.max(
        clientData.lastUpdated || 0,
        serverData.lastUpdated || 0,
        Date.now()
      )
    };
  }

  /**
   * Prompt user for conflict resolution
   */
  private async promptUserForResolution(conflict: ConflictData): Promise<ConflictResolutionResult> {
    return new Promise((resolve) => {
      // Store callback for when user makes decision
      this.userPromptCallbacks.set(conflict.id, (decision) => {
        conflict.userDecision = decision;
        resolve({
          resolved: true,
          strategy: decision.strategy,
          resolvedData: decision.data,
          requiresUserInput: true
        });
      });

      // Show user prompt (this would integrate with UI)
      this.showConflictPrompt(conflict);
    });
  }

  /**
   * Show conflict prompt to user (placeholder for UI integration)
   */
  private showConflictPrompt(conflict: ConflictData): void {
    // This would integrate with the UI to show a conflict resolution dialog
    console.log(`🤔 User prompt required for ${conflict.conflictType} conflict:`, conflict);
    
    // For now, show a toast notification
    toast.warning(`Conflict detected: ${conflict.conflictType}`, {
      description: 'Manual resolution required',
      action: {
        label: 'Resolve',
        onClick: () => {
          // This would open a conflict resolution dialog
          console.log('Opening conflict resolution dialog...');
        }
      }
    });
  }

  /**
   * Handle user decision for conflict
   */
  handleUserDecision(conflictId: string, decision: any): void {
    const callback = this.userPromptCallbacks.get(conflictId);
    if (callback) {
      callback(decision);
      this.userPromptCallbacks.delete(conflictId);
    }
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): ConflictStats {
    const conflicts = Array.from(this.conflicts.values());
    
    const stats: ConflictStats = {
      totalConflicts: conflicts.length,
      resolvedConflicts: conflicts.filter(c => c.resolvedAt).length,
      pendingConflicts: conflicts.filter(c => !c.resolvedAt).length,
      autoResolvedCount: conflicts.filter(c => c.autoResolved).length,
      userResolvedCount: conflicts.filter(c => c.resolvedAt && !c.autoResolved).length,
      conflictsByType: {
        inventory: 0,
        pricing: 0,
        customer: 0,
        product: 0,
        discount: 0,
        other: 0
      },
      conflictsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };

    // Count by type and severity
    for (const conflict of conflicts) {
      stats.conflictsByType[conflict.conflictType]++;
      stats.conflictsBySeverity[conflict.severity]++;
    }

    return stats;
  }

  /**
   * Clear resolved conflicts older than specified time
   */
  cleanupResolvedConflicts(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolvedAt && conflict.resolvedAt < cutoffTime) {
        this.conflicts.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} resolved conflicts`);
    }
  }
}
