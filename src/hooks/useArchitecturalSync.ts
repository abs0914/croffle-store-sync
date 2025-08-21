import { useState, useEffect, useCallback } from 'react';
import { masterControl } from '@/services/architecture/masterControlService';
import { toast } from 'sonner';

export interface ArchitecturalStatus {
  isHealthy: boolean;
  isInitialized: boolean;
  lastHealthCheck?: Date;
  systemReport?: any;
  validationSummary?: any;
}

/**
 * React hook for managing architectural synchronization
 * Provides reactive access to system health and repair functions
 */
export const useArchitecturalSync = (storeId?: string) => {
  const [status, setStatus] = useState<ArchitecturalStatus>({
    isHealthy: false,
    isInitialized: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize architecture on mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const success = await masterControl.initializeArchitecture();
        setStatus(prev => ({ 
          ...prev, 
          isInitialized: success,
          isHealthy: success 
        }));
      } catch (error) {
        console.error('Architecture initialization failed:', error);
        toast.error('System architecture initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Refresh system health
  const refreshHealth = useCallback(async () => {
    if (!storeId) return;
    
    setIsLoading(true);
    try {
      const healthData = await masterControl.getSystemHealthReport(storeId);
      
      setStatus(prev => ({
        ...prev,
        isHealthy: healthData.healthReport.failed === 0,
        lastHealthCheck: new Date(),
        systemReport: healthData.healthReport,
        validationSummary: healthData.validationSummary
      }));
      
      return healthData;
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Health check failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  // Process sale with full integrity
  const processSale = useCallback(async (
    transactionId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>
  ) => {
    if (!storeId) {
      toast.error('Store ID required for sale processing');
      return false;
    }

    setIsLoading(true);
    try {
      const result = await masterControl.processSaleWithIntegrity(
        transactionId,
        items,
        storeId
      );
      
      // Refresh health after sale to detect any new issues
      await refreshHealth();
      
      return result.success;
    } catch (error) {
      console.error('Sale processing failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeId, refreshHealth]);

  // Get safe products for POS
  const getSafeProducts = useCallback(async () => {
    if (!storeId) return null;
    
    try {
      return await masterControl.getSafeProducts(storeId);
    } catch (error) {
      console.error('Failed to get safe products:', error);
      return null;
    }
  }, [storeId]);

  // Run emergency repair
  const emergencyRepair = useCallback(async () => {
    if (!storeId) {
      toast.error('Store ID required for emergency repair');
      return null;
    }

    setIsLoading(true);
    try {
      const result = await masterControl.emergencyRepair(storeId);
      
      // Refresh health after repair
      await refreshHealth();
      
      return result;
    } catch (error) {
      console.error('Emergency repair failed:', error);
      toast.error('Emergency repair failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storeId, refreshHealth]);

  // Validate and fix a specific product
  const validateAndFixProduct = useCallback(async (productId: string) => {
    setIsLoading(true);
    try {
      const result = await masterControl.validateAndFixProduct(productId);
      
      if (result.valid) {
        // Refresh health to reflect improvements
        await refreshHealth();
      }
      
      return result;
    } catch (error) {
      console.error('Product validation failed:', error);
      toast.error('Product validation failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshHealth]);

  // Sync template globally
  const syncTemplateGlobally = useCallback(async (templateId: string) => {
    setIsLoading(true);
    try {
      const success = await masterControl.syncTemplateGlobally(templateId);
      
      if (success) {
        // Refresh health to reflect sync improvements
        await refreshHealth();
      }
      
      return success;
    } catch (error) {
      console.error('Template sync failed:', error);
      toast.error('Template synchronization failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshHealth]);

  return {
    // Status
    status,
    isLoading,
    
    // Actions
    refreshHealth,
    processSale,
    getSafeProducts,
    emergencyRepair,
    validateAndFixProduct,
    syncTemplateGlobally,
    
    // Utilities
    isReady: status.isInitialized && !isLoading
  };
};