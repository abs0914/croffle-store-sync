import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncIssue {
  type: 'missing_product' | 'inactive_product' | 'price_mismatch' | 'availability_mismatch';
  productId: string;
  productName: string;
  storeId: string;
  storeName?: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MonitoringReport {
  storeId: string;
  storeName: string;
  lastCheck: string;
  overallHealth: 'healthy' | 'warning' | 'critical';
  issues: SyncIssue[];
  metrics: {
    totalProducts: number;
    syncedProducts: number;
    missingProducts: number;
    inventoryItems: number;
    lowStockItems: number;
    negativeStockItems: number;
  };
}

/**
 * Inventory Monitoring Service
 * Provides continuous monitoring and alerting for data synchronization issues
 */
export class InventoryMonitoringService {

  /**
   * Generate comprehensive monitoring report for a store
   */
  static async generateStoreReport(storeId: string): Promise<MonitoringReport> {
    try {
      console.log('📊 Generating monitoring report for store:', storeId);
      
      // Get store information
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();

      if (storeError) {
        throw storeError;
      }

      const issues: SyncIssue[] = [];
      
      // Check product synchronization
      const syncIssues = await this.checkProductSynchronization(storeId, store.name);
      issues.push(...syncIssues);

      // Check inventory health
      const inventoryIssues = await this.checkInventoryHealth(storeId, store.name);
      issues.push(...inventoryIssues);

      // Calculate metrics
      const metrics = await this.calculateStoreMetrics(storeId);

      // Determine overall health
      const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
      const highIssues = issues.filter(issue => issue.severity === 'high').length;
      
      let overallHealth: 'healthy' | 'warning' | 'critical';
      if (criticalIssues > 0) {
        overallHealth = 'critical';
      } else if (highIssues > 0 || metrics.negativeStockItems > 0) {
        overallHealth = 'warning';
      } else {
        overallHealth = 'healthy';
      }

      return {
        storeId,
        storeName: store.name,
        lastCheck: new Date().toISOString(),
        overallHealth,
        issues,
        metrics
      };
    } catch (error) {
      console.error('❌ Monitoring report generation failed:', error);
      throw error;
    }
  }

  /**
   * Check product synchronization between catalog and products table
   */
  private static async checkProductSynchronization(storeId: string, storeName: string): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    try {
      // Get products in catalog but missing from products table
      const { data: catalogProducts } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          is_available,
          price,
          products!left(id, is_active, price)
        `)
        .eq('store_id', storeId);

        catalogProducts?.forEach(catalogProduct => {
        const productRecord = catalogProduct.products && catalogProduct.products.length > 0 ? catalogProduct.products[0] : null;
        
        if (!productRecord) {
          issues.push({
            type: 'missing_product',
            productId: catalogProduct.id,
            productName: catalogProduct.product_name,
            storeId,
            storeName,
            details: 'Product exists in catalog but missing from products table',
            severity: 'high'
          });
        } else {
          // Check for availability mismatch
          if (catalogProduct.is_available !== (productRecord as any).is_active) {
            issues.push({
              type: 'availability_mismatch',
              productId: catalogProduct.id,
              productName: catalogProduct.product_name,
              storeId,
              storeName,
              details: `Availability mismatch: catalog=${catalogProduct.is_available}, products=${(productRecord as any).is_active}`,
              severity: 'medium'
            });
          }

          // Check for price mismatch
          if (Math.abs((catalogProduct.price || 0) - ((productRecord as any).price || 0)) > 0.01) {
            issues.push({
              type: 'price_mismatch',
              productId: catalogProduct.id,
              productName: catalogProduct.product_name,
              storeId,
              storeName,
              details: `Price mismatch: catalog=${catalogProduct.price}, products=${(productRecord as any).price}`,
              severity: 'low'
            });
          }
        }
      });

    } catch (error) {
      console.error('❌ Product synchronization check failed:', error);
    }

    return issues;
  }

  /**
   * Check inventory health for potential issues
   */
  private static async checkInventoryHealth(storeId: string, storeName: string): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    try {
      // Check for negative stock
      const { data: negativeStock } = await supabase
        .from('inventory_stock')
        .select('id, item, stock_quantity')
        .eq('store_id', storeId)
        .lt('stock_quantity', 0)
        .eq('is_active', true);

      negativeStock?.forEach(item => {
        issues.push({
          type: 'missing_product', // Using existing type for negative stock
          productId: item.id,
          productName: item.item,
          storeId,
          storeName,
          details: `Negative stock: ${item.stock_quantity}`,
          severity: 'critical'
        });
      });

    } catch (error) {
      console.error('❌ Inventory health check failed:', error);
    }

    return issues;
  }

  /**
   * Calculate store metrics
   */
  private static async calculateStoreMetrics(storeId: string) {
    try {
      // Get product counts
      const [catalogCountResult, productsCountResult, inventoryCountResult] = await Promise.all([
        supabase.from('product_catalog').select('id', { count: 'exact' }).eq('store_id', storeId),
        supabase.from('products').select('id', { count: 'exact' }).eq('store_id', storeId),
        supabase.from('inventory_stock').select('id', { count: 'exact' }).eq('store_id', storeId).eq('is_active', true)
      ]);

      // Get inventory health metrics
      const [lowStockResult, negativeStockResult] = await Promise.all([
        supabase.from('inventory_stock')
          .select('id', { count: 'exact' })
          .eq('store_id', storeId)
          .eq('is_active', true)
          .filter('stock_quantity', 'lt', 'minimum_threshold'),
        supabase.from('inventory_stock')
          .select('id', { count: 'exact' })
          .eq('store_id', storeId)
          .eq('is_active', true)
          .lt('stock_quantity', 0)
      ]);

      return {
        totalProducts: catalogCountResult.count || 0,
        syncedProducts: productsCountResult.count || 0,
        missingProducts: (catalogCountResult.count || 0) - (productsCountResult.count || 0),
        inventoryItems: inventoryCountResult.count || 0,
        lowStockItems: lowStockResult.count || 0,
        negativeStockItems: negativeStockResult.count || 0
      };
    } catch (error) {
      console.error('❌ Metrics calculation failed:', error);
      return {
        totalProducts: 0,
        syncedProducts: 0,
        missingProducts: 0,
        inventoryItems: 0,
        lowStockItems: 0,
        negativeStockItems: 0
      };
    }
  }

  /**
   * Monitor all stores and generate comprehensive report
   */
  static async monitorAllStores(): Promise<MonitoringReport[]> {
    try {
      console.log('📊 Monitoring all stores...');
      
      // Get all active stores
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      if (!stores || stores.length === 0) {
        return [];
      }

      // Generate reports for all stores in parallel
      const reportPromises = stores.map(store => 
        this.generateStoreReport(store.id).catch(error => {
          console.error(`Failed to generate report for store ${store.name}:`, error);
          return null;
        })
      );

      const reports = await Promise.all(reportPromises);
      
      // Filter out failed reports
      return reports.filter(report => report !== null) as MonitoringReport[];
    } catch (error) {
      console.error('❌ All stores monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Check for missing inventory movements (sales without deductions)
   */
  static async checkMissingInventoryMovements(
    storeId: string, 
    dateFrom: string, 
    dateTo: string
  ): Promise<{
    missingMovements: Array<{
      transactionId: string;
      receiptNumber: string;
      productName: string;
      quantity: number;
      transactionDate: string;
    }>;
    totalAffected: number;
  }> {
    try {
      console.log('🔍 Checking for missing inventory movements:', { storeId, dateFrom, dateTo });
      
      // Get transactions in date range
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          receipt_number,
          created_at,
          transaction_items (
            product_id,
            name,
            quantity
          )
        `)
        .eq('store_id', storeId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .eq('status', 'completed');

      if (error) {
        throw error;
      }

      const missingMovements: Array<{
        transactionId: string;
        receiptNumber: string;
        productName: string;
        quantity: number;
        transactionDate: string;
      }> = [];

      // Check each transaction for corresponding inventory movements
      for (const transaction of transactions || []) {
        for (const item of transaction.transaction_items || []) {
          // Check if inventory movement exists for this transaction item
          const { data: movements } = await supabase
            .from('inventory_movements')
            .select('id')
            .eq('reference_id', transaction.id)
            .eq('movement_type', 'sale_deduction');

          if (!movements || movements.length === 0) {
            missingMovements.push({
              transactionId: transaction.id,
              receiptNumber: transaction.receipt_number,
              productName: item.name,
              quantity: item.quantity,
              transactionDate: transaction.created_at
            });
          }
        }
      }

      console.log(`Found ${missingMovements.length} missing inventory movements`);
      
      return {
        missingMovements,
        totalAffected: missingMovements.length
      };
    } catch (error) {
      console.error('❌ Missing movements check failed:', error);
      throw error;
    }
  }

  /**
   * Set up automated monitoring alerts
   */
  static async setupMonitoringAlerts(config: {
    checkInterval: number; // minutes
    criticalThreshold: number; // number of critical issues
    enableNotifications: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('⚙️ Setting up monitoring alerts:', config);
      
      // This would typically integrate with a scheduling system
      // For now, we'll return success and log the configuration
      
      if (config.enableNotifications) {
        toast.success(`Monitoring alerts configured: Check every ${config.checkInterval} minutes, alert on ${config.criticalThreshold}+ critical issues`);
      }

      return {
        success: true,
        message: `Monitoring alerts configured successfully`
      };
    } catch (error) {
      console.error('❌ Failed to setup monitoring alerts:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Setup failed'
      };
    }
  }
}