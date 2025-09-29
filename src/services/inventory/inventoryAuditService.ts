/**
 * Inventory Audit Service - Minimal
 * 
 * **PHASE 2 FIX**: Basic audit and monitoring without complex types
 */

export class InventoryAuditService {
  private static instance: InventoryAuditService;
  private performanceBuffer: Map<string, number> = new Map();

  public static getInstance(): InventoryAuditService {
    if (!InventoryAuditService.instance) {
      InventoryAuditService.instance = new InventoryAuditService();
    }
    return InventoryAuditService.instance;
  }

  /**
   * Start performance timing
   */
  public startPerformanceTimer(transactionId: string): void {
    this.performanceBuffer.set(transactionId, Date.now());
    console.log(`⏱️ PERFORMANCE: Started timer for ${transactionId}`);
  }

  /**
   * Get elapsed time
   */
  public getElapsedTime(transactionId: string): number {
    const startTime = this.performanceBuffer.get(transactionId);
    if (!startTime) {
      console.warn(`⚠️ PERFORMANCE: No timer found for ${transactionId}`);
      return 0;
    }
    
    const elapsed = Date.now() - startTime;
    this.performanceBuffer.delete(transactionId);
    return elapsed;
  }

  /**
   * Log basic audit event
   */
  public async logInventoryEvent(data: {
    transactionId: string;
    storeId: string;
    operationType: string;
    status: string;
    itemsProcessed: number;
    processingTimeMs: number;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      console.log(`📊 AUDIT: ${data.operationType} - ${data.status} (${data.processingTimeMs}ms)`);
      
      // Simple localStorage fallback for audit data
      const auditEntry = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`audit_${data.transactionId}_${Date.now()}`, JSON.stringify(auditEntry));
      console.log(`✅ AUDIT: Event logged locally for ${data.transactionId}`);
      
    } catch (error) {
      console.error(`❌ AUDIT: Failed to log event:`, error);
    }
  }

  /**
   * Get basic performance metrics
   */
  public getBasicMetrics(): { activeTimers: number; lastUpdate: string } {
    return {
      activeTimers: this.performanceBuffer.size,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Log authentication failure
   */
  public async logAuthFailure(transactionId: string, storeId: string, error: string): Promise<void> {
    await this.logInventoryEvent({
      transactionId,
      storeId,
      operationType: 'authentication',
      status: 'failure',
      itemsProcessed: 0,
      processingTimeMs: 0,
      metadata: { error_type: 'auth_failure', error_message: error }
    });
  }

  /**
   * Clear old performance timers
   */
  public clearOldTimers(): void {
    const cutoff = Date.now() - 300000; // 5 minutes
    for (const [key, startTime] of this.performanceBuffer.entries()) {
      if (startTime < cutoff) {
        this.performanceBuffer.delete(key);
      }
    }
  }
}

// Export singleton instance
export const inventoryAuditService = InventoryAuditService.getInstance();